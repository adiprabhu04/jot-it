<div align="center">

# Jot It

### An AI-powered knowledge workspace for capturing, organizing, and interacting with notes, documents, and ideas.

[![Live](https://img.shields.io/badge/Live-usejotit.vercel.app-5B6EF5?style=for-the-badge)](https://usejotit.vercel.app)
[![License](https://img.shields.io/badge/License-MIT-22C55E?style=for-the-badge)](./LICENSE)

![ASP.NET Core](https://img.shields.io/badge/ASP.NET_Core-8.0-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)
![Python](https://img.shields.io/badge/Python-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Azure](https://img.shields.io/badge/Azure-Computer_Vision-0078D4?style=for-the-badge&logo=microsoftazure&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Railway](https://img.shields.io/badge/Backend-Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white)

[**Live App**](https://usejotit.vercel.app) · [**Repository**](https://github.com/adiprabhu04/jot-it) · [**Documentation**](./docs)

</div>

---

## Overview

**Jot It** is an AI-powered knowledge workspace that turns handwriting, documents, and scattered ideas into searchable, structured knowledge. Write or draw notes, scan handwritten pages, extract text with Azure Computer Vision OCR, and generate AI summaries — across web and mobile.

It is built as a modern multi-service product:

- **Web** — fast, framework-free frontend deployed on Vercel
- **Backend** — ASP.NET Core 8 Minimal API on Railway
- **AI Service** — Python FastAPI OCR/NLP service on Railway
- **Database** — PostgreSQL on Neon
- **Mobile** — React Native + Expo companion app

> **Live:** https://usejotit.vercel.app

---

## Features

### Notes & Organization
- Full CRUD note management with a rich text editor
- Categories, color coding, and note pinning
- Hashtag auto-extraction and real-time search
- Inline word suggestions

### AI & OCR
- Handwriting OCR powered by Azure Computer Vision
- Canvas handwriting recognition
- Camera / image OCR upload
- Confidence scoring pills for OCR results
- AI-generated summaries
- OCR feedback and analytics

### Export
- Export notes as PDF or CSV
- AI summaries included in exports

### Experience
- Dark and light mode
- Premium SaaS-inspired landing page (bento grids, sticky showcase, scroll reveals)
- Responsive desktop / tablet / mobile layouts
- Progressive Web App support
- Skeleton loaders and microinteractions

### Mobile
- React Native + Expo (SDK 54)
- Shared backend API with the web app
- Auth, OCR scanning, and notes management on Android and iOS

---

## Screenshots

> _Screenshots coming soon. Add images under [`screenshots/`](./screenshots) and reference them here._

| Landing | Notes Dashboard | OCR Canvas |
|---------|-----------------|------------|
| _placeholder_ | _placeholder_ | _placeholder_ |

---

## Architecture

Jot It runs as independently deployed services communicating over HTTPS.

```text
            ┌──────────────────────────┐
            │   Frontend (Web / PWA)   │
            │      Vercel · Vanilla JS  │
            └─────────────┬────────────┘
                          │ HTTPS (REST + JWT)
                          ▼
            ┌──────────────────────────┐
            │   ASP.NET Core Backend   │
            │      Railway · .NET 8     │
            └──────┬───────────────┬────┘
                   │               │
       Azure SDK   │               │  EF Core / Npgsql
          call     ▼               ▼
   ┌───────────────────┐   ┌──────────────────┐
   │    AI Service     │   │    PostgreSQL    │
   │  FastAPI · Python │   │       Neon        │
   └─────────┬─────────┘   └──────────────────┘
             │ REST
             ▼
   ┌───────────────────┐
   │  Azure Computer   │
   │  Vision Read API  │
   └───────────────────┘
```

**Flow:**

1. The **frontend** (and mobile app) send authenticated REST requests to the **ASP.NET Core backend**.
2. The backend handles auth (JWT), notes/tasks business logic, and persistence via **EF Core / Npgsql** to **PostgreSQL (Neon)**.
3. For OCR, the backend forwards images to the **AI Service**, which calls **Azure Computer Vision** and returns extracted text plus confidence data.
4. The backend stores results and returns structured responses to the client.

See [`docs/Architecture.md`](./docs/Architecture.md) for the detailed design.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Vanilla JS, HTML5, CSS3 | Lightweight static frontend / PWA |
| Backend | ASP.NET Core 8 Minimal API | REST API + business logic |
| Database | PostgreSQL on Neon | Persistent storage |
| AI / OCR | Python FastAPI + Azure Computer Vision | OCR + NLP processing |
| Mobile | React Native + Expo SDK 54 | Mobile companion app |
| Deployment | Vercel + Railway | Production hosting |

---

## Repository Structure

```text
jot-it/
├── frontend/      # Web app + landing page (Vanilla JS, deployed to Vercel)
├── backend/       # ASP.NET Core 8 Minimal API (NotesApi)
├── ai-service/    # Python FastAPI OCR/NLP service
├── mobile/        # React Native + Expo companion app
├── docs/          # Project documentation (SRS, Architecture, API, Database, Roadmap)
├── assets/        # Brand and shared assets
├── screenshots/   # Product screenshots for the README
└── README.md
```

---

## Installation

**Prerequisites**

- [.NET 8 SDK](https://dotnet.microsoft.com/download)
- [Python 3.11+](https://www.python.org/)
- [Node.js 18+](https://nodejs.org/) (for the mobile app)
- A PostgreSQL database (e.g. [Neon](https://neon.tech))
- An [Azure Computer Vision](https://azure.microsoft.com/products/ai-services/ai-vision) resource

```bash
git clone https://github.com/adiprabhu04/jot-it.git
cd jot-it
```

---

## Local Development

### Backend

```bash
cd backend/NotesApi
dotnet run
```

### AI Service

```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend

The frontend is static. Serve `frontend/` with any static server, or open `frontend/index.html` directly. In production it is deployed to Vercel and proxies API calls to the backend via `/api`.

### Mobile App

```bash
cd mobile
npm install
npx expo start
```

---

## Environment Variables

### Backend (`backend/NotesApi`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET_KEY` | JWT signing secret |
| `AI_SERVICE_URL` | OCR service base URL |
| `ALLOWED_ORIGINS` | Comma-separated allowed frontend origins |

### AI Service (`ai-service`)

| Variable | Description |
|----------|-------------|
| `AZURE_VISION_KEY` | Azure Computer Vision API key |
| `AZURE_VISION_ENDPOINT` | Azure Computer Vision endpoint |

---

## Deployment

| Service | Platform |
|---------|----------|
| Frontend | Vercel (static + `/api` rewrite proxy to the backend) |
| Backend API | Railway (Docker, `/health` healthcheck) |
| AI Service | Railway |
| Database | Neon (PostgreSQL) |

The backend ships as a Docker image (`Dockerfile`) and is configured for Railway via `railway.toml`. The frontend's `vercel.json` rewrites `/api/*` to the backend to keep API calls same-origin.

---

## AI Pipeline

1. **Capture** — a user draws on the canvas or uploads/scans an image.
2. **Upload** — the client sends the image to the backend over an authenticated request.
3. **OCR** — the backend forwards the image to the FastAPI AI service, which preprocesses it (Pillow) and calls the **Azure Computer Vision Read API**.
4. **Extraction** — text and per-line confidence scores are returned and surfaced as confidence pills.
5. **Summarization** — extracted/written text can be summarized into a concise AI summary.
6. **Persistence** — results are stored in PostgreSQL, scoped to the user account.

---

## Roadmap

### Completed
- ✅ Authentication
- ✅ OCR (Azure Computer Vision)
- ✅ AI summaries
- ✅ Mobile application
- ✅ Export features (PDF / CSV)
- ✅ Responsive UI

### Planned
- ⬜ Semantic search
- ⬜ Retrieval-augmented generation (RAG)
- ⬜ Chat with notes
- ⬜ Flashcard generation
- ⬜ Voice notes
- ⬜ AI organization
- ⬜ Web clipper
- ⬜ Offline mode
- ⬜ Real-time collaboration
- ⬜ Custom themes

See [`docs/Roadmap.md`](./docs/Roadmap.md) for details.

---

## Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes
4. Push the branch and open a Pull Request

Please keep changes focused and document any new environment variables or endpoints.

---

## License

Released under the [MIT License](./LICENSE).

---

## Author

**Aditya Prabhudessai**

- GitHub: [@adiprabhu04](https://github.com/adiprabhu04)
- LinkedIn: [aditya-prabhudessai](https://www.linkedin.com/in/aditya-prabhudessai)

> Originally developed during an AI/ML internship and now actively maintained as an independent personal project.
