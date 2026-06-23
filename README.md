# StudyOS

**AI-powered learning platform for Indian engineering students.**

Upload any university syllabus PDF → get structured notes, MCQs, solved numericals, a study plan, and an AI tutor — all scoped to your exact curriculum.

---

## Architecture

```
┌─────────────────────────────┐
│   React / Next.js  :3000    │  ← Your browser
└──────────┬──────────────────┘
           │ HTTP
           ▼
┌─────────────────────────────┐
│   Express Gateway  :3001    │  ← Routing, SQLite cache
└──────────┬──────────────────┘
           │ HTTP (internal)
           ▼
┌─────────────────────────────┐
│  Python AgenticService:8000 │  ← Claude API, PDF parsing, Pydantic
└─────────────────────────────┘
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full details.

---

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- An Anthropic API key (`sk-ant-...`)

### 1. AgenticService (Python / Claude)

```bash
cd AgenticService
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env

pip install -r requirements.txt
python main.py
# Running on http://localhost:8000
```

### 2. Express Gateway (Node.js)

```bash
cd Backend-Express
cp .env.example .env
npm install
npm run dev
# Running on http://localhost:3001
```

### 3. Frontend (Next.js)

```bash
cd Frontend
cp .env.local.example .env.local
npm install
npm run dev
# Running on http://localhost:3000
```

Open http://localhost:3000 — upload a syllabus PDF and start studying.

---

## Toggle Real vs Mock API

In `Frontend/.env.local`:

```env
# Use real Claude backend
NEXT_PUBLIC_USE_REAL_API=true
NEXT_PUBLIC_API_URL=http://localhost:3001

# OR use mock data (no backend required)
NEXT_PUBLIC_USE_REAL_API=false
```

---

## Project Structure

```
StudyOS/
├── Frontend/                  # Next.js 15 + TypeScript + Tailwind
│   └── src/
│       ├── app/               # Next.js App Router pages
│       ├── components/        # UI components (landing, dashboard, topic)
│       ├── lib/               # api.ts, flags.ts, mock-api.ts
│       ├── mocks/             # Realistic mock data (Phase 1)
│       └── types/             # Contract types shared with backend
│
├── Backend-Express/           # Express.js API gateway
│   └── src/
│       ├── server.js          # Entry point
│       ├── db.js              # SQLite (cache layer)
│       └── routes/            # upload.js, notes.js, mcq.js
│
├── AgenticService/            # Python FastAPI (AI-only, internal)
│   ├── main.py                # FastAPI app
│   ├── config.py              # Settings from .env
│   ├── services/
│   │   ├── llm.py             # Claude API wrapper + JSON extraction
│   │   ├── pdf_parser.py      # pdfplumber + syllabus parsing
│   │   ├── notes_service.py   # Notes generation + Pydantic validation
│   │   └── mcq_service.py     # MCQ generation + Pydantic validation
│   └── prompts/               # LLM prompt files
│       ├── notes_generator.md
│       ├── mcq_generator.md
│       └── syllabus_parser.md
│
└── ARCHITECTURE.md            # Detailed architecture decisions
```

---

## Roadmap

- [x] Phase 1 — Full UI on mock data
- [x] Phase 2 — Notes feature end-to-end
- [x] Phase 3 (partial) — MCQ Generator
- [ ] Phase 3 — Solved Numericals
- [ ] Phase 3 — AI Tutor Chat
- [ ] Phase 3 — Study Plan Generator
- [ ] Phase 4 — Infrastructure (auth, scaling)
- [ ] Phase 5 — Real user testing
