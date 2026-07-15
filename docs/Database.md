# Database — Jot It

Jot It uses **PostgreSQL** (hosted on Neon) accessed by the backend through **EF Core / Npgsql**. The schema below reflects the entities in `backend/NotesApi/Models`.

## Entity Overview

```text
User 1───∞ Note
User 1───∞ OcrFeedback
```

Every `Note` and `OcrFeedback` is scoped to a `User` via `UserId`.

## Tables

### users

| Column | Type | Notes |
|--------|------|-------|
| `Id` | `Guid` | Primary key |
| `Name` | `string` | Display name |
| `Email` | `string` | Unique login identifier |
| `PasswordHash` | `string` | bcrypt hash — never plain text |
| `CreatedAt` | `DateTime` | Account creation timestamp |

### notes

| Column | Type | Notes |
|--------|------|-------|
| `Id` | `Guid` | Primary key |
| `Title` | `string` | Note title |
| `Content` | `string` | Note body |
| `Category` | `string` | Defaults to `"General"` |
| `IsPinned` | `bool` | Pin state, default `false` |
| `ImageData` | `string?` | Optional source/scanned image data |
| `Summary` | `string?` | AI-generated summary |
| `Color` | `string?` | Color label |
| `Tags` | `string?` | Hashtags / tags |
| `ReminderAt` | `DateTime?` | Optional reminder time |
| `CreatedAt` | `DateTime` | Defaults to UTC now |
| `UpdatedAt` | `DateTime` | Defaults to UTC now |
| `UserId` | `Guid` | Foreign key → `users.Id` |

### ocr_feedbacks

| Column | Type | Notes |
|--------|------|-------|
| `Id` | `Guid` | Primary key |
| `UserId` | `Guid` | Foreign key → `users.Id` |
| `ExtractedText` | `string` | Text returned by OCR |
| `Engine` | `string` | OCR engine identifier |
| `Confidence` | `float?` | OCR confidence score |
| `IsAccurate` | `bool` | Whether the user marked it accurate |
| `CorrectedText` | `string?` | User-supplied correction |
| `CreatedAt` | `DateTime` | Defaults to UTC now |

## Access & Integrity
- The backend is the only service that connects to the database.
- All read/write queries filter by the authenticated `UserId`, enforcing per-user isolation.
- Connection details are supplied via the `DATABASE_URL` environment variable.

## Migrations
Schema changes are managed through EF Core. Generate and apply migrations from `backend/NotesApi`:

```bash
dotnet ef migrations add <Name>
dotnet ef database update
```

In the current deployment, pending migrations are also applied
automatically on backend startup (`db.Database.Migrate()`).

------------------------------------------------------------------------

# Planned Schema — Version 2

> **Status legend:** ✅ Implemented (v1, above) · 🔭 Planned (V2, below).
> Everything in this section is a **forward-looking design**. None of
> these tables exist in `backend/NotesApi/Models` yet. Column lists are
> intentional but not final — treat them as the target contract to
> refine when the corresponding [ROADMAP.md](./Roadmap.md) phase begins.
> Cross-references: [ARCHITECTURE.md](./Architecture.md) (RAG/search
> flow), [AI.md](./AI.md) (embeddings), [API.md](./API.md) (endpoints).

## Design notes for V2

- **pgvector 🔭** — a PostgreSQL extension enabling a `vector` column
  type and approximate-nearest-neighbor indexes. It is the storage
  backbone for embeddings and semantic search.
- **Image storage 🔭** — `notes.ImageData` currently stores image bytes
  inline (base64 text), which bloats rows. V2 moves image payloads to
  object storage and keeps only a URL/reference in the row.
- **Naming** — v1 uses PascalCase EF property names mapped to tables like
  `notes`, `users`, `ocr_feedbacks`. New entities follow the same
  convention.

## Planned Entity Overview 🔭

