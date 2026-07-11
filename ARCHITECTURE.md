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
│  • LangChain (ChatAnthropic) + LangGraph  │
│    workflows — see App/agents,            │
│    App/workflows                          │
│  • PDF extraction (pdfplumber)            │
│  • Pydantic contract validation           │
│  • Syllabus parsing                       │
│  • Notes generation (+ RAG indexing)      │
│  • MCQ generation                         │
│  • Numericals generation                  │
│  • AI Tutor chat (RAG + session memory)   │
└──────────────┬──────────────────────────────┘
               │
               ▼
     (vector_db/ — local Chroma store
      over generated notes, used by
      Tutor Chat retrieval only)

┌───────────────────────────────────────────┐
│  MySQL                                     │
│  Lives behind Next.js only.               │
│  PlanetScale / Railway / Aiven all work.  │
└───────────────────────────────────────────┘
```

## AgenticService internals (LangChain / LangGraph)

As of the LangGraph migration, `AgenticService/` is organized as:

```
AgenticService/
  App/
    agents/       ← one file per feature: prompt + Pydantic validation
    services/     ← llm_service.py (ChatAnthropic wrapper), pdf_service.py,
                     rag_service.py (Chroma vector store)
    workflows/     ← one LangGraph graph per feature — main.py calls these
    prompts/       ← .md prompt contracts (unchanged content, moved here)
  vector_db/       ← Chroma persistence for Tutor Chat retrieval
  main.py, config.py, requirements.txt
```

Notes/MCQ/Numericals are single-node graphs (generate → validate); Tutor Chat
is the one genuinely multi-step graph (retrieve → generate) with LangGraph's
`MemorySaver` checkpointer carrying conversation history per session. See
`AgenticService/MIGRATION_NOTES.md` for the full rationale and what's ported
vs. newly built.

## Frontend internals

`Frontend/src/components/` is intentionally flat — there's no `dashboard/`,
`landing/`, `layout/`, `shared/`, `topic/` subdivision. With ~14 components
total, per-feature folders added navigation overhead without a real payoff.
Only `components/ui/` (shadcn primitives) stays separate, since that's a
different category of file (generated, rarely touched) rather than a
different feature area.

```
Frontend/src/
  app/                    ← Next.js App Router (routes + API route handlers)
  components/
    ui/                   ← shadcn primitives (button, card, badge)
    Navbar.tsx             ← public landing navbar (app/page.tsx)
    AppNavbar.tsx           ← authenticated app navbar ((dashboard) layout)
    Footer.tsx, Hero.tsx, Features.tsx, CTA.tsx, Mockup.tsx  ← landing page
    SyllabusTree.tsx        ← left-nav syllabus tree (dashboard + study page)
    NotesView.tsx, NumericalsView.tsx, MCQQuiz.tsx, ChatPanel.tsx  ← topic tabs
    LoadingSteps.tsx, StateComponents.tsx  ← shared idle/loading/error/empty UI
  lib/                    ← api.ts (API client), db.ts, agentic.ts, utils.ts
  types/                  ← shared TypeScript contracts
```

Note there are two navbars by design, not by accident: `Navbar.tsx` is the
signed-out marketing navbar shown on `/`, `AppNavbar.tsx` is the signed-in
app navbar (with `<UserButton/>`) shown inside `(dashboard)/layout.tsx`.

There is no `mocks/` folder and no `USE_REAL_API` flag — every feature
(Notes, MCQ, Numericals, Tutor Chat) always calls the real API routes.
Study Plan has no backend yet, so `/plan` shows an honest "coming soon"
state rather than fake generated data.

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
| `MODEL_NAME` | Default `claude-sonnet-4-6` |
| `ALLOWED_ORIGINS` | Comma-separated list of origins allowed to call this service (your Next.js URL) |
| `VECTOR_DB_DIR` | Default `vector_db` — local Chroma persistence path for Tutor Chat RAG |
| `EMBEDDING_MODEL` | Default `sentence-transformers/all-MiniLM-L6-v2` — local embeddings, no extra API key needed |

### Frontend (.env.local)
| Key | Description |
|---|---|
| `DATABASE_URL` | MySQL connection string, e.g. `mysql://user:pass@host:3306/studyos` |
| `AGENTIC_SERVICE_URL` | URL of the FastAPI service. Server-side only — no `NEXT_PUBLIC_` prefix |
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

POST   /api/numericals/generate ← generate or return cached numericals set
GET    /api/numericals/:topicId ← fetch cached numericals set
DELETE /api/numericals/:topicId ← delete cached numericals set

POST   /api/chat                ← forward one tutor-chat turn (no caching —
                                    memory lives in the AgenticService)

GET    /api/health              ← API health check
```

These are byte-for-byte the same contract the old Express gateway exposed —
`Frontend/src/lib/api.ts` did not need its function signatures changed, only
its base URL (now same-origin by default).

## AgenticService Endpoints (internal only)

```
POST  /agent/parse-syllabus     ← PDF bytes → structured syllabus JSON
POST  /agent/generate-notes     ← topic params → Notes contract JSON (+ RAG indexing)
POST  /agent/generate-mcq       ← topic params → MCQ contract JSON
POST  /agent/generate-numericals ← topic params → Numericals contract JSON
POST  /agent/tutor-chat         ← session_id + question → Tutor response JSON

GET   /health                   ← agentic layer health check
```

Each endpoint delegates to a LangGraph workflow in `App/workflows/`.

## Adding a new feature (e.g. Study Plan)

1. Add prompt → `AgenticService/App/prompts/study_plan_generator.md`
2. Add agent → `AgenticService/App/agents/study_plan_agent.py` (Pydantic models + Claude call via `llm_service`)
3. Add workflow → `AgenticService/App/workflows/study_plan_workflow.py` (LangGraph graph wrapping the agent)
4. Add endpoint → `AgenticService/main.py` (`POST /agent/generate-study-plan`)
5. Add route → `Frontend/src/app/api/plan/generate/route.ts` (cache-first, mirrors `numericals/generate/route.ts`)
6. Add MySQL table → `Frontend/src/lib/db.ts`
7. Wire frontend → replace mock in the Study Plan view with an `api.ts` call, flip its flag in `flags.ts`

Same pattern every time. No architectural decisions needed.
