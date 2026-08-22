# StudyOS

**Turn your university syllabus into a structured study system.**

StudyOS takes the syllabus PDF your college hands you and turns it into
notes, practice MCQs, and a day-by-day study plan — all scoped to exactly
what's on your syllabus, tracked per subject, and personalized to your own
accuracy over time. Built for Indian engineering students (SPPU, VTU,
Mumbai University, and similar semester-pattern courses), but the
underlying pipeline works for any syllabus-driven course.

🔗 **Live app:** [study-os-liart-six.vercel.app](https://study-os-liart-six.vercel.app/)
📦 **Repo:** [github.com/Aryan-Mohite/StudyOS](https://github.com/Aryan-Mohite/StudyOS)

---

## What it does

| Feature | What you get |
|---|---|
| **Syllabus parsing** | Upload a syllabus PDF → StudyOS extracts every unit and topic into a structured tree you can navigate |
| **Structured notes** | Per-topic notes generated on demand, grounded in your syllabus wording |
| **MCQ practice** | Auto-generated multiple-choice sets per topic, with an Easy / Medium / Hard / Mixed difficulty selector |
| **Reference material grounding** | Upload your own textbook chapters or lecture PDFs per subject — notes and MCQs are generated *from* that material via RAG instead of the model's general knowledge |
| **Study plans** | Give it an exam date; it builds a day-by-day schedule across your syllabus, with dedicated revision and mock-test days |
| **Personalized progress** | Every MCQ attempt updates a per-topic mastery score, surfaces weak topics, and schedules revision reminders |
| **Goals & streaks** | Daily question-count and weekly topic-count goals, tracked on a dashboard |

StudyOS does **not** currently include an AI tutor chat or a solved-numericals
generator — both existed early on and were deliberately removed to keep the
product focused on notes, MCQs, and study planning. If you're reading an
older description of the project that mentions either, it's out of date.

## Screenshots

> Add a few screenshots or a short GIF of the dashboard, a generated notes
> page, and the study-plan view here before publishing — nothing replaces
> visuals on a project README.

## Tech stack

**Frontend** — Next.js 15 (App Router, TypeScript), Tailwind CSS + shadcn/ui,
Framer Motion, Clerk (auth), Zod, mysql2. Deployed on Vercel.

**AgenticService** — Python / FastAPI, LangChain + LangGraph (generate →
validate → repair workflows), Qdrant (RAG vector store), pdfplumber +
PyMuPDF (PDF text extraction). Deployed on Render's free native-Python
runtime (no Docker).

**Data** — MySQL (Aiven free tier) for all app data and caching; Qdrant
Cloud (free tier) for reference-material embeddings.

**LLM** — Configurable provider (Groq `llama-3.3-70b-versatile` by default,
or Gemini / Anthropic). Embeddings always run through the Gemini Embedding
API regardless of which provider generates text.

The whole stack runs entirely on free tiers — see
[`docs/DOCUMENTATION.md`](docs/DOCUMENTATION.md) for why that shapes several
architecture decisions (e.g. why there's no Docker, why embeddings don't
run locally).

## Architecture, one paragraph

There are exactly two services. **Next.js is the backend as well as the
UI** — its Route Handlers under `Frontend/src/app/api/**` enforce auth,
check a MySQL cache, and on a cache miss call the second service. The
**AgenticService** (FastAPI) does nothing but AI work: parsing PDFs,
running LangGraph workflows, and talking to the LLM and vector store. The
browser never talks to AgenticService directly. Full diagrams and the
reasoning behind this split are in
[`docs/DOCUMENTATION.md`](docs/DOCUMENTATION.md).

## Repository layout

```
StudyOS/
  Frontend/           Next.js app (UI + API routes) — deploys to Vercel
    src/app/           pages (App Router) and API route handlers
    src/components/    React components
    src/lib/           db.ts, agentic.ts, api.ts, auth/validation helpers
  AgenticService/     Python/FastAPI AI service — deploys to Render
    App/agents/        prompt + Pydantic contract per feature
    App/workflows/     one LangGraph graph per feature
    App/services/      llm_service.py, pdf_service.py, rag_service.py
  render.yaml         Render Blueprint (AgenticService)
  docs/               User Guide + technical documentation (this delivery)
```

## Getting started locally

You need three things running: MySQL, the AgenticService, and the Next.js
frontend.

```bash
# 1. AgenticService
cd AgenticService
cp .env.example .env        # fill in an LLM key (Groq/Gemini/Anthropic) + GEMINI_API_KEY
pip install -r requirements.txt
uvicorn main:app --reload   # → http://localhost:8000

# 2. Frontend (new terminal)
cd Frontend
cp .env.local.example .env.local   # fill in Clerk keys + DATABASE_URL
npm install
npm run dev                 # → http://localhost:3000
```

MySQL schema is created automatically on first request — no manual SQL
needed. Full environment variable reference, a from-scratch free-tier
deployment walkthrough (Vercel + Render + Aiven + Qdrant Cloud), and
troubleshooting notes live in [`docs/DOCUMENTATION.md`](docs/DOCUMENTATION.md)
and [`DEPLOYMENT.md`](DEPLOYMENT.md).

## Documentation

| Doc | For |
|---|---|
| [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md) | Students using the app — what each page does and how to get the most out of it |
| [`docs/DOCUMENTATION.md`](docs/DOCUMENTATION.md) | Developers — architecture, data flow, environment variables, testing, project conventions |
| [`API.md`](API.md) | Full endpoint-by-endpoint API reference (Next.js routes + internal AgenticService routes) |
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | Step-by-step free-tier deployment guide |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Earlier architecture notes — largely superseded by `docs/DOCUMENTATION.md`, kept for history |

## Testing

```bash
# Frontend
cd Frontend && npm run test

# AgenticService
cd AgenticService && pytest
```

Both layers are verified with `tsc --noEmit` / `next build` and
`py_compile` / `pytest` before anything ships — see
[`docs/DOCUMENTATION.md`](docs/DOCUMENTATION.md#testing--verification).

## License

No license file is currently included in this repository. Until one is
added, treat the code as "all rights reserved" by default — add a
`LICENSE` file (MIT is the common choice for projects like this) if you
want to make reuse terms explicit.

## Author

Built by [Aryan Mohite](https://github.com/Aryan-Mohite).
