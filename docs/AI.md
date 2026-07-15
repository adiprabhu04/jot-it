# AI — Jot It

> How Jot It thinks. This document is the source of truth for every AI
> capability: what exists today, what is planned, and the principles
> that govern all of it.

**Status legend:** ✅ Implemented (v1) · 🔭 Planned (V2). Cross-refs:
[VISION.md](./VISION.md) (product intent + Non Goals),
[ARCHITECTURE.md](./Architecture.md) (system placement),
[DATABASE.md](./Database.md) (storage), [API.md](./API.md) (endpoints),
[ROADMAP.md](./Roadmap.md) (sequencing), [DECISIONS.md](./DECISIONS.md)
(rationale).

------------------------------------------------------------------------

## 1. AI Philosophy

AI in Jot It is an **assistant, not the main character**. It follows the
design principle that *AI should feel invisible* (see
[DESIGN.md](./DESIGN.md)) and the product principle that AI must
*reduce friction, aid recall, or deepen understanding* (see
[VISION.md](./VISION.md)).

Three non-negotiable rules:

1. **Grounded, not generic.** The AI operates on the user's own
   knowledge. It is never a general-purpose, open-domain chatbot
   (a stated [Non Goal](./VISION.md)). When it answers, it answers *from
   the notes*, and it cites them.
2. **Honest over confident.** If the user's notes don't contain the
   answer, the AI says so. Fabrication is a defect, not a feature.
3. **Assistive, not intrusive.** AI suggests and augments; it never
   blocks capture, interrupts the user, or hides core functionality
   behind itself.

All AI model interaction is isolated in the **AI service (FastAPI)**. The
backend orchestrates; clients never call model providers directly.

------------------------------------------------------------------------

## 2. OCR Pipeline ✅

**Purpose:** convert handwriting and images into editable text.

**Flow** (see [ARCHITECTURE.md](./Architecture.md) OCR Flow):

1. Client captures an image (canvas drawing, upload, or camera) and sends
   it to the backend `/notes/scan` with a `source` hint (`canvas` vs.
   `upload`). Backend validates size (≤10MB) and MIME type.
2. Backend forwards the image to the AI service `/extract-text` with
   retry/backoff on rate limiting.
3. **Preprocessing (Pillow), source-aware:**
   - Composite transparency onto white; convert to grayscale.
   - Upscale small images (stronger minimum for `canvas` to reveal thin
     strokes).
   - `canvas`: thicken strokes (MaxFilter) then stronger contrast +
     mean-threshold binarization. `upload`: median denoise + moderate
     contrast.
   - Sharpen (UnsharpMask), normalize brightness.
4. **Recognition:** Azure Computer Vision **Read API** (handwriting +
   print), polled to completion, returning text and **per-word
   confidence**.
5. **Fallback:** if Azure is unconfigured or errors, **Tesseract**
   (`pytesseract`) runs with a PSM mode chosen from the image type.
6. Text + confidence return to the backend → client review UI
   (confidence pills, inline correction) → save as note.
7. **Feedback loop:** `/ocr/feedback` records accuracy/corrections;
   `/ocr/stats` aggregates per-user OCR accuracy.

**Engines & provenance:** each result reports its `engine`
(`azure_vision` or `tesseract`) so downstream analytics can distinguish
sources.

------------------------------------------------------------------------

## 3. Summarization Pipeline ✅

**Purpose:** produce concise summaries of note content.

- **Primary:** Groq LLM (`llama-3.1-8b-instant`) with a **word-count
  constrained** system prompt. Three length presets map to target word
  counts: `short` ≈ 15, `medium` ≈ 35 (default), `detailed` ≈ 60. Output
  is hard-capped (with headroom) via a word-truncation safety net.
- **Fallback:** a **frequency-based extractive** summarizer (sentence
  scoring over content words, original-order reassembly) runs when Groq
  is unavailable or returns empty. This guarantees a summary path even
  with no LLM.
