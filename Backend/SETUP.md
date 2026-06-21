# StudyOS Backend — Phase 3 Setup (Notes + MCQ)

## What's here

Lean FastAPI backend, now covering Notes (Phase 2) and MCQ (Phase 3):

| Endpoint | What it does |
|---|---|
| `POST /api/upload` | Accept PDF → extract text → parse with Claude → return syllabus JSON |
| `GET  /api/upload/latest` | Return latest syllabus for a user (no re-parse) |
| `POST /api/notes/generate` | Generate structured notes for a topic (cached after first generation) |
| `GET  /api/notes/{topic_id}` | Fetch cached notes without LLM call |
| `DELETE /api/notes/{topic_id}` | Bust cache so notes regenerate |
| `POST /api/mcq/generate` | Generate a 10-question MCQ set for a topic (cached after first generation) |
| `GET  /api/mcq/{topic_id}` | Fetch cached MCQ set without LLM call |
| `DELETE /api/mcq/{topic_id}` | Bust cache so the MCQ set regenerates |
| `GET  /health` | Health check |

**Storage:** SQLite (`studyos.db`) — no Docker, no Postgres, no Redis needed.  
**LLM:** Direct Claude API calls via `anthropic` SDK — no LangGraph yet.

---

## First-time setup

```bash
cd Backend

# 1. Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Create .env file
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

---

## Daily dev workflow

```bash
cd Backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

The API is now at `http://localhost:8000`.  
Interactive docs: `http://localhost:8000/docs`

---

## Frontend connection

In `Frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_USE_REAL_API=true
```

With `USE_REAL_API=false` (or unset), the frontend falls back to mock data — useful for UI work without running the backend.

---

## Testing the endpoints manually

**Upload a syllabus:**
```bash
curl -X POST http://localhost:8000/api/upload \
  -F "file=@/path/to/syllabus.pdf" \
  -F "user_id=dev-user-01"
```

**Generate notes:**
```bash
curl -X POST http://localhost:8000/api/notes/generate \
  -H "Content-Type: application/json" \
  -d '{
    "topic_id": "t-ht-001",
    "topic_name": "Fourier'\''s Law of Heat Conduction",
    "subject": "Heat Transfer",
    "unit_title": "Conduction",
    "syllabus_context": ["Thermal Resistance", "Critical Radius", "Extended Surfaces"]
  }'
```

**Fetch cached notes:**
```bash
curl http://localhost:8000/api/notes/t-ht-001
```

**Force regenerate (bypass cache):**
```bash
curl -X POST http://localhost:8000/api/notes/generate \
  -H "Content-Type: application/json" \
  -d '{ ..., "force_regenerate": true }'
```

**Generate an MCQ set:**
```bash
curl -X POST http://localhost:8000/api/mcq/generate \
  -H "Content-Type: application/json" \
  -d '{
    "topic_id": "t-ht-001",
    "topic_name": "Fourier'\''s Law of Heat Conduction",
    "subject": "Heat Transfer",
    "count": 10,
    "difficulty": "mixed",
    "syllabus_context": ["Thermal Resistance", "Critical Radius", "Extended Surfaces"]
  }'
```

**Fetch cached MCQ set:**
```bash
curl http://localhost:8000/api/mcq/t-ht-001
```

---

## Phase 2 validation checklist

**Status: explicitly deferred (2026-06-21).** Architecture, prompt, validation layer, and frontend wiring are complete and build-clean, but the items below were not formally verified before moving to Phase 3. Decision: proceed anyway, revisit before real users.

- [ ] 3 different university PDF formats parse correctly
- [ ] 10 different topics generate consistently useful notes
- [ ] Cached notes are returned instantly (no LLM call) on second request
- [ ] LLM returning malformed JSON is handled gracefully (retry + error message)
- [ ] PDF with no extractable text returns a clear 422 error
- [ ] Notes contract matches `contracts/notes.contract.json` exactly
- [ ] Cost per notes generation is acceptable (log token usage)

## Phase 3 validation checklist — MCQ

Same status as above: code-level verification only (Pydantic validation tested against contract examples, generate → cache → fetch → delete cycle tested end-to-end with a mocked LLM, malformed-JSON failure path confirmed to return 502). Not yet validated:

- [ ] 10+ topics across different subjects produce plausible, non-absurd distractors
- [ ] Explanations actually address a specific wrong option, not just restate the question
- [ ] Difficulty distribution in "mixed" mode roughly matches 30/50/20 easy/medium/hard over multiple generations
- [ ] No question stem gives away the answer through phrasing
- [ ] Cost per MCQ generation is acceptable (log token usage)

---

## What's NOT here yet (Phase 3 remainder, Phase 4+)

- Numericals, Chat, Study Plan endpoints
- MySQL migration (stays SQLite until needed)
- Qdrant / vector search (add when Chat RAG is built)
- Celery + Redis (add when generation exceeds 30 seconds consistently)
- Cloudflare R2 (add when local PDF storage becomes a problem)
- Auth middleware (Clerk added in Phase 4)
