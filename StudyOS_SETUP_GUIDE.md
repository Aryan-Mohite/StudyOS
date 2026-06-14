# StudyOS v2 — Complete Setup Guide

---

## What you need before starting

| Tool | Version | Download |
|------|---------|----------|
| Node.js | 20+ | https://nodejs.org |
| Python | 3.11+ | https://python.org |
| MySQL | 8.0+ | https://dev.mysql.com/downloads |
| Docker Desktop | Latest | https://docker.com/products/docker-desktop |
| Git | Any | https://git-scm.com |

Check everything is installed:
```bash
node -v        # should print v20+
python --version   # should print 3.11+
mysql --version
docker --version
```

---

## Step 1 — Extract the project

```bash
# Unzip the downloaded file
unzip StudyOS_v2.zip

# You should now see:
# StudyOS_v2/
# ├── Frontend/
# ├── Backend/
# └── Database/
```

---

## Step 2 — Get your API keys

You need accounts on 4 services. All have free tiers.

### 2A — Clerk (Authentication)
1. Go to https://clerk.com → Sign up free
2. Click **Create application**
3. Name it `StudyOS`, enable **Google** and **Email** login
4. Go to **API Keys** in the left sidebar
5. Copy:
   - `Publishable key` → starts with `pk_test_...`
   - `Secret key` → starts with `sk_test_...`

### 2B — OpenAI (Notes generation)
1. Go to https://platform.openai.com → Sign up
2. Go to **API Keys** → **Create new secret key**
3. Copy the key → starts with `sk-...`
4. Add $5 credits (minimum) under Billing

### 2C — Anthropic Claude (Syllabus analysis)
1. Go to https://console.anthropic.com → Sign up
2. Go to **API Keys** → **Create Key**
3. Copy the key → starts with `sk-ant-...`
4. Add $5 credits under Billing

### 2D — Google Gemini (Fast Q&A chat)
1. Go to https://aistudio.google.com
2. Click **Get API Key** → **Create API key**
3. Copy the key → starts with `AIza...`
4. Free tier: 60 requests/minute — enough for development

> **Cost tip for development:** You only need ONE LLM key to start.
> Open `Backend/app/services/llm_router.py` and point all tasks
> to a single model temporarily.

---

## Step 3 — Start databases with Docker

Open a terminal and run these one by one:

### MySQL
```bash
docker run -d \
  --name studyos-mysql \
  -e MYSQL_ROOT_PASSWORD=studyos123 \
  -e MYSQL_DATABASE=studyos \
  -p 3306:3306 \
  mysql:8.0

# Wait 20 seconds for MySQL to start, then verify:
docker logs studyos-mysql | tail -5
# Should show: ready for connections
```

### Qdrant (Vector database)
```bash
docker run -d \
  --name studyos-qdrant \
  -p 6333:6333 \
  qdrant/qdrant

# Verify — open in browser:
# http://localhost:6333/dashboard
```

### Redis (Cache + job queue)
```bash
docker run -d \
  --name studyos-redis \
  -p 6379:6379 \
  redis:alpine

# Verify:
docker exec studyos-redis redis-cli ping
# Should print: PONG
```

### Check all 3 containers are running:
```bash
docker ps
# Should show 3 containers: studyos-mysql, studyos-qdrant, studyos-redis
```

---

## Step 4 — Set up the database schema

```bash
# Load the schema into MySQL
mysql -h 127.0.0.1 -u root -pstudyos123 studyos < StudyOS_v2/Database/schema.sql

# Load sample data
mysql -h 127.0.0.1 -u root -pstudyos123 studyos < StudyOS_v2/Database/seed.sql

# Verify tables were created:
mysql -h 127.0.0.1 -u root -pstudyos123 studyos -e "SHOW TABLES;"
# Should list: users, subjects, syllabi, topics, books, notes, quizzes, progress, chat_sessions, chat_messages
```

---

## Step 5 — Set up Qdrant collections

```bash
cd StudyOS_v2/Database

# Install just qdrant-client for this script
pip install qdrant-client

# Run the setup
QDRANT_HOST=localhost QDRANT_PORT=6333 python qdrant_setup.py

# Expected output:
#   ok    book_chunks created
#   ok    notes_chunks created
#   ok    pyq_chunks created
#   Qdrant ready.
```

---

## Step 6 — Set up the Backend

```bash
cd StudyOS_v2/Backend
```