- **Invocation:** available on-demand via `/notes/summarize`, and
  currently also generated inline on note create/update.

**V2 changes 🔭:** move summarization **off the synchronous write path**
(async generation), and **never overwrite an existing good summary** when
the provider fails (a v1 defect — failure currently clears the field).
See [ROADMAP.md](./Roadmap.md) Phase 3 and [SRS.md](./SRS.md) NFR-15.

------------------------------------------------------------------------

## 4. Embedding Generation 🔭 (Planned — V2)

The embedding pipeline is the **shared foundation** for semantic search,
RAG chat, related notes, flashcards/quizzes, and the knowledge graph. It
is designed once and consumed everywhere.

- **Trigger:** on note create/update, the note is **chunked** (size/overlap
  tuned for retrieval quality) and each chunk is embedded.
- **Storage:** vectors are written to the `embeddings` table using
  **pgvector**, linked to the note/chunk and scoped to the user, with the
  embedding **model id recorded** for provenance and re-index safety
  (see [DATABASE.md](./Database.md)).
- **Model — DECIDED:** **`BAAI/bge-small-en-v1.5`, self-hosted
  (ONNX-quantized) in the FastAPI service, 384-dim.** Kept in-house for
  privacy and $0 marginal cost; fallback `all-MiniLM-L6-v2` (same 384
  dims) if memory-constrained. Groq has no embeddings API. See
  [DECISIONS.md](./DECISIONS.md) D-11 and the full design +
  model comparison in [KNOWLEDGE_ENGINE.md](./KNOWLEDGE_ENGINE.md).
- **Re-indexing:** changing the embedding model requires re-embedding;
  `/embeddings/reindex` and `/embeddings/status` support this
  (see [API.md](./API.md)).

------------------------------------------------------------------------

## 5. Vector Search 🔭 (Planned — V2)

- **Store/index:** pgvector column with an ANN index (HNSW or IVFFlat)
  for scalable similarity search.
- **Query path:** embed the query → nearest-neighbor search (top-k) →
  optional **hybrid** re-rank combining keyword full-text
  (`search_index` / `tsvector`) with vector similarity → return ranked
  notes with snippets and scores.
- **Scoping:** every query is filtered by `UserId`; cross-user retrieval
  is impossible by construction ([SRS.md](./SRS.md) NFR-8).
- **Surfaces:** unified search UI, command palette, and "related notes"
  all consume this layer (see [DESIGN.md](./DESIGN.md)).

------------------------------------------------------------------------

## 6. RAG Architecture 🔭 (Planned — V2)

Retrieval-Augmented Generation grounds LLM answers in the user's notes.

1. **Retrieve:** vector search (§5) fetches the most relevant chunks for
   the user's question.
2. **Assemble:** retrieved chunks form the grounding context, within a
   token budget; irrelevant/low-score chunks are dropped.
3. **Generate:** the LLM answers **only** from the provided context,
   returning the answer plus the **source note ids** used.
4. **Persist:** the conversation and messages (with source provenance)
   are stored per user (`conversations`, `messages` — see
   [DATABASE.md](./Database.md)).
5. **Stream:** the answer streams to the client token-by-token.

**No-context behavior:** if retrieval finds nothing relevant, the model
must respond that it cannot answer from the user's notes — it must not
fall back to general world knowledge. This is what keeps Jot It from
becoming a generic chatbot.

------------------------------------------------------------------------

## 7. Prompt Engineering Principles

