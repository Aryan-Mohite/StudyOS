"""StudyOS FastAPI application."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.database import engine, Base
from app import models  # noqa: F401 — ensures all tables register on Base.metadata
from app.routers import syllabus, notes, chat, quiz

cfg = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create MySQL tables on startup (use Alembic for production migrations)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title="StudyOS API",
    description="Syllabus-first AI learning platform",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[cfg.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(syllabus.router, prefix="/syllabus", tags=["Syllabus"])
app.include_router(notes.router,    prefix="/notes",    tags=["Notes"])
app.include_router(chat.router,     prefix="/chat",     tags=["Chat"])
app.include_router(quiz.router,     prefix="/quiz",     tags=["Quiz"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "StudyOS API", "env": cfg.environment}
