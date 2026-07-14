# Architecture — Jot It

Jot It is composed of independently deployed services that communicate over HTTPS.

## High-Level Flow

```text
Frontend (Web / Mobile)
        │
        ▼
ASP.NET Core Backend
        │
        ▼
AI Service (FastAPI)
        │
        ▼
Azure Computer Vision
        │
        ▼
PostgreSQL
```

## Components

### 1. Frontend
- **Web:** Vanilla JS / HTML / CSS, deployed statically on Vercel as a PWA.
- **Mobile:** React Native + Expo (SDK 54).
- Both clients call the backend's REST API and never talk to the database or AI service directly.
- In production, the web app proxies `/api/*` to the backend (via `vercel.json`) to keep calls same-origin.

### 2. Backend — ASP.NET Core 8 Minimal API
- Authentication (JWT issuance and validation).
- Notes and tasks CRUD and business logic.
- OCR orchestration: forwards images to the AI service and persists results.
- Data access through EF Core / Npgsql.
- Deployed on **Render** as a Docker container with a `/health` healthcheck (base URL `https://jotit-api.onrender.com`). See [DECISIONS.md](./DECISIONS.md) for the Railway → Render migration.

### 3. AI Service — Python FastAPI
- Receives images from the backend.
- Preprocesses images (Pillow) and calls the Azure Computer Vision Read API.
- Returns extracted text and per-line confidence scores.
- Provides text summarization (Groq LLM with an extractive NLP fallback).
- Deployed on **Render**.

### 4. Azure Computer Vision
- Managed OCR (handwriting and printed text) via the Read API.
- Invoked exclusively by the AI service.

### 5. PostgreSQL (Neon)
- Primary datastore for users, notes, tasks, and OCR/summary metadata.
- Accessed only by the backend.

## Communication Flow

1. A client sends an authenticated REST request (JWT in the `Authorization` header) to the backend.
2. The backend validates the token and authorizes the request against the owning user.
3. For data operations, the backend reads/writes PostgreSQL via EF Core.
4. For OCR, the backend forwards the image to the AI service over REST.
5. The AI service preprocesses the image and calls Azure Computer Vision, then returns text + confidence data.
6. The backend stores the result and returns a structured JSON response to the client.

## Cross-Cutting Concerns
- **Security:** HTTPS everywhere, JWT auth, bcrypt password hashing, per-user data scoping, configurable CORS origins.
- **Resilience:** Healthchecks on the backend; services scale independently.
- **Performance:** Static, framework-free frontend; lightweight Pillow-based image preprocessing.

------------------------------------------------------------------------

# Architecture — Detailed Reference

> The sections above are the concise overview. Below is the detailed
> reference for implementers. **Status legend:** ✅ Implemented (v1) ·
> 🔭 Planned (V2). Anything marked Planned is a target design, not
> existing code. See [ROADMAP.md](./Roadmap.md) for sequencing,
> [AI.md](./AI.md) for AI internals, and [DECISIONS.md](./DECISIONS.md)
> for the rationale behind each technology.

## High-Level Architecture

Jot It is a set of independently deployed services communicating only
over HTTPS/REST. Clients never touch the database or AI service directly;
the backend is the single trust and orchestration boundary.

```text
        ┌──────────────────────┐        ┌──────────────────────┐
        │  Web (Vanilla JS/PWA)│        │  Mobile (Expo / RN)  │
        │  Vercel · /api proxy │        │  direct base URL     │
        └──────────┬───────────┘        └──────────┬───────────┘
                   │  REST + JWT (HTTPS)            │
                   └──────────────┬─────────────────┘
                                  ▼
                   ┌──────────────────────────────┐
                   │  ASP.NET Core 8 Minimal API  │
                   │  Render · Docker · /health   │
                   │  auth · notes · orchestration│
                   └───┬───────────────────┬──────┘
          EF Core /    │                   │  REST
          Npgsql       ▼                   ▼
             ┌──────────────────┐   ┌──────────────────────┐
             │ PostgreSQL (Neon)│   │ AI Service (FastAPI) │
             │ + pgvector 🔭    │   │ Render · Python      │
             └──────────────────┘   └──────────┬───────────┘
                                                │ external calls
                                   ┌────────────┴───────────┐
                                   ▼                        ▼
                        ┌────────────────────┐   ┌────────────────────┐
                        │ Azure Computer     │   │ Groq LLM (summary) │
                        │ Vision (Read/OCR)  │   │ + embeddings 🔭    │
                        └────────────────────┘   └────────────────────┘
```

## Component Architecture

