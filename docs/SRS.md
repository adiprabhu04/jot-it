# Software Requirements Specification — Jot It

## 1. Introduction

### 1.1 Purpose
This document specifies the functional and non-functional requirements for **Jot It**, an AI-powered knowledge workspace for capturing, organizing, and interacting with notes, documents, and ideas.

### 1.2 Scope
Jot It allows users to create and organize notes, draw or scan handwritten content, extract text via OCR, generate AI summaries, and export their content — across web and mobile clients backed by a shared API.

### 1.3 Definitions
- **OCR** — Optical Character Recognition (Azure Computer Vision Read API).
- **JWT** — JSON Web Token, used for stateless authentication.
- **AI Service** — the Python FastAPI service that performs OCR and NLP.

## 2. Overall Description

### 2.1 Product Perspective
A multi-service application: a static web frontend and a React Native mobile app communicate with an ASP.NET Core backend, which persists data to PostgreSQL and delegates OCR to a FastAPI AI service.

### 2.2 User Classes
- **Authenticated user** — creates, manages, and exports their own notes.
- **Guest** — can view the public landing page only.

### 2.3 Assumptions and Dependencies
- A reachable PostgreSQL database (Neon).
- A provisioned Azure Computer Vision resource.
- Network connectivity between the backend and the AI service.

## 3. Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-1 | Users can register and authenticate using email and password. |
| FR-2 | Passwords are hashed (bcrypt); sessions use signed JWTs. |
| FR-3 | Users can create, read, update, and delete notes. |
| FR-4 | Users can categorize, color-code, pin, and search notes. |
| FR-5 | Hashtags are auto-extracted from note content. |
| FR-6 | Users can draw handwriting on a canvas and convert it to text via OCR. |
| FR-7 | Users can upload or capture images for OCR. |
| FR-8 | OCR results display per-line confidence indicators. |
| FR-9 | Users can generate AI summaries of note content. |
| FR-10 | Users can export notes as PDF or CSV. |
| FR-11 | Each note is scoped to its owning user at the database level. |

## 4. Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-1 | All client–server communication uses HTTPS. |
| NFR-2 | The frontend ships without a heavy framework for fast load times. |
| NFR-3 | The UI is responsive across desktop, tablet, and mobile. |
| NFR-4 | The UI supports dark and light modes and reduced-motion preferences. |
| NFR-5 | OCR image preprocessing is memory-efficient (Pillow-based). |
| NFR-6 | Note content is never used for model training and is not shared. |

## 5. External Interfaces
- **REST API** — JSON over HTTPS, JWT-authenticated. See [API.md](./API.md).
- **Azure Computer Vision** — invoked by the AI service for OCR.
- **Groq LLM** — invoked by the AI service for summarization (extractive fallback when unavailable).
- **PostgreSQL** — accessed by the backend via EF Core / Npgsql. See [Database.md](./Database.md).

------------------------------------------------------------------------

## 6. Planned Functional Requirements (Version 2)

> **Status:** every requirement in this section is 🔭 **Planned (V2)** —
> a target specification, not yet implemented. Each has a unique,
> stable identifier so it can be referenced from
> [ROADMAP.md](./Roadmap.md), [API.md](./API.md), and
> [DATABASE.md](./Database.md). Requirement IDs are never reused or
> renumbered once assigned.

### 6.1 Embeddings & Retrieval
| ID | Requirement |
|----|-------------|
| FR-12 | On note create/update, note content is chunked and embedded, and vectors are stored (pgvector), scoped to the owning user. |
| FR-13 | Users can trigger a re-index of their notes' embeddings (e.g., after an embedding-model change). |

### 6.2 Semantic Search
| ID | Requirement |
|----|-------------|
| FR-14 | Users can search notes by meaning (semantic search), receiving results ranked by relevance with content snippets. |
| FR-15 | Search results are strictly scoped to the requesting user's notes. |
| FR-16 | Users receive type-ahead search suggestions as they type. |
| FR-17 | Users can view "related notes" for any note, derived from embedding similarity. |

