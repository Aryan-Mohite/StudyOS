# StudyOS — fixes from full codebase audit (2026-07-18)

Extract this zip into your repo root — paths mirror the repo exactly.
7 files changed, 0 new files, 0 deleted files. Both layers verified clean
after applying these changes: `npx tsc --noEmit` (TypeScript) and
`python3 -m py_compile` (all AgenticService `.py` files).

---

## 1. `Frontend/next.config.ts` — removed dead Express rewrite (real bug)

The old `rewrites()` block proxied every `/api/*` request to
`http://localhost:3001` — a leftover from the pre-rebuild Express gateway,
which `ARCHITECTURE.md` already documents as removed.

**Impact:** Next.js applies array-form `rewrites()` as `afterFiles` —
checked after static routes but before dynamic ones. Your static API paths
(`/api/upload`, `/api/notes/generate`, `/api/chat`, etc.) were unaffected,
but the three dynamic routes — `/api/notes/[topicId]`,
`/api/mcq/[topicId]`, `/api/numericals/[topicId]` (GET + DELETE) — were
silently hijacked to a server that doesn't exist. In practice this meant
every "Regenerate" button's cache-delete step (`deleteNotes`/`deleteMCQ`/
`deleteNumericals`) was silently failing (caught by a swallowed try/catch),
leaving stale rows to pile up in `notes`/`mcq_sets`/`numerical_sets` on
every regeneration. Not user-visible today only because regeneration also
passes `force_regenerate: true`, which bypasses the cache lookup anyway —
but it was a live trap for anything that ever relied on those routes
working (e.g. the unused `getNotes`/`getMCQ`/`getNumericals` GET helpers).

**Fix:** removed the `rewrites()` block entirely.

## 2. `Frontend/src/middleware.ts` — API routes now require auth

Previously `isProtectedRoute` only matched page routes
(`/dashboard`, `/upload`, `/plan`, `/study`, `/profile`). Every `/api/**`
route handler was reachable anonymously and fell back to a shared
`"dev-user-01"` identity on `auth()` returning null — meaning any
unauthenticated caller could hit LLM-calling endpoints (notes/MCQ/
numericals/plan generation, tutor chat, syllabus upload) for free, with
their data landing in one shared bucket alongside every other
unauthenticated caller.

**Fix:** extended `isProtectedRoute` to also match `/api/upload`,
`/api/notes`, `/api/mcq`, `/api/numericals`, `/api/plan`, `/api/chat`, and
`/api/profile`. `/api/health` stays public (no cost, no per-user data). The
existing `dev-user-01` fallback code in each route handler was left in
place as defensive dead code — harmless now that middleware guarantees a
signed-in user before the handler ever runs.

## 3. `AgenticService/main.py` — syllabus parsing now goes through its
   validate→repair workflow (real bug)

`App/workflows/syllabus_workflow.py` fully implements the same
generate → validate quality → repair-once pattern used by MCQ, Numericals,
and Study Plan (`run_pdf_analysis`, built on `syllabus_agent.py`'s
`validate_syllabus_quality`/`repair_syllabus`). But `main.py` was calling
`run_syllabus_parse` directly from `syllabus_agent.py` — the plain
single-shot version with no quality loop — so that repair path for
garbled/placeholder-riddled syllabus parses (a real failure mode for OCR'd
or awkwardly-formatted PDFs) was fully built but never executed. The two
files' docstrings actively disagreed about which one `main.py` calls.

**Fix:** `main.py` now imports and calls `run_pdf_analysis` from
`App/workflows/syllabus_workflow.py` instead of `run_syllabus_parse`. No
request/response contract change — same input (`raw_text`, `filename`),
same output shape.

## 4. `AgenticService/App/agents/syllabus_agent.py` — docstring fix

Updated the module docstring and `run_syllabus_parse`'s docstring so they
correctly describe `main.py`'s actual behavior post-fix, instead of
contradicting each other about which entry point is live.

## 5. `AgenticService/App/workflows/README.md` — doc fix

This file claimed "syllabus parsing is still a single LLM-call-in,
JSON-out operation... so it stays a plain function," which was already
false the day `syllabus_workflow.py` was added, and never mentioned
`study_plan_workflow.py` at all. Rewrote the module list to include both,
and correctly describe how `main.py` calls syllabus parsing now.

## 6. `Frontend/src/lib/api.ts` — fixed `checkHealth()` path

Was requesting `/health`, which doesn't exist — the actual route is
`/api/health` (`Frontend/src/app/api/health/route.ts`). This function is
currently unused anywhere in the app, so it was a dormant bug; fixed it
anyway so it works correctly if/when something calls it.

## 7. `Frontend/src/types/index.ts` — removed stale, unused `StudyPlan`
   type shape

An earlier contract draft (`StudyPlan`/`StudyWeek`/`StudyDay`/`StudyTask`/
`TaskType`/`Priority`, weeks→days→tasks nesting) never matched what the
backend actually returns (`study_plan_id`, flat `days[]` with
`session_type`/`topics`/`focus_note` — see
`AgenticService/App/agents/study_plan_agent.py`). Nothing in the app
imported these types — `app/(dashboard)/plan/page.tsx` defines its own
local interface matching the real contract instead. Removed the stale
types (and the now-dangling `StudyPlanState`/`StudyPlanFeatureState` that
depended on them) so nobody reaches for the wrong shape later. Verified
with a repo-wide grep before removal that nothing else imports any of
these names.

---

### Not fixed (flagged only, needs a product decision)

- The `dev-user-01` fallback pattern still exists in every API route
  handler's code as a defensive no-op. With middleware now enforcing auth
  on those routes, it should never trigger — but if you want it removed
  outright rather than left dormant, that's a quick follow-up.
