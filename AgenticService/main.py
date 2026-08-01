"""
main.py — StudyOS AgenticService
Pure AI layer: PDF parsing, notes/MCQ generation, study plans.
No database. No caching. That's the Next.js layer's job.

Notes, MCQ, Study Plan, and Syllabus parsing all delegate to a LangGraph
workflow in App/workflows/ (genuine multi-step: generate+index,
generate+validate+repair). See App/workflows/README.md for the full
breakdown and ARCHITECTURE.md for the full request flow.

Hardening (see CHANGES.md for the full writeup):
  - Every /agent/* route requires a short-lived service JWT minted by
    Next.js (App/core/security.py) — this used to be reachable by anyone
    who could hit the port.
  - Structured JSON request logging with a request_id (App/core/logging_config.py).
  - Per-IP rate limiting on the expensive routes (App/core/rate_limit.py).
  - Tighter Pydantic field constraints (bounded strings/lists/counts) so
    malformed or oversized payloads are rejected before reaching an LLM call.
  - Startup fails fast if required env vars are missing (config.py).
"""

import os
import time
from typing import Optional

import uvicorn
from fastapi import BackgroundTasks, Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.responses import JSONResponse

from config import settings
from App.core.logging_config import configure_logging, log_generation_event, request_logging_middleware
from App.core.rate_limit import GENERATION_LIMIT, INGESTION_LIMIT, limiter
from App.core.security import verify_service_token
from App.services.pdf_service import extract_pdf_text
from App.workflows.mcq_workflow import run_mcq_generation
from App.workflows.notes_workflow import run_notes_generation
from App.workflows.reference_material_workflow import run_reference_ingestion
from App.workflows.study_plan_workflow import run_study_plan_generation
from App.workflows.syllabus_workflow import run_pdf_analysis

configure_logging()

app = FastAPI(
    title="StudyOS AgenticService",
    description="Internal AI service — not exposed directly to browser clients. Called only by the Next.js API routes.",
    version="2.1.0",
)

app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded. Try again shortly."})


app.middleware("http")(request_logging_middleware)

_allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _allowed_origins if o.strip()],
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type", "Authorization"],
)

MAX_PDF_BYTES = 15 * 1024 * 1024  # 15 MB — a bit above the Frontend's 10MB cap to leave headroom for multipart overhead

# ── Auth dependency, applied per-route below ────────────────────────────────
# /health is intentionally excluded (used for uptime checks / load balancer
# probes that won't carry a service token).
ServiceAuth = Depends(verify_service_token)


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status": "ok",
        "layer": "python-agentic",
        "provider": settings.llm_provider,
        "model": {
            "groq": settings.groq_model_name,
            "gemini": settings.gemini_model_name,
            "anthropic": settings.anthropic_model_name,
        }.get(settings.llm_provider, "unknown"),
    }


# ── Syllabus parsing ──────────────────────────────────────────────────────────

@app.post("/agent/parse-syllabus", dependencies=[ServiceAuth])
@limiter.limit(INGESTION_LIMIT)
async def agent_parse_syllabus(
    request: Request,
    file: UploadFile = File(...),
    filename: str = Form(default=""),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    raw_bytes = await file.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(raw_bytes) > MAX_PDF_BYTES:
        raise HTTPException(status_code=413, detail="PDF exceeds the 15 MB size limit.")

    try:
        # extract_pdf_text is a blocking, CPU-bound call (pdfplumber/PyMuPDF,
        # and worst case per-page Tesseract OCR) — run it in a worker thread
        # so it doesn't block the event loop for other requests while it runs.
        raw_text = await run_in_threadpool(extract_pdf_text, raw_bytes)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"PDF text extraction failed: {exc}") from exc

    if not raw_text.strip():
        raise HTTPException(
            status_code=422,
            detail="Could not extract any text from this PDF. It may be a scanned image.",
        )

    try:
        parsed = run_pdf_analysis(raw_text, filename or file.filename)
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return parsed


# ── Reference material ingestion (optional, per-syllabus) ─────────────────────

