"""
main.py — StudyOS AgenticService
Pure AI layer: PDF parsing, notes/MCQ/numericals generation, tutor chat.
No database. No caching. That's the Express layer's job.

Notes, Tutor Chat, MCQ, and Numericals all delegate to a LangGraph workflow
in App/workflows/ (genuine multi-step: generate+index, retrieve+generate,
generate+validate+repair). Syllabus parsing calls its agent in App/agents/
directly — see App/workflows/README.md for why. See ARCHITECTURE.md for
the full request flow.
"""

import os
from typing import Optional

import uvicorn
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import settings
from App.services.pdf_service import extract_pdf_text
from App.agents.syllabus_agent import run_syllabus_parse
from App.workflows.mcq_workflow import run_mcq_generation
from App.workflows.notes_workflow import run_notes_generation
from App.workflows.numericals_workflow import run_numericals_generation
from App.workflows.reference_material_workflow import run_reference_ingestion
from App.workflows.tutor_workflow import run_tutor_turn

app = FastAPI(
    title="StudyOS AgenticService",
    description="Internal AI service — not exposed directly to browser clients. Called only by the Next.js API routes / Express gateway.",
    version="2.0.0",
)

_allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _allowed_origins if o.strip()],
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type"],
)


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

@app.post("/agent/parse-syllabus")
async def agent_parse_syllabus(
    file: UploadFile = File(...),
    filename: str = Form(default=""),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    raw_bytes = await file.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

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
        parsed = run_syllabus_parse(raw_text, filename or file.filename)
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return parsed


# ── Reference material ingestion (optional, per-syllabus) ─────────────────────

@app.post("/agent/ingest-reference-material")
async def agent_ingest_reference_material(
    syllabus_id: str = Form(...),
    file: UploadFile = File(...),
):
    """
    Ingests one student-uploaded reference file (textbook chapter, lecture
    PDF, past-paper solutions) for a syllabus. Optional feature — call this
    zero or more times per syllabus_id; each call adds to the same
    reference-material collection for that syllabus (see
    App/services/rag_service.py). Not required for Notes/MCQ/Numericals to
    work — those fall back to trained knowledge alone if nothing's indexed.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    raw_bytes = await file.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        return await run_in_threadpool(
            run_reference_ingestion, syllabus_id, file.filename, raw_bytes
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


# ── Notes generation ──────────────────────────────────────────────────────────

class NotesRequest(BaseModel):
    topic_id: str
    topic_name: str
    subject: str
    unit_title: str
    syllabus_context: list[str] = []
    syllabus_id: Optional[str] = None  # enables grounding in uploaded reference material


@app.post("/agent/generate-notes")
async def agent_generate_notes(req: NotesRequest):
    """Generates notes, then indexes them into the RAG vector store for Tutor Chat."""
    try:
        return run_notes_generation(
            topic_name=req.topic_name,
            subject=req.subject,
            unit_title=req.unit_title,
            topic_id=req.topic_id,
            syllabus_context=req.syllabus_context,
            syllabus_id=req.syllabus_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=f"Notes generation failed: {exc}") from exc


# ── MCQ generation ────────────────────────────────────────────────────────────

class MCQRequest(BaseModel):
    topic_id: str
    topic_name: str
    subject: str
    count: int = 10
    difficulty: str = "mixed"
    syllabus_context: list[str] = []
    syllabus_id: Optional[str] = None  # enables grounding in uploaded reference material


@app.post("/agent/generate-mcq")
async def agent_generate_mcq(req: MCQRequest):
    try:
        return run_mcq_generation(
            topic_name=req.topic_name,
            subject=req.subject,
            topic_id=req.topic_id,
            count=req.count,
            difficulty=req.difficulty,
            syllabus_context=req.syllabus_context,
            syllabus_id=req.syllabus_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=f"MCQ generation failed: {exc}") from exc


# ── Numericals generation ─────────────────────────────────────────────────────

class NumericalsRequest(BaseModel):
    topic_id: str
    topic_name: str
    subject: str
    count: int = 5
    difficulty: str = "mixed"
    syllabus_context: list[str] = []
    syllabus_id: Optional[str] = None  # enables grounding in uploaded reference material


@app.post("/agent/generate-numericals")
async def agent_generate_numericals(req: NumericalsRequest):
    try:
        return run_numericals_generation(
            topic_name=req.topic_name,
            subject=req.subject,
            topic_id=req.topic_id,
            count=req.count,
            difficulty=req.difficulty,
            syllabus_context=req.syllabus_context,
            syllabus_id=req.syllabus_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=f"Numericals generation failed: {exc}") from exc


# ── Tutor chat ────────────────────────────────────────────────────────────────

class TutorRequest(BaseModel):
    session_id: str  # e.g. f"{user_id}:{topic_id}" — stable per conversation
    question: str
    topic_id: str
    topic_name: str
    subject: str
    syllabus_context: list[str] = []


@app.post("/agent/tutor-chat")
async def agent_tutor_chat(req: TutorRequest):
    try:
        return run_tutor_turn(
            session_id=req.session_id,
            question=req.question,
            subject=req.subject,
            topic_name=req.topic_name,
            topic_id=req.topic_id,
            syllabus_context=req.syllabus_context,
        )
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=f"Tutor response failed: {exc}") from exc


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=True,
    )