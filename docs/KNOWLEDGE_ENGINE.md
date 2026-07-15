# Knowledge Engine — Jot It (V2)

> **One retrieval substrate, six consumers.** Semantic Search, RAG Chat,
> Related Notes, Flashcards, Quiz Generation, and the future Knowledge
> Graph are not separate systems. Each is a thin consumer of one shared
> pipeline: **chunk → embed → store in pgvector → retrieve → (optionally)
> generate.** Build the substrate once; every feature becomes small.

**Status:** 🔭 Planned (V2). This is the technical design for
[ROADMAP.md](./Roadmap.md) Phase 3 (and the Phase 4 features that build
on it). Nothing here is implemented yet. Cross-refs:
[AI.md](./AI.md), [ARCHITECTURE.md](./Architecture.md),
[DATABASE.md](./Database.md), [API.md](./API.md),
[DECISIONS.md](./DECISIONS.md), [SRS.md](./SRS.md), [VISION.md](./VISION.md).

**Invariants preserved (from existing architecture):** only the backend
touches PostgreSQL; the AI service owns all model interaction and is
stateless/DB-less; every query is user-scoped; AI is grounded in the
user's own notes, never open-domain (see [VISION.md](./VISION.md) Non
Goals).

**Decision locked:** embedding model = **`BAAI/bge-small-en-v1.5`,
self-hosted (ONNX-quantized) in the FastAPI service, 384-dim** (see
[DECISIONS.md](./DECISIONS.md) D-11, and the comparison at the end of
this document).

------------------------------------------------------------------------

## 1. Overall Architecture

```text
                     ┌──────────── Clients (web / mobile) ────────────┐
                     │  search · chat · related · flashcards · quiz    │
                     └───────────────────────┬─────────────────────────┘
                                     REST + JWT (per-user)
                                             ▼
┌──────────────────────────── BACKEND (ASP.NET Core) ────────────────────────────┐
│  Feature endpoints  →  Knowledge Engine services                                 │
│                                                                                  │
│   IngestionService ──┐                 ┌── IRetrievalService (THE seam)          │
│   (dirty-check,      │                 │   retrieve(userId, query, filters, k)   │
│    enqueue)          │                 │      1. query→vector (AI /embed)        │
│                      ▼                 │      2. pgvector ANN SQL (user-scoped)  │
│   EmbeddingWorker (BackgroundService)  │      3. rank + return chunks            │
│      chunk → AI /embed → store         └─────────────┬──────────────────────────│
│                                                      │ consumed by all features  │
│   GenerationService (chat/cards/quiz) ──── AI /generate, /chat (LLM)            │
└───────────────┬───────────────────────────────────────┬─────────────────────────┘
      EF/Npgsql  │ (pgvector SQL)              REST       │
                 ▼                                        ▼
        ┌─────────────────┐                    ┌────────────────────────┐
        │ PostgreSQL+Neon │                    │ AI SERVICE (FastAPI)   │
        │ notes,embeddings│                    │ /embed  (bge-small)    │
        │ HNSW ANN index  │                    │ /chat,/generate (Groq) │
        └─────────────────┘                    │ /extract-text,/summarize│
                                               └────────────────────────┘
```

**Two layers, one seam:**

- **Retrieval layer** — backend `IRetrievalService`. The reusable
  primitive. Returns ranked, user-scoped chunks. Feature-agnostic. It is
  the *only* code that knows about pgvector.
- **Generation layer** — backend `GenerationService` → AI `/chat` /
  `/generate`. Turns retrieved context into answers/cards/questions. Also
  feature-agnostic; the only variable is the prompt template.

Every feature = `retrieve()` + (optional) `generate()` + light shaping.
Adding a feature adds a consumer, never new infrastructure.

------------------------------------------------------------------------

## 2. Data Flow

**Write path (ingestion — async, never blocks note save):**

1. Note created/updated → backend computes `ContentHash`. If unchanged,
   skip (pin/color/category edits never re-embed).
2. Set `note.EmbeddingStatus = pending`, commit note immediately (write
   returns at v1 latency).
3. `EmbeddingWorker` picks up pending notes → chunk → batch AI `/embed` →
   transactional upsert into `embeddings` (delete note's old chunks,
   insert new) → `EmbeddingStatus = ready`.

**Query path (retrieval):**

1. Feature calls `IRetrievalService.Retrieve(userId, query, filters, k)`.
2. Backend obtains the query vector from AI `/embed` (cached by query
   hash).
