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
