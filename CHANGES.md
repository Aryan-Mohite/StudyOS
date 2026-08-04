# Changes — Deployment audit + MCQ difficulty selector

Fresh clone audited at commit `7db2ed9` (2026-08-02). Scope: verify
deployment-readiness, confirm RAG status, and close out the three items
flagged at the end of the prior audit.

## Audit findings (no action needed)

- **RAG is intact, but on a different backend than before.** The most
  recent commit switched the reference-material store from ChromaDB to
  Qdrant (local embedded instance for dev, Qdrant Cloud for the free
  deployment plan). Retrieval is wired into `notes_workflow.py` and
  `mcq_workflow.py`; ingestion is unchanged in `reference_material_workflow.py`.
- **AI Tutor Chat and Solved Numericals have been removed from the product**
  (commits `fcb4e33` / `1991f17`, July 31). This was a deliberate decision,
  not a regression — `API.md` documents it. It's the reason RAG no longer
  feeds a tutor: there isn't one anymore.
- **`/api/reference` and `/api/plan/generate` ownership validation** — both
  already scope `syllabus_id` to the requesting `user_id` in the current
  codebase. This was flagged as open in a prior session; it's since been
  fixed (comments in both files describe the fix).
- **`dev-user-01` fallback** — confirmed fully removed from live code paths;
  only cleanup/migration logic in `db.ts` still references the string.
- **Secret scan** — no live credentials anywhere in the tree; `.env.example`
  files contain only placeholders.
- **Build verification** — `py_compile` (all AgenticService files), `tsc
  --noEmit`, `eslint`, and `npm run build` (28/28 pages) all pass clean.

## Changes made

### 1. `DEPLOYMENT.md`
Step 4 of the smoke-test section told the deployer to "ask the AI tutor" to
exercise the Qdrant read path — a leftover reference to the removed Tutor
feature (this doc was only added in the same commit that removed nothing
tutor-related, so the two changes never got reconciled). Replaced with an
instruction to generate Notes or an MCQ set for a topic covered by uploaded
reference material, and to check `grounded_in_reference` in the response —
this is the actual current way to exercise that code path.

### 2. `Frontend/src/components/MCQQuiz.tsx`
Added an actionable difficulty selector to the idle state (Easy / Medium /
Hard / Mixed), replacing the hardcoded `difficulty: "mixed"` on every
generate call. Also made the "based on your past attempts" suggestion chip
tappable — picking it sets the selector instead of just displaying text.

One correctness issue this surfaced and had to be handled: `/api/mcq/generate`'s
cache lookup is keyed on `topic_id` only, not difficulty. Without a fix, a
student switching from "Mixed" to "Hard" on a topic they'd already generated
would silently get back the old Mixed-difficulty set from cache. Fixed by
tracking the difficulty used on the last successful generation client-side;
if the student picks a different one, the request now clears the cached row
(same `deleteMCQ` pattern already used by `handleRegenerate`) and passes
`force_regenerate: true`, so a same-difficulty repeat is still fast/cached
but a difficulty change always produces a genuinely new set.

No backend changes were needed — `mcqGenerateSchema` and the MCQ agent
already accept and honor `easy` / `medium` / `hard` / `mixed`; this was
purely a missing frontend control.

## Deliberately not changed

- **Render free-tier OOM risk** (`sentence-transformers` + `torch` at
  400-600MB against a 512MB cap). `DEPLOYMENT.md` already documents this
  correctly and is explicit that the fix — upgrading Render's plan or
  swapping to a hosted embeddings API — is a real architecture decision,
  not something to make silently. Left as-is; flagging here so it's visible
  as a still-open decision rather than something checked off.

## Verification

- `python3 -m py_compile` on every `.py` file in `AgenticService/` — clean
- `npx tsc --noEmit` in `Frontend/` — clean
- `npx eslint src/components/MCQQuiz.tsx` — clean
- `npm run build` in `Frontend/` — 28/28 pages, zero errors/warnings
