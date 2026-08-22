# StudyOS — Technical Documentation

This is the developer-facing reference: architecture, data flow, local
setup, environment variables, testing, and project conventions. For
end-user instructions see [`USER_GUIDE.md`](USER_GUIDE.md). For the full
endpoint list see [`../API.md`](../API.md). For a from-scratch deployment
walkthrough see [`../DEPLOYMENT.md`](../DEPLOYMENT.md).

> This document reflects the codebase as audited directly from the repo.
> A couple of details in the older `ARCHITECTURE.md` and `API.md` (a
> mention of ChromaDB, a three-tier OCR PDF extraction pipeline, and a
> historical "Express gateway" design) are stale — the project has always
> been two layers, the vector store is Qdrant, and OCR was dropped when
> Docker was dropped. This doc is the current source of truth.

---

## 1. Architecture

StudyOS is a **two-layer system.** There is no separate API gateway
service and never has been — Next.js Route Handlers *are* the backend.

```
┌─────────────────────────────────────────────┐
│  Next.js 15 (Vercel)                         │
│  UI (App Router) + API layer, merged          │
│                                                │
│  • Clerk enforces auth on every route          │
│  • Route Handlers under src/app/api/**         │
│    validate input (Zod), check MySQL cache,    │
│    and on a miss call AgenticService           │
│  • mysql2 pool (src/lib/db.ts) — all app data  │
└───────────────────┬───────────────────────────┘
                     │ HTTPS, server-side only
                     │ HS256 service JWT (INTERNAL_SERVICE_JWT_SECRET)
                     ▼
┌─────────────────────────────────────────────┐
│  AgenticService — Python / FastAPI (Render)  │
│  Pure AI layer. No database, no browser access │
│                                                │
│  • pdfplumber → PyMuPDF text extraction        │
│  • LangGraph workflows (generate→validate→repair)│
│  • RAG via Qdrant, embeddings via Gemini API    │
│  • LLM call via configurable provider           │
└───────────────────┬───────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ▼                          ▼
  MySQL (Aiven)              Qdrant (Cloud)
  app data + cache           reference-material
                              embeddings (RAG)
```

**The browser never talks to AgenticService directly** — only server-side
Route Handlers do, via `AGENTIC_SERVICE_URL` (never exposed with a
`NEXT_PUBLIC_` prefix). This means the AI layer can be redeployed, scaled,
or swapped without touching the frontend, and every LLM call is cached
exactly once in MySQL rather than re-paid on every page view.

### Why this split, specifically

| Concern | Decision | Reasoning |
|---|---|---|
| Where does routing/caching logic live? | Next.js Route Handlers | One deploy target on Vercel; no separate Node gateway process to run or pay for |
| Where does AI logic live? | Separate Python/FastAPI service | Best AI-library ecosystem (LangChain/LangGraph, PDF libs); long-running LLM calls don't suit serverless functions the way Route Handlers do |
| Where's the data? | MySQL (Aiven) | Survives redeploys, unlike file-based SQLite; every free host supports it |
| Where are reference-material vectors? | Qdrant Cloud | Render's free web service has **ephemeral disk** — anything persisted locally (the old ChromaDB approach) is wiped on every spin-down/redeploy. Qdrant Cloud's free tier persists independently of the backend process |

## 2. AgenticService internals

```
AgenticService/
  main.py            FastAPI app, route definitions, service-auth dependency
  config.py           Pydantic settings (env var parsing, provider selection)
  App/
    agents/           One file per feature: prompt template + Pydantic
                       request/response contracts + the actual LLM call
    workflows/         One LangGraph graph per feature — main.py calls these,
                        not the agents directly. Each graph is generate →
                        validate → repair (validation failures trigger one
                        repair pass before giving up)
    services/
      llm_service.py    Wraps whichever provider LLM_PROVIDER selects
                         (Groq / Gemini / Anthropic) behind one call_llm()
      pdf_service.py     Two-tier text extraction: pdfplumber → PyMuPDF.
                          No OCR tier — dropped along with Docker (see
                          "Free-tier constraints" below). A PDF with no
                          embedded text layer at all (e.g. a photographed
                          page) returns an error rather than being OCR'd.
      rag_service.py     Qdrant client wrapper. Embeddings via the Gemini
                          Embedding API (gemini-embedding-001, 768-dim),
                          not run locally.
    prompts/            .md prompt templates referenced by agents/
    core/               Shared auth/security helpers (service JWT verification)
  tests/                pytest suite (44 tests as of the last audited commit)
```

