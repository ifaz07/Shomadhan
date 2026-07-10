# Shomadhan — Smart Civic Issue Tracking and Resolution System

Shomadhan (Bengali for "solution") is a full-stack MERN platform that lets citizens report civic issues — road damage, water/electricity faults, sanitation, safety hazards, and more — and routes them through an automated priority, escalation, and resolution pipeline involving department officers, mayors, and administrators.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Overview](#api-overview)
- [Current Limitations](#current-limitations)
- [Future Improvements](#future-improvements)

## Overview

Shomadhan connects four user roles — **citizens**, **department officers ("servants")**, **mayors**, and **admins** — around a single complaint lifecycle. Citizens submit complaints with photo/video/audio evidence and geolocation; the backend classifies the category, scores priority, checks for duplicates/spam, and assigns an SLA. Complaints that go unresolved automatically escalate through authority levels via a scheduled job. Officers manage and resolve tickets from a dedicated dashboard, mayors get city-wide analytics and can issue emergency broadcasts, and admins approve new officer/mayor accounts and identity verifications.

## Key Features

**Complaint lifecycle** — Citizens submit complaints (title, description, category, GPS location, up to 5 evidence files) as authenticated or anonymous users, upvote existing complaints, leave multi-criteria feedback (resolution quality, response time, officer professionalism) once resolved, and track status (`pending` → `in-progress` → `resolved`/`rejected`).

**AI-assisted triage** — A Hugging Face zero-shot classification model (`facebook/bart-large-mnli`) suggests a department/category from the free-text description, keyword extraction provides fallback classification when the API is unavailable, and a Mistral-7B model can expand short citizen notes into a fuller description.

**Automatic priority scoring** — `priorityService` derives a Low/Medium/High/Critical priority from category severity, manual emergency flags, upvote count, and keyword matches against sensitive locations (hospitals, schools, police stations, markets, etc.).

**Duplicate & spam detection** — `spamDetectionService` flags likely duplicate reports using geospatial proximity (Haversine distance), a time window, and text-similarity scoring (token overlap, character n-grams, and an optional Hugging Face sentence-embedding model).

**SLA-driven escalation engine** — A `node-cron` job periodically scans pending complaints whose SLA has lapsed, bumps their authority level (1→3) and priority, and logs the transition in the complaint's history.

**Role-based dashboards** — Citizen dashboard with map/heatmap views and complaint history; department-officer dashboard for managing assigned complaints, setting SLAs, and updating status; mayor dashboard with city-wide stats, a Groq LLM-powered chat briefing, "Good Citizen" leaderboard/badging, and volunteer-event management; admin dashboard for approving pending officers/mayors and identity verification documents.

**Emergency broadcast system** — Mayors and officers can publish geo-targeted disaster alerts (fire, flood, cyclone, earthquake, etc.) with an optional audio clip; recipients are computed by radius around a lat/lng point and role targeting, and delivered via the notification/email services.

**Authentication & identity verification** — JWT-based auth with HTTP-only cookies, Google and Facebook OAuth via Passport, bcrypt password hashing, password reset flow, and a separate identity-verification step (NID/passport/birth certificate upload) required before certain citizen actions.

**Notifications & reporting** — In-app notification feed plus transactional email via Resend, and PDF report generation (`pdfkit`) for individual complaints and city-wide summaries, exposed to mayors/admins.

**Geospatial visualization** — Leaflet-based interactive map and heatmap (`leaflet.heat`) of complaint density, plus Recharts-powered analytics dashboards for public and departmental statistics.

**Volunteer program** — Mayors can post volunteer opportunities (with poster image, event date, required headcount); citizens can register, tracked via a dedicated volunteer-ads collection.

**Gamification** — Citizens earn points/penalties for complaint activity, and a monthly "Good Citizen" badge is awarded and can be revoked by mayors.

**Internationalization scaffold** — A language-context/toggle component and an on-demand translation widget (calling the MyMemory translation API) support switching complaint text between English and Bengali.

## Architecture

```
┌─────────────────┐        REST (JSON, JWT)        ┌──────────────────────┐
│  React (Vite)    │ ───────────────────────────▶  │  Express API          │
│  Frontend (SPA)   │ ◀─────────────────────────── │  /api/v1/*             │
└─────────────────┘                                └──────────┬────────────┘
                                                                │
                        ┌───────────────────────────────────────┼───────────────────────────┐
                        │                                       │                           │
                 ┌──────▼──────┐                       ┌────────▼────────┐          ┌───────▼───────┐
                 │  MongoDB     │                       │  node-cron       │          │  External APIs │
                 │  (Mongoose)  │                       │  escalation job  │          │  HF / Groq /    │
                 └─────────────┘                       └─────────────────┘          │  Resend / OAuth │
                                                                                      └────────────────┘
```

The backend is a layered Express app: `routes` → `middleware` (JWT auth, role authorization, multer uploads) → `controllers` → `services` (NLP, priority, spam detection, escalation, notifications, email, AI content, PDF reports) → `models` (Mongoose schemas). The frontend is a single-page React app with route guards per role (citizen, department officer, mayor, admin) and a shared Axios API client.

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React 18, Vite, React Router 6, Tailwind CSS, Framer Motion, Axios, React Leaflet + Leaflet.heat, Recharts, react-hot-toast, react-easy-crop, lucide-react |
| Backend | Node.js, Express 4, Mongoose 8 (MongoDB), JWT, Passport (Google & Facebook OAuth strategies), bcryptjs, express-validator, express-rate-limit, Helmet, CORS, Multer, node-cron, PDFKit |
| AI / NLP | Hugging Face Inference API (zero-shot classification, sentence embeddings, text generation), Groq SDK (LLM chat briefing) |
| Email | Resend (with Nodemailer as an available alternative) |
| Deployment targets | Vercel (frontend), Render/Railway (backend) |

## Project Structure

```
Shomadhan/
├── backend/
│   ├── config/          # DB connection, Passport strategies, runtime URL resolution
│   ├── controllers/      # Route handlers (auth, complaint, admin, mayor, servant, etc.)
│   ├── middleware/        # JWT auth, role authorization, file upload handling, error handler
│   ├── models/            # Mongoose schemas (User, Complaint, Feedback, Notification, ...)
│   ├── routes/             # Express routers per resource
│   ├── services/           # NLP classification, priority scoring, spam detection,
│   │                       # escalation cron, notifications, email, AI text expansion
│   ├── utils/               # Department taxonomy, upload path helpers
│   └── server.js             # App entry point
└── frontend/
    ├── src/
    │   ├── components/        # Shared UI (modals, chatbot, badges, translation widget, layout)
    │   ├── context/            # Auth and language React contexts
    │   ├── pages/               # Route-level pages, including a servant/ subtree
    │   ├── services/api.js       # Axios client
    │   └── translations/          # UI copy strings
    └── vite.config.js
```

## Getting Started

### Prerequisites

- Node.js 18+
- A MongoDB instance (local or Atlas)

### Backend

```bash
cd backend
npm install
cp .env.example .env   # populate required variables (see below)
npm run dev             # nodemon, or `npm start` for production
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env    # set VITE_API_URL
npm run dev
```

The frontend expects the backend to be reachable at `VITE_API_URL` (e.g. `http://localhost:5001/api/v1`).

## Environment Variables

**Backend (`backend/.env`)**

| Variable | Purpose |
|---|---|
| `PORT`, `NODE_ENV` | Server port and environment mode |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET`, `JWT_EXPIRE` | JWT signing secret and token lifetime |
| `SESSION_SECRET` | Express session secret (used for OAuth handshake) |
| `CLIENT_URL`, `BACKEND_URL` | Used for CORS allow-list and OAuth callback URLs |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth credentials |
| `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` | Facebook OAuth credentials |
| `HUGGINGFACE_API_KEY` | Enables NLP category classification, similarity-based duplicate detection, and AI text expansion |
| `GROQ_API_KEY` | Enables the mayor's AI chat briefing feature |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Transactional email delivery |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS` | SMTP fallback for email |

**Frontend (`frontend/.env`)**

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Base URL of the backend API |

AI, OAuth, and email integrations degrade gracefully (return a clear "not configured" error or skip the step) when their corresponding keys are absent, so the core complaint workflow runs without them.

## API Overview

All routes are versioned under `/api/v1`:

- `/auth` — register, login, logout, profile, password reset, OAuth (Google/Facebook), avatar and identity-document upload
- `/complaints` — CRUD, voting, feedback, heatmap data, nearby search, AI-assisted classification (`/analyze`)
- `/servant` — department officer complaint queue, status updates, SLA assignment, stats
- `/mayor` — dashboard stats, AI chat briefing, citizen leaderboard, Good Citizen badge management
- `/admin` — approve pending officers/mayors, identity verification review, user management
- `/notifications` — mark-as-read
- `/emergency-broadcasts` — create and list disaster alerts
- `/volunteer-ads` — create, list, and register for volunteer events
- `/reports` — PDF generation for a single complaint or a summary report
- `/ai` — free-text expansion helper

## Current Limitations

- **Local file storage for evidence** — uploaded images/videos/audio and verification documents are stored on the backend's local disk via Multer rather than durable object storage, so files are lost on redeploy/restart on most PaaS hosts (acknowledged in `DEPLOYMENT.md`).
- **Escalation interval is hardcoded for testing** — the cron job runs every minute and treats a 48-hour-old pending complaint as escalation-eligible; this fixed window is not yet configurable per department or SLA tier.
- **Single points of failure for AI features** — NLP classification, spam similarity, chat briefings, and text expansion all depend on third-party APIs (Hugging Face, Groq) with no local fallback model, so those features fail closed if a key is missing or a provider is down.
- **No automated test suite** — there are no unit, integration, or end-to-end tests in either `backend/` or `frontend/`, so regressions rely on manual verification.
- **Session/JWT hybrid auth** — the app mixes JWT bearer/cookie auth with `express-session` (only for the OAuth handshake), which adds operational complexity (session store, cookie flags) for a feature that could be handled statelessly.
- **Limited internationalization** — only English UI strings are bundled; Bengali (or other language) support currently relies on an on-demand call to the free MyMemory translation API rather than pre-translated content.
- **No real-time updates** — notifications, complaint status changes, and emergency broadcasts are delivered via polling/page reload rather than WebSockets or push, so clients don't see updates instantly.
- **Duplicate/priority heuristics are rule-based** — category severity, sensitive-location keywords, and duplicate thresholds are hardcoded constants rather than tunable configuration or a trained model.

## Future Improvements

- **Move evidence and verification uploads to object storage** (S3, Cloudinary, or Vercel Blob) as already flagged in `DEPLOYMENT.md`, with signed URLs and CDN delivery instead of serving static files from the API host.
- **Make SLA and escalation windows configurable per department/priority** (stored in `DepartmentMetric` or a dedicated config collection) instead of the current fixed cron interval, so real deployments can use realistic SLA hours.
- **Add a test suite** (Jest/Supertest for the API, Vitest/React Testing Library for the frontend) covering auth, complaint lifecycle, priority scoring, and escalation logic, wired into CI.
- **Introduce WebSockets (Socket.IO) or Server-Sent Events** for live notification delivery, complaint status changes, and emergency broadcast pushes, replacing manual refresh/polling.
- **Consolidate on a single stateless auth strategy** (JWT-only, with OAuth state handled via short-lived signed tokens instead of `express-session`) to simplify deployment across multiple backend instances.
- **Cache and rate-limit external AI calls**, and add a lightweight local fallback (e.g., a keyword/rules classifier as primary with the Hugging Face model as enhancement) to reduce cost and improve resilience when third-party APIs are slow or unavailable.
- **Expand localization** by pre-translating UI strings into Bengali within the existing `translations` module rather than relying solely on the runtime MyMemory API call, improving reliability and removing a third-party dependency from the core UX.
- **Add structured logging and monitoring** (e.g., Winston/Pino plus a hosted log sink) in place of `morgan`/console logging, to make the escalation cron job and AI-service failures observable in production.
```
