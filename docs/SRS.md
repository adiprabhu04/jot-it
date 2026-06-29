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
- **PostgreSQL** — accessed by the backend via EF Core / Npgsql. See [Database.md](./Database.md).