### 6.3 Retrieval-Augmented Generation (RAG)
| ID | Requirement |
|----|-------------|
| FR-18 | The system retrieves the most relevant note chunks for a query and uses them as grounding context for LLM answers. |
| FR-19 | RAG answers are grounded only in the user's notes; when no relevant context exists, the system states it cannot answer rather than fabricating one. |
| FR-20 | RAG answers cite the source notes used to produce them. |

### 6.4 Chat with Notes
| ID | Requirement |
|----|-------------|
| FR-21 | Users can hold multi-turn conversations grounded in their notes; conversations and messages are persisted per user. |
| FR-22 | Assistant responses stream to the client incrementally. |
| FR-23 | Users can create, list, view, and delete conversations. |

### 6.5 Voice Notes
| ID | Requirement |
|----|-------------|
| FR-24 | Users can capture audio and have it transcribed into editable text that can be saved as a note. |

### 6.6 Folders & Collections
| ID | Requirement |
|----|-------------|
| FR-25 | Users can create hierarchical folders and move notes between them. |
| FR-26 | Users can create collections (cross-cutting groups) and add/remove notes to/from them; a note may belong to multiple collections. |

### 6.7 Flashcards & Quizzes
| ID | Requirement |
|----|-------------|
| FR-27 | Users can generate flashcards from a note. |
| FR-28 | Flashcards support spaced-repetition review scheduling. |
| FR-29 | Users can generate a quiz (multiple-choice with answers/explanations) from a note or collection. |

### 6.8 Knowledge Graph
| ID | Requirement |
|----|-------------|
| FR-30 | The system maintains relationships between notes (AI-inferred and user-created) and exposes them for visualization. |
| FR-31 | Users can view the local neighborhood of connections around any single note. |

### 6.9 Command Palette
| ID | Requirement |
|----|-------------|
| FR-32 | A keyboard-accessible command palette (`Cmd/Ctrl+K`) provides fast navigation and actions. *(Base palette exists in v1; V2 extends it.)* |
| FR-33 | The command palette surfaces semantic search results and AI actions. |

### 6.10 Offline Sync
| ID | Requirement |
|----|-------------|
| FR-34 | Users can create and edit notes offline; changes sync to the backend automatically on reconnection. |
| FR-35 | Sync resolves conflicts deterministically without silent data loss. |

### 6.11 Version History
| ID | Requirement |
|----|-------------|
| FR-36 | The system retains prior versions of a note and lets users view and restore them. |

### 6.12 User Preferences & Settings
| ID | Requirement |
|----|-------------|
| FR-37 | Users can manage preferences (theme, default summary length, reduced motion, AI enablement), persisted server-side. |

### 6.13 Collaboration (Long-Term)
| ID | Requirement |
|----|-------------|
| FR-38 | (Long-term) Users can share notes and edit collaboratively in real time. Evaluated in a later phase; must not compromise the single-user calm experience. |

------------------------------------------------------------------------

## 7. Planned Non-Functional & Security Requirements (Version 2)

> All 🔭 **Planned (V2)**. IDs continue the NFR sequence.

| ID | Requirement |
|----|-------------|
| NFR-7 | Semantic search and RAG retrieval must return results within an acceptable interactive latency budget, using an ANN index for scalability. |
| NFR-8 | AI answers must not expose or leak other users' data; all retrieval is per-user filtered. |
| NFR-9 | Note content is never used for third-party model training (reaffirms NFR-6 for new AI features). |
| NFR-10 | The web frontend remains framework-free and statically deployable after modularization. |
| NFR-11 | The client-side password pre-hash is removed so web and mobile share one authentication contract (bcrypt server-side only). |
| NFR-12 | Authentication endpoints are rate-limited, access-token lifetimes are shortened with refresh tokens, and a password policy is enforced. |
| NFR-13 | The AI service restricts CORS to configured origins (no wildcard) in production. |
| NFR-14 | Image payloads are stored in object storage rather than inline in the database. |
| NFR-15 | AI features degrade gracefully (documented fallbacks) when an upstream model/provider is unavailable. |

Security context and rationale for NFR-11 – NFR-14 are described in
[ARCHITECTURE.md](./Architecture.md) (Security Considerations) and
[DECISIONS.md](./DECISIONS.md).
