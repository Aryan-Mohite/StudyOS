"""
StudyOS — FastAPI Backend
Entry point: uvicorn main:app --reload
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import syllabus, notes, chat

app = FastAPI(
    title="StudyOS API",
    description="Syllabus-first AI learning platform backend",
    version="0.1.0",
)

# ── CORS ────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],   # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ─────────────────────────────────────────────────────────────────
app.include_router(syllabus.router, prefix="/syllabus", tags=["Syllabus"])
app.include_router(notes.router,    prefix="/notes",    tags=["Notes"])
app.include_router(chat.router,     prefix="/chat",     tags=["AI Tutor"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "StudyOS API"}
