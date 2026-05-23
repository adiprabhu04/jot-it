# Jot It — AI-Powered Notes App

![Live](https://img.shields.io/badge/Live-persistent--ai--ml--internship.vercel.app-5B6EF5?style=for-the-badge)
![ASP.NET Core](https://img.shields.io/badge/ASP.NET_Core-8.0-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)
![Python](https://img.shields.io/badge/Python-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Azure](https://img.shields.io/badge/Azure-Computer_Vision-0078D4?style=for-the-badge&logo=microsoftazure&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Railway](https://img.shields.io/badge/Backend-Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white)

---

# Jot It

Jot It is an AI-powered handwriting notes platform that combines note management, OCR, and intelligent summarization into a modern cross-platform experience.

Users can:
- write and organize notes
- draw handwriting on a canvas
- upload handwritten pages
- extract text using Azure Computer Vision OCR
- generate AI-powered summaries
- export notes as PDF or CSV

The project is deployed as a modern multi-service architecture using:
- Vercel (frontend)
- Railway (backend + AI OCR service)
- Neon PostgreSQL

---

## Live URLs

| Service | URL |
|---------|-----|
| Frontend | https://persistent-ai-ml-internship.vercel.app |
| Backend API | https://persistent-ai-ml-internship-production.up.railway.app |
| AI Service | https://imaginative-cat-production-43f6.up.railway.app |
| Repository | https://github.com/adiprabhu04/persistent-ai-ml-internship |

---

## Product Experience

The landing page was designed as a modern SaaS-style product experience inspired by:

- Linear
- Raycast
- Vercel
- Framer
- Apple product pages

UI highlights include:

- Premium dark luxury aesthetic
- Glassmorphism navigation
- Bento-grid feature layouts
- Sticky product showcase interactions
- Scroll-triggered reveal animations
- Ambient glow and parallax effects
- Responsive mobile-first layouts
- Lightweight vanilla JavaScript animation architecture

---

## Screenshots

> Add screenshots here:
- Hero section
- Bento grid feature section
- OCR canvas
- Notes dashboard
- Mobile responsive UI

---

## Features

### Core Notes

- Full CRUD note management
- Rich text editor
- Categories and color-coded organization
- Hashtag auto-extraction
- Real-time search
- Note pinning
- Inline word suggestions

### AI Features

- Handwriting OCR using Azure Computer Vision
- Canvas handwriting recognition
- Camera/image OCR upload
- Confidence scoring pills
- AI-generated summaries
- OCR feedback and analytics

### Export Features

- Export notes as PDF
- Export notes as CSV
- AI summary included in exports

### UI / UX

- Dark and light mode
- Premium SaaS-inspired landing page
- Glassmorphism and bento-grid layouts
- Sticky interactive showcase section
- Scroll-triggered reveal animations
- Responsive desktop/tablet/mobile layouts
- Skeleton loaders and microinteractions
- Progressive Web App support

### Mobile App

- React Native + Expo SDK 54
- Shared backend API with web frontend
- Auth, OCR scanning, notes management
- Android and iOS support

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Vanilla JS, HTML5, CSS3 | Lightweight static frontend |
| Backend | ASP.NET Core 8 Minimal API | REST API + business logic |
| Database | PostgreSQL on Neon | Persistent storage |
| AI / OCR | Python FastAPI + Azure Computer Vision | OCR processing |
| Mobile | React Native + Expo SDK 54 | Mobile companion app |
| Deployment | Vercel + Railway | Production hosting |

---

## Architecture

Jot It runs as three independently deployed services communicating over HTTPS.

```text
Browser / Mobile App
        |
        | HTTPS
        v
+------------------------+        +------------------------+
|  ASP.NET Core 8        |  HTTP  |  Python FastAPI        |
|  Backend API           +------->+  OCR Service           |
|  Railway               |        |  Railway               |
+----------+-------------+        +-----------+------------+
           |                                  |
           | EF Core / Npgsql                 | Azure SDK
           v                                  v
+------------------------+        +------------------------+
|  PostgreSQL            |        |  Azure Computer        |
|  Neon                  |        |  Vision Read API       |
+------------------------+        +------------------------+
```

Frontend is deployed statically on Vercel and communicates directly with the ASP.NET Core backend API.

---

## Why Vanilla JS?

The frontend intentionally avoids heavy frontend frameworks to:

- minimize bundle size
- reduce deployment complexity
- eliminate build-step overhead
- maximize performance
- keep the architecture transparent and easy to debug

Animations and interactions are implemented using lightweight vanilla JavaScript and IntersectionObserver APIs instead of heavy animation frameworks.

---

## Performance Considerations

- Passive scroll listeners
- IntersectionObserver-based reveal system
- Reduced-motion accessibility support
- Lightweight static deployment on Vercel
- No heavy frontend frameworks
- Optimized reveal animations
- Unobserved elements after animation trigger
- Performance-friendly animation architecture

---

## Technical Decisions

- ASP.NET Core 8 Minimal API for lightweight REST architecture
- Vanilla JS frontend for simplicity and performance
- Azure Computer Vision OCR for handwriting recognition
- Railway deployment for scalable backend hosting
- TF-scoring summaries instead of hosted LLM APIs to avoid API costs

---

## Challenges and Solutions

### Railway Migration

The original deployment used Render free-tier infrastructure which caused uptime and memory limitations. The project was migrated to Railway with separated backend and AI services for improved stability and scalability.

### OCR Confidence UX

Raw OCR confidence scores confused users during testing. Redesigned the system into color-coded confidence pills for better readability.

### Mobile Responsiveness

iOS Safari viewport behavior caused layout issues. Fixed using dynamic viewport units (`dvh`) and safe-area support.

### OCR Performance

Image preprocessing memory usage was optimized by replacing heavy scipy-based processing with lightweight Pillow-only pipelines.

---

## Local Development

### Backend

```bash
cd backend/NotesApi
dotnet run
```

Environment variables:

| Variable | Description |
|----------|-------------|
| DATABASE_URL | PostgreSQL connection string |
| JWT_SECRET_KEY | JWT signing secret |
| AI_SERVICE_URL | OCR service base URL |
| ALLOWED_ORIGINS | Allowed frontend origins |

---

### AI Service

```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Required environment variables:

- AZURE_VISION_KEY
- AZURE_VISION_ENDPOINT

---

### Mobile App

```bash
cd mobile
npm install
npx expo start
```

---

## Future Improvements

- Interactive OCR demo on landing page
- Voice-to-text notes
- Public note sharing
- Multi-language OCR
- Real-time collaboration
- AI semantic search
- Cloud sync improvements

---

## Built By

### Aditya Prabhudessai

Persistent Systems Internship Project — 2026

- GitHub: https://github.com/adiprabhu04
- LinkedIn: https://www.linkedin.com/in/aditya-prabhudessai