```text
User 1───∞ Folder            Folder 1───∞ Note (optional)
User 1───∞ Collection        Collection ∞───∞ Note (via CollectionNote)
Note 1───∞ Embedding
User 1───∞ Conversation      Conversation 1───∞ Message
Note 1───∞ Flashcard         Note/Collection 1───∞ Quiz 1───∞ QuizQuestion
User 1───1 UserPreferences
Note ∞───∞ Note (via NoteRelationship — knowledge graph edges)
```

Every planned entity remains **user-scoped** via a `UserId` foreign key,
enforcing the same per-user isolation as v1.

## Planned Tables 🔭

### folders 🔭 (Planned — V2)
Hierarchical organization of notes.

| Column | Type | Notes |
|--------|------|-------|
| `Id` | `Guid` | Primary key |
| `UserId` | `Guid` | FK → `users.Id` |
| `Name` | `string` | Folder name |
| `ParentId` | `Guid?` | Self-FK for nesting; null = root |
| `Color` | `string?` | Optional color label |
| `SortOrder` | `int` | Manual ordering |
| `CreatedAt` / `UpdatedAt` | `DateTime` | Timestamps |

A note may reference an optional `FolderId` (nullable) when this ships.

### collections 🔭 (Planned — V2)
Cross-cutting, non-hierarchical groupings (a note can belong to many).

| Column | Type | Notes |
|--------|------|-------|
| `Id` | `Guid` | Primary key |
| `UserId` | `Guid` | FK → `users.Id` |
| `Name` | `string` | Collection name |
| `Description` | `string?` | Optional |
| `IsSmart` | `bool` | If true, membership is rule/AI-driven |
| `CreatedAt` / `UpdatedAt` | `DateTime` | Timestamps |

### collection_notes 🔭 (Planned — V2)
Join table for the many-to-many between collections and notes.

| Column | Type | Notes |
|--------|------|-------|
| `CollectionId` | `Guid` | FK → `collections.Id` |
| `NoteId` | `Guid` | FK → `notes.Id` |
| `AddedAt` | `DateTime` | Timestamp |

### embeddings 🔭 (Planned — V2)
Vector representations of note chunks — the retrieval substrate for
semantic search, RAG, related notes, flashcards, and the knowledge graph.

| Column | Type | Notes |
|--------|------|-------|
| `Id` | `Guid` | Primary key |
| `UserId` | `Guid` | FK → `users.Id` (scoping + filtered ANN) |
| `NoteId` | `Guid` | FK → `notes.Id` |
| `ChunkIndex` | `int` | Position of the chunk within the note |
| `Content` | `string` | The chunk text (for grounding/snippets) |
| `Vector` | `vector(384)` | pgvector embedding (384-dim = bge-small) |
| `Model` | `string` | Embedding model id (provenance) |
| `TokenCount` | `int?` | Optional, for cost/telemetry |
| `ContentHash` | `string` | Chunk-level hash for dedupe / skip |
| `CreatedAt` | `DateTime` | Timestamp |

An **HNSW** index (`vector_cosine_ops`) is added on `Vector`. The
embedding model is **`BAAI/bge-small-en-v1.5`, self-hosted, 384-dim** —
see [DECISIONS.md](./DECISIONS.md) D-11 and the full design in
[KNOWLEDGE_ENGINE.md](./KNOWLEDGE_ENGINE.md).

### conversations 🔭 (Planned — V2)
A chat session for "Chat with notes" (RAG).

| Column | Type | Notes |
|--------|------|-------|
| `Id` | `Guid` | Primary key |
| `UserId` | `Guid` | FK → `users.Id` |
| `Title` | `string?` | Auto-generated from first message |
| `CreatedAt` / `UpdatedAt` | `DateTime` | Timestamps |

### messages 🔭 (Planned — V2)
Individual turns within a conversation, with grounding provenance.

| Column | Type | Notes |
|--------|------|-------|
| `Id` | `Guid` | Primary key |
| `ConversationId` | `Guid` | FK → `conversations.Id` |
| `Role` | `string` | `user` \| `assistant` \| `system` |
| `Content` | `string` | Message text |
| `SourceNoteIds` | `string?` | JSON array of note ids used as sources |
| `CreatedAt` | `DateTime` | Timestamp |