### 6A — Create Python virtual environment
```bash
# Mac/Linux
python3 -m venv .venv
source .venv/bin/activate

# Windows
python -m venv .venv
.venv\Scripts\activate

# Your terminal prompt should now show (.venv)
```

### 6B — Install dependencies
```bash
pip install -r requirements.txt
# Takes 2–3 minutes
```

### 6C — Create the .env file
```bash
cp .env.example .env
```

Now open `.env` in any text editor and fill in:

```env
# Database — matches the Docker MySQL we started in Step 3
DATABASE_URL=mysql+pymysql://root:studyos123@127.0.0.1:3306/studyos

# Vector DB — matches Docker Qdrant
QDRANT_HOST=localhost
QDRANT_PORT=6333

# AI Keys — paste what you copied in Step 2
OPENAI_API_KEY=sk-...your-key...
ANTHROPIC_API_KEY=sk-ant-...your-key...
GOOGLE_API_KEY=AIza...your-key...

# Auth — from Clerk dashboard
CLERK_SECRET_KEY=sk_test_...your-key...
CLERK_PUBLISHABLE_KEY=pk_test_...your-key...

# Storage — leave these blank for now (uploads won't save to R2 but app still runs)
R2_BUCKET=
R2_ACCESS_KEY=
R2_SECRET_KEY=
R2_ENDPOINT=

# Redis — matches Docker Redis
REDIS_URL=redis://localhost:6379/0

# App
ENVIRONMENT=development
SECRET_KEY=any-random-string-here-change-in-production
FRONTEND_URL=http://localhost:3000
```

### 6D — Test the .env loads correctly
```bash
python -c "from app.config import get_settings; s=get_settings(); print('DB:', s.database_url[:30])"
# Should print the first 30 chars of your DATABASE_URL
```

### 6E — Start the FastAPI server
```bash
uvicorn app.main:app --reload --port 8000
```

Expected output:
```
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000
```

**Open http://localhost:8000/docs in your browser.**
You should see the Swagger UI with all endpoints listed.

### 6F — Test the health endpoint
```bash
curl http://localhost:8000/health
# {"status":"ok","service":"StudyOS API","env":"development"}
```

### 6G — Start the Celery worker (new terminal tab)
```bash
cd StudyOS_v2/Backend
source .venv/bin/activate    # activate venv again in this new tab

celery -A app.tasks.celery_app worker \
  -Q pdf,embeddings \
  --loglevel=info \
  --concurrency=2
```

Expected output:
```
[tasks]
  . app.tasks.pdf_tasks.process_syllabus_pdf
  . app.tasks.pdf_tasks.process_book_pdf
  . app.tasks.embedding_tasks.embed_chunk
  . app.tasks.embedding_tasks.embed_notes

[2025-...] celery@machine ready.
```

---

## Step 7 — Set up the Frontend

Open a new terminal tab.

```bash
cd StudyOS_v2/Frontend
```

### 7A — Install dependencies
```bash
npm install
# Takes 1–2 minutes
```

### 7B — Set up ShadCN UI
```bash
npx shadcn@latest init
```
When prompted:
- Style: **Default**
- Base color: **Slate**
- CSS variables: **Yes**

Then add the components used in the project:
```bash
npx shadcn@latest add button badge card dialog toast
```

### 7C — Create the .env.local file
```bash
cp .env.example .env.local
```

Open `.env.local` and fill in:
```env
# From Clerk dashboard (Step 2A)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...your-key...
CLERK_SECRET_KEY=sk_test_...your-key...

# Clerk redirect URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Backend URL
NEXT_PUBLIC_API_URL=http://localhost:8000
BACKEND_URL=http://localhost:8000
```

### 7D — Start the dev server
```bash
npm run dev
```

Expected output:
```
  ▲ Next.js 15.1.0 (Turbopack)
  - Local:        http://localhost:3000
  - Ready in 1.2s
```

**Open http://localhost:3000**
You should see the StudyOS landing page.

---

## Step 8 — Verify everything works end-to-end

### Quick check list

Open your browser and test each URL:

| URL | Should show |
|-----|-------------|
| http://localhost:3000 | StudyOS landing page |
| http://localhost:8000/health | `{"status":"ok"}` |
| http://localhost:8000/docs | Swagger UI with endpoints |
| http://localhost:6333/dashboard | Qdrant collections dashboard |

### Test the API from Swagger

