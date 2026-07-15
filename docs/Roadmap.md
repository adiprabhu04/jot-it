# Roadmap — Jot It

The roadmap tracks where Jot It is and where it's going. It is a living
document and priorities may shift. It is organized around **milestones**,
not a flat feature list: each V2 phase has explicit goals, features,
dependencies, and success criteria so that any contributor — human or AI
— can pick up a phase and know exactly what "done" means.

**Status legend:** ✅ Shipped (v1) · 🔭 Planned (V2). Cross-references:
[VISION.md](./VISION.md) (why), [ARCHITECTURE.md](./Architecture.md)
(how), [AI.md](./AI.md) (AI internals), [SRS.md](./SRS.md) (requirements),
[CHANGELOG.md](./CHANGELOG.md) (version history).

------------------------------------------------------------------------

## ✅ Shipped in v1 (baseline)

| Feature | Description |
|---------|-------------|
| Authentication | Email/password auth with bcrypt hashing and JWT sessions. |
| OCR | Handwriting and image OCR via Azure Computer Vision (Tesseract fallback). |
| AI summaries | Concise summaries of note content (Groq LLM, extractive fallback). |
| Notes CRUD | Create, edit, delete, pin, categorize, color-code, tag, search. |
| Mobile application | React Native + Expo companion app (Android/iOS). |
| Export features | Export notes as PDF and CSV. |
| Responsive UI + PWA | Dark/light modes across desktop, tablet, and mobile; installable PWA. |

V1 is the foundation. V2 does not discard it — it modularizes the
frontend, adds a shared AI retrieval layer, and builds knowledge
features on top.

------------------------------------------------------------------------

## The V2 arc at a glance

V2 is sequenced so infrastructure precedes features and intelligence
compounds instead of being rebuilt:

1. **Phase 1 — UI Modernization** (foundation + docs)
2. **Phase 2 — Knowledge Organization**
3. **Phase 3 — AI Capabilities** (the embedding pipeline and everything it powers)
4. **Phase 4 — Productivity**
5. **Phase 5 — Polish**

> **Guiding sequencing decision:** the frontend modularization and this
> documentation update (Phase 1) come **before** semantic search. The
> embedding pipeline introduced in Phase 3 is designed **once** as the
> shared foundation for AI Chat, Related Notes, Flashcards, Quizzes, and
> the Knowledge Graph — so it never has to be redesigned later.

------------------------------------------------------------------------

## 🔭 V2 Phase 1 — UI Modernization

**Goals**
- Make the frontend maintainable and extensible without changing its
  external behavior or lightweight, framework-free nature.
- Establish this documentation set as the project's single source of truth.

**Features / work items**
- Split the monolithic `frontend/index.html` into ES modules (`state`,
  `api`, `auth`, `router`, `notes`, `ocr`, `summarize`, `commands`,
  `ui/*`) — vanilla JS, **no framework** (see [DECISIONS.md](./DECISIONS.md)).
- Extract design tokens into a dedicated stylesheet with **identical
  values** (see [DESIGN.md](./DESIGN.md)).
- Refresh and align all `/docs` (this effort).
- Optional prod bundling/minification only if measurably beneficial; dev
  stays no-build.

**Dependencies**
- None (foundational). Must land first because later AI UI surfaces plug
  into the modular structure.

**Success criteria**
- Behavior parity with the current app (no user-facing regressions).
- Token values unchanged; both themes verified.
- Documentation internally consistent and cross-referenced.

------------------------------------------------------------------------

## 🔭 V2 Phase 2 — Knowledge Organization

**Goals**
- Give users intelligent structure without manual folder-wrangling
  overhead — organization that respects the "organize intelligently"
  principle.

**Features / work items**
- **Folders** (hierarchical) and **Collections** (cross-cutting groups).
- Improved categorization and tag management.
- Note reordering and richer filtering.
- Data model additions per [DATABASE.md](./Database.md) (`folders`,
  `collections`, `collection_notes`).

