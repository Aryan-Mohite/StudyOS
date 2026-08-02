# CHANGES.md — Free-tier deployment (Vercel + Render + Aiven + Qdrant)

## Scope confirmed with Aryan before starting
- Full config: Dockerfile, render.yaml, Vercel config, env docs, Qdrant
  swap, CORS updates.
- ChromaDB → Qdrant swap: yes, do it ("do what you think is good" — see
  rationale below for why this wasn't optional).
- Aiven MySQL: write full setup/migration instructions (turned out schema
  needs zero manual SQL — `initDb()` already handles it).

---

## 1. ChromaDB → Qdrant (`AgenticService/App/services/rag_service.py`)

**Why this had to change, not just get deployed as-is:** Render's free web
service tier has no persistent disk — local filesystem changes are wiped on
every spin-down (which happens after 15 minutes of inactivity) or redeploy.
ChromaDB's `persist_directory` writes straight to local disk. Deploying the
old rag_service.py to Render free tier as-is would mean every student's
uploaded reference material silently vanishes the first time the service
goes idle — not a performance problem, a data-loss problem, and a silent
one (no error, retrieval just returns empty results going forward).

**What changed:**
- Swapped `langchain_chroma.Chroma` for `langchain_qdrant.QdrantVectorStore`.
- Same three public functions, same signatures, zero changes needed at any
  call site (`reference_material_workflow.py`, `main.py`): `index_reference_material`,
  `retrieve_reference_context`, `has_reference_material`.
- Dual-mode client, mirroring the existing `LLM_PROVIDER` env-var pattern:
  - `QDRANT_URL` unset (local dev default) → embedded on-disk Qdrant via
    `QdrantClient(path=...)` — same zero-setup experience Chroma had.
  - `QDRANT_URL` set (Qdrant Cloud free tier, or self-hosted) → connects
    over HTTP, storage lives outside the Render process entirely.
- One Qdrant collection per `syllabus_id`, created on first write
  (`_ensure_collection`), matching the old one-Chroma-collection-per-syllabus
  design.
- `config.py`: added `qdrant_url`, `qdrant_api_key`, `qdrant_local_path`.
  Kept the "fail fast on missing config" philosophy but as a **warning**,
  not a hard `_fail()`, when `ENV=production` and `QDRANT_URL` is unset —
  local-path Qdrant still functions, it just won't survive a restart on
  ephemeral-disk hosts. A hard failure would incorrectly block deploying to
  a host that *does* have persistent disk and doesn't need Qdrant Cloud.
- `requirements.txt`: removed `langchain-chroma` + `chromadb`, added
  `langchain-qdrant` + `qdrant-client`.

**Verified:** all new import paths resolve (`langchain_qdrant.QdrantVectorStore`,
`qdrant_client.QdrantClient`, `qdrant_client.http.models`,
`qdrant_client.http.exceptions.UnexpectedResponse`); collection
create/exists logic smoke-tested end-to-end against a real embedded Qdrant
instance (both the "doesn't exist yet" and "already exists" branches);
`py_compile` clean on all touched `.py` files.

---

## 2. Render deployment (`AgenticService/Dockerfile`, `render.yaml`)

- `Dockerfile`: `python:3.11-slim` base, installs `tesseract-ocr` +
  `tesseract-ocr-eng` (the actual OCR engine — `pytesseract` in
  requirements.txt is just the Python wrapper and does nothing without
  this), plus `libgl1` for Pillow. Reads `$PORT` from the environment at
  runtime rather than hardcoding 8000, since Render assigns this
  dynamically.
- `.dockerignore` added so `.env`, `vector_db/`, and caches don't end up in
  the build context.
- `render.yaml` at repo root: a Blueprint so Aryan can deploy via "New →
  Blueprint" instead of manually configuring a web service through the
  dashboard. `rootDir: AgenticService` points Render at the right
  subdirectory since this is a monorepo. Secrets (API keys, JWT secret,
  Qdrant credentials) are marked `sync: false` so Render prompts for them
  in the dashboard rather than this file holding real values.

**Flagged, not silently handled:** `sentence-transformers` + `torch`
typically need 400-600MB RAM once the embedding model loads. Render's free
tier gives 512MB total. This is a real OOM risk under actual usage — noted
in `DEPLOYMENT.md`'s "Known limitations," not fixed here, since the fix
(switching to a hosted embeddings API) is an architecture change with its
own tradeoffs that should be a separate decision, not something bundled
into a deploy-config delivery.

---

## 3. Vercel deployment (`Frontend/vercel.json`)

Minimal — Vercel auto-detects Next.js. The one thing a file *can't* handle:
this repo's Next.js app lives in `Frontend/`, not the repo root, so **Root
Directory must be set to `Frontend` in the Vercel dashboard** — documented
in `DEPLOYMENT.md`, not something `vercel.json` can express for a fresh
import.

---

## 4. Aiven MySQL (`Frontend/.env.local.example`, `src/lib/env.ts`, `src/lib/db.ts`)

**Turned out simpler than expected:** `db.ts`'s `initDb()` already runs
`CREATE TABLE IF NOT EXISTS` for the full schema plus idempotent migration
checks on first request. Aiven needs zero manual SQL — just the connection
string.

**What did need a real change:** Aiven enforces TLS. The old `db.ts` doc
comment gestured at `?ssl={"rejectUnauthorized":true}` in the URI but never
actually wired an `ssl` option into `mysql.createPool()` — that comment was
inert. Added:
- `DB_SSL_CA` (optional) in `env.ts` and `.env.local.example` — paste the
  full PEM contents of Aiven's CA certificate.
- `db.ts`: when `DB_SSL_CA` is set, passes `{ ca: env.DB_SSL_CA,
  rejectUnauthorized: true }` as the pool's `ssl` option, so the connection
  is actually certificate-verified instead of just hoping the default
  trust store works.

---

## 5. CORS (`AgenticService/.env.example`, `render.yaml`)

`ALLOWED_ORIGINS` comment updated to show the production case (a Vercel
URL) instead of only the localhost dev default. `render.yaml` ships with a
localhost placeholder that Aryan updates to the real Vercel URL after the
Frontend is deployed — documented as step 5 in `DEPLOYMENT.md`, since the
two deploys are inherently sequential (need the Vercel URL before CORS can
be set correctly).

---

## Verified before packaging
- `py_compile` clean: `config.py`, `App/services/rag_service.py`,
  `App/workflows/reference_material_workflow.py`, `main.py`.
- `tsc --noEmit` clean on the Frontend after the `db.ts`/`env.ts` changes.
- New Qdrant import paths and collection create/exists logic smoke-tested
  against a real embedded Qdrant client (not just import-checked).
- Did **not** run `npm run build` for this delivery — no page/route logic
  changed, only `db.ts`/`env.ts` (already `tsc`-clean) and a new
  `vercel.json` that isn't part of the build graph. `tsc --noEmit` is the
  right-weight check here.

## Not done / explicitly out of scope for this delivery
- Did not implement the sentence-transformers OOM mitigation (hosted
  embeddings API swap) — flagged as a known limitation, not a silent fix,
  since it's an architecture decision.
- Did not set up the actual Aiven/Qdrant Cloud/Render/Vercel accounts —
  `DEPLOYMENT.md` is the walkthrough for Aryan to do that manually, since
  it requires account creation and dashboard clicks I can't do here.