| Component | Responsibility | Talks to |
|-----------|----------------|----------|
| Web frontend | UI, capture, offline shell (PWA) | Backend (`/api/*`) |
| Mobile app | UI, camera/scan, capture | Backend (base URL) |
| Backend | Auth, notes CRUD, orchestration, persistence | DB, AI service |
| AI service | OCR, summarization, embeddings 🔭 | Azure Vision, Groq, (vector ops) |
| PostgreSQL | System of record | Backend only |

## Frontend Architecture

**Today (v1) ✅** — a single `frontend/index.html` (~6.9k lines) with
inline CSS and one inline `<script>` (~130 functions). No build step;
served statically on Vercel. A service worker (`sw.js`) provides a
network-first HTML shell with API bypass and offline fallback. All API
calls use the relative base `/api`, proxied to the backend via
`vercel.json`.

**V2 direction 🔭** — the frontend is **modularized into ES modules
without adopting a framework** (see [DECISIONS.md](./DECISIONS.md) —
"Why Vanilla JS"). Target module boundaries: `tokens.css` /
`styles/*`, `state`, `api`, `auth`, `router`, `notes`, `ocr`,
`summarize`, `search`, `chat` 🔭, `commands`, and `ui/*` components.
Design tokens move to a dedicated stylesheet with **identical values**.
External behavior and the static-hosting model are preserved; this is a
maintainability refactor, not a rewrite. This modularization is the
**first V2 milestone** and a prerequisite for the AI UI surfaces.

## Backend Architecture

**ASP.NET Core 8 Minimal API**, currently a single `Program.cs`.

- **Auth:** JWT bearer (HS256, signed with `JWT_SECRET_KEY`), tokens
  valid 7 days, carrying the user id (`NameIdentifier`) claim.
  `RequireAuthorization()` guards protected endpoints; every query is
  scoped by the authenticated `UserId`.
- **Data access:** EF Core / Npgsql; migrations are applied automatically
  on startup (`db.Database.Migrate()`).
- **Orchestration:** for OCR and summarization the backend forwards to
  the AI service (`AI_SERVICE_URL`) and persists results. It never calls
  Azure or Groq directly.
- **Config:** environment-driven (`DATABASE_URL`, `JWT_SECRET_KEY`,
  `AI_SERVICE_URL`, `ALLOWED_ORIGINS`).
- **Keepalive:** a background loop pings the AI service `/health` every
  10 minutes to mitigate Render cold starts.

**V2 direction 🔭** — split `Program.cs` into endpoint groups
(auth, notes, ai, search, chat) and service classes; move summarization
off the synchronous note-write path (see [AI.md](./AI.md)); add
semantic-search and chat endpoints (see [API.md](./API.md)).

## AI Architecture

The **AI service (FastAPI)** owns all model interaction. See
[AI.md](./AI.md) for the full design. Summary:

- **OCR:** Pillow preprocessing (source-aware for canvas vs. upload) →
  Azure Computer Vision **Read API** → per-word confidence; **Tesseract**
  fallback when Azure is unconfigured/unavailable.
- **Summarization:** Groq (`llama-3.1-8b-instant`) with a word-count
  constrained prompt → frequency-based **extractive** fallback.
- **Embeddings & RAG 🔭:** planned — an embedding endpoint plus a
  retrieval layer over pgvector (see "Future RAG flow" below).

## Data Flow (note lifecycle) ✅

1. Client sends an authenticated REST request to the backend.
2. Backend validates the JWT and authorizes against the owning user.
3. For CRUD, backend reads/writes PostgreSQL via EF Core.
4. On create/update, backend may request a summary from the AI service.
   *(V2 🔭: this becomes asynchronous so writes are not blocked on the
   LLM, and an existing summary is never overwritten on failure.)*
5. Backend returns a structured JSON response.

## Authentication Flow ✅

1. **Register/Login:** client submits email + password. *(Note: the web
   client currently pre-hashes the password with SHA-256 before sending;
   the backend then applies bcrypt. V2 🔭 removes the client-side
   pre-hash so web and mobile share one contract — bcrypt server-side
   only.)*
2. Backend verifies with bcrypt and issues a signed JWT (7-day expiry).
3. Client stores the token and sends it as `Authorization: Bearer <jwt>`
   on every protected request.
4. Backend validates the signature/expiry and resolves the user id for
   per-user scoping. `GET /auth/me` returns the current user.

## OCR Flow ✅

1. Client captures an image (canvas drawing, upload, or camera) and
   POSTs it to `/notes/scan` with a `source` hint.
2. Backend validates size (≤10MB) and type, then forwards the image to
   the AI service `/extract-text` (with retry/backoff on rate limits).
