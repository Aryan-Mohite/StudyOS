# Remove AI Tutor Chat + Solved Numericals — Changes

Delivered as changed files only, paths mirror the repo root. Extract over
your working copy of `StudyOS/`. Files with no remaining purpose were
deleted rather than left as dead code.

Built against a fresh clone/read of the repo per usual. Verified with
`python3 -m py_compile` (all changed AgenticService files, clean) and
`tsc --noEmit` (clean, zero errors).

---

## Summary

Removed two features end-to-end, per explicit request: **AI Tutor Chat**
and **Solved Numericals**. This includes their frontend UI, Next.js API
routes, AgenticService agents/workflows/prompts, and MySQL tables —
everything specific to these two features, including infrastructure that
existed *only* to support them.

## AI Tutor Chat — removed

- **Frontend:** `components/ChatPanel.tsx`, `api/chat/route.ts`,
  `api/chat/sessions/route.ts`, `(dashboard)/history/page.tsx` deleted.
  Tutor panel and mobile "AI Tutor" overlay removed from
  `(dashboard)/study/[topicId]/page.tsx`; "History" link removed from
  `AppNavbar.tsx`.
- **AgenticService:** `App/agents/tutor_agent.py`,
  `App/workflows/tutor_workflow.py`, `App/prompts/tutor_chat.md` deleted;
  `POST /agent/tutor-chat` endpoint removed from `main.py`.
- **DB:** `chat_messages` and `chat_faq_cache` tables dropped (via
  migration `DROP TABLE IF EXISTS` in `lib/db.ts`, so existing installs
  clean up automatically on next start, not just fresh ones).

## Solved Numericals — removed

- **Frontend:** `components/NumericalsView.tsx`,
  `api/numericals/generate/route.ts`, `api/numericals/[topicId]/route.ts`
  deleted. "Problems" tab removed from the study page. `attempts.submit`
  and its type now only accept `content_type: "mcq"` (the `"numerical"`
  variant is gone).
- **AgenticService:** `App/agents/numericals_agent.py`,
  `App/workflows/numericals_workflow.py`,
  `App/prompts/numericals_generator.md` deleted; `POST
  /agent/generate-numericals` endpoint removed from `main.py`.
- **DB:** `numerical_sets` table dropped (same migration cleanup as above).
  The `attempts` table itself is untouched — it's shared with MCQ and its
  historical rows aren't feature-specific.

## Judgment calls (flagging explicitly, not silently)

1. **Dropped `notebooks` table and `syllabi.notebook_id` column.** These
   existed *solely* to scope the Tutor's own RAG retrieval
   (`studyos_notes_{notebook_id}` Chroma collections) — reference-material
   RAG (used by Notes/MCQ grounding) is scoped by `syllabus_id` directly and
   never touched notebooks. With Tutor gone, this linkage had no remaining
   consumer, so it's removed rather than left as dead infrastructure,
   consistent with the project's lean-infra stance. `lib/db.ts` migrates
   existing installs by dropping the column/index on next `initDb()` call.
2. **Removed `has_numericals` from the syllabus contract.** This field
   existed only to flag numerically-heavy topics for two consumers: the
   removed Numericals feature, and the study-plan agent's "don't cluster
   numerically-heavy topics" scheduling rule (also removed). Dropped from
   `syllabus_parser.md`'s output contract, `SyllabusTopic` (frontend type),
   `study_plan_agent.py`'s topic flattening, and the dashboard's topic-count
   stat that read it.
3. **Simplified `rag_service.py` and `notes_workflow.py`.** The
   `studyos_notes` collection and `index_note()`/`retrieve_context()`
   functions existed only to feed Tutor Chat's retrieval step — nothing else
   ever read from that collection. Removed along with the notes-generation
   workflow's now-pointless "index into RAG" node (Notes generation itself
   is unaffected; only the post-generation indexing step, whose sole
   consumer was Tutor, is gone). Reference-material RAG
   (`index_reference_material` / `retrieve_reference_context`, used by
   Notes/MCQ grounding) is untouched.
4. **Deleted two stale docs referencing only-now-deleted files.** Root
   `README.md` (a historical "Profile + Auto-Notebooks + RAG patch" note)
   and `AgenticService/MIGRATION_NOTES.md` (a one-time migration record)
   exclusively documented `tutor_agent.py`, `tutor_workflow.py`,
   `ChatPanel.tsx`, and the `notebooks` table/`notebook_id` linkage — all
   now gone. Left in place, they'd actively mislead anyone reading them.
   `API.md`, `ARCHITECTURE.md`, and `App/workflows/README.md` are the
   maintained docs and have been updated in place instead.
