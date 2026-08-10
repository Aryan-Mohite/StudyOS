# CHANGES-BUGFIXES.md — Bug fixing + performance (items 8, 9)

Found by auditing the codebase against the project's own established security
pattern ("no client-supplied IDs trusted without ownership verification")
rather than a generic sweep — these are the places that pattern was missed.
Two real bugs (one of them a genuine IDOR), one correctness+perf fix on the
hottest write path, one DB index fix on the hottest read path.

Delivered as changed/new files only — extract at repo root, overwriting
existing paths.

## Bug 1 (security): `/api/notes/[topicId]` and `/api/mcq/[topicId]` had no ownership check

**Before:** `GET`/`DELETE /api/notes/:topicId` and `/api/mcq/:topicId` looked
up or deleted rows by `topic_id` alone — no check that the requesting user's
syllabus actually owned that topic. `topic_id` is a UUID (`App/agents/syllabus_agent.py`
generates it via `uuid.uuid4()`), so this isn't exploitable by *guessing*
ids — but any signed-in user who *obtained* another student's topic_id
(a shared link, a screenshot with a URL visible, browser history sync, a
referrer header) could read or **delete** that student's notes/MCQs with
zero verification. Every other syllabus-scoped route in this codebase
already enforces `syllabusBelongsToUser` before trusting a client-supplied
id (see `lib/db.ts`'s doc comment on that function) — these two routes were
the gap.

**Fix:** both routes now require a `syllabus_id` query param, verify it via
`syllabusBelongsToUser`, and scope the SQL by `topic_id AND syllabus_id`
instead of `topic_id` alone. 404 (not 403) on a failed check, matching the
convention already used everywhere else. `lib/api.ts`'s `getNotes`/`deleteNotes`/`getMCQ`/`deleteMCQ`
now take a required `syllabusId` param; the two call sites (`MCQQuiz.tsx`,
`NotesView.tsx`) pass it through — both already had `syllabusId` available
as a prop, so this was a pure plumbing fix.

## Bug 2 (security, more serious): `/api/notes/generate` and `/api/mcq/generate` trusted a client-supplied `syllabus_id` for RAG grounding

**Before:** both generate routes accepted `syllabus_id` in the request body
and passed it straight to AgenticService, which uses it to retrieve
uploaded reference material for grounding (see `App/services/rag_service.py`).
No ownership check. A signed-in user could set `syllabus_id` to *any*
value in the request body and get notes/MCQs generated grounded in another
student's private uploaded reference material — a more serious version of
Bug 1, since it doesn't even require obtaining a topic_id, just a
syllabus_id (which appears in more places — e.g. every page URL under
`/dashboard`, `/plan`, `/progress` while that syllabus is active).

**Fix:** both routes now call `syllabusBelongsToUser(syllabus_id, userId)`
before using it for anything, returning 404 if it fails. Skipped entirely
when `syllabus_id` is omitted (trained-knowledge-only generation, a
legitimate flow already supported by the schema's `.optional()`). Also
tightened the cache-check `SELECT` in both routes to filter by
`topic_id AND syllabus_id` instead of `topic_id` alone, for the same
defense-in-depth reason as Bug 1.

## Bug 3 (correctness) + perf: `recordAttempt` wasn't transactional

**Before:** every graded MCQ answer triggered 5 separate `pool.query()`
calls (insert `attempts`, upsert `topic_mastery`, re-`SELECT` it, `SELECT`
+ upsert `revision_schedule`, upsert `daily_goals`) — each one its own
connection-pool checkout, with no transaction wrapping them. If the
process crashed or the connection dropped between any two of these writes,
the rollup tables (`topic_mastery`, `revision_schedule`, `daily_goals`) would
permanently disagree with the source-of-truth `attempts` table, with no
reconciliation path.

**Fix:** `recordAttempt` now acquires one connection, wraps all 5
statements in a transaction (`beginTransaction` / `commit` / `rollback` on
error / `release` in `finally`), so it's all-or-nothing. This is also a
perf win on the hottest write path in the app: 1 pool checkout instead of
5 per attempt, which matters under concurrent load (each checkout has real
overhead — pool bookkeeping, plus a wait if the pool is momentarily
exhausted).

## Perf: missing composite index on `syllabi(user_id, created_at)`

**Before:** `syllabi` had a single-column index on `user_id`. The hottest
read in the app — `fetchLatestSyllabus()` on every dashboard page load, and
the identical query in `/api/upload/latest` — runs
`SELECT ... WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`. With only
`user_id` indexed, MySQL narrows to that user's rows via the index but
still needs a filesort to satisfy `ORDER BY created_at DESC`.

**Fix:** schema definition changed to a composite `idx_syllabi_user_created
(user_id, created_at)`, which lets the query walk the index in the right
order and stop at the first row — no sort. Added an idempotent migration
step in `migrateSchema()` (the existing `information_schema`-check pattern
already used for the other migrations in that function) so installs
created before this fix pick up the new index — and drop the now-redundant
single-column one — the next time `initDb()` runs, with no manual SQL
required.

## Regression tests added
- `src/app/api/notes/[topicId]/__tests__/route.test.ts` — proves the fixed
  route 400s with no `syllabus_id`, 404s (without querying `notes` at all)
  on an owned-by-someone-else syllabus, and scopes both the `SELECT` and
  the `DELETE` by `syllabus_id` when ownership checks out.
- `src/app/api/mcq/generate/__tests__/route.test.ts` — proves the fixed
  route 404s (without ever calling AgenticService) when `syllabus_id`
  doesn't belong to the caller, proceeds normally when it does or when
  it's omitted entirely, and scopes the cache-hit lookup by `syllabus_id`.

Both suites mock `@/lib/db` and (for the mcq test) `@/lib/agentic` — no
real MySQL/AgenticService needed to run them.

## Verification performed
- `npx tsc --noEmit` — clean.
- `npx next lint` — "No ESLint warnings or errors".
- `npx vitest run` — **63/63 passed** (58 from the previous testing pass + 5 new regression tests; two of the notes-route tests initially failed on a test-authoring bug on my end — `withApiHandler`'s returned route function takes `(req, routeParams)`, not `(req, ctx, routeParams)` — caught and fixed before delivery, not shipped broken).
- AgenticService `pytest` — re-ran for sanity (untouched by this pass): 35/35 still passing.

## What's not covered (flagging honestly)
- This was a targeted audit against one specific pattern (missing ownership
  checks) plus the two most obviously hot paths (`recordAttempt`,
  `fetchLatestSyllabus`) — not an exhaustive line-by-line review of every
  route or every query in the codebase. A few things worth a closer look in
  a future pass if you want to keep going down this list:
  - No load testing was done to confirm the `recordAttempt` transaction
    change actually reduces latency under concurrency (it should, by
    construction — 1 checkout vs 5 — but "should" isn't "measured").
  - Client-side perf (bundle size, re-render profiling, image optimization)
    wasn't audited this pass — the app has no `<img>` tags anywhere
    (confirmed during the earlier accessibility pass), so there's no
    obvious low-hanging fruit there, but no formal profiling was run either.
  - AgenticService's own hot paths (the LangGraph workflows, Qdrant
    queries) weren't profiled — out of scope for this pass, same reasoning
    as the testing pass's gap list (needs either a real LLM/vector-DB call
    or heavy mocking to exercise meaningfully).
