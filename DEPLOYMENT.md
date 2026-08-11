# Deploying StudyOS for free

This covers the $0 deployment: **Vercel** (Frontend) + **Render** free tier
(AgenticService) + **Aiven** free MySQL + **Qdrant Cloud** free tier (RAG
vector store). See "Known limitations" at the bottom before you commit to
this for anything beyond a demo/portfolio.

Set these up in order — each later step needs a URL or credential from the
one before it.

---

## 1. Aiven — free MySQL

1. Sign up at https://aiven.io (no credit card required for the free plan).
2. Create a new service → MySQL → Free plan → pick any region.
3. Once it's running, open the service's **Overview** tab. You need two things:
   - The **Service URI** (or the individual host/port/user/password/dbname
     fields) — build your `DATABASE_URL` as:
     `mysql://USER:PASSWORD@HOST:PORT/DBNAME`
   - The **CA Certificate** — click to view/download it. Copy the *entire*
     PEM contents (including the `-----BEGIN CERTIFICATE-----` /
     `-----END CERTIFICATE-----` lines).
4. You do **not** need to run any SQL by hand. `Frontend/src/lib/db.ts`
   creates the full schema automatically (`CREATE TABLE IF NOT EXISTS` +
   migration checks) the first time any route touches the database.

Save the `DATABASE_URL` and the CA cert contents — you'll paste both into
Vercel's env vars in step 4.

---

## 2. Qdrant Cloud — free vector store (RAG)

1. Sign up at https://cloud.qdrant.io (free tier, no credit card).
2. Create a free cluster.
3. From the cluster dashboard, copy:
   - The **Cluster URL** (looks like `https://xxxx.cloud.qdrant.io`)
   - An **API key** (create one if you don't have one yet)

Save both — they go into Render's env vars in step 3. Collections are
created automatically per syllabus on first upload; no manual setup needed.

---

## 3. Render — AgenticService (Python backend)

1. Sign up at https://render.com (free, no credit card for the free plan).
2. Dashboard → **New** → **Blueprint** → connect your GitHub account →
   select the `StudyOS` repo. Render will find `render.yaml` at the repo
   root automatically and propose the `studyos-agentic` service.
3. Render will prompt for the env vars marked `sync: false` in
   `render.yaml`. Fill in:
   - `GROQ_API_KEY` (or `ANTHROPIC_API_KEY`, matching whatever
     `LLM_PROVIDER` you use for text generation — Groq is the default)
   - `GEMINI_API_KEY` — **required regardless of `LLM_PROVIDER`.** RAG
     embeddings always run via the free Gemini Embedding API now (see
     "Known limitations" below for why). Get a free key, no credit card,
     at https://aistudio.google.com/apikey.
   - `QDRANT_URL` and `QDRANT_API_KEY` from step 2
   - `INTERNAL_SERVICE_JWT_SECRET` — generate one locally with
     `openssl rand -hex 32`. **Save this value** — you need the exact same
     string in Vercel in step 4.
4. Deploy. This is Render's native Python runtime (no Docker) — build is
   just `pip install -r requirements.txt`, which is fast since there's no
   torch and no OS packages to install.
5. Once live, copy the service's URL, e.g. `https://studyos-agentic.onrender.com`.
6. **Note the free-tier behavior:** this service spins down after 15
   minutes of no traffic and takes 30-60 seconds to wake up on the next
   request. That's expected, not a bug — see "Known limitations" below.

---

## 4. Vercel — Frontend (Next.js)

1. Sign up at https://vercel.com and import the `StudyOS` GitHub repo.
2. **Important:** this repo has the Next.js app inside `Frontend/`, not at
   the repo root. In the import screen (or Project Settings → General
   afterward), set **Root Directory** to `Frontend`. `Frontend/vercel.json`
   documents the build settings but can't set this for you — Vercel
   requires it in the dashboard for monorepo layouts.
3. Add environment variables (Project Settings → Environment Variables),
   using `Frontend/.env.local.example` as the checklist:
   - Clerk keys (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, etc.)
   - `DATABASE_URL` — from Aiven, step 1
   - `DB_SSL_CA` — the full CA cert PEM text from Aiven, step 1
   - `AGENTIC_SERVICE_URL` — the Render URL from step 3
   - `INTERNAL_SERVICE_JWT_SECRET` — **the exact same value** you set on Render
   - `NEXT_PUBLIC_USE_REAL_API=true`
4. Deploy.
5. Copy your Vercel URL (e.g. `https://studyos.vercel.app`).

---

## 5. Close the loop: CORS

Go back to Render → your service → Environment → update `ALLOWED_ORIGINS`
to your actual Vercel URL(s), comma-separated if you have more than one
(e.g. production + a preview domain):

```
ALLOWED_ORIGINS=https://studyos.vercel.app
```

Save — Render will redeploy automatically. Without this step, the browser
will block every request from your Vercel frontend to the Render backend.

---

## 6. Smoke test

1. Open your Vercel URL, sign in via Clerk.
2. Upload a syllabus PDF — this exercises Vercel → Render → LLM provider →
   Aiven MySQL, the full chain.
3. Upload a reference material PDF for that syllabus — this exercises the
   Qdrant write path.
4. Generate Notes or an MCQ set for a topic covered by that reference
   material — exercises the Qdrant read path (check `grounded_in_reference`
   in the response).
5. If the first request after some idle time takes 30-60 seconds, that's
   the Render free-tier cold start, not a failure — see below.

---

## Known limitations of this free stack

Be upfront with yourself about these before pointing real users at it:

- **Cold starts.** Render's free web service spins down after 15 minutes of
  inactivity; the next request pays a 30-60s wake-up cost. Fine for a demo
  you control the timing of, bad for a stranger's first impression.
- **Resolved: the OOM risk.** This stack originally ran embeddings locally
  via `sentence-transformers`/`torch`, which needed 400-600MB RAM once
  loaded — over Render's free 512MB cap, and it crashed the service on
  startup (before any request even landed). Embeddings now run via the
  Gemini Embedding API instead (free tier, 1,500 requests/day, no card),
  so this process no longer loads a model into memory at all. This is why
  `GEMINI_API_KEY` is required even if `LLM_PROVIDER=groq`. Rate-limit
  note: 1,500 embedding requests/day is generous for a study app, but if
  you ever hit it, Render's Standard plan ($25/mo, 2GB RAM — note the $7
  Starter plan is *also* 512MB and won't help) is the paid fallback.
- **Free-tier suspension risk.** Render can suspend free services that
  generate unusual outbound traffic patterns. Don't build anything
  time-critical on this without a paid plan.
- **No SLA on any of these four services at the free tier.** Any one of
  them can have downtime or policy changes with no notice.

If StudyOS gets real users, the Hostinger KVM 2 VPS path discussed
separately (Ubuntu + PM2 + Uvicorn + Nginx, all on hardware you control) is
the more durable next step — no cold starts, no ephemeral disk, predictable
$6-8/month cost instead of four separate free-tier dependencies each with
their own limits and failure modes.
