# StudyOS — Architecture

## Overview

StudyOS uses a **2-service architecture**: Next.js owns the UI *and* the API/cache
layer (merged), and a Python service stays separate purely for AI work.

```
┌───────────────────────────────────────────┐
│   Next.js  (UI + API Routes)              │
│   Deployed to Vercel                      │
│   • React UI                              │
│   • /app/api/** route handlers            │
│     (routing + validation, replaces        │
│      the old Express gateway)             │
│   • MySQL cache (notes, MCQs, syllabi)    │
│   • Cache-first: returns instantly if      │
│     result already exists                 │
│   • Forwards uncached requests to ↓        │
└──────────────────┬──────────────────────────┘
                   │ HTTPS (server-side only)
                   ▼
┌───────────────────────────────────────────┐
│  Python AgenticService  (FastAPI)         │
│  Deployed to Railway / Render             │
│  • Pure AI — no DB, no cache              │
│  • PDF extraction (pdfplumber)            │
│  • Claude API calls                       │
│  • Pydantic contract validation           │
│  • Syllabus parsing                       │
│  • Notes generation                       │
│  • MCQ generation                         │
└──────────────┬──────────────────────────────┘
               │
               ▼
        (no DB connection —
         stateless AI layer)

┌───────────────────────────────────────────┐
│  MySQL                                     │
│  Lives behind Next.js only.               │
│  PlanetScale / Railway / Aiven all work.  │
└───────────────────────────────────────────┘
```

## What changed from the original 3-layer design

The original design had **Frontend → Express Gateway → AgenticService**, with
SQLite owned by Express. That's now **Frontend+Gateway merged into Next.js**,
talking to MySQL directly, and FastAPI is unchanged except for CORS config.

| Layer | Before | Now |
|---|---|---|
| Frontend | Next.js (UI only) | Next.js (UI **+** API routes) |
| Gateway | Express.js (separate service, port 3001) | **Removed** — logic moved into Next.js Route Handlers |
| Database | SQLite via better-sqlite3 (file-based) | MySQL via `mysql2` (hosted, serverless-safe) |
| AgenticService | FastAPI, called by Express | FastAPI, called directly by Next.js — **no functional change** |

Nothing about *what* the app does changed — every route, every cache rule,
every request/response shape is identical. Only *where* the gateway code lives
and *which* database it talks to changed.

## Why this split?

| Layer | Language | Why |
|---|---|---|
| Frontend + API | Next.js / TypeScript | One deploy target (Vercel), Route Handlers replace a whole Node service |
| AgenticService | Python / FastAPI | Best-in-class AI libraries (Anthropic SDK, pdfplumber, Pydantic); kept separate because long-running Claude calls don't suit serverless functions |
| Database | MySQL | Mature, well-supported by every host (PlanetScale, Railway, Aiven), survives redeploys unlike file-based SQLite |

The **frontend (browser) never calls the AgenticService directly** — only
server-side Route Handlers do, via `AGENTIC_SERVICE_URL` (never `NEXT_PUBLIC_`).
This means:
- The agentic layer can be swapped, scaled, or replaced without touching the UI.
- Caching lives in one place (Next.js + MySQL), so we never pay twice for the same LLM call.
- The Python layer is purely about AI correctness — no routing logic clutters it.

## Deployment targets

| Service | Where | Why |
|---|---|---|
| Next.js (UI + API) | **Vercel** | Zero-config for Next.js, free tier, instant previews |
| AgenticService (FastAPI) | **Railway** or **Render** | Long-running Python process, handles slow Claude/PDF calls without serverless timeouts |
| MySQL | **PlanetScale**, **Railway**, or **Aiven** | Serverless-friendly hosted MySQL, free/cheap tiers |

## Setup (local dev)

### 1. MySQL

Run MySQL locally (or use a free hosted tier) and create a database:
```sql
CREATE DATABASE studyos;
```
Tables are created automatically on first request — see `Frontend/src/lib/db.ts`.

### 2. Python AgenticService

```bash
cd AgenticService
cp .env.example .env          # add ANTHROPIC_API_KEY
pip install -r requirements.txt
python main.py
# → http://localhost:8000
```

### 3. Next.js (Frontend + API)

```bash
cd Frontend
cp .env.local.example .env.local   # add DATABASE_URL, AGENTIC_SERVICE_URL
npm install
npm run dev
# → http://localhost:3000
```

There is no separate gateway step anymore — Next.js *is* the gateway.

## Environment variables

### AgenticService (.env)
| Key | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `PORT` | Default 8000 (Railway/Render set this automatically in prod) |
| `ALLOWED_ORIGINS` | Comma-separated list of origins allowed to call this service (your Next.js URL) |

### Frontend (.env.local)
| Key | Description |
|---|---|
| `DATABASE_URL` | MySQL connection string, e.g. `mysql://user:pass@host:3306/studyos` |
| `AGENTIC_SERVICE_URL` | URL of the FastAPI service. Server-side only — no `NEXT_PUBLIC_` prefix |
| `NEXT_PUBLIC_USE_REAL_API` | `true` to use real API routes, `false` for mock data |
| `NEXT_PUBLIC_API_URL` | Leave unset (defaults to same-origin `/api/*`). Only set if you split the API routes into a separate deployment later |

## API Routes (Next.js Route Handlers)

```
POST   /api/upload              ← upload PDF → triggers syllabus parsing
GET    /api/upload/latest       ← fetch last parsed syllabus for user

POST   /api/notes/generate      ← generate or return cached notes
GET    /api/notes/:topicId      ← fetch cached notes
DELETE /api/notes/:topicId      ← delete cached notes

POST   /api/mcq/generate        ← generate or return cached MCQ set
GET    /api/mcq/:topicId        ← fetch cached MCQ set
DELETE /api/mcq/:topicId        ← delete cached MCQ set

GET    /api/health              ← API health check
```

These are byte-for-byte the same contract the old Express gateway exposed —
`Frontend/src/lib/api.ts` did not need its function signatures changed, only
its base URL (now same-origin by default).

## AgenticService Endpoints (internal only)

```
POST  /agent/parse-syllabus     ← PDF bytes → structured syllabus JSON
POST  /agent/generate-notes     ← topic params → Notes contract JSON
POST  /agent/generate-mcq       ← topic params → MCQ contract JSON

GET   /health                   ← agentic layer health check
```

Unchanged from the original design.

## Adding a new feature (e.g. Numericals)

1. Add prompt → `AgenticService/prompts/numericals_generator.md`
2. Add service → `AgenticService/services/numericals_service.py` (Pydantic models + Claude call)
3. Add endpoint → `AgenticService/main.py` (`POST /agent/generate-numericals`)
4. Add route → `Frontend/src/app/api/numericals/generate/route.ts` (cache-first, mirrors `notes/generate/route.ts`)
5. Add MySQL table → `Frontend/src/lib/db.ts`
6. Wire frontend → replace mock in `NumericalsView.tsx` with an `api.ts` call

Same pattern every time. No architectural decisions needed.
