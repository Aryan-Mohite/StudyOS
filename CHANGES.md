# Reference Material Upload UI + dev-user-01 Removal — Changes

Delivered as changed/new files only, paths mirror the repo root. Extract over
your working copy of `StudyOS/`.

Built against a fresh clone of `github.com/Aryan-Mohite/StudyOS` (main), read
before writing per usual. Verified with `tsc --noEmit` (clean) and
`next build` (compiles + lints clean — 2 pre-existing `_req` unused-var
warnings, not new; the prerender error you'll see locally if you build with
a dummy Clerk key is unrelated to this change, it's Clerk rejecting a fake
publishable key).

---

## 1. Reference material upload UI

The AgenticService endpoint (`POST /agent/ingest-reference-material`) already
existed and worked — there was just no way to reach it from the browser.

**New:**
- `Frontend/src/app/api/reference/route.ts` — `POST` forwards a PDF to the
  AgenticService for extraction + Chroma indexing, then records the filename
  in MySQL. `GET ?syllabus_id=...` lists what's already uploaded.
- `Frontend/src/app/(dashboard)/reference/page.tsx` — drag-and-drop upload
  page, mirrors the existing `/upload` page's visual pattern. Shows already-
  uploaded files, states for idle/selected/indexing/success/error. Reuses
  the existing `SyllabusUploadState` type rather than inventing new UI
  states — the states map directly (upload → parse/index → success/error).

**Changed:**
- `Frontend/src/lib/agentic.ts` — added `ingestReferenceMaterial()`, mirrors
  `parseSyllabus()`.
- `Frontend/src/lib/db.ts` — added `reference_materials` table (records
  filename + chunk count per syllabus; the vector store itself remains the
  source of truth for retrieval, this is a listing convenience) and
  `insertReferenceMaterial()` / `getReferenceMaterials()` helpers.
- `Frontend/src/lib/api.ts` — added `uploadReferenceMaterial()` /
  `getReferenceMaterials()` client functions.
- `Frontend/src/types/index.ts` — added `ReferenceMaterial` type.
- `Frontend/src/components/AppNavbar.tsx` — added a "Reference Material" nav
  link.
- `Frontend/src/middleware.ts` — added `/reference(.*)` and
  `/api/reference(.*)` to the protected-route matcher.
- `API.md` — documented the two new routes.

**Scope note:** upload is optional by design — generation already falls back
to trained knowledge when nothing's uploaded (`grounded_in_reference: false`
in responses), so this doesn't touch Notes/MCQ/Numericals generation code at
all, just adds the missing upload surface. Ownership of `syllabus_id` isn't
separately re-verified against the caller in the new route — this matches
the existing pattern in `api/plan/generate/route.ts`, which also trusts a
client-supplied `syllabus_id` once the caller is authenticated. Flagging in
case you want stricter checks added consistently across all of these later.

---

## 2. `dev-user-01` fallback removed

Every route that fell back to a shared `dev-user-01` identity when
`auth()` returned no session now returns `401 { detail: "Not signed in." }`
instead. This was flagged as dead code in the last audit because
`middleware.ts` already gates all of these routes — the fallback could only
ever fire if a route were somehow reached outside that middleware, at which
point silently attributing the request to a shared placeholder user is worse
than failing loudly. Removing it now that it's a deliberate call, not a
silent fix.

**Changed (fallback removed, explicit 401 guard added — same pattern already
used in `api/revision/route.ts` etc.):**
- `Frontend/src/app/api/upload/route.ts`
- `Frontend/src/app/api/upload/latest/route.ts`
- `Frontend/src/app/api/plan/generate/route.ts`
- `Frontend/src/app/api/chat/route.ts` (both `GET` and `POST`)
- `Frontend/src/app/api/chat/sessions/route.ts`

**Changed (dead client-side plumbing removed now that the server no longer
honors it):**
- `Frontend/src/lib/api.ts` — `uploadSyllabus()` / `getLatestSyllabus()` no
  longer accept a `userId` param; neither existing caller passed one
  in — it was always the placeholder anyway.
- `Frontend/src/lib/db.ts` — dropped `DEFAULT 'dev-user-01'` from the
  `syllabi` and `study_plans` schema definitions, and added a one-time
  migration step (in `migrateSchema()`, alongside the existing
  `notebook_id` migration) that drops the default from **existing**
  installs where it's still set. `CREATE TABLE IF NOT EXISTS` alone
  wouldn't reach already-created tables, hence the explicit migration.
  No data changes, no downtime — this only removes a fallback value that
  the app no longer writes.
- `Frontend/src/middleware.ts` — updated the comment above the route
  matcher (it referenced the fallback as the reason API routes needed
  gating; now describes the current, fallback-free state) and added
  `/api/reference(.*)` to the matcher for part 1 above.

**Not touched:** nothing else reads or writes `dev-user-01` — verified with
a full-repo grep after these edits. The only remaining matches are in this
file, and in `middleware.ts`/`db.ts` themselves — a comment describing what
was removed, and the literal string the new migration checks for in order
to drop it from existing installs.

**Your move:** none needed — this was the "flag it, don't silently fix it"
item from the last audit, and this delivery is that explicit go-ahead being
acted on. If you'd rather keep the fallback around a while longer for local
dev without needing a Clerk session, say so and I'll revert just this half.
