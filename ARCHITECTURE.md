# StudyOS — Architecture

## Overview

StudyOS uses a **3-layer architecture** designed to make the agentic AI work
visible and explicit — not hidden behind a monolith.

```
┌─────────────────────────────────────┐
│   React Frontend  (Next.js :3000)   │
│   UI / UX only. No AI calls.        │
└──────────────┬──────────────────────┘
               │ HTTP REST
               ▼
┌─────────────────────────────────────┐
│  Express Gateway  (:3001)           │
│  • Routing + validation             │
│  • SQLite cache (notes, MCQs,       │
│    syllabi)                         │
│  • Cache-first: returns instantly   │
│    if result already exists         │
│  • Forwards uncached requests to ↓  │
└──────────────┬──────────────────────┘
               │ HTTP (internal)
               ▼
┌─────────────────────────────────────┐
│  Python AgenticService  (:8000)     │
│  • Pure AI — no DB, no cache        │
│  • PDF extraction (pdfplumber)      │
│  • Claude API calls                 │
│  • Pydantic contract validation     │
│  • Syllabus parsing                 │
│  • Notes generation                 │
│  • MCQ generation                   │
└─────────────────────────────────────┘
```

## Why this split?

| Layer | Language | Why |
|---|---|---|
| Frontend | Next.js / TypeScript | Best React ecosystem; UI stays framework-agnostic |
| Gateway | Express.js / Node | Thin, fast, ideal for routing + SQLite ops |
| AgenticService | Python / FastAPI | Best-in-class AI libraries (Anthropic SDK, pdfplumber, Pydantic) |

The **frontend never calls the AgenticService directly**. This means:
- The agentic layer can be swapped, scaled, or replaced without touching the UI.
- Caching lives in one place (Express), so we never pay twice for the same LLM call.
- The Python layer is purely about AI correctness — no routing logic clutters it.

## Ports

| Service | Port | Exposed to |
|---|---|---|
| Frontend (Next.js) | 3000 | Browser |
| Express Gateway | 3001 | Browser (API calls only) |
| AgenticService (FastAPI) | 8000 | Express only — never browser |

## Setup

### 1. Python AgenticService

```bash
cd AgenticService
cp .env.example .env          # add ANTHROPIC_API_KEY
pip install -r requirements.txt
python main.py
# → http://localhost:8000
```

### 2. Express Gateway

```bash
cd Backend-Express
cp .env.example .env
npm install
npm run dev
# → http://localhost:3001
```

### 3. React Frontend

```bash
cd Frontend
cp .env.local.example .env.local
npm install
npm run dev
# → http://localhost:3000
```

## Environment variables

### AgenticService (.env)
| Key | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `PORT` | Default 8000 |

### Backend-Express (.env)
| Key | Description |
|---|---|
| `PORT` | Default 3001 |
| `AGENTIC_SERVICE_URL` | Default http://localhost:8000 |
| `DB_PATH` | SQLite file path, default studyos.db |
| `CORS_ORIGINS` | Comma-separated allowed origins |

### Frontend (.env.local)
| Key | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Express gateway URL, default http://localhost:3001 |
| `NEXT_PUBLIC_USE_REAL_API` | `true` to use real backend, `false` for mock data |

## API Routes (Express Gateway)

```
POST   /api/upload              ← upload PDF → triggers syllabus parsing
GET    /api/upload/latest       ← fetch last parsed syllabus for user

POST   /api/notes/generate      ← generate or return cached notes
GET    /api/notes/:topicId      ← fetch cached notes
DELETE /api/notes/:topicId      ← delete cached notes

POST   /api/mcq/generate        ← generate or return cached MCQ set
GET    /api/mcq/:topicId        ← fetch cached MCQ set
DELETE /api/mcq/:topicId        ← delete cached MCQ set

GET    /health                  ← gateway health check
```

## AgenticService Endpoints (internal only)

```
POST  /agent/parse-syllabus     ← PDF bytes → structured syllabus JSON
POST  /agent/generate-notes     ← topic params → Notes contract JSON
POST  /agent/generate-mcq       ← topic params → MCQ contract JSON

GET   /health                   ← agentic layer health check
```

## Adding a new feature (e.g. Numericals)

1. Add prompt → `AgenticService/prompts/numericals_generator.md`
2. Add service → `AgenticService/services/numericals_service.py` (Pydantic models + Claude call)
3. Add endpoint → `AgenticService/main.py` (`POST /agent/generate-numericals`)
4. Add router → `Backend-Express/src/routes/numericals.js` (cache-first, mirrors notes.js)
5. Register router → `Backend-Express/src/server.js`
6. Add DB table → `Backend-Express/src/db.js`
7. Wire frontend → replace mock in `NumericalsView.tsx` with `api.ts` call

Same pattern every time. No architectural decisions needed.