3. AI service preprocesses (source-aware) and calls Azure Read API,
   polling for the result; falls back to Tesseract if needed.
4. Text + per-word confidence returns to the backend, then to the client
   for review, inline correction, and save.
5. Optional OCR feedback (`/ocr/feedback`) records accuracy for stats.

## Future RAG Flow 🔭 (Planned — V2)

1. **Ingestion:** on note create/update, the note is chunked and each
   chunk is embedded (via the AI service embedding endpoint). Vectors are
   stored in PostgreSQL using **pgvector**, linked to the note/chunk.
2. **Retrieval:** a query is embedded and matched against stored vectors
   (approximate nearest-neighbor) to fetch the most relevant chunks,
   scoped to the user.
3. **Generation:** retrieved chunks form the grounding context for an LLM
   prompt; the model answers **only** from that context and returns
   source citations. Responses stream to the client.
4. **Reuse:** the same retrieval layer powers semantic search, related
   notes, flashcard/quiz generation, and the knowledge graph — designed
   once, consumed many times (see [VISION.md](./VISION.md) V2 thesis).

## Semantic Search Architecture 🔭 (Planned — V2)

- **Store:** pgvector column(s) on an `embeddings` table (see
  [DATABASE.md](./Database.md)).
- **Index:** ANN index (e.g., HNSW/IVFFlat) for scalable similarity
  search; per-user filtering enforced in-query.
- **Query path:** embed query → vector search (top-k) → optional keyword
  hybrid re-rank → return ranked notes with snippets and scores.
- **Surface:** unified search UI + command palette + "Related notes"
  (see [DESIGN.md](./DESIGN.md)). Endpoints in [API.md](./API.md).

## Deployment Architecture ✅

| Service | Platform | Notes |
|---------|----------|-------|
| Web frontend | Vercel | Static + PWA; `/api/*` rewrite to backend |
| Backend API | Render | Docker image; `/health` healthcheck; `https://jotit-api.onrender.com` |
| AI service | Render | Docker (FastAPI + Tesseract) |
| Database | Neon | Managed PostgreSQL; `DATABASE_URL` |
| Mobile | Expo / EAS | Android + iOS builds |

Legacy `railway.toml` files remain in the tree from the pre-Render
deployment and are no longer authoritative.

## Scalability Considerations

- **Stateless backend** (JWT auth, no server session) → horizontally
  scalable behind a load balancer.
- **Independent services** scale on their own resource profiles (the AI
  service is CPU/memory-heavier due to image processing).
- **Database:** Neon scales storage/compute; V2 vector search needs an
  ANN index and careful pagination to stay fast.
- **Known v1 limits:** keyword search is a sequential `LIKE`-style scan
  (no index); base64 image data stored inline in `notes` bloats rows.
  Both are addressed by V2 (indexed/semantic search; external/object
  image storage — see [DATABASE.md](./Database.md)).
- **Cold starts:** mitigated by the backend keepalive ping to the AI
  service.

## Security Considerations

- HTTPS everywhere; JWT bearer auth; bcrypt password storage; strict
  per-user data scoping on every query; configurable CORS allow-list
  (`ALLOWED_ORIGINS`).
- **Secrets** via environment variables only; no credentials in the repo
  (the local GCP service-account key is gitignored and untracked).
- **Known hardening items for V2 🔭:** remove the redundant client-side
  SHA-256 pre-hash; add refresh tokens + shorter access-token lifetime;
  rate-limit `/auth/*`; enforce a password policy; tighten the AI
  service CORS (currently `*`). Tracked as security requirements in
  [SRS.md](./SRS.md).

## Technology Decisions

Rationale, alternatives, and tradeoffs for every major choice
(ASP.NET Core, FastAPI, PostgreSQL, Neon, Render, Vercel, Azure OCR,
Groq, Vanilla JS, React Native/Expo) are recorded in
[DECISIONS.md](./DECISIONS.md).

## Future Architecture Evolution (V2)

1. **Frontend modularization** (vanilla ES modules) — maintainability
   foundation and prerequisite for AI UI. *(Milestone 1.)*
2. **Documentation as source of truth** — this docs set. *(Milestone 1.)*
3. **Embedding pipeline + pgvector** — the shared retrieval substrate.
4. **Semantic search**, then **RAG chat**, **related notes**,
   **flashcards/quizzes**, and **knowledge graph** — all consuming the
   same retrieval layer.
5. **Async AI processing**, **object storage for images**, and the
   **auth/security hardening** listed above.

The ordering is deliberate: infrastructure and retrieval before
features, so intelligence compounds instead of being rebuilt.
