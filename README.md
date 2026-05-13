# Jot It — AI-Powered Notes App

![Live](https://img.shields.io/badge/Live-jotit--notes.netlify.app-5B6EF5?style=for-the-badge)
![ASP.NET Core](https://img.shields.io/badge/ASP.NET_Core-8.0-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)
![Python](https://img.shields.io/badge/Python-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Azure](https://img.shields.io/badge/Azure-Computer_Vision-0078D4?style=for-the-badge&logo=microsoftazure&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Netlify](https://img.shields.io/badge/Frontend-Netlify-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)
![Render](https://img.shields.io/badge/Backend-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)

---

## Overview

Jot It is an AI-powered note-taking application built across a three-service architecture. Users write and organize notes with a rich text editor, draw handwriting on a canvas or upload images for OCR via Azure Computer Vision, and receive AI-generated summaries on every save. The system supports full CRUD, real-time search, hashtag filtering, note pinning, color coding, drag-and-drop reordering, PDF/CSV export, and a React Native mobile companion app — all wired to the same backend API.

---

## Live URLs

| Service | URL |
|---------|-----|
| Frontend | https://jotit-notes.netlify.app |
| Backend API | https://persistent-ai-ml-internship.onrender.com |
| AI Service | https://ai-service-ocr.onrender.com |
| Repository | https://github.com/adiprabhu04/persistent-ai-ml-internship |

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Vanilla JS, HTML5, CSS3 | Single-file PWA, no build step |
| Backend | ASP.NET Core 8 Minimal API | REST API, auth, business logic |
| Database | PostgreSQL on Neon | Persistent storage via EF Core |
| AI / OCR | Python FastAPI + Azure Computer Vision | Handwriting recognition |
| Mobile | React Native + Expo SDK 54 | iOS and Android companion app |
| Deployment | Netlify (frontend) + Render (backend + AI) | Production hosting |

---

## Architecture

Jot It is composed of three independently deployed services communicating over HTTPS.

```
Browser / Mobile App
        |
        | HTTPS
        v
+------------------------+        +------------------------+
|  ASP.NET Core 8        |  HTTP  |  Python FastAPI        |
|  Backend API           +------->+  OCR Service           |
|  Render Web Service    |        |  Render Web Service    |
+----------+-------------+        +-----------+------------+
           |                                  |
           | EF Core / Npgsql                 | Azure SDK
           v                                  v
+------------------------+        +------------------------+
|  PostgreSQL            |        |  Azure Computer        |
|  Neon Serverless       |        |  Vision Read API       |
+------------------------+        +------------------------+

Frontend (Netlify) served statically — communicates directly with Backend API.
```

---

## Features

### Core Notes

- Full CRUD with rich text editor (bold, italic, underline, ordered and unordered lists, headings)
- 6 note templates for quick starting points
- Categories: General, Personal, Work, Ideas
- Note color coding across 8 colors
- Hashtag support: `#tag` auto-extracted from content and available as filters
- Note pinning to keep priority notes at the top
- Drag and drop reordering of the note list
- Real-time search across titles and content
- Word suggestions from a 170+ word dictionary while typing

### AI Features

- Handwriting OCR via Azure Computer Vision Read API
- Canvas drawing with mouse and touch input, plus image upload (JPG, PNG)
- Per-word confidence scoring displayed as color-coded pills
- AI-generated summary on every note save using TF-scoring (approximately 50 words)
- OCR accuracy feedback loop: thumbs up / thumbs down per scan
- OCR stats dashboard showing accuracy trends over time
- Strike-through gesture on canvas to erase individual recognized words
- Original scan image saved alongside the OCR result in the note

### Export and Data

- Export all notes as a single PDF or CSV file
- Export individual note as PDF or CSV
- AI-generated summary included in PDF export

### UI / UX

- Dark and light mode with OS-level auto-detection, persisted across sessions
- Inter font, indigo (`#5B6EF5`) design system throughout
- PWA installable from the browser on desktop and mobile
- Fully responsive layout for mobile, tablet, and desktop viewports
- Skeleton loaders, confetti animation on note creation, staggered list animations
- Landing page for first-time visitors before authentication
- About page with social links

### Mobile App

- React Native + Expo SDK 54
- Screens: Auth, Home, Scan, NewNote, EditNote, Settings
- Wired to the same backend REST API as the web frontend
- EAS Build configuration for standalone iOS and Android binaries

---

## API Endpoints

All `/notes` and `/ocr` endpoints require an `Authorization: Bearer <token>` header.

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:---:|
| `POST` | `/auth/register` | Register new user | No |
| `POST` | `/auth/login` | Login and receive JWT | No |
| `GET` | `/auth/me` | Get current user profile | Yes |
| `GET` | `/notes` | Get all notes (paginated) | Yes |
| `POST` | `/notes` | Create note | Yes |
| `PUT` | `/notes/:id` | Update note | Yes |
| `DELETE` | `/notes/:id` | Delete note | Yes |
| `PUT` | `/notes/:id/pin` | Toggle pin status | Yes |
| `POST` | `/notes/scan` | OCR scan image (multipart/form-data) | Yes |
| `POST` | `/ocr/feedback` | Submit OCR accuracy rating | Yes |
| `GET` | `/ocr/stats` | Get OCR accuracy stats | Yes |
| `GET` | `/health` | Health check | No |

---

## Database Schema

### Notes

| Column | Type | Notes |
|--------|------|-------|
| `Id` | UUID | Primary key |
| `Title` | string | Note title |
| `Content` | text | Rich HTML content |
| `Category` | string | General / Personal / Work / Ideas |
| `IsPinned` | bool | Pin status |
| `Color` | string | One of 8 color values |
| `Tags` | string | Comma-separated hashtags extracted from content |
| `Summary` | text | AI-generated TF-score summary |
| `ImageData` | text | Base64 original scan image |
| `CreatedAt` | datetime | UTC creation timestamp |
| `UpdatedAt` | datetime | UTC last-modified timestamp |
| `UserId` | UUID | Foreign key to Users |

### Users

| Column | Type | Notes |
|--------|------|-------|
| `Id` | UUID | Primary key |
| `Name` | string | Display name |
| `Email` | string | Unique, used for login |
| `PasswordHash` | string | BCrypt hash |
| `CreatedAt` | datetime | UTC creation timestamp |

### OcrFeedback

| Column | Type | Notes |
|--------|------|-------|
| `Id` | UUID | Primary key |
| `UserId` | UUID | Foreign key to Users |
| `ExtractedText` | text | OCR output text |
| `Engine` | string | Vision engine identifier |
| `Confidence` | float | Aggregate confidence score |
| `IsAccurate` | bool | User thumbs up / down |
| `CreatedAt` | datetime | UTC creation timestamp |

---

## Environment Variables

### Backend (Render)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (Neon) |
| `JWT_SECRET_KEY` | Secret for signing JWT tokens — minimum 32 characters |
| `AI_SERVICE_URL` | Base URL of the deployed Python OCR service |
| `ALLOWED_ORIGINS` | Comma-separated CORS allowed origins |

### AI Service (Render)

| Variable | Description |
|----------|-------------|
| `AZURE_VISION_KEY` | Azure Computer Vision API key |
| `AZURE_VISION_ENDPOINT` | Azure Computer Vision endpoint URL |

---

## Local Development

### Prerequisites

| Tool | Version |
|------|---------|
| .NET SDK | 8.0+ |
| Python | 3.10+ |
| Node.js | 18+ |
| Azure Computer Vision resource | Any tier |

### Backend

```bash
cd backend/NotesApi
dotnet run
```

Serves API and frontend at `http://localhost:8080`.

### AI Service

```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

OCR service runs at `http://localhost:8000`.

### Mobile App

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with Expo Go, or press `i` / `a` for iOS / Android simulator.

### Frontend (standalone)

Open `frontend/index.html` directly, or serve it:

```bash
python -m http.server 8080
```

---

## Repository Structure

```
/backend/NotesApi     ASP.NET Core 8 Minimal API
/ai-service           Python FastAPI OCR service
/mobile               React Native Expo app
/frontend             Netlify deployment files
/sync-frontend.ps1    Script to sync frontend build to Netlify
```

---

## Challenges and Solutions

**1. inotify crash on Render**
ASP.NET Core file watching exhausted inotify handles on the free-tier container. Fixed by setting `reloadOnChange: false` in `appsettings.json`.

**2. Google Vision billing**
Google Cloud Vision required a billing account even at low usage. Switched to Azure Computer Vision for Azure Students, which provides free credits without a credit card.

**3. Canvas OCR producing empty results**
The canvas `toBlob()` call was executing before the composite drawing operations completed. Fixed by ensuring the image and drawing layers were fully composited before the blob was captured.

**4. Memory OOM on Render free tier**
Image preprocessing with scipy was pushing the AI service over the 512 MB memory limit. Removed scipy, replaced with Pillow-only processing, and capped image upscaling to stay within limits.

**5. CORS errors on Netlify**
Splitting the frontend to Netlify while the API stayed on Render caused cross-origin failures. Resolved by setting the `ALLOWED_ORIGINS` environment variable on the backend to include the Netlify domain.

---

## Roadmap

### Month 1 — Foundation

- [x] User registration and JWT authentication
- [x] Create, edit, delete notes
- [x] Note categories (General, Personal, Work, Ideas)
- [x] Real-time client-side search
- [x] PostgreSQL database with EF Core migrations
- [x] Render deployment (backend + AI service)

### Month 2 — AI and OCR

- [x] Handwriting OCR via canvas drawing
- [x] Handwriting OCR via image upload
- [x] Azure Computer Vision integration
- [x] Per-word confidence scoring with color-coded pills
- [x] Strike-through gesture to erase canvas words
- [x] Original scan image saved with note
- [x] OCR accuracy feedback (thumbs up / down)
- [x] OCR stats dashboard

### Month 3 — Features and Polish

- [x] Rich text editor (bold, italic, underline, lists, headings)
- [x] 6 note templates
- [x] Note color coding (8 colors)
- [x] Hashtag auto-extraction and filter
- [x] Note pinning
- [x] Drag and drop reordering
- [x] Word suggestions dictionary
- [x] AI-generated note summary (TF-scoring)
- [x] Dark / light mode with OS auto-detection
- [x] PWA — installable from browser
- [x] Skeleton loaders and stagger animations

### Month 4 — Export and Mobile

- [x] Export all notes as PDF or CSV
- [x] Export individual note as PDF or CSV
- [x] Summary included in PDF export
- [x] React Native mobile app (Expo SDK 54)
- [x] Mobile screens: Auth, Home, Scan, NewNote, EditNote, Settings
- [x] Netlify deployment for frontend
- [x] Landing page for first-time visitors
- [x] About page with social links

---

## Built By

**Aditya Prabhudessai**
Internship at Persistent Systems, 2026

- GitHub: https://github.com/adiprabhu04
- LinkedIn: https://www.linkedin.com/in/aditya-prabhudessai