**Dependencies**
- Phase 1 (modular frontend to host the new navigation/organization UI).

**Success criteria**
- Users can organize notes into folders and collections and navigate them
  fluidly on all breakpoints.
- No degradation to capture speed or perceived simplicity.

------------------------------------------------------------------------

## 🔭 V2 Phase 3 — AI Capabilities

**Goals**
- Build the **embedding pipeline** as the shared retrieval substrate, then
  ship the intelligence features that consume it.

**Features / work items**
- **Embedding pipeline** — chunk + embed notes on create/update; store
  vectors in **pgvector** (see [AI.md](./AI.md), [DATABASE.md](./Database.md)).
- **Semantic search** — meaning-based retrieval + search suggestions.
- **Chat with notes (RAG)** — streaming, source-cited answers grounded
  strictly in the user's notes.
- **Related notes** — automatic surfacing of connected ideas.
- **Async summarization** — move summary generation off the write path;
  never overwrite a good summary on failure.
- Endpoints per [API.md](./API.md) (`/search/*`, `/chat/*`, `/embeddings/*`).

**Dependencies**
- Phase 1 (UI surfaces: search, chat panel, related notes).
- pgvector enabled on Neon; embedding model = **bge-small self-hosted,
  384-dim** (see [DECISIONS.md](./DECISIONS.md) D-11 and the design in
  [KNOWLEDGE_ENGINE.md](./KNOWLEDGE_ENGINE.md)).

**Success criteria**
- Semantic search returns relevant results ranked by meaning, per-user
  scoped, within acceptable latency.
- Chat answers are grounded and cite their source notes; it refuses to
  answer when no relevant notes exist (no hallucination).
- Related notes appear on note view.
- The retrieval layer is reused by search, chat, and related notes with
  no per-feature re-architecture.

------------------------------------------------------------------------

## 🔭 V2 Phase 4 — Productivity

**Goals**
- Turn stored knowledge into active tools for learning and capture.

**Features / work items**
- **Flashcards** and **Quiz generation** from notes/collections
  (consume the Phase 3 retrieval layer).
- **Voice notes** — capture + transcription.
- **Knowledge graph** — visualize relationships between notes
  (edges from embedding similarity + manual links).
- **Web clipper** — save web content into Jot It.
- Command palette extended with AI actions.

**Dependencies**
- Phase 3 (embeddings/retrieval underpin flashcards, quizzes, graph).

**Success criteria**
- Users can generate study material and quizzes from their own notes.
- Voice capture produces editable, saveable notes.
- The knowledge graph renders a navigable map of the user's notes.

------------------------------------------------------------------------

## 🔭 V2 Phase 5 — Polish

**Goals**
- Harden, refine, and make the whole experience feel premium and reliable.

**Features / work items**
- **Offline mode** — local-first editing with background sync.
- **Version history** for notes.
- **Custom themes** and appearance settings (backed by user preferences).
- **Security hardening** — remove client-side password pre-hash, refresh
  tokens, rate limiting, password policy, tighter AI-service CORS
  (see [SRS.md](./SRS.md) security requirements).
- **Object storage for images** (replace inline base64).
- Performance passes, accessibility audit, motion refinement.
- **Real-time collaboration** — evaluated here as a longer-term item.

**Dependencies**
- Phases 1–4 (polish assumes the feature surface is in place).

**Success criteria**
- App is usable offline and syncs cleanly on reconnect.
- Security items closed; no known auth/CORS gaps.
- Accessibility and performance targets met across breakpoints.

------------------------------------------------------------------------

## Guiding Principles
- Performance and a polished, restrained UI come first.
- AI features should be genuinely useful, not decorative, and always
  grounded in the user's own knowledge.
- The web app stays lightweight and framework-free.
- Infrastructure before features: the retrieval layer is built once and
  reused everywhere.
- Every feature must satisfy at least one product goal in
  [VISION.md](./VISION.md) and must not drift into a
  [Non Goal](./VISION.md).