**Endpoints** (all except `/health` require the service-to-service JWT):

```
GET   /health
POST  /agent/parse-syllabus
POST  /agent/ingest-reference-material
POST  /agent/generate-notes
POST  /agent/generate-mcq
POST  /agent/generate-study-plan
```

Full request/response contracts for each are in [`../API.md`](../API.md).

## 3. Frontend internals

```
Frontend/src/
  app/
    (auth)/            sign-in / sign-up (Clerk)
    (dashboard)/        authenticated pages: dashboard, upload, study/[topicId],
                         plan, progress, reference, profile
    api/                Route Handlers — the actual backend (see below)
    page.tsx            public landing page
  components/           flat structure — ~18 components, no per-feature
                         subfolders (deliberate; the component count didn't
                         justify the navigation overhead)
    ui/                  shadcn primitives only
  lib/
    db.ts                mysql2 pool + schema creation/migration
    agentic.ts            typed client for calling AgenticService
    api.ts                typed client the frontend components call
    apiHandler.ts          withApiHandler wrapper: auth, logging, rate
                            limiting, consistent error shape — used by
                            every route in app/api/**
    serviceAuth.ts          mints/verifies the internal service JWT
    validation.ts           Zod schemas per route
    rateLimit.ts, roles.ts, env.ts, profile.ts, utils.ts
  types/                 shared TypeScript contracts
```

### API routes (Next.js — the actual backend)

```
POST   /api/upload                        GET /api/upload/latest
POST   /api/notes/generate                 GET/DELETE /api/notes/[topicId]
POST   /api/mcq/generate                    GET/DELETE /api/mcq/[topicId]
GET    /api/mcq/suggested-difficulty
POST   /api/plan/generate
POST   /api/reference                       GET /api/reference
POST   /api/attempts/submit
GET    /api/progress
GET/POST /api/goals/daily                    GET/POST /api/goals/weekly
GET    /api/revision
GET    /api/analytics/dashboard
GET/POST /api/profile
GET    /api/health
```

Every route above is wrapped in `withApiHandler` for consistent Clerk auth
enforcement, structured logging, and rate limiting. See
[`../API.md`](../API.md) for request/response shapes.

### Removed features

