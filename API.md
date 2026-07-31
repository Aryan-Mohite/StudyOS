# StudyOS API Documentation

StudyOS is two layers, no gateway in between:

- **Frontend (Next.js)** — `Frontend/src/app/api/**`. These Route Handlers *are*
  the backend the browser talks to. They authenticate the request (Clerk),
  check the MySQL cache, and — on a cache miss — call the AgenticService.
- **AgenticService (FastAPI)** — `AgenticService/main.py`. Pure AI layer: PDF
  parsing, LangGraph workflows, RAG. No database, no caching, not exposed to
  the browser directly. Only the Next.js layer calls it.

Almost all product code should call the **Next.js routes** below. The
**AgenticService routes** are documented for completeness and for local
testing of the Python layer in isolation.

---

## 1. Next.js API (called by the browser)

Base URL: your Next.js deployment, e.g. `http://localhost:3000`.
Auth: Clerk session cookie, enforced by `middleware.ts` on every route below —
requests without a valid session get a redirect (pages) or `401` (API
routes) before the handler runs.

### Syllabus

**`POST /api/upload`**
Uploads a syllabus PDF, parses it via the AgenticService, and caches the
result.
- Body: `multipart/form-data`, field `file` (PDF, ≤10 MB)
- 200 → parsed syllabus contract (see [`syllabus_agent.py`](AgenticService/App/agents/syllabus_agent.py))
- 400 → missing/non-PDF/oversized file · 502 → parsing failed

**`GET /api/upload/latest`**
Returns the current user's most recently uploaded syllabus.
- 200 → parsed syllabus contract · 404 → no syllabus uploaded yet

### Notes

**`POST /api/notes/generate`**
- Body: `{ topic_id, topic_name, subject, unit_title, syllabus_context?: string[], syllabus_id?: string, force_regenerate?: boolean }`
- Cache-first on `topic_id`; skip the cache with `force_regenerate: true`.
- 200 → notes contract, `_cached: boolean` · 400 → missing required fields · 502 → generation failed

**`GET /api/notes/:topicId`** → cached notes for a topic, 404 if none exist yet
**`DELETE /api/notes/:topicId`** → deletes cached notes for a topic

### MCQs

**`POST /api/mcq/generate`**
- Body: `{ topic_id, topic_name, subject, count?, difficulty?, syllabus_context?, syllabus_id?, force_regenerate? }`
- Same cache-first / `_cached` behavior as Notes.

**`GET /api/mcq/:topicId`** / **`DELETE /api/mcq/:topicId`** — same shape as Notes.

**`GET /api/mcq/suggested-difficulty?topic_id=...`**
A difficulty suggestion only — the student still picks the difficulty
themselves. Derived from their own accuracy on this topic, not returned
until there are at least 3 prior attempts (`"mixed"` otherwise).
- 200 → `{ topic_id, suggested_difficulty: "easy"|"medium"|"hard"|"mixed" }`

### Study Plan

**`POST /api/plan/generate`**
Builds a day-by-day schedule from a syllabus and an exam date.
- Body: `{ syllabus_id, exam_date: "YYYY-MM-DD", force_regenerate?: boolean }`
- Cached per `(user, syllabus_id, exam_date)` — a new exam date always regenerates.
- 200 → `{ study_plan_id, syllabus_id, exam_date, total_days, days: [{ day_number, session_type: "learn"|"revision"|"mock_test"|"rest", topics: [{topic_id, topic_name, subject}], focus_note }], _cached }`
- 400 → missing/malformed input · 404 → syllabus not found · 502 → generation failed

### Reference Material

**`POST /api/reference`**
Uploads one textbook/lecture PDF, indexes it into that syllabus's Chroma
collection via the AgenticService, and records the filename in MySQL.
Optional — Notes/MCQ generation works fine with nothing
uploaded; it just answers from trained knowledge instead of grounding in
your material (`grounded_in_reference: false` on those responses).
- Body: `multipart/form-data`, fields `file` (PDF, ≤10 MB) and `syllabus_id`
- 200 → `{ id, filename, chunks_indexed, text_length }`
- 400 → missing/non-PDF/oversized file or missing `syllabus_id` · 502 → extraction/indexing failed

