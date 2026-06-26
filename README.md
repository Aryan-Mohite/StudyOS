# StudyOS

**AI-powered learning platform for Indian engineering students.**

Upload any university syllabus PDF → get structured notes, MCQs, solved numericals, a study plan, and an AI tutor — all scoped to your exact curriculum.

---

## Architecture

```
┌───────────────────────────────┐
│   Next.js (UI + API Routes)  │  ← Your browser + server, deployed on Vercel
└──────────────┬─────────────────┘
               │ HTTPS (server-side only)
               ▼
┌───────────────────────────────┐
│  Python AgenticService        │  ← Claude API, PDF parsing, Pydantic
│  Deployed on Railway/Render   │
└──────────────┬─────────────────┘
               │
        (no DB connection)

┌───────────────────────────────┐
│  MySQL                        │  ← Used only by Next.js
│  PlanetScale / Railway / Aiven│
└───────────────────────────────┘
```

The old Express gateway has been merged into Next.js Route Handlers, and the
cache layer moved from file-based SQLite to hosted MySQL — this gives a
**2-service deploy** (Vercel + Railway/Render) instead of three, with no
behavior changes. See [ARCHITECTURE.md](./ARCHITECTURE.md) for full details
on what changed and why.

---

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- A MySQL database (local install, or a free PlanetScale/Railway/Aiven instance)
- An Anthropic API key (`sk-ant-...`)

### 1. MySQL

Create an empty database — tables are created automatically on first request:

```sql
CREATE DATABASE studyos;
```

### 2. AgenticService (Python / Claude)

```bash
cd AgenticService
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env

pip install -r requirements.txt
python main.py
# Running on http://localhost:8000
```

### 3. Frontend (Next.js — UI + API routes)

```bash
cd Frontend
cp .env.local.example .env.local
# Add DATABASE_URL (MySQL connection string) and AGENTIC_SERVICE_URL

npm install
npm run dev
# Running on http://localhost:3000
```

Open http://localhost:3000 — upload a syllabus PDF and start studying.

There is no separate gateway step anymore — Next.js's own API routes
(`src/app/api/**`) do what `Backend-Express` used to do.

---

## Toggle Real vs Mock API

In `Frontend/.env.local`:

```env
# Use the real API routes (Next.js -> FastAPI -> MySQL)
NEXT_PUBLIC_USE_REAL_API=true

# OR use mock data (no backend required)
NEXT_PUBLIC_USE_REAL_API=false
```

`NEXT_PUBLIC_API_URL` is no longer needed in normal use — the API routes are
same-origin now. Only set it if you split the API routes into a separately
deployed service later.

---

## Deployment

| Service | Platform | Notes |
|---|---|---|
| Next.js (UI + API) | **Vercel** | Connect the repo, set `DATABASE_URL` and `AGENTIC_SERVICE_URL` as env vars, deploy |
| AgenticService | **Railway** or **Render** | Uses the included `Dockerfile` (or `Procfile`); set `ANTHROPIC_API_KEY` and `ALLOWED_ORIGINS` (your Vercel URL) |
| MySQL | **PlanetScale**, **Railway**, or **Aiven** | Copy the connection string into `DATABASE_URL` on Vercel |

---

## Project Structure

```
StudyOS/
├── Frontend/                  # Next.js 15 + TypeScript + Tailwind
│   └── src/
│       ├── app/
│       │   ├── api/           # Route Handlers — replaces Backend-Express
│       │   │   ├── upload/
│       │   │   ├── notes/
│       │   │   ├── mcq/
│       │   │   └── health/
│       │   └── ...            # Next.js App Router pages
│       ├── components/        # UI components (landing, dashboard, topic)
│       ├── lib/
│       │   ├── api.ts         # Client used by components (same-origin fetch)
│       │   ├── db.ts          # MySQL pool + schema (replaces db.js)
│       │   ├── agentic.ts     # Server-side AgenticService client (replaces axios calls)
│       │   ├── flags.ts
│       │   └── mock-api.ts
│       ├── mocks/              # Realistic mock data (Phase 1)
│       └── types/              # Contract types shared with AgenticService
│
├── AgenticService/             # Python FastAPI (AI-only, internal)
│   ├── main.py                 # FastAPI app
│   ├── config.py               # Settings from .env
│   ├── Dockerfile              # For Railway/Render
│   ├── Procfile                # Alternative to Dockerfile
│   ├── services/
│   │   ├── llm.py              # Claude API wrapper + JSON extraction
│   │   ├── pdf_parser.py       # pdfplumber + syllabus parsing
│   │   ├── notes_service.py    # Notes generation + Pydantic validation
│   │   └── mcq_service.py      # MCQ generation + Pydantic validation
│   └── prompts/                # LLM prompt files
│       ├── notes_generator.md
│       ├── mcq_generator.md
│       └── syllabus_parser.md
│
└── ARCHITECTURE.md             # Detailed architecture decisions
```

---

## Roadmap

- [x] Phase 1 — Full UI on mock data
- [x] Phase 2 — Notes feature end-to-end
- [x] Phase 3 (partial) — MCQ Generator
- [x] Tech stack migration — Express+SQLite → Next.js API routes+MySQL
- [ ] Phase 3 — Solved Numericals
- [ ] Phase 3 — AI Tutor Chat
- [ ] Phase 3 — Study Plan Generator
- [ ] Phase 4 — Infrastructure (auth, scaling)
- [ ] Phase 5 — Real user testing
