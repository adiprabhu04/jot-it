# API Reference — Jot It

The backend exposes a JSON REST API over HTTPS. All endpoints (except auth and health) require a valid JWT.

## Base URL

In production, the web frontend calls the backend through a same-origin proxy:

```
/api/*  →  backend
```

Mobile clients call the backend base URL directly.

## Authentication

Send the token on protected requests:

```http
Authorization: Bearer <jwt>
```

Tokens are issued at login/registration and are signed with `JWT_SECRET_KEY`.

## Endpoints

### Health

| Method | Path | Description |
|--------|------|-------------|
| `GET`/`HEAD` | `/health` | Liveness probe (used by the platform healthcheck). |

### Auth

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/register` | Register a new user. Returns a JWT. |
| `POST` | `/auth/login` | Authenticate and receive a JWT. |
| `GET` | `/auth/me` | Return the current authenticated user. |

**Register / Login request**

```json
{
  "email": "user@example.com",
  "password": "••••••••"
}
```

### Notes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/notes` | List the current user's notes. |
| `GET` | `/notes/{id}` | Get a single note. |
| `POST` | `/notes` | Create a note. |
| `PUT` | `/notes/{id}` | Update a note. |
| `PUT` | `/notes/{id}/pin` | Toggle the pinned state of a note. |
| `DELETE` | `/notes/{id}` | Delete a note. |

**Note payload (shape)**

```json
{
  "title": "string",
  "content": "string",
  "category": "string",
  "color": "string",
  "pinned": false
}
```

### OCR & AI

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/notes/scan` | Upload an image; returns extracted text + confidence data. |
| `POST` | `/notes/summarize` | Generate an AI summary of supplied text. |
| `POST` | `/ocr/feedback` | Submit feedback on an OCR result. |
| `GET` | `/ocr/stats` | Retrieve aggregated OCR accuracy/feedback stats. |

## Errors

The API returns standard HTTP status codes:

| Code | Meaning |
|------|---------|
| `400` | Invalid request payload |
| `401` | Missing or invalid token |
| `403` | Authenticated but not authorized for the resource |
| `404` | Resource not found |
| `500` | Server error |

## Notes
- All note operations are scoped to the authenticated user.
- This reference documents the public surface; request/response details follow the implementations in `backend/NotesApi/Program.cs`.
- `POST /auth/register` additionally requires a `name` field, and
  `POST /auth/login` returns `{ token, name, user }`. Tokens are valid
  for 7 days. *(A client-side password pre-hash exists on web today and
  is slated for removal in V2 — see [ARCHITECTURE.md](./Architecture.md)
  authentication flow.)*

------------------------------------------------------------------------

# Planned Endpoints — Version 2

> **Status legend:** the endpoints above are ✅ Implemented (v1). Every
> endpoint below is 🔭 **Planned (V2)** — a target contract, not yet
> built. Paths, payloads, and names may be refined when the relevant
> [ROADMAP.md](./Roadmap.md) phase begins. These are intentionally
> consistent with [ARCHITECTURE.md](./Architecture.md),
> [DATABASE.md](./Database.md), [AI.md](./AI.md), and the
> [Knowledge Engine design](./KNOWLEDGE_ENGINE.md); do not add
> implementation details that contradict those documents. The
> `/search/*`, `/chat/*`, and `/embeddings/*` endpoints below are all
> consumers of the one retrieval substrate described there.

All planned endpoints are JWT-authenticated and user-scoped, following
the same conventions as v1.

## Semantic Search 🔭

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/search/semantic` | Meaning-based search over the user's notes. Body: `{ query, topK?, filters? }`. Returns ranked notes with snippets + scores. |
| `GET` | `/search/suggestions?q=` | Type-ahead search suggestions. |
| `GET` | `/notes/{id}/related` | Related notes for a given note (embedding similarity). |

## Chat (RAG) 🔭

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/chat/conversations` | Start a conversation. |
| `GET` | `/chat/conversations` | List the user's conversations. |
| `GET` | `/chat/conversations/{id}` | Get a conversation with messages. |
| `POST` | `/chat/conversations/{id}/messages` | Send a message; response **streams** and includes source note citations. Answers are grounded only in the user's notes. |
| `DELETE` | `/chat/conversations/{id}` | Delete a conversation. |

## Embeddings 🔭

Embeddings are generated internally on note create/update (not a public
CRUD surface). Operational endpoints only:

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/embeddings/reindex` | Re-embed the user's notes (e.g., after a model change). Async job. |
| `GET` | `/embeddings/status` | Reindex/embedding coverage status for the user. |

## Voice Notes 🔭

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/notes/voice` | Upload audio; returns a transcription (and optional summary) that can be saved as a note. |

## Folders 🔭

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/folders` | List folders (tree). |
| `POST` | `/folders` | Create a folder. |
| `PUT` | `/folders/{id}` | Rename / recolor / move a folder. |
| `DELETE` | `/folders/{id}` | Delete a folder. |
| `PUT` | `/notes/{id}/folder` | Move a note into a folder. |

## Collections 🔭

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/collections` | List collections. |
| `POST` | `/collections` | Create a collection. |
| `PUT` | `/collections/{id}` | Update a collection. |
| `DELETE` | `/collections/{id}` | Delete a collection. |
| `POST` | `/collections/{id}/notes` | Add a note to a collection. |
| `DELETE` | `/collections/{id}/notes/{noteId}` | Remove a note from a collection. |

## Flashcards 🔭

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/notes/{id}/flashcards` | Generate flashcards from a note. |
| `GET` | `/flashcards` | List the user's flashcards (supports due-for-review filtering). |
| `PUT` | `/flashcards/{id}/review` | Record a spaced-repetition review result. |
| `DELETE` | `/flashcards/{id}` | Delete a flashcard. |

## Quiz Generation 🔭

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/quizzes` | Generate a quiz from a note or collection. Body: `{ sourceType, sourceId, questionCount? }`. |
| `GET` | `/quizzes/{id}` | Get a quiz with questions. |

## Knowledge Graph 🔭

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/graph` | Return graph nodes (notes) and edges (relationships) for visualization. |
| `GET` | `/notes/{id}/graph` | Return the local neighborhood around one note. |

## Settings 🔭

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/settings` | Get the user's preferences. |
| `PUT` | `/settings` | Update preferences (theme, default summary length, AI toggles, reduced motion). |

## Planned response conventions 🔭

- **Streaming** (chat): server-sent events / chunked responses;
  each answer carries the note ids used as sources.
- **Pagination**: list endpoints follow the existing `page` / `pageSize`
  convention used by `GET /notes`.
- **Errors**: same HTTP status-code semantics as the table above.