**`GET /api/reference?syllabus_id=...`**
Lists files already uploaded for a syllabus, newest first.
- 200 → `{ materials: [{ id, filename, chunks_indexed, created_at }] }`

### Personalized Learning

**`POST /api/attempts/submit`**
Records one graded MCQ answer, and rolls the result into `topic_mastery`,
`revision_schedule`, and today's `daily_goals`.
- Body: `{ topic_id, topic_name, subject, syllabus_id?, content_type: "mcq", difficulty: "easy"|"medium"|"hard", is_correct: boolean }`
- 200 → `{ mastery_score, total_attempts, correct_attempts, next_review_date }`

**`GET /api/progress`** → `{ topics: TopicMastery[], overall_accuracy: number|null, total_attempts: number }`

**`GET /api/goals/daily`** / **`POST /api/goals/daily`** — get or set today's daily question-count goal.

**`GET /api/goals/weekly`** / **`POST /api/goals/weekly`** — get or set this week's topic-count goal.

**`GET /api/revision`** → `{ items: RevisionItem[] }` — topics due for revision in the next 7 days (including overdue).

**`GET /api/analytics/dashboard`** → aggregated dashboard payload: streak, daily/weekly goals, weak topics, upcoming revisions, overall accuracy.

### Profile

**`GET /api/profile`** → `{ exists, profile }` for the signed-in user (401 if signed out)
**`POST /api/profile`** → upsert `{ name, education_level, course, university }` (all required strings), returns the saved profile

### Health

**`GET /api/health`** → `{ status: "ok", version, layer: "nextjs-api-routes" }`

---

## 2. AgenticService API (internal — called only by the Next.js layer)

Base URL: `AGENTIC_SERVICE_URL` (e.g. `http://localhost:8000`). Not exposed
to the browser; CORS is locked to `ALLOWED_ORIGINS`.

**`GET /health`** → `{ status, layer: "python-agentic", provider, model }`

**`POST /agent/parse-syllabus`** — `multipart/form-data`: `file` (PDF), `filename` (optional). Three-tier text extraction (pdfplumber → PyMuPDF → Tesseract OCR) then LLM parse. 422 if no text could be extracted (e.g. pure scanned image the OCR tier also failed on).

**`POST /agent/ingest-reference-material`** — `multipart/form-data`: `syllabus_id`, `file` (PDF). Optional, callable zero or more times per syllabus; indexes a student-supplied reference PDF (textbook chapter, past-paper solutions) into that syllabus's RAG collection. Generation endpoints work without this — they fall back to trained knowledge alone.

**`POST /agent/generate-notes`** — JSON body matches `NotesRequest`: `topic_id, topic_name, subject, unit_title, syllabus_context, syllabus_id?, student_context?`. Grounds generation in any uploaded reference material for `syllabus_id`, if present.

**`POST /agent/generate-mcq`** — `MCQRequest`: `topic_id, topic_name, subject, count (default 10), difficulty (default "mixed"), syllabus_context, syllabus_id?, student_context?`. LangGraph generate → validate → repair (checks duplicate `concept_tested`, difficulty distribution, lazy explanations).

**`POST /agent/generate-study-plan`** — `StudyPlanRequest`: `syllabus_id, syllabus (full parsed contract), exam_date ("YYYY-MM-DD")`. LangGraph generate → validate → repair (checks every topic scheduled exactly once, contiguous day numbering, a revision day present for plans of 4+ days).

All `/agent/*` endpoints return `502` with `{ detail: "<context>: <e>" }` on an LLM/generation failure, and share the underlying Pydantic contract models defined next to each workflow in `AgenticService/App/agents/`.

---

**Removed features:** The AI Tutor Chat (`/api/chat`, `/api/chat/sessions`,
`/agent/tutor-chat`) and Solved Numericals (`/api/numericals/*`,
`/agent/generate-numericals`) endpoints have been removed from the product.
See `CHANGES.md` for details.
