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
Auth: Clerk session cookie. Routes that read `auth()` fall back to a
`dev-user-01` placeholder user only when no Clerk session is present
(local dev convenience — do not rely on this in production).

### Syllabus

**`POST /api/upload`**
Uploads a syllabus PDF, parses it via the AgenticService, and caches the
result. Auto-creates a `notebooks` row for this subject (no separate
"create notebook" step exists).
- Body: `multipart/form-data`, field `file` (PDF, ≤10 MB)
- 200 → parsed syllabus contract (see [`syllabus_agent.py`](AgenticService/App/agents/syllabus_agent.py)) + `notebook_id`
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

### Solved Numericals

**`POST /api/numericals/generate`**
- Body: `{ topic_id, topic_name, subject, count?: number (1–10, default 5), difficulty?: "easy"|"medium"|"hard"|"mixed" (default "mixed"), syllabus_context?, syllabus_id?, force_regenerate? }`
- 400 if `difficulty` isn't one of the four allowed values.

**`GET /api/numericals/:topicId`** / **`DELETE /api/numericals/:topicId`** — same shape as Notes.

### Study Plan

**`POST /api/plan/generate`**
Builds a day-by-day schedule from a syllabus and an exam date.
- Body: `{ syllabus_id, exam_date: "YYYY-MM-DD", force_regenerate?: boolean }`
- Cached per `(user, syllabus_id, exam_date)` — a new exam date always regenerates.
- 200 → `{ study_plan_id, syllabus_id, exam_date, total_days, days: [{ day_number, session_type: "learn"|"revision"|"mock_test"|"rest", topics: [{topic_id, topic_name, subject}], focus_note }], _cached }`
- 400 → missing/malformed input · 404 → syllabus not found · 502 → generation failed

### AI Tutor Chat

**`POST /api/chat`**
Single tutor turn, scoped to one topic. Conversation memory for the live
LangGraph turn is in-process (`session_id = "{user_id}:{topic_id}"`); every
turn is also durably persisted to MySQL for history (see below).
- Body: `{ question, topic_id, topic_name, subject, syllabus_context?: string[], syllabus_id? }`
- 200 → `{ message_id, answer, confidence, sources_referenced, follow_up_suggestions, out_of_scope }`
- 400 → missing required fields · 502 → tutor response failed

**`GET /api/chat?topic_id=...`**
Returns the persisted message history for the current user's conversation
on this topic, oldest first — used to resume a chat.
- 200 → `{ session_id, messages: [{ role: "user"|"assistant", content, isOutOfScope }] }`

**`GET /api/chat/sessions`**
Lists every topic the current user has chatted about, newest-first, with a
preview of the last message — powers the browsable chat-history page.
- 200 → `{ sessions: [{ topic_id, topic_name, subject, message_count, last_message_at, last_message_preview }] }`

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

**`POST /agent/generate-notes`** — JSON body matches `NotesRequest`: `topic_id, topic_name, subject, unit_title, syllabus_context, syllabus_id?, student_context?, notebook_id?`. Generates notes, then indexes them into the RAG store for Tutor Chat to retrieve later.

**`POST /agent/generate-mcq`** — `MCQRequest`: `topic_id, topic_name, subject, count (default 10), difficulty (default "mixed"), syllabus_context, syllabus_id?, student_context?`. LangGraph generate → validate → repair (checks duplicate `concept_tested`, difficulty distribution, lazy explanations).

**`POST /agent/generate-numericals`** — `NumericalsRequest`, same shape as MCQ with `count` default 5. Validates for empty `given` fields and placeholder answers.

**`POST /agent/generate-study-plan`** — `StudyPlanRequest`: `syllabus_id, syllabus (full parsed contract), exam_date ("YYYY-MM-DD")`. LangGraph generate → validate → repair (checks every topic scheduled exactly once, contiguous day numbering, a revision day present for plans of 4+ days).

**`POST /agent/tutor-chat`** — `TutorRequest`: `session_id, question, topic_id, topic_name, subject, syllabus_context, notebook_id?`. RAG-retrieves from the topic's notes, then answers with `MemorySaver` conversation-turn checkpointing keyed by `session_id`. This checkpoint is in-process only — it does not survive a restart, which is why the Next.js layer separately persists every turn to MySQL (`chat_messages`) for durable history.

All `/agent/*` endpoints return `502` with `{ detail: "<context>: <error>" }` on an LLM/generation failure, and share the underlying Pydantic contract models defined next to each workflow in `AgenticService/App/agents/`.
