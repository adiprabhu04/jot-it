# Engineering Decisions — Jot It

> A running record of significant technology and architecture decisions:
> what was decided, why, what else was considered, and the tradeoffs
> accepted. New decisions are **appended** (never rewritten), so this
> file reads as the project's decision history.

**Format:** each entry has **Decision · Reason · Alternatives considered
· Tradeoffs**, plus a status (✅ in effect · 🔭 planned/open). Cross-refs:
[ARCHITECTURE.md](./Architecture.md), [AI.md](./AI.md),
[ROADMAP.md](./Roadmap.md).

------------------------------------------------------------------------

## D-1 · Backend: ASP.NET Core 8 Minimal API ✅

- **Decision:** build the backend as an ASP.NET Core 8 Minimal API.
- **Reason:** high performance, first-class async, strong typing, mature
  auth/EF Core ecosystem, and low-ceremony endpoint definitions suited to
  a compact REST surface. Originated in an internship context with .NET
  expertise.
- **Alternatives considered:** Node/Express, Python FastAPI (already used
  for AI), Go.
- **Tradeoffs:** two languages in the stack (C# + Python). Accepted
  because the AI workload is Python-native and the split keeps concerns
  clean. Minimal API keeps everything in one `Program.cs` today —
  readable now, slated to be split into endpoint groups in V2.

## D-2 · AI Service: Python FastAPI ✅

- **Decision:** implement OCR/NLP/AI as a separate Python FastAPI service.
- **Reason:** the ML/imaging ecosystem (Pillow, pytesseract, Azure SDK,
  Groq, future embedding libraries) is Python-first. Isolating it lets AI
  scale and deploy independently and keeps model interaction in one place.
- **Alternatives considered:** doing OCR/AI in-process in .NET; a
  serverless function per task.
- **Tradeoffs:** an extra network hop and service to operate. Accepted for
  the ecosystem fit and independent scaling; the backend orchestrates so
  clients never see the split.

## D-3 · Database: PostgreSQL on Neon ✅

- **Decision:** PostgreSQL as the system of record, hosted on Neon.
- **Reason:** robust relational guarantees, JSON support, and — decisively
  for V2 — the **pgvector** extension enables vector search in the same
  database, avoiding a separate vector store. Neon adds serverless
  scaling and a generous managed tier.
- **Alternatives considered:** MySQL, SQLite (too limited for multi-user
  cloud), a dedicated vector DB (Pinecone/Weaviate/Qdrant) alongside a
  relational DB.
- **Tradeoffs:** a separate vector DB could offer more specialized ANN
  tuning, at the cost of a second datastore to sync and operate. Keeping
  vectors in Postgres (pgvector) is simpler and keeps user data
  co-located and per-user scoped.

## D-4 · Hosting: Render (migrated from Railway) ✅

- **Decision:** deploy the backend and AI service as Docker containers on
  **Render**; the backend lives at `https://jotit-api.onrender.com` with a
  `/health` healthcheck. This **replaced an earlier Railway deployment**.
- **Reason (Railway, originally):** fast, low-config deploys from a repo,
  simple environment management — good for early iteration.
- **Reason (migration to Render):** Render's Docker deployment model,
  healthcheck integration, and operational fit better matched the
  containerized backend/AI services.
- **Alternatives considered:** Railway (used first), Fly.io, Azure App
  Service, AWS/GCP container services.
- **Tradeoffs:** managed PaaS trades fine-grained infra control for
  operational simplicity. Cold starts on lower tiers are mitigated by a
  backend keepalive ping to the AI service. Legacy `railway.toml` files
  remain in the tree but are no longer authoritative — Render is the
  source of truth (see [ARCHITECTURE.md](./Architecture.md)).

## D-5 · Frontend hosting & proxy: Vercel ✅

- **Decision:** serve the static web app on Vercel and rewrite `/api/*` to
  the backend via `vercel.json`.
- **Reason:** excellent static/PWA hosting, global CDN, and a simple
  rewrite that keeps API calls same-origin (no CORS in the browser path,
  backend URL not hardcoded in the page).
- **Alternatives considered:** Netlify (config retained as `netlify.toml`
  / `_redirects` for portability), GitHub Pages, serving the SPA from the
  .NET `wwwroot`.
- **Tradeoffs:** ties production routing to Vercel's rewrite; mitigated by
  keeping equivalent Netlify config and a relative `/api` base so the
  target backend is a single-line change.

## D-6 · OCR: Azure Computer Vision (Read API) ✅

- **Decision:** use Azure Computer Vision's Read API as the primary OCR
  engine, with Tesseract as a local fallback.
- **Reason:** strong **handwriting** recognition (the core Jot It use
  case) and per-word confidence scores, which the review UI surfaces as
  confidence pills.
- **Alternatives considered:** Google Cloud Vision, AWS Textract,
  Tesseract-only.
- **Tradeoffs:** a paid managed dependency and network latency (polling
  the async Read API). Accepted for handwriting quality; Tesseract
  guarantees a working path when Azure is unconfigured/unavailable.

## D-7 · Summarization: Groq LLM + extractive fallback ✅

- **Decision:** use Groq (`llama-3.1-8b-instant`) for summaries, with a
  frequency-based extractive fallback.
- **Reason:** Groq offers very low-latency inference at low cost, well
  suited to short, frequent summary calls. The extractive fallback keeps
  summaries working with zero external dependency.
- **Alternatives considered:** OpenAI/Anthropic hosted models
  (higher cost/latency for this task), local LLMs (heavier to host),
  extractive-only (lower quality).
- **Tradeoffs:** a hosted LLM dependency for best quality; the fallback
  bounds the risk. Note: **Groq has no embeddings API**, so the V2
  embedding provider is a separate, open decision (see D-11).

## D-8 · Web frontend: Vanilla JS (framework-free) ✅ → modularized in V2 🔭

- **Decision:** build the web app in vanilla JS/HTML/CSS with no
  framework. **V2 keeps vanilla but modularizes** it into ES modules
  (no framework adopted).
- **Reason:** minimal bundle, instant load, no build step, and no
  framework churn — aligned with the "performance is part of the design"
  principle. The design system lives in plain CSS custom properties.
- **Alternatives considered:** React, Svelte, Vue. Rejected for V2 to
  avoid a full rewrite and to preserve the lightweight ethos; the real
  problem (a 6.9k-line single file) is **maintainability**, which
  modularization solves without a framework.
- **Tradeoffs:** vanilla means more manual DOM/state code and no
  component ecosystem. Accepted; modular ES modules + the token stylesheet
  recover maintainability while keeping the app static and fast
  (see [ARCHITECTURE.md](./Architecture.md), [ROADMAP.md](./Roadmap.md)
  Phase 1).

## D-9 · Mobile: React Native + Expo ✅

- **Decision:** ship a React Native + Expo (SDK 54) companion app sharing
  the backend API.
- **Reason:** one codebase for Android + iOS, fast iteration via Expo,
  and native camera/image-picker access for scanning.
- **Alternatives considered:** native (Kotlin/Swift), Flutter, a mobile
  web wrapper.
- **Tradeoffs:** RN abstraction overhead and Expo constraints. Accepted
  for cross-platform speed. (Known contract drift with the web client —
  password hashing and the scan field name — is tracked for V2
  alignment; see [ARCHITECTURE.md](./Architecture.md).)

## D-10 · Auth: JWT + bcrypt ✅

- **Decision:** stateless JWT bearer auth (HS256, 7-day expiry) with
  bcrypt password hashing.
- **Reason:** stateless tokens keep the backend horizontally scalable;
  bcrypt is a proven password hash.
- **Alternatives considered:** server-side sessions, OAuth/social login,
  Argon2 for hashing.
- **Tradeoffs:** JWTs are hard to revoke before expiry, and a 7-day token
  in `localStorage` has XSS exposure. **V2 hardening (planned):** remove
  the redundant web-side SHA-256 pre-hash, add refresh tokens with a
  shorter access-token lifetime, rate-limit auth, and enforce a password
  policy ([SRS.md](./SRS.md) NFR-11–NFR-12).

## D-11 · Embedding provider 🔭 (OPEN DECISION)

- **Decision:** *not yet made.* The embedding model/provider for V2
  semantic search and RAG is deliberately deferred until Phase 3.
- **Reason to defer:** the choice trades privacy, quality, and cost, and
  should be made when the retrieval work actually begins rather than
  guessed now.
- **Alternatives considered:**
  - **Local** (`sentence-transformers` in the FastAPI service) — no
    vendor, no per-call cost, content stays in-house; needs compute.
  - **OpenAI `text-embedding-3-small`** — strong quality, low cost,
    hosted; sends content out.
  - **Cohere embeddings** — competitive hosted option.
  - Groq is **excluded** — no embeddings API.
- **Tradeoffs to weigh:** privacy (in-house vs. third-party), quality,
  latency, and cost. Once chosen, record the decision here and update
  [AI.md](./AI.md) and [DATABASE.md](./Database.md). Until then, no
  document may assume a specific provider.

## D-12 · Vector store: pgvector in PostgreSQL 🔭 (Planned — V2)

- **Decision:** store embeddings in PostgreSQL via the pgvector extension
  rather than a dedicated vector database.
- **Reason:** keeps vectors co-located with user data (simpler per-user
  scoping, one datastore to operate, transactional consistency with
  notes). Follows from D-3.
- **Alternatives considered:** Pinecone, Weaviate, Qdrant, Milvus.
- **Tradeoffs:** a specialized vector DB may scale ANN further and offer
  richer tuning; pgvector is simpler and sufficient for expected
  per-user data sizes, with HNSW/IVFFlat indexes for performance.
  Revisit if scale demands it.