**AI Tutor Chat** (`/api/chat*`, `/agent/tutor-chat`) and **Solved
Numericals** (`/api/numericals/*`, `/agent/generate-numericals`) were
deliberately removed from the product — they are not partial/broken
features, they were fully deleted. RAG now feeds only the Notes and MCQ
workflows. If you see references to either elsewhere (including in this
repo's own `CHANGES.md` history), that's expected — they document the
removal, not a feature that still exists.

## 4. Database schema (MySQL)

Tables are created automatically on first request via `initDb()` in
`Frontend/src/lib/db.ts` — no manual SQL needed against a fresh database.
Schema changes to *existing* installs are handled with
`information_schema`-based migration checks (`ALTER TABLE` guarded by a
column-existence check) rather than drop-and-recreate, to avoid data loss.

| Table | Purpose |
|---|---|
| `syllabi` | Parsed syllabus per user (subjects/units/topics tree) |
| `notes` | Cached generated notes, keyed by topic |
| `mcq_sets` | Cached generated MCQ sets, keyed by topic (+ difficulty tracked client-side, see below) |
| `study_plans` | Cached study plans, keyed by `(user, syllabus_id, exam_date)` |
| `attempts` | Every individual MCQ attempt a student submits |
| `topic_mastery` | Rolled-up mastery score per user + topic, derived from `attempts` |
| `revision_schedule` | Computed next-review dates per topic |
| `reference_materials` | Metadata for uploaded reference PDFs (filename, chunk count) — the actual vectors live in Qdrant, not MySQL |
| `daily_goals`, `weekly_goals` | Per-user goal targets and progress |
| `user_profile` | Name, education level, course, university |

Every query that touches user data filters by **both `user_id` and the
relevant scoping ID** (e.g. `syllabus_id` or `topic_id`) — this is what
keeps multiple syllabi/subjects fully isolated per user and closes IDOR
(insecure direct object reference) risk. Ownership checks return **404**,
not 403, by project convention (don't reveal that a resource exists but
belongs to someone else).

## 5. Environment variables

### `Frontend/.env.local`

| Key | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Yes | From the Clerk dashboard |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `..._SIGN_UP_URL`, `..._SIGN_IN_FALLBACK_REDIRECT_URL`, `..._SIGN_UP_FALLBACK_REDIRECT_URL` | Yes | Clerk routing config |
| `DATABASE_URL` | Yes | `mysql://user:pass@host:port/db`. Strip `?ssl-mode=REQUIRED` if present — not compatible with `mysql2`'s connection options as-is |
| `DB_POOL_SIZE` | No (default 10) | Connection pool size |
| `DB_SSL_CA` | Only for TLS-enforcing hosts (Aiven) | Full PEM contents of the CA cert |
| `AGENTIC_SERVICE_URL` | Yes | Must be the **live Render URL** in production — a `localhost` value here in Vercel is a common misconfiguration |
| `INTERNAL_SERVICE_JWT_SECRET` | Yes | Must exactly match the AgenticService's copy of this value |
| `NEXT_PUBLIC_USE_REAL_API` | Yes (`true`) | |

### `AgenticService/.env`

| Key | Required | Notes |
|---|---|---|
| `LLM_PROVIDER` | Yes | `groq` \| `gemini` \| `anthropic` |
| `GROQ_API_KEY` / `GROQ_MODEL_NAME` | If `LLM_PROVIDER=groq` | Default model `llama-3.3-70b-versatile` |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL_NAME` | If `LLM_PROVIDER=anthropic` | |
| `GEMINI_API_KEY` / `GEMINI_MODEL_NAME` | **Always required** | Embeddings run through the Gemini API regardless of `LLM_PROVIDER` — see §6 |
| `QDRANT_URL`, `QDRANT_API_KEY` | Production only | Blank locally → falls back to an embedded on-disk Qdrant instance |
| `QDRANT_LOCAL_PATH` | No (default `vector_db`) | Local fallback path |
| `INTERNAL_SERVICE_JWT_SECRET` | Yes in production | Must match the Frontend's copy |
| `ALLOWED_ORIGINS` | Yes | Comma-separated list of origins allowed to call this service (CORS) |
| `PORT` | No | Render sets this automatically |

## 6. Free-tier constraints (and why they shaped the code)

This project has a hard requirement of running entirely on free hosting
tiers. That constraint directly explains several non-obvious decisions:

- **No Docker.** The only reason Docker was ever needed was installing
  the `tesseract-ocr` system binary for an OCR PDF-extraction fallback.
  Render's free native-Python runtime can't install OS packages, only
  `pip install`. Dropping the OCR tier (pdfplumber → PyMuPDF is now the
  full chain) let the service move off Docker entirely, which simplified
  the Render build. Trade-off: a genuinely scanned/photographed syllabus
  with no embedded text layer now errors instead of being OCR'd.
- **Embeddings run via an API, not locally.** Local embeddings
  (`sentence-transformers` + `torch`) needed 400–600MB RAM once loaded —
  over Render's free-tier 512MB cap, and it crashed the service at
  startup, before any request landed. Embeddings were moved to the Gemini
  Embedding API (`gemini-embedding-001`, 768-dim), which is why
  `GEMINI_API_KEY` is required even when `LLM_PROVIDER=groq`.
- **Qdrant Cloud instead of local Chroma.** Render's free web service has
  ephemeral disk — anything persisted to it is wiped on every
  spin-down/redeploy. Qdrant Cloud's free tier persists independently.
- **Cold starts are expected, not a bug.** Render's free tier spins the
  service down after 15 minutes of inactivity; the next request pays a
  30–60s wake-up cost. A cron job pings the service to reduce this, but
  the current ping interval (hourly) is less frequent than the 15-minute
  sleep window, so cold starts still happen in practice — tightening this
  interval is an open item (see `README.md`'s "on the horizon" notes if
  present, or the project's own tracking).

If StudyOS ever needs to leave the free tier, the cheapest durable next
step documented in `DEPLOYMENT.md` is a small VPS (Ubuntu + PM2 + Uvicorn
+ Nginx) instead of four separate free-tier dependencies, each with its
own failure mode.

## 7. Testing & verification

```bash
# Frontend — Vitest
cd Frontend
npm run test            # single run
npm run test:watch      # watch mode
npm run test:coverage   # with coverage

# Type-check + build (part of every delivery's verification)
npx tsc --noEmit
npm run build

# AgenticService — pytest
cd AgenticService
pytest

# Compile-check every file (part of every delivery's verification)
python3 -m py_compile App/**/*.py main.py config.py
```

Every code change is expected to pass `tsc --noEmit` + `next build` on the
frontend and `py_compile` + `pytest` on AgenticService before it's
considered done — this is a project convention, not just a CI nicety.

## 8. Security conventions

- **Ownership checks return 404, not 403** on any resource scoped to a
  user (notes, MCQs, plans, reference material) — this avoids confirming
  a resource exists when it belongs to someone else.
- **Every DB query on user-scoped data filters by both `user_id` and the
  relevant ID** (`syllabus_id`, `topic_id`, etc.) — this is what isolates
  multiple syllabi/subjects per user and prevents IDOR.
- **Service-to-service auth** between Next.js and AgenticService is a
  short-lived HS256 JWT signed with `INTERNAL_SERVICE_JWT_SECRET`, minted
  per-request by Next.js and verified by AgenticService — the two values
  must match exactly across both deployments.
- **Rate limiting** is enforced on both layers (Next.js via
  `rateLimit.ts`, AgenticService via `slowapi`).
- **No `dev-user-01` or other debug-auth fallback** exists in any live
  code path — only historical references remain in migration/cleanup
  logic in `db.ts`.
- **Multi-step state changes are transactional** — e.g. recording an MCQ
  attempt (`recordAttempt`) updates `attempts`, `topic_mastery`, and
  `revision_schedule` as a single DB transaction, not three independent
  writes that could partially fail.

## 9. Adding a new feature

The established pattern (used consistently for Notes, MCQ, and Study
Plan) is:

1. **Prompt** → `AgenticService/App/prompts/<feature>.md`
2. **Agent** → `AgenticService/App/agents/<feature>_agent.py` — Pydantic
   request/response contracts + the LLM call via `llm_service.call_llm()`
3. **Workflow** → `AgenticService/App/workflows/<feature>_workflow.py` —
   a LangGraph graph: generate → validate → repair
4. **Endpoint** → register in `AgenticService/main.py`
   (`POST /agent/<feature>`, behind the service-auth dependency)
5. **Next.js route** → `Frontend/src/app/api/<feature>/generate/route.ts`
   — cache-first against MySQL, `withApiHandler`-wrapped, calls the new
   AgenticService endpoint via `lib/agentic.ts` on a cache miss
6. **MySQL table** → add to `Frontend/src/lib/db.ts`'s schema
   creation/migration block
7. **Frontend** → wire the new `api.ts` client call into the relevant
   component/page

Following this exactly (rather than improvising a new shape) is what
keeps the codebase's cache behavior, auth enforcement, and error handling
consistent across features.

## 10. Known documentation gaps

- No `LICENSE` file exists in the repo yet.
- No `CONTRIBUTING.md` exists — if the project starts accepting outside
  contributions, worth adding one describing the verification steps in
  §7 as a PR checklist.
- `ARCHITECTURE.md` (root) predates the Qdrant migration and the Study
  Plan feature shipping; this document supersedes it for anything the two
  disagree on.