3. pgvector ANN SQL: `WHERE UserId=@uid [AND filters] ORDER BY Vector <=>
   @q LIMIT k`.
4. Returns `[{noteId, chunkIndex, content, score}]`.

**Generation path (RAG features):** retrieve → assemble context
(token-budgeted) → AI `/chat` or `/generate` with the feature prompt →
stream/return → persist with source note IDs.

------------------------------------------------------------------------

## 3. Database Schema Changes

Builds on the planned `embeddings` table in [DATABASE.md](./Database.md),
refined for pgvector, dirty-checking, and model namespacing.

**`notes` — add columns** (ingestion control; no change to v1 behavior):

| Column | Type | Purpose |
|--------|------|---------|
| `ContentHash` | `text` | SHA-256 of normalized content; skip re-embed when unchanged |
| `EmbeddingStatus` | `text` | `pending` \| `processing` \| `ready` \| `failed` |
| `EmbeddedAt` | `timestamptz?` | last successful embed |
| `EmbeddingModel` | `text?` | model that produced current vectors |

**`embeddings` — finalized:**

| Column | Type | Notes |
|--------|------|-------|
| `Id` | `uuid` PK | |
| `UserId` | `uuid` | FK, indexed, in every ANN filter |
| `NoteId` | `uuid` | FK, cascade delete |
| `ChunkIndex` | `int` | position within the note |
| `Content` | `text` | chunk text (grounding / snippets) |
| `Vector` | `vector(384)` | pgvector; 384 = bge-small dim |
| `Model` | `text` | provenance / re-index safety |
| `TokenCount` | `int?` | telemetry / cost |
| `ContentHash` | `text` | chunk-level dedupe/skip |
| `CreatedAt` | `timestamptz` | |

**Indexes:** `HNSW (Vector vector_cosine_ops)` with `m=16,
ef_construction=64`, `ef_search` tuned at query time; btree on `(UserId)`
and `(NoteId)`.

**Generation tables** (unchanged from [DATABASE.md](./Database.md)):
`conversations`, `messages` (with `SourceNoteIds`), `flashcards`,
`quizzes`, `quiz_questions`, `note_relationships` (graph edges).

**Migrations** stay EF Core. The pgvector extension and the HNSW index
require a **raw-SQL migration** (`CREATE EXTENSION IF NOT EXISTS vector`;
`CREATE INDEX ... USING hnsw`). The `Vector` column maps via
`Pgvector.EntityFrameworkCore`.

------------------------------------------------------------------------

## 4. pgvector Integration

- **Extension:** `CREATE EXTENSION vector` on Neon (Neon supports
  pgvector).
- **Type:** `vector(384)`. `halfvec(384)` (16-bit) is a deferred storage
  optimization (~½ index size, negligible recall loss).
- **Distance:** cosine (`<=>`) with normalized embeddings (bge output is
  normalized → cosine ≈ dot).
- **Index:** **HNSW** (over IVFFlat) — better recall/latency, no training
  step. Filtered ANN (`WHERE UserId=@uid`) is fine at Jot It per-user
  scale.
- **.NET access:** `Pgvector` + `Pgvector.EntityFrameworkCore`; ANN
  queries via raw SQL / `FromSqlInterpolated` for `ORDER BY Vector <=>
  @q`.
- **Model namespacing:** the `Model` column + filter guarantees a query
  vector is only compared against vectors from the same model — enabling
  safe model swaps via dual-write reindex.

------------------------------------------------------------------------

## 5. Embedding Pipeline

Owned by the AI service; orchestrated by the backend.

- **AI `/embed`** — `POST { texts: [str], type: "passage"|"query" }` →
  `{ vectors: [[float;384]], model, dims }`. Batched. `type` carries the
  bge query/passage instruction distinction.
- **`EmbeddingWorker`** (backend `BackgroundService`): polls `notes`
  where `EmbeddingStatus IN (pending, failed-and-retry-due)` in small
  batches → chunk → `/embed` (passage) → transactional upsert (delete old
  chunks, insert new, set `ready`).
- **Dirty-check:** `ContentHash` gate — non-content edits never re-embed.
- **Idempotent & retriable:** safe to re-run; failed notes get
  exponential backoff, capped retries → `failed` (surfaced via
  `/embeddings/status`).
- **Query embedding** (`type:"query"`) is cached (§11), never stored.

------------------------------------------------------------------------

## 6. Chunking Strategy

- **Unit:** paragraph-aware, sentence-boundary splitting. HTML is
  stripped to plain text first (notes store rich HTML).
