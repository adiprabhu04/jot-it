# Changelog — Jot It

All notable changes to Jot It are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/) conventions and
[Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`).

- **v1.x** documents what has **shipped**.
- **v2.0.0 (Unreleased)** documents **planned** changes; items move from
  "Planned" to a dated release entry as they ship.

Cross-refs: [ROADMAP.md](./Roadmap.md) (phase planning),
[DECISIONS.md](./DECISIONS.md) (why), [SRS.md](./SRS.md) (requirements).

------------------------------------------------------------------------

## [2.0.0] — Unreleased (Planned)

Version 2 turns Jot It from a notes app into an **AI-first knowledge
workspace** built on a shared embedding/retrieval foundation. Grouped by
roadmap phase; all items are 🔭 **planned** until released.

### Phase 1 — UI Modernization
- Modularize the web frontend into ES modules (vanilla JS, no framework).
- Extract design tokens into a dedicated stylesheet (identical values).
- Establish `/docs` as the single source of truth (this documentation
  overhaul: added `AI.md`, `DECISIONS.md`, `CHANGELOG.md`; expanded
  `VISION`, `DESIGN`, `ARCHITECTURE`, `DATABASE`, `API`, `ROADMAP`, `SRS`).

### Phase 2 — Knowledge Organization
- Folders (hierarchical) and Collections (cross-cutting).
- Improved categorization, tagging, and filtering.

### Phase 3 — AI Capabilities
- Embedding pipeline with pgvector (shared retrieval foundation).
- Semantic search + search suggestions + related notes.
- Chat with notes (RAG): streaming, source-cited, grounded answers.
- Asynchronous summarization (off the write path; failure-safe).

### Phase 4 — Productivity
- Flashcards and quiz generation.
- Voice notes with transcription.
- Knowledge graph visualization.
- Web clipper; command palette extended with AI actions.

### Phase 5 — Polish
- Offline mode with background sync; note version history.
- Custom themes and user-preference settings.
- Security hardening: remove client-side password pre-hash, add refresh
  tokens + rate limiting + password policy, tighten AI-service CORS.
- Object storage for images (replace inline base64).
- Performance, accessibility, and motion refinement.
- Real-time collaboration (evaluated as a longer-term item).

### Security (planned, tracked in SRS NFR-11–NFR-14)
- Unify web/mobile auth contract (bcrypt server-side only).
- Refresh tokens and shorter access-token lifetime.
- Rate limiting on authentication endpoints; password policy.
- Restrict AI-service CORS to configured origins.

------------------------------------------------------------------------

## [1.0.0] — Shipped

The current production release. See [ROADMAP.md](./Roadmap.md) "Shipped in
v1" for the feature baseline.

### Added
- Email/password authentication with bcrypt hashing and JWT sessions.
- Notes CRUD: create, read, update, delete; pin, categorize, color-code,
  tag, and keyword-search notes; hashtag auto-extraction.
- Handwriting/image OCR via Azure Computer Vision Read API (per-word
  confidence), with a Tesseract fallback; canvas drawing, upload, and
  camera capture; OCR review with inline correction and feedback/stats.
- AI summaries via Groq LLM with a frequency-based extractive fallback
  (short/medium/detailed lengths).
- Export notes as PDF and CSV.
- Responsive UI with dark/light modes and reduced-motion support;
  installable PWA with an offline app shell (service worker).
- React Native + Expo mobile companion app (Android/iOS) sharing the
  backend API.

### Infrastructure
- Backend: ASP.NET Core 8 Minimal API (EF Core / Npgsql), deployed on
  Render (Docker, `/health`).
- AI service: Python FastAPI, deployed on Render.
- Database: PostgreSQL on Neon.
- Web frontend: static / PWA on Vercel with an `/api/*` proxy to the
  backend.

### Changed (post-1.0 operational)
- Migrated backend and AI service hosting from Railway to Render
  (see [DECISIONS.md](./DECISIONS.md) D-4).

------------------------------------------------------------------------

## Versioning policy
- **MAJOR** — significant product shifts (e.g., v1 notes app → v2 AI
  knowledge workspace).
- **MINOR** — backward-compatible feature additions (e.g., a roadmap
  phase's features shipping).
- **PATCH** — fixes and small improvements with no new feature surface.