### flashcards 🔭 (Planned — V2)
Study cards generated from a note.

| Column | Type | Notes |
|--------|------|-------|
| `Id` | `Guid` | Primary key |
| `UserId` | `Guid` | FK → `users.Id` |
| `NoteId` | `Guid` | FK → `notes.Id` (source) |
| `Front` | `string` | Question / prompt |
| `Back` | `string` | Answer |
| `EaseFactor` / `IntervalDays` / `DueAt` | `double`/`int`/`DateTime?` | Optional spaced-repetition fields |
| `CreatedAt` | `DateTime` | Timestamp |

### quizzes 🔭 (Planned — V2)
A generated quiz over one or more notes/collections.

| Column | Type | Notes |
|--------|------|-------|
| `Id` | `Guid` | Primary key |
| `UserId` | `Guid` | FK → `users.Id` |
| `SourceType` | `string` | `note` \| `collection` |
| `SourceId` | `Guid` | Source note/collection id |
| `Title` | `string` | Quiz title |
| `CreatedAt` | `DateTime` | Timestamp |

### quiz_questions 🔭 (Planned — V2)

| Column | Type | Notes |
|--------|------|-------|
| `Id` | `Guid` | Primary key |
| `QuizId` | `Guid` | FK → `quizzes.Id` |
| `Question` | `string` | Prompt |
| `Options` | `string` | JSON array of choices |
| `CorrectIndex` | `int` | Index of the correct option |
| `Explanation` | `string?` | Optional rationale |

### user_preferences 🔭 (Planned — V2)
Per-user settings (theme, defaults, AI preferences).

| Column | Type | Notes |
|--------|------|-------|
| `UserId` | `Guid` | PK / FK → `users.Id` (1:1) |
| `Theme` | `string` | `system` \| `dark` \| `light` |
| `DefaultSummaryLength` | `string` | `short` \| `medium` \| `detailed` |
| `ReducedMotion` | `bool` | Accessibility preference |
| `AiEnabled` | `bool` | Master switch for AI features |
| `UpdatedAt` | `DateTime` | Timestamp |

### search_index 🔭 (Planned — V2)
Full-text search support (keyword layer complementing vector search).

| Column | Type | Notes |
|--------|------|-------|
| `NoteId` | `Guid` | FK → `notes.Id` |
| `UserId` | `Guid` | FK → `users.Id` |
| `SearchVector` | `tsvector` | PostgreSQL full-text index |
| `UpdatedAt` | `DateTime` | Timestamp |

May be implemented as a generated `tsvector` column on `notes` rather
than a separate table — decided at implementation time. Enables hybrid
(keyword + semantic) ranking.

### note_relationships 🔭 (Planned — V2)
Edges of the **knowledge graph** — connections between notes, whether
AI-inferred (from embedding similarity) or user-created.

| Column | Type | Notes |
|--------|------|-------|
| `Id` | `Guid` | Primary key |
| `UserId` | `Guid` | FK → `users.Id` |
| `SourceNoteId` | `Guid` | FK → `notes.Id` |
| `TargetNoteId` | `Guid` | FK → `notes.Id` |
| `RelationType` | `string` | `related` \| `references` \| `derived` \| `manual` |
| `Weight` | `double` | Similarity/strength score |
| `Origin` | `string` | `ai` \| `user` |
| `CreatedAt` | `DateTime` | Timestamp |

## Planned modifications to existing tables 🔭

- **notes** — add nullable `FolderId` (FK → `folders.Id`); migrate
  `ImageData` to an object-storage reference (`ImageUrl`) instead of
  inline base64; add a generated full-text `SearchVector` (see above).
- **notes (embedding control)** — add `ContentHash`, `EmbeddingStatus`
  (`pending`/`processing`/`ready`/`failed`), `EmbeddedAt`, and
  `EmbeddingModel` to drive async, dirty-checked embedding ingestion.
  See [KNOWLEDGE_ENGINE.md](./KNOWLEDGE_ENGINE.md) §3.

None of these modifications are applied yet; they are recorded here so
future work stays consistent with this schema.