- **Size:** ~**256 tokens/chunk, ~15% overlap** — focused chunks suit a
  small embedding model and keep RAG context tight.
- **Short-note fast path:** notes under ~256 tokens = **one chunk** (the
  majority of Jot It notes). Avoids fragmenting tiny notes.
- **Title prepend:** prepend the note title to each chunk before
  embedding (cheap recall boost).
- **Location:** chunking lives in the **AI service** (beside the
  tokenizer → accurate token counts), returned alongside `/embed`.
- **Deterministic:** same input → same chunks, so the `ContentHash`
  dirty-check is stable.

------------------------------------------------------------------------

## 7. Retrieval Pipeline

Single code path, parameterized:

1. **Embed query** (AI `/embed type=query`, cached).
2. **ANN SQL** (user-scoped, filtered): top-`k` by cosine.
3. **Optional hybrid** (phase-in): union with keyword full-text
   (`tsvector` / planned `search_index`), merge normalized scores. Pure
   vector first.
4. **Optional rerank** (later): cross-encoder stage — a reserved hook,
   off by default (latency/cost).
5. **Threshold + dedupe:** collapse multiple chunks of the same note for
   Search; keep all for RAG context.
6. Return typed `RetrievedChunk[]`.

Feature-specific shaping happens **above** this primitive:

