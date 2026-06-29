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
- Deployed on Railway as a Docker container with a `/health` healthcheck.

### 3. AI Service — Python FastAPI
- Receives images from the backend.
- Preprocesses images (Pillow) and calls the Azure Computer Vision Read API.
- Returns extracted text and per-line confidence scores.
- Provides NLP summarization.
- Deployed on Railway.

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