5. **Copy-only edits, no behavior change:** landing page (`Hero.tsx`,
   `Features.tsx`), `terms/page.tsx`, `privacy/page.tsx` (also drops the
   now-inaccurate "chat history" data-collection claim), `layout.tsx`
   metadata, `dashboard/page.tsx`, `progress/page.tsx`,
   `profile/page.tsx`, `reference/page.tsx`, and `NotesView.tsx`'s
   empty-state suggestion all had numericals/tutor mentions removed or
   reworded.

## Not touched

- Reference-material upload/RAG (`api/reference/*`,
  `index_reference_material`, `retrieve_reference_context`,
  `has_reference_material` in `rag_service.py`) — still used by Notes and
  MCQ generation for grounding.
- The `attempts`, `topic_mastery`, `revision_schedule`, `daily_goals`,
  `weekly_goals` tables and their routes — shared personalized-learning
  infrastructure, still fully used by MCQ attempts.
- Study Plan feature — unrelated to this request.

---

# Week 5 — RAG + Knowledge Base — Changes

Delivered as changed files only, paths mirror the repo root. Extract over
your working copy of `StudyOS/`.

Built against a fresh clone/read of the repo per usual. Verified with
`python3 -m py_compile` (all changed AgenticService files, clean),
`tsc --noEmit` (clean, zero errors), and `next build` (compiles + lints
clean — the only failure is Clerk rejecting the placeholder publishable key
in `.env.local.example` during static prerendering, expected without real
credentials, not a code issue).

---

## Context

Before writing any code, I read the actual repo state. Most of the Week 5
checklist was already built in earlier sessions: Chroma vector DB, chunking,
embeddings, semantic search, context retrieval, multi-document support — and,
contrary to what memory had flagged as still outstanding, the reference
material upload UI (`/reference` + `/api/reference`) already exists.

Three real gaps remained against this week's stated goal ("AI answers only
from uploaded syllabus", "much more accurate responses"). This delivery
closes all three, scoped and confirmed with you before starting:

1. Tutor Chat never queried uploaded reference material — only generated notes.
2. Citations were topic-level only, not source-level (no filename attribution).
3. No FAQ caching — every chat turn hit the LLM, even for repeated questions.

---

## 1. Tutor Chat now grounds in reference material, not just generated notes

