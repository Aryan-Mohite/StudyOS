# CHANGES.md — Backend Hardening (JWT, roles, secure APIs, logging, rate limiting, validation, background tasks, DB optimization, env config)

## Scope confirmed with Aryan before starting
- JWT: service-to-service (Next.js → AgenticService), not a replacement for Clerk.
- One delivery covering all 9 areas.
- Rate limiting on both layers.

---

## 1. JWT Authentication (service-to-service)

**Problem:** AgenticService (FastAPI) had zero protection — no auth of any
kind. Only CORS stood between it and any caller who could reach its port,
and CORS does nothing against server-to-server requests. Anyone on the
same network/host could hit `/agent/generate-notes` etc. directly and burn
LLM/OCR budget for free.

**Fix:**
- `Frontend/src/lib/serviceAuth.ts` mints a short-lived (60s) HS256 JWT on
  every call to AgenticService (`getServiceToken()`), signed with
  `INTERNAL_SERVICE_JWT_SECRET`.
- `AgenticService/App/core/security.py` verifies it (`verify_service_token`
  FastAPI dependency), checking issuer, audience, expiry, and signature.
  Applied to every `/agent/*` route except `/health`.
- Both sides read the same secret from env — **you must set the identical
  value** in `Frontend/.env.local` and `AgenticService/.env`
  (`INTERNAL_SERVICE_JWT_SECRET`). Generate one with `openssl rand -hex 32`.

**Explicitly not done:** replacing or duplicating Clerk. Clerk remains the
only user-facing auth. This token proves "this call came from our Next.js
backend," nothing about which student is asking — AgenticService still
doesn't know about individual users.

## 2. User roles

**Problem:** no role concept existed anywhere; nothing currently *needs*
one (there are no admin-only features today).

**Fix (forward-compatible infra, not new admin routes):**
- `Frontend/src/lib/roles.ts` — `getUserRole()` reads
  `sessionClaims.metadata.role` from Clerk (defaults to `"student"`), and
  `requireRole()` throws `ForbiddenError` (caught by `withApiHandler` → 403)
  if it doesn't match.
- `Frontend/src/lib/types-clerk.ts` — types the custom claim.
- **Not wired into any route** — there's nothing today that should be
  admin-gated, so I didn't invent one. To use it later: add a `role`
  custom session claim in the Clerk dashboard (Sessions → Customize session
  token), set `publicMetadata.role = "admin"` on a user, then add
  `requireRole(sessionClaims, "admin")` at the top of any route that needs it.

## 3. Secure APIs

- **Service auth** (#1) closes AgenticService's open door.
- **Ownership fixes** — two real authorization gaps found during audit and
  fixed as part of this pass, since they're squarely "secure APIs":
  - `plan/generate/route.ts` used to fetch a syllabus by client-supplied
    `syllabus_id` with no check that it belonged to the caller — any
    signed-in user could generate a study plan from another user's syllabus
    by guessing/observing its id. Now scoped `WHERE id = ? AND user_id = ?`,
    404s if not owned.
  - `reference/route.ts` (both GET and POST) had the same gap for listing/
    attaching reference material. Same fix applied via a shared
    `assertOwnsSyllabus()` check.
- **Generic error responses** — `withApiHandler`'s catch-all never forwards
  a raw error message/stack to the client; it logs the real detail
  server-side and returns `"Something went wrong."` for anything unexpected.
  Routes that call AgenticService still surface AgenticService's own
  `detail` message on purpose (that's operator-facing content, not internal
  error trace).
- **Auth consistency** — `withApiHandler` enforces `auth()` once, centrally,
  instead of each route repeating `const { userId } = await auth(); if
  (!userId) return 401`. Applied to all 15 routes touched in this pass.

**Not fixed (flagged, not silently patched):** `mcq/[topicId]` and
`notes/[topicId]` DELETE have no per-user ownership check, but this is
intentional by design — notes/mcq_sets are a shared cache keyed by
`topic_id` only (no `user_id` column), consistent with the project's
cache-first architecture. Any signed-in user can force a regeneration by
deleting the cached entry for a topic. That's a mild annoyance (next reader
pays the regeneration cost), not a data-leak — leaving as-is since changing
it means deciding whether notes/MCQs should become per-user data, which is
a product decision, not a hardening bug.

## 4. Logging