@app.post("/agent/ingest-reference-material", dependencies=[ServiceAuth])
@limiter.limit(INGESTION_LIMIT)
async def agent_ingest_reference_material(
    request: Request,
    syllabus_id: str = Form(..., min_length=1, max_length=64),
    file: UploadFile = File(...),
):
    """
    Ingests one student-uploaded reference file (textbook chapter, lecture
    PDF, past-paper solutions) for a syllabus. Optional feature — call this
    zero or more times per syllabus_id; each call adds to the same
    reference-material collection for that syllabus (see
    App/services/rag_service.py). Not required for Notes/MCQ to work — those
    fall back to trained knowledge alone if nothing's indexed.
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    raw_bytes = await file.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(raw_bytes) > MAX_PDF_BYTES:
        raise HTTPException(status_code=413, detail="PDF exceeds the 15 MB size limit.")

    try:
        return await run_in_threadpool(
            run_reference_ingestion, syllabus_id, file.filename, raw_bytes
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


# ── Notes generation ──────────────────────────────────────────────────────────

class NotesRequest(BaseModel):
    topic_id: str = Field(..., min_length=1, max_length=128)
    topic_name: str = Field(..., min_length=1, max_length=512)
    subject: str = Field(..., min_length=1, max_length=256)
    unit_title: str = Field(..., min_length=1, max_length=512)
    syllabus_context: list[str] = Field(default_factory=list, max_length=100)
    syllabus_id: Optional[str] = Field(default=None, max_length=64)  # enables grounding in uploaded reference material
    student_context: Optional[str] = Field(default=None, max_length=500)  # one-line profile summary


@app.post("/agent/generate-notes", dependencies=[ServiceAuth])
@limiter.limit(GENERATION_LIMIT)
async def agent_generate_notes(request: Request, req: NotesRequest, background_tasks: BackgroundTasks):
    """Generates notes, grounded in any student-uploaded reference material for this syllabus."""
    start = time.monotonic()
    try:
        result = run_notes_generation(
            topic_name=req.topic_name,
            subject=req.subject,
            unit_title=req.unit_title,
            topic_id=req.topic_id,
            syllabus_context=req.syllabus_context,
            syllabus_id=req.syllabus_id,
            student_context=req.student_context,
        )
    except ValueError as exc:
        background_tasks.add_task(
            log_generation_event, endpoint="generate-notes", topic_id=req.topic_id,
            duration_ms=(time.monotonic() - start) * 1000, ok=False,
        )
        raise HTTPException(status_code=502, detail=f"Notes generation failed: {exc}") from exc

    background_tasks.add_task(
        log_generation_event, endpoint="generate-notes", topic_id=req.topic_id,
        duration_ms=(time.monotonic() - start) * 1000, ok=True,
    )
    return result


# ── MCQ generation ────────────────────────────────────────────────────────────

class MCQRequest(BaseModel):
    topic_id: str = Field(..., min_length=1, max_length=128)
    topic_name: str = Field(..., min_length=1, max_length=512)
    subject: str = Field(..., min_length=1, max_length=256)
    count: int = Field(default=10, ge=1, le=50)
    difficulty: str = Field(default="mixed", pattern="^(easy|medium|hard|mixed)$")
    syllabus_context: list[str] = Field(default_factory=list, max_length=100)
    syllabus_id: Optional[str] = Field(default=None, max_length=64)
    student_context: Optional[str] = Field(default=None, max_length=500)


@app.post("/agent/generate-mcq", dependencies=[ServiceAuth])
@limiter.limit(GENERATION_LIMIT)
async def agent_generate_mcq(request: Request, req: MCQRequest, background_tasks: BackgroundTasks):
    start = time.monotonic()
    try:
        result = run_mcq_generation(
            topic_name=req.topic_name,
            subject=req.subject,
            topic_id=req.topic_id,
            count=req.count,
            difficulty=req.difficulty,
            syllabus_context=req.syllabus_context,
            syllabus_id=req.syllabus_id,
            student_context=req.student_context,
        )
    except ValueError as exc:
        background_tasks.add_task(
            log_generation_event, endpoint="generate-mcq", topic_id=req.topic_id,
            duration_ms=(time.monotonic() - start) * 1000, ok=False,
        )
        raise HTTPException(status_code=502, detail=f"MCQ generation failed: {exc}") from exc

    background_tasks.add_task(
        log_generation_event, endpoint="generate-mcq", topic_id=req.topic_id,
        duration_ms=(time.monotonic() - start) * 1000, ok=True,
    )
    return result


# ── Study plan generation ─────────────────────────────────────────────────────

class StudyPlanRequest(BaseModel):
    syllabus_id: str = Field(..., min_length=1, max_length=64)
    syllabus: dict  # full parsed syllabus contract (see syllabus_agent.py)
    exam_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")  # YYYY-MM-DD


@app.post("/agent/generate-study-plan", dependencies=[ServiceAuth])
@limiter.limit(GENERATION_LIMIT)
async def agent_generate_study_plan(request: Request, req: StudyPlanRequest, background_tasks: BackgroundTasks):
    start = time.monotonic()
    try:
        result = run_study_plan_generation(
            syllabus_id=req.syllabus_id,
            syllabus=req.syllabus,
            exam_date=req.exam_date,
        )
    except ValueError as exc:
        background_tasks.add_task(
            log_generation_event, endpoint="generate-study-plan", topic_id=req.syllabus_id,
            duration_ms=(time.monotonic() - start) * 1000, ok=False,
        )
        raise HTTPException(status_code=502, detail=f"Study plan generation failed: {exc}") from exc

    background_tasks.add_task(
        log_generation_event, endpoint="generate-study-plan", topic_id=req.syllabus_id,
        duration_ms=(time.monotonic() - start) * 1000, ok=True,
    )
    return result


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=True,
    )