**Problem:** `tutor_workflow.py` only called `retrieve_context()` (the
student's own generated notes). Notes/MCQ/Numericals generation already
retrieved from a syllabus's uploaded reference material
(`retrieve_reference_context()`), but the Tutor chatbot — the feature
students actually converse with — never did.

**Fix:**
- `AgenticService/App/workflows/tutor_workflow.py` — `_retrieve_node` now
  calls both `retrieve_context()` (notes, k=3) and, when a `syllabus_id` is
  present, `retrieve_reference_context()` (reference material, k=3), and
  merges the results. No reference material uploaded yet is treated as the
  expected default, not an error — same pattern as `notes_workflow.py`.
- `AgenticService/main.py` — `TutorRequest` gains an optional `syllabus_id`
  field, passed through to `run_tutor_turn`.
- `Frontend/src/lib/agentic.ts` — `TutorChatPayload` gains `syllabus_id`.
- `Frontend/src/app/api/chat/route.ts` — now forwards `syllabus_id` to the
  AgenticService (previously it was only used to resolve `notebook_id`).

`ChatPanel.tsx` already had a `syllabus_id` prop wired in from the caller,
so no page-level changes were needed there.

## 2. Source-level citations

**Problem:** `sources_referenced` was a flat list of topic names, with no
way to tell whether an answer drew on the student's own notes or an
uploaded textbook — despite the reference collection already tagging each
chunk with its filename.

**Fix:**
- `rag_service.py` — both `retrieve_context()` and
  `retrieve_reference_context()` now tag each returned chunk with
  `source_type` (`"notes"` / `"reference"`).
- `tutor_agent.py` — retrieved chunks are split into a "notes" context
  block and a "reference material" context block, sent to the LLM
  separately. New `SourceRef` model (`{type, label}`) replaces free-text
  citation; `sources_referenced` (kept for backward compatibility) is now
  *derived* from the model's structured `sources` output rather than asked
  for twice, so the two fields can't disagree.
- `App/prompts/tutor_chat.md` — updated contract and rules: cite
  `type: "reference"` + filename or `type: "notes"` + topic name based on
  which block actually informed the answer; prefer reference material when
  it directly covers the question (primary source), fall back to notes,
  fall back to general knowledge only when both are empty.
- `Frontend/src/types/index.ts` — added `ChatSource` type; `TutorResponse`
  now carries both `sources` (structured) and `sources_referenced`
  (derived labels, unchanged shape for any other consumer).
- `Frontend/src/components/ChatPanel.tsx` — renders a small badge row under
  each assistant message showing which notes/reference sources it cited
  (book icon for notes, file icon for reference material).

**Fixed in this delivery, not just flagged:** `chat_messages` now has a
`sources_json` column. The assistant's structured `sources` are persisted
on every turn and returned by `GET /api/chat`, so reloading a conversation
shows the same citation badges as the live answer did — not just for
in-session messages.

## 3. FAQ caching for Tutor Chat

**Problem:** Every chat turn called the LLM, even for a question that's
been asked (identically or near-identically) many times before, e.g. "what
is polymorphism" — no cache-first pattern here despite it being used
everywhere else in the app.

**Fix:**
- `Frontend/src/lib/db.ts` — new `chat_faq_cache` table, keyed on
  `(topic_id, question_normalized)` with a unique index. Added
  `normalizeQuestion()` (lowercase, trim, strip punctuation, collapse
  whitespace — fuzzy match, per your choice) plus `getCachedFaqAnswer()`
  and `upsertFaqCache()`.
- `Frontend/src/app/api/chat/route.ts` — on a request, first checks whether
  this is the *first* turn of the session (no prior `chat_messages` rows).
  If so, normalizes the question and checks the cache before calling the
  AgenticService; a hit returns the stored response with `_cached: true`
  and skips the LLM entirely. A miss falls through to the normal LLM call,
  and the result is written into the cache afterward.

**Deliberate restriction — flagged, not silent:** caching only applies on
a session's first turn. Reusing a cached answer mid-conversation would
ignore the student's actual chat history and could produce a
context-blind non-sequitur. Restricting to first-turn also means there's
no chat_history drift: the AgenticService's LangGraph checkpointer
(in-memory, per session) is empty at that point too, so skipping the LLM
call there doesn't cost any conversational state. If FAQ caching across
mid-conversation turns is wanted later, it'd need explicit reasoning about
how to reconcile a cached answer with live chat history — not attempted
here.

---

## 4. Citation persistence across page reloads

**Fix:**
- `Frontend/src/lib/db.ts` — `chat_messages` gains a `sources_json` column
  (fresh installs via `CREATE TABLE`, existing installs via the
  `migrateSchema()` upgrade path, same pattern as the `notebook_id`
  migration already in place).
- `POST /api/chat` now writes the assistant's `sources` into that column.
- `GET /api/chat` now returns `sources` per message (safely parsed, `[]` on
  anything malformed or `NULL`), so `ChatPanel.tsx` renders citation badges
  identically whether the message just arrived or was reloaded from history.

---

## Incidental fix

- `Frontend/src/app/(dashboard)/reference/page.tsx` — fixed a pre-existing
  unescaped-apostrophe ESLint error (`react/no-unescaped-entities`) that
  was failing `npm run build` regardless of this session's changes. One
  line, unrelated to the RAG work above, fixed so the build could be
  verified cleanly end-to-end.

## Files changed

```
AgenticService/App/services/rag_service.py
AgenticService/App/workflows/tutor_workflow.py
AgenticService/App/agents/tutor_agent.py
AgenticService/App/prompts/tutor_chat.md
AgenticService/main.py
Frontend/src/lib/agentic.ts
Frontend/src/lib/db.ts
Frontend/src/app/api/chat/route.ts
Frontend/src/types/index.ts
Frontend/src/components/ChatPanel.tsx
Frontend/src/app/(dashboard)/reference/page.tsx
```

## Still open (from the roadmap, unchanged by this session)

- `dev-user-01` fallback removal — still pending your explicit call.
- Real end-to-end RAG smoke test — needs live API keys + full stack, can't
  be done in this sandbox.
