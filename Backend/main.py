from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import init_db
from routers import mcq, notes, upload


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialise DB on startup."""
    await init_db()
    yield


app = FastAPI(
    title="StudyOS API",
    version="0.3.0",
    description="Phase 3 — Notes + Syllabus Parser + MCQ (SQLite, Claude direct calls)",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(upload.router, prefix="/api")
app.include_router(notes.router,  prefix="/api")
app.include_router(mcq.router,    prefix="/api")


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok", "version": app.version}