1. Go to http://localhost:8000/docs
2. Click on **GET /health** → **Try it out** → **Execute**
3. Should return `200 OK`
4. Click on **POST /syllabus/upload** → **Try it out**
5. Upload any PDF file, set subject_name to "Data Structures"
6. Should return `200` with a `syllabus_id` and `task_id`

### Test Clerk auth

1. Go to http://localhost:3000
2. Click **Get started** in the navbar
3. Sign in with Google or email
4. You should be redirected to `/dashboard`

---

## Step 9 — Cloudflare R2 setup (optional for dev, required for production)

If you want file uploads to actually save (not just be processed in memory):

1. Go to https://dash.cloudflare.com → **R2 Object Storage**
2. Create a bucket named `studyos-uploads`
3. Go to **Manage R2 API tokens** → Create token with **Object Read & Write**
4. Copy the credentials into your Backend `.env`:
   ```env
   R2_BUCKET=studyos-uploads
   R2_ACCESS_KEY=your-access-key
   R2_SECRET_KEY=your-secret-key
   R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
   ```
5. Restart the Backend server

---

## Daily development workflow

Every time you sit down to work, run these in order:

**Terminal 1 — Databases (if Docker containers stopped)**
```bash
docker start studyos-mysql studyos-qdrant studyos-redis
```

**Terminal 2 — Backend API**
```bash
cd StudyOS_v2/Backend
source .venv/bin/activate      # Windows: .venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

**Terminal 3 — Celery worker**
```bash
cd StudyOS_v2/Backend
source .venv/bin/activate
celery -A app.tasks.celery_app worker -Q pdf,embeddings --loglevel=info
```

**Terminal 4 — Frontend**
```bash
cd StudyOS_v2/Frontend
npm run dev
```

---

## Common errors and fixes

### "ModuleNotFoundError: No module named 'app'"
```bash
# Make sure you're inside the Backend folder, not the root
cd StudyOS_v2/Backend
uvicorn app.main:app --reload
```

### "Access denied for user 'root'@'localhost'"
```bash
# Use 127.0.0.1 instead of localhost in DATABASE_URL
DATABASE_URL=mysql+pymysql://root:studyos123@127.0.0.1:3306/studyos
```

### "Connection refused" on port 6333 (Qdrant)
```bash
docker start studyos-qdrant
# Wait 5 seconds, then retry
```

### "Cannot find module 'lucide-react'" in Frontend
```bash
cd StudyOS_v2/Frontend
npm install
```

### "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is missing"
```bash
# Make sure the file is named .env.local not .env
ls -la StudyOS_v2/Frontend/   # should show .env.local
```

### Celery task not running
```bash
# Check Redis is reachable
docker exec studyos-redis redis-cli ping   # should print PONG
# Check Celery can see the task queues
celery -A app.tasks.celery_app inspect active
```

### "Table doesn't exist" error
```bash
# Re-run the schema
mysql -h 127.0.0.1 -u root -pstudyos123 studyos < StudyOS_v2/Database/schema.sql
```

---

## Project ports summary

| Service | Port | URL |
|---------|------|-----|
| Next.js Frontend | 3000 | http://localhost:3000 |
| FastAPI Backend | 8000 | http://localhost:8000 |
| MySQL | 3306 | (internal) |
| Qdrant | 6333 | http://localhost:6333/dashboard |
| Redis | 6379 | (internal) |

---

## What to build next

The scaffold is ready. Here's what to implement to make it fully functional:

1. **Parse the PDF** — Complete `Backend/app/tasks/pdf_tasks.py`
   - Use `PyPDF2` to extract text
   - Send text to Claude via `llm_router.call_llm(Task.syllabus_analysis, ...)`
   - Parse the JSON response and save topics to MySQL

2. **Embed the book** — Complete `embedding_tasks.py`
   - Chunk book text by heading/chapter
   - Call `embed_chunk()` for each chunk
   - This powers the RAG pipeline for notes + chat

3. **Dashboard UI** — Build out `Frontend/src/app/(dashboard)/dashboard/page.tsx`
   - Show list of uploaded syllabi
   - Topic tree with completion checkboxes
   - Notes viewer and chat interface

4. **Wire up the chat** — The LangGraph graph in `agents/graph.py` is complete
   - The `/chat` endpoint calls `study_graph.ainvoke()`
   - Just build the chat UI in the frontend and point it at `POST /chat`