- **Search** → group by note, best-chunk snippet, sort by score.
- **Related Notes** → query = the note's own chunk vector(s), `WHERE
  NoteId != self`, dedupe.
- **RAG** → keep top chunks as context (token budget).
- **Flashcards / Quiz** → retrieve source note/collection chunks (or use
  the full note directly for single-note cards).
- **Graph** → batch kNN per note → edges.

------------------------------------------------------------------------

## 8. Generic Retrieval API

**Internal seam (backend service) — the reusable core:**

```
IRetrievalService.RetrieveAsync(
  userId,
  query: text | float[384],          // text (embed it) or precomputed vector (related-notes)
  filters: { noteIds?, folderId?, collectionId?, excludeNoteId? },
  k, minScore?, mode: vector | hybrid
) -> RetrievedChunk[] { noteId, chunkIndex, content, score }
```

Every feature calls this. It is the single place that touches pgvector.

**Public HTTP surface** (from [API.md](./API.md), all 🔭 Planned, JWT +
user-scoped):

- `POST /search/semantic` `{query, topK?, filters?}` → ranked notes +
  snippets + scores
- `GET /search/suggestions?q=`
- `GET /notes/{id}/related`
- `POST /chat/conversations/{id}/messages` (streaming, cited) +
  conversation CRUD
- `POST /notes/{id}/flashcards`, `GET/PUT/DELETE /flashcards/...`
- `POST /quizzes`, `GET /quizzes/{id}`
- `GET /graph`, `GET /notes/{id}/graph`
- `POST /embeddings/reindex`, `GET /embeddings/status`

------------------------------------------------------------------------

## 9. AI Service Responsibilities

- **Model hosting:** the embedding model (`/embed`) and all LLM
  generation.
- **Chunking + tokenization** (beside the tokenizer).
- **Generation endpoints:** `/chat` (RAG, streaming, grounded-or-refuse,
  returns text), `/generate` (structured JSON: flashcards, quizzes),
  existing `/summarize`, `/extract-text`.
- **Prompt templates** (versioned) — grounding rules, refusal behavior,
  JSON schemas.
- **Never touches the database.** Stateless. No user data persisted.

------------------------------------------------------------------------

## 10. Backend Responsibilities

- **Orchestration:** ingestion, retrieval, generation flow control.
- **All persistence**, including the pgvector ANN SQL.
- **Auth + per-user scoping** on every query (the security boundary).
- **Background embedding worker** + job/status tracking.
- **Caching** (query vectors, retrieval results, summaries).
- **Public API surface** + streaming passthrough (SSE from AI `/chat` →
  client).
- **Graph batch job**, reindex jobs.

------------------------------------------------------------------------

## 11. Caching Strategy

| Layer | Key | TTL / invalidation | Why |
|-------|-----|--------------------|-----|
| **Embeddings themselves** | note `ContentHash` | on content change | biggest cache — never re-embed unchanged notes |
| **Query-vector cache** | `sha256(model+query)` | LRU, hours | repeated searches skip the AI hop |
| **Retrieval-result cache** | `(userId, queryHash, filters)` | short (~60s), bust on note write | de-dupe rapid identical searches |
| **Related-notes** | `note.Id + ContentHash` | on note/edge change | read-heavy, precomputable |
| **Summaries** | note (existing) | on content change | already implemented |

Start with in-process `IMemoryCache`; no Redis needed at current scale.
The interface allows swapping to a distributed cache later.

------------------------------------------------------------------------

## 12. Background Processing

No message broker exists; don't add one yet.

- **`EmbeddingWorker : BackgroundService`** — DB-backed queue via
  `notes.EmbeddingStatus`. Polls (short interval / triggered), claims a
  batch (`FOR UPDATE SKIP LOCKED`), embeds, updates status. Same pattern
  as the existing keepalive loop, hardened.
- **Batching:** embed multiple chunks/notes per AI call.
- **Backfill job:** one-time reindex of existing notes; resumable; drives
  `/embeddings/status`.
- **Graph builder:** periodic/triggered batch computing kNN edges into
  `note_relationships`.
- **Scale path:** the DB-queue design migrates to a durable queue
  (Hangfire) later with no API change.

------------------------------------------------------------------------

## 13. Failure Handling

- **Note write never blocks on AI** — embedding is post-commit async. AI
  down = notes still save.
- **Embedding failure** → status `failed`, backoff retry, capped →
  surfaced in `/embeddings/status`. Note stays usable (keyword-searchable).
- **Search with no/stale embeddings** → degrade to v1 keyword
  (`LIKE`/`tsvector`) search. Always returns something.
- **RAG:** empty retrieval **or** AI down → explicit "can't answer from
  your notes" ([SRS.md](./SRS.md) FR-19). Never hallucinate; never fall
  back to world knowledge.
- **Summarization:** existing Groq→extractive fallback (already failure-safe).
- **Partial state tolerated:** retrieval works on whatever is `ready`.
- **Idempotency:** re-embedding replaces a note's chunks transactionally;
  no duplicates.

------------------------------------------------------------------------

## 14. Security Considerations

- **Per-user scoping is mandatory in every ANN query** (`WHERE
  UserId=@uid`), enforced inside `IRetrievalService`, not per feature. No
  cross-user retrieval is possible ([SRS.md](./SRS.md) NFR-8).
- **RAG grounding = data-leak prevention:** the model only ever sees the
  requesting user's chunks.
- **AI service** stays DB-less and stateless; receives only the text it
  must process; **CORS restricted** to configured origins (NFR-13).
- **Prompt-injection:** retrieved note content is treated as data, not
  instructions; a fixed system prompt owns the role; model output is
  escaped when rendered.
- **Secrets** via environment variables only.
- **Privacy:** self-hosted embeddings keep note content in-house
  (satisfies [SRS.md](./SRS.md) NFR-6/NFR-9). An AI master switch in user
  preferences ([SRS.md](./SRS.md) FR-37) disables the engine.

------------------------------------------------------------------------

## 15. Performance Considerations

- **384-dim vectors** → compact index, fast search, ¼ the storage of a
  1536-dim model.
- **HNSW** gives low-latency ANN at Jot It scale; tune `ef_search` for
  recall/latency.
- **Batch embedding**; **quantized ONNX** model for fast CPU inference.
- **Bounded top-k + token budget** keep RAG prompts small (fast, cheap,
  less hallucination).
- **Streaming** chat for perceived speed.
- **Short-note single-chunk** fast path avoids overhead for most notes.
- **Async ingestion** keeps write latency at v1 levels.
- **Query-vector + result caching** cut repeat cost.

------------------------------------------------------------------------

## 16. Cost Considerations

- **Self-hosted embeddings = $0 marginal** (compute only, on the existing
  Render AI service). The biggest cost lever.
- **Dirty-check** avoids all redundant embedding work.
- **Groq** generation is already cheap; bounded context caps tokens.
- **pgvector on Neon** = no separate vector-DB bill; 384-dim keeps storage
  minimal.
- Hosted embeddings would add `tokens × ~$0.02/1M` plus a vendor — avoided
  by self-hosting.

------------------------------------------------------------------------

## 17. Future Extensibility

- **The seam is `IRetrievalService`** — new features consume it; zero new
  infrastructure.
- **Hybrid search** (add `tsvector`), **reranker** (cross-encoder hook),
  and **multi-vector** retrieval slot into the reserved pipeline stages.
- **Knowledge Graph** = batch kNN over existing embeddings → edges; no new
  pipeline.
- **Model swap** is safe via `Model` namespacing + dual-write reindex.
- **Collections/folders filtering** is already in the filter struct.
- Generation features (cards / quiz / chat) differ only by **prompt
  template** in the AI service.

------------------------------------------------------------------------

## Embedding Model Comparison & Decision

| Model | Dim | Host | Speed (CPU) | Retrieval | Cost | Privacy | Portfolio |
|-------|-----|------|-------------|-----------|------|---------|-----------|
| all-MiniLM-L6-v2 | 384 | self | fastest (~80MB) | good | free | in-house | modest |
| **bge-small-en-v1.5** | **384** | **self** | **fast (~130MB)** | **strong** | **free** | **in-house** | **high** |
| OpenAI text-embedding-3-small | 1536 | API | network hop | strong | ~$0.02/1M tok | data leaves | low |
| Cohere Embed v3 | 1024 | API | network hop | strong | ~$0.10/1M tok | data leaves | low |

**Decision: `BAAI/bge-small-en-v1.5`, self-hosted via quantized ONNX
(`onnxruntime`) in the FastAPI service, 384-dim.**

- **Retrieval quality:** best-in-class for its size; clearly above
  MiniLM, on par with OpenAI-3-small — at 384 dims.
- **Deployment simplicity:** reuses the existing Python AI service;
  ONNX-int8 keeps memory/latency within Render's tier. No new vendor, no
  new secret.
- **Inference speed:** small, quantized, batched → fast CPU inference; no
  network round-trip per query.
- **Cost:** $0 marginal.
- **Privacy:** note content never leaves the infrastructure — directly
  satisfies the Jot It privacy stance. Hosted APIs can't match this.
- **Portfolio quality:** self-hosting an embedding model + pgvector RAG
  demonstrates real ML/systems depth.

**Fallbacks:** `all-MiniLM-L6-v2` (drop-in, same 384 dims) if Render
memory is tight; `OpenAI text-embedding-3-small` only if self-hosting is
operationally infeasible — but its **1536 dims** change the `vector()`
column and index cost, so that switch must happen before M1.

------------------------------------------------------------------------

## Implementation Plan — Milestones

Each milestone is independently **buildable, testable, and committable**.
`[BE]` backend · `[AI]` AI service · `[DB]` migration · `[FE]` frontend.

| # | Milestone | Scope | Done-when / test |
|---|-----------|-------|------------------|
| **M0** | Enable pgvector `[DB]` | raw-SQL migration `CREATE EXTENSION vector` | extension present; migration idempotent |
| **M1** | `embeddings` table + `notes` columns `[DB][BE]` | EF models, `Pgvector.EFCore`, HNSW index | migration applies; a `vector(384)` round-trips |
| **M2** | AI `/embed` `[AI]` | bge-small via ONNX; query/passage; batch | dims=384, deterministic, normalized; batch works |
| **M3** | Chunking `[AI]` | HTML-strip + sentence/paragraph, 256/overlap, short-note fast path, title prepend | boundary/overlap/idempotence unit tests |
| **M4** | Ingestion worker `[BE]` | `ContentHash`, status machine, `EmbeddingWorker`, upsert | create/edit note → chunks `ready`; non-content edit skips |
| **M5** | Backfill + `/embeddings/status` `[BE]` | reindex existing notes, coverage status | seed data → 100% ready; status accurate |
| **M6** | `IRetrievalService` `[BE]` | query-embed + user-scoped ANN SQL + query-vector cache | seeded corpus returns expected neighbors; cross-user leakage test = 0 |
| **M7** | `POST /search/semantic` + UI `[BE][FE]` | group-by-note, snippets, scores; degrade→keyword | e2e ranked results; AI-down → keyword fallback |
| **M8** | `GET /notes/{id}/related` `[BE][FE]` | self-vector query, exclude self | related notes on note view |
| **M9** | RAG chat `[DB][AI][BE][FE]` | conversations/messages, AI `/chat` streaming, citations, refuse-on-empty | grounded cited answer; empty → refusal; streams |
| **M10** | Flashcards `[DB][AI][BE][FE]` | `/generate` cards from note; table + review | cards generated + persisted; review updates schedule |
| **M11** | Quizzes `[DB][AI][BE][FE]` | quiz + questions from note/collection | quiz with answers/explanations generated |
| **M12** | Knowledge Graph `[BE][FE]` | batch kNN → `note_relationships`; `/graph` | edges computed; neighborhood renders |

**M0–M6 build the reusable engine; M7–M12 are thin consumers that prove
reuse** (each adds a prompt/endpoint/UI, no new infra). The async
summarization migration ([AI.md](./AI.md) §3) folds into M4's write-path
refactor.
