# Jot It — AI-Powered Notes App

![Live](https://img.shields.io/badge/Live-persistent--ai--ml--internship.vercel.app-5B6EF5?style=for-the-badge)
![ASP.NET Core](https://img.shields.io/badge/ASP.NET_Core-8.0-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)
![Python](https://img.shields.io/badge/Python-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Azure](https://img.shields.io/badge/Azure-Computer_Vision-0078D4?style=for-the-badge&logo=microsoftazure&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Railway](https://img.shields.io/badge/Backend-Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white)

---

Jot It is a note-taking app with handwriting OCR. Users write notes with a rich text editor, draw on a canvas or upload a photo to extract text via Azure Computer Vision, and get a short AI-generated summary on every save. The project runs as three separate services: a Vanilla JS frontend on Vercel, an ASP.NET Core 8 API on Railway, and a Python FastAPI OCR service on Railway.

---

## Live URLs

| Service | URL |
|---------|-----|
| Frontend | https://persistent-ai-ml-internship.vercel.app |
| Backend API | https://persistent-ai-ml-internship-production.up.railway.app |
| AI Service | https://imaginative-cat-production-43f6.up.railway.app |
| Repository | https://github.com/adiprabhu04/persistent-ai-ml-internship |

---

## Screenshots

> Screenshots will be added after the live deployment is fully stable. Planned captures: note list, note editor, OCR canvas, confidence chip results, dark mode, mobile app.

---

## Features

### Core Notes

- Full CRUD with rich text editor (bold, italic, underline, ordered and unordered lists, headings)
- 6 note templates
- Categories (General, Personal, Work, Ideas) with color coding across 8 colors
- Hashtag auto-extraction from content with filter; real-time search across titles and content
- Note pinning; inline word suggestions while typing

### AI Features

- Handwriting OCR via Azure Computer Vision Read API
- Draw handwriting on canvas (pen icon) or capture/upload a photo (camera icon) for OCR processing
- Per-word confidence scoring displayed as color-coded pills (green / orange / red)
- AI-generated summary on every save using TF-scoring (approximately 50 words)
- OCR accuracy feedback (thumbs up / down) and stats dashboard

### Export and Data

- Export all notes as a single PDF or CSV
- Export individual note as PDF or CSV
- AI summary included in PDF export

### UI / UX

- Dark and light mode with OS auto-detection, persisted across sessions
- Inter font, indigo (`#5B6EF5`) design system throughout
- PWA installable from the browser on desktop and mobile
- Fully responsive; skeleton loaders, confetti on note creation, staggered list animations
- Landing page for first-time visitors; About page with social links

### Mobile App

- React Native + Expo SDK 54
- Screens: Auth, Home, Scan, NewNote, EditNote, Settings
- Wired to the same backend API as the web frontend
- EAS Build configuration for standalone iOS and Android binaries

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Vanilla JS, HTML5, CSS3 | Single-file PWA, no build step |
| Backend | ASP.NET Core 8 Minimal API | REST API, auth, business logic |
| Database | PostgreSQL on Neon | Persistent storage via EF Core |
| AI / OCR | Python FastAPI + Azure Computer Vision | Handwriting recognition |
| Mobile | React Native + Expo SDK 54 | iOS and Android companion app |
| Deployment | Vercel (frontend) + Render (backend + AI) | Production hosting |

---

## Architecture

Jot It runs as three independently deployed services communicating over HTTPS. The frontend is served statically from Vercel and calls the backend API directly. The backend proxies OCR requests to the Python service and owns all database access.

```
Browser / Mobile App
        |
        | HTTPS
        v
+------------------------+        +------------------------+
|  ASP.NET Core 8        |  HTTP  |  Python FastAPI        |
|  Backend API           +------->+  OCR Service           |
|  Render                |        |  Render                |
+----------+-------------+        +-----------+------------+
           |                                  |
           | EF Core / Npgsql                 | Azure SDK
           v                                  v
+------------------------+        +------------------------+
|  PostgreSQL            |        |  Azure Computer        |
|  Neon                  |        |  Vision Read API       |
+------------------------+        +------------------------+

Frontend (Vercel) served statically — communicates directly with Backend API.
```

---

## Technical Decisions

- Minimal API (ASP.NET Core 8) over MVC — smaller surface area, no controller overhead for a REST-only service.
- Vanilla JS frontend — no build step, deploys as static files to Vercel, loads without a bundle.
- Azure Computer Vision over Google Vision — free credits via Azure for Students, no billing account or credit card required.
- TF-scoring for summaries instead of a hosted LLM — runs in-process on the AI service, no API cost per note save.

---

## Challenges and Solutions

**1. inotify crash on Render**
ASP.NET Core file watching exhausted inotify handles on the free-tier container. Fixed by setting `reloadOnChange: false` in `appsettings.json`.

**2. Google Vision billing**
Google Cloud Vision required a billing account even at low usage. Switched to Azure Computer Vision for Azure Students, which provides free credits with no credit card.

**3. Canvas OCR returning empty results**
The `toBlob()` call was executing before the composite drawing operations completed. Fixed by ensuring the image and drawing layers were fully composited before the blob was captured.

**4. Memory OOM on Render free tier**
Image preprocessing with scipy was pushing the AI service over the 512 MB memory limit. Removed scipy, replaced with Pillow-only processing, and capped image upscaling.

**5. Mobile responsive on iOS Safari**
iOS Safari viewport height includes the browser chrome, breaking fixed-position layouts. Switched to `dvh` units and `env(safe-area-inset-bottom)` throughout.

**6. OCR confidence UX**
The initial confidence display showed raw numbers that confused users during testing. Redesigned to per-word color pills (green / orange / red) and an editable text area before saving.

---

## Local Development

### Backend

```bash
cd backend/NotesApi
dotnet run
```

Serves the API at `http://localhost:8080`. Set environment variables before running (see table below).

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (Neon) |
| `JWT_SECRET_KEY` | JWT signing secret — minimum 32 characters |
| `AI_SERVICE_URL` | Base URL of the OCR service |
| `ALLOWED_ORIGINS` | Comma-separated CORS allowed origins |

### AI Service

```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

OCR service runs at `http://localhost:8000` locally. Production: `https://imaginative-cat-production-43f6.up.railway.app`. Requires `AZURE_VISION_KEY` and `AZURE_VISION_ENDPOINT` environment variables.

### Mobile App

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with Expo Go, or press `i` / `a` for iOS / Android simulator.

---

## Future Improvements

- Voice-to-text note input
- Note sharing via public link
- Multi-language OCR support
- Collaborative editing

---

## Built By

**Aditya Prabhudessai**
Internship at Persistent Systems, 2026

- GitHub: https://github.com/adiprabhu04
- LinkedIn: https://www.linkedin.com/in/aditya-prabhudessai