- **AgenticService**: `App/core/logging_config.py` — structured JSON logs
  via `python-json-logger`, one line per request (`request_completed` /
  `request_failed`) with `request_id`, route, status, duration, client IP.
  Generation endpoints additionally log a `generation_event` line via
  `BackgroundTasks` (see #7) with topic id, duration, and success/failure —
  never prompt/response content. `x-request-id` echoed back in the response
  header for cross-service correlation with the Frontend's own request id.
- **Frontend**: `withApiHandler` logs one structured JSON line per request
  (route, method, userId, status, duration, requestId) to stdout — PM2
  captures stdout to its own log files, so no new log infra needed.

## 5. Rate limiting (both layers, as requested)

- **AgenticService**: `slowapi`, in-memory, keyed by client IP.
  Generation endpoints: 20/min. Ingestion (PDF upload/parsing): 10/min.
  429 returns a clean JSON body via a custom exception handler.
- **Frontend**: `Frontend/src/lib/rateLimit.ts`, in-memory fixed-window,
  keyed by `route:userId` (falls back to IP for the rare unauthenticated
  case). Three presets in `RATE_LIMITS`: `generation` (15/min — LLM-backed
  routes), `write` (30/min — cheap DB writes), `read` (60/min — GETs).
- **Why in-memory, not Redis:** consistent with the project's "stay lean
  until a specific problem demands it" stance — this is a single-process
  VPS deployment (see deployment plan). Noted in both files: if
  AgenticService is ever horizontally scaled, or PM2 is ever run in cluster
  mode, the limiter needs a shared store (Redis) or the effective limit
  multiplies per instance.

## 6. API validation

- **AgenticService**: Pydantic models in `main.py` now have real bounds —
  `min_length`/`max_length` on every string field, `ge`/`le` on `count`,
  `pattern` on `difficulty` and `exam_date`, list length caps on
  `syllabus_context`. Previously most fields were untyped `str`/`list` with
  no bounds, so a malformed or huge payload would reach an LLM call before
  failing. Also added a hard 15MB request-body cap on PDF uploads (was
  unbounded on the AgenticService side — the Frontend already capped at
  10MB, but nothing stopped a direct call from sending more).
- **Frontend**: `Frontend/src/lib/validation.ts` — Zod schemas for every
  write route (`notesGenerateSchema`, `mcqGenerateSchema`,
  `planGenerateSchema`, `attemptSubmitSchema`, `dailyGoalSchema`,
  `weeklyGoalSchema`, `profileUpdateSchema`), replacing ad-hoc/loose
  per-route checks with one consistent, bounded set of rules. `parseBody()`
  turns a validation failure into a clean 400 with a specific message
  instead of a 500 from a downstream `undefined` access.

## 7. Background tasks

- **AgenticService**: every generation endpoint (`generate-notes`,
  `generate-mcq`, `generate-study-plan`) now logs a `generation_event`
  (endpoint, topic id, duration, success) via `BackgroundTasks` *after* the
  response is already sent — it doesn't add latency to what the student is
  waiting on.
- **Scope note:** I did not move the actual generation calls (PDF parsing,
  notes/MCQ/plan generation) to background jobs with polling. That's a
  bigger architectural change — it would mean the Frontend routes returning
  immediately with a job id and the UI polling for completion, touching
  most of the generation UI. Given the "stay lean" principle and that this
  wasn't asked for explicitly, I kept the existing synchronous-but-awaited
  contract and only used background tasks for the genuinely fire-and-forget
  work (logging). Worth a dedicated follow-up if generation latency becomes
  a UX problem.
- PDF text extraction (`extract_pdf_text`) is CPU-bound and blocking
  (pdfplumber/PyMuPDF, worst case per-page Tesseract OCR) — it now runs via
  `run_in_threadpool` in `/agent/parse-syllabus` and
  `/agent/ingest-reference-material` instead of blocking the event loop for
  every other in-flight request while OCR runs. This isn't a "background
  task" in the fire-and-forget sense, but it's the other half of not
  blocking the server on a slow synchronous operation.

## 8. Database optimization

- `Frontend/src/lib/db.ts` pool: connection limit now configurable via
  `DB_POOL_SIZE` (was hardcoded at 10), plus `enableKeepAlive` (drops dead
  connections instead of handing them out — matters after a MySQL restart
  or a managed provider's idle-connection timeout) and a 10s
  `connectTimeout` so a hung connection attempt fails fast instead of
  hanging a request indefinitely.
- **Index audit:** checked every hot query path against existing indexes
  (`idx_notes_topic_id`, `idx_mcq_sets_topic_id`, `idx_attempts_user_topic`,
  `idx_attempts_user_date`, `idx_revision_user_date`,
  `idx_reference_materials_syllabus`, etc.) — all read/write paths touched
  in this pass already have a covering index. No new indexes were needed.
- **Not done:** query-level profiling (EXPLAIN on production data volumes)
  — there's no production data yet to profile against. Worth revisiting
  post-launch if any dashboard/analytics query gets slow.

## 9. Environment configuration

- **AgenticService** (`config.py`): added a `pydantic` `model_validator`
  that fails fast at import time (crashes the process with `SystemExit(1)`
  and a clear message) if: the configured `LLM_PROVIDER` isn't one of
  groq/gemini/anthropic, its matching API key isn't set, or (in
  `ENV=production`) `INTERNAL_SERVICE_JWT_SECRET` is missing. Previously a
  missing key surfaced as an opaque error the first time a route tried to
  call the LLM.
- **Frontend** (`src/lib/env.ts` + `src/instrumentation.ts`): a Zod schema
  validates all required env vars once at server boot (Next.js
  instrumentation hook, no config flag needed on Next 15) — Clerk keys,
  `DATABASE_URL` (must be a `mysql://` URI), `AGENTIC_SERVICE_URL`,
  `INTERNAL_SERVICE_JWT_SECRET` (enforced ≥32 chars). Throws with an
  itemized list of what's missing/invalid instead of a vague runtime crash
  later.
- **Both `.env.example` files updated** with the new required vars and
  comments on where to generate them.

---

## Pre-existing issue found during audit — NOT fixed in this delivery

`npx tsc --noEmit` on unmodified `main` already fails with **20 errors**,
entirely inside the Tutor Chat and Numericals features:
`src/app/api/chat/route.ts`, `src/app/api/numericals/generate/route.ts`,
`src/components/ChatPanel.tsx`, `src/components/NumericalsView.tsx`. They
import functions (`tutorChat`, `getCachedFaqAnswer`,
`getNotebookIdForSyllabus`, `normalizeQuestion`, `upsertFaqCache`,
`generateNumericals`) and types (`ChatSource`, `TutorResponse`,
`NumericalSet`, `NumericalsState`) that don't exist in
`lib/agentic.ts`/`lib/db.ts`/`types.ts`. `db.ts`'s own migration comments
say these features were removed, but the route/UI files calling them
weren't deleted — so `npm run build` currently fails on `main`, before any
of my changes.

This is unrelated to the hardening work requested, and fixing it properly
needs UI changes too (a separate, sizable task) — I did not touch it. What
I *did* verify: `npx tsc --noEmit` after my changes produces the exact same
20 errors, in the exact same 4 files, and nothing else — my changes
introduce zero new type errors. `npm run build`'s webpack compile step
succeeds cleanly (no bundling errors from anything I touched); it fails at
the type-check step for the same 4 pre-existing files.

**Recommendation:** decide whether Tutor Chat / Numericals should be fully
removed (delete the 4 broken files + their nav entries) or fully restored
(rebuild the missing `db.ts`/`agentic.ts` functions) — happy to do either
as a follow-up once you've picked a direction.

---

## Files touched

**AgenticService**
- `config.py` — env validation, new `internal_service_jwt_secret` setting
- `main.py` — full rewrite: auth, rate limiting, logging, tightened validation, background task logging, threadpool for blocking PDF work
- `App/core/security.py` (new)
- `App/core/rate_limit.py` (new)
- `App/core/logging_config.py` (new)
- `App/core/__init__.py` (new)
- `requirements.txt` — added `pyjwt`, `slowapi`, `python-json-logger`
- `.env.example` — new vars

**Frontend**
- `src/lib/env.ts` (new)
- `src/instrumentation.ts` (new)
- `src/lib/serviceAuth.ts` (new)
- `src/lib/rateLimit.ts` (new)
- `src/lib/apiHandler.ts` (new)
- `src/lib/roles.ts` (new)
- `src/lib/types-clerk.ts` (new)
- `src/lib/validation.ts` (new)
- `src/lib/agentic.ts` — attach service JWT to all 5 outbound calls
- `src/lib/db.ts` — pool tuning
- `.env.local.example` — new vars
- Routes rewritten with `withApiHandler` (+ validation where they write):
  `upload`, `upload/latest`, `reference` (GET+POST, + ownership fix),
  `notes/generate`, `notes/[topicId]`, `mcq/generate`, `mcq/[topicId]`,
  `plan/generate` (+ ownership fix), `attempts/submit`, `profile`,
  `goals/daily`, `goals/weekly`, `analytics/dashboard`, `progress`,
  `revision`

**Not touched:** `chat/*`, `numericals/*` (pre-existing broken, see above),
`health` routes (intentionally unauthenticated on both layers, used for
uptime probes).

## Verification performed

- AgenticService: `py_compile` on every `.py` file — clean. New modules
  import-tested with dummy env vars — clean. Fail-fast validation
  confirmed to actually crash the process when a required key is missing.
- Frontend: `npx tsc --noEmit` — 20 pre-existing errors, 0 new ones.
  `npm run build` — webpack compile succeeds; build fails only at the
  type-check step, only on the 4 pre-existing broken files.

## Before running this

1. Set `INTERNAL_SERVICE_JWT_SECRET` to the **same** `openssl rand -hex 32`
   value in both `Frontend/.env.local` and `AgenticService/.env`.
2. `cd Frontend && npm install` (adds `jose`, `zod`).
3. `cd AgenticService && pip install -r requirements.txt` (adds `pyjwt`,
   `slowapi`, `python-json-logger`).
4. Optionally set `ENV=production` in `AgenticService/.env` once deployed —
   dev leaves the JWT secret check non-fatal so local setup with a stub
   secret still boots.