- **Explicit constraints.** Prompts state the exact job and limits (e.g.,
  the summarizer's word-count target and "output only the summary" rule).
- **Grounding first (RAG).** System prompts instruct the model to use
  only the supplied context and to cite sources; refuse when context is
  insufficient.
- **Output discipline.** Ask for clean output — no preamble, labels, or
  markdown scaffolding the UI must strip.
- **Determinism where it matters.** Prefer low/zero temperature for
  extraction, classification, and grounded answers.
- **Safety nets around the model.** Never trust length/format blindly —
  post-process (truncation caps, validation) as the summarizer does.
- **Versioned prompts.** Treat prompts as code; changes are reviewable
  and traceable.

------------------------------------------------------------------------

## 8. Caching 🔭 (Planned — V2)

- **Embeddings are a cache by nature:** re-embed only when a note's
  content changes (dirty-checking on update), not on every read.
- **Summary caching:** persist summaries (already stored on the note) and
  regenerate only on content change.
- **Query/result caching:** short-lived caching of frequent search
  queries per user may be added if profiling justifies it.
- **Model/provider responses:** cache idempotent operations where safe;
  never cache across users.

------------------------------------------------------------------------

## 9. Streaming 🔭 (Planned — V2)

Chat responses stream incrementally (server-sent events / chunked
transfer) so answers feel alive without being distracting (see
[DESIGN.md](./DESIGN.md) AI Chat panel). Streaming applies to RAG chat;
short operations (summaries) return whole. Each streamed answer resolves
with its source citations.

------------------------------------------------------------------------

## 10. Hallucination Prevention

Layered defenses:

1. **Grounding:** RAG answers use only retrieved user content.
2. **Refusal on empty retrieval:** no relevant notes → explicit "can't
   answer from your notes," never invented facts (FR-19).
3. **Citations:** every answer exposes its source notes so users can
   verify (FR-20).
4. **Scoping:** per-user retrieval prevents cross-contamination (NFR-8).
5. **Deterministic settings** for grounded/extractive tasks.
6. **Post-processing/validation** of model output before it reaches the
   user.

------------------------------------------------------------------------

## 11. Evaluation Strategy 🔭

- **OCR:** the existing feedback loop (`/ocr/feedback`, `/ocr/stats`)
  provides accuracy signal per engine; extend with confidence-vs-accuracy
  analysis.
- **Summarization:** track fallback rate (Groq vs. extractive), length
  adherence, and user edits post-summary.
- **Retrieval:** measure relevance with a labeled query set
  (precision@k / recall@k) and monitor latency.
- **RAG:** evaluate groundedness (are cited sources actually used?),
  answer correctness on a curated set, and refusal correctness (does it
  refuse when it should?).
- **Regression gates:** prompt or model changes are checked against these
  metrics before rollout.

------------------------------------------------------------------------

## 12. Privacy Considerations

- **User data is never used for third-party model training** and is not
  shared ([SRS.md](./SRS.md) NFR-6, NFR-9).
- **Per-user isolation** on all retrieval and generation (NFR-8).
- **Provider exposure is a first-class decision:** a local embedding
  model keeps content in-house; any hosted provider that receives note
  content is chosen deliberately and documented in
  [DECISIONS.md](./DECISIONS.md).
- **User control:** an AI master switch in user preferences lets users
  disable AI features (FR-37).
- **Secrets** (API keys) live only in environment variables.

------------------------------------------------------------------------

## 13. Cost Optimization

- **Fallbacks reduce spend and increase resilience:** Tesseract for OCR,
  extractive summarization for text — the product works even with no paid
  AI call.
- **Small, fast models** for high-frequency tasks (the summarizer uses an
  8B instant model); reserve larger models for where quality pays off.
- **Cache/dirty-check embeddings and summaries** so work is done once per
  content change, not per view (§8).
- **Right-size retrieval:** bounded top-k and token budgets keep RAG
  prompts small.
- **Local embeddings** (if chosen) remove per-call embedding cost
  entirely, trading vendor spend for compute on the AI service.

------------------------------------------------------------------------

## 14. Future AI Roadmap

Sequenced in [ROADMAP.md](./Roadmap.md): Phase 3 builds the embedding
pipeline, semantic search, RAG chat, related notes, and async
summarization; Phase 4 adds flashcards, quizzes, voice transcription, and
the knowledge graph — all on the same retrieval foundation. The pipeline
is designed once so these features never require re-architecting it.
