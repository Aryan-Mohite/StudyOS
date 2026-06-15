# StudyOS v2

> Syllabus-first AI learning platform — Next.js 15 + FastAPI + LangGraph

```
StudyOS/
├── Frontend/     Next.js 15 · TypeScript · Tailwind · ShadCN · Framer Motion · Clerk
├── Backend/      FastAPI · LangGraph · Celery · Multi-model LLM routing
└── Database/     MySQL schema · Qdrant vector store · Redis cache
```

---

## Run Order

```
MySQL → Qdrant → Redis → Backend (API) → Backend (Celery) → Frontend
```

---

## Frontend

```bash
cd Frontend
npm install
cp .env.example .env.local      # fill in Clerk keys
npm run dev                      # http://localhost:3000
```

---

## Backend

```bash
cd Backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # fill in all keys

# Terminal 1 — FastAPI
uvicorn app.main:app --reload    # http://localhost:8000
                                 # Swagger: http://localhost:8000/docs

# Terminal 2 — Celery worker
celery -A app.tasks.celery_app worker -Q pdf,embeddings --loglevel=info
```

---

## Database

```bash
# MySQL
mysql -u root -p < Database/schema.sql
mysql -u root -p studyos < Database/seed.sql

# Qdrant
docker run -p 6333:6333 qdrant/qdrant
python Database/qdrant_setup.py

# Redis
docker run -p 6379:6379 redis:alpine
```

---

## Tech Stack

| Layer      | Tech                                         |
|------------|----------------------------------------------|
| Frontend   | Next.js 15, TypeScript, Tailwind, ShadCN, Framer Motion |
| Auth       | Clerk (Google, GitHub, Email OTP)            |
| Backend    | FastAPI, Pydantic v2, async SQLAlchemy       |
| AI Agents  | LangGraph multi-agent graph                  |
| LLMs       | GPT-4o (notes) · Claude (analysis) · Gemini (chat) |
| Vector DB  | Qdrant                                       |
| Main DB    | MySQL                                        |
| Cache      | Redis                                        |
| Jobs       | Celery + Redis                               |
| Storage    | Cloudflare R2                                |
