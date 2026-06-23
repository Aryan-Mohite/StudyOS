"""
main.py — StudyOS AgenticService
Pure AI layer: PDF parsing, notes generation, MCQ generation.
No database. No caching. That's the Express layer's job.
"""

import uvicorn
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import settings
from services.llm import call_claude_json
from services.mcq_service import generate_mcq
from services.notes_service import generate_notes
from services.pdf_parser import extract_pdf_text, parse_syllabus

app = FastAPI(
    title="StudyOS AgenticService",
    description="Internal AI service — not exposed directly to browser clients. Called only by the Express gateway.",
    version="1.0.0",
)

# Only allow calls from the Express backend (or localhost in dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://127.0.0.1:3001"],
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type"],
)


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "layer": "python-agentic", "model": "claude-sonnet-4-6"}


# ── Syllabus parsing ──────────────────────────────────────────────────────────

@app.post("/agent/parse-syllabus")
async def agent_parse_syllabus(
    file: UploadFile = File(...),
    filename: str = Form(default=""),
):
    """
    Accept a raw PDF upload, extract text, send to Claude for syllabus parsing.
    Returns the structured syllabus JSON (with injected UUIDs).
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    raw_bytes = await file.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        raw_text = extract_pdf_text(raw_bytes)
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"PDF text extraction failed: {exc}",
        ) from exc

    if not raw_text.strip():
        raise HTTPException(
            status_code=422,
            detail="Could not extract any text from this PDF. It may be a scanned image.",
        )

    try:
        parsed = parse_syllabus(raw_text, filename or file.filename)
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return parsed


# ── Notes generation ──────────────────────────────────────────────────────────

class NotesRequest(BaseModel):
    topic_id: str
    topic_name: str
    subject: str
    unit_title: str
    syllabus_context: list[str] = []


@app.post("/agent/generate-notes")
async def agent_generate_notes(req: NotesRequest):
    """
    Generate study notes for a topic. Returns the full Notes contract JSON.
    Raises 502 if the model returns malformed output after retries.
    """
    try:
        result = generate_notes(
            topic_name=req.topic_name,
            subject=req.subject,
            unit_title=req.unit_title,
            topic_id=req.topic_id,
            syllabus_context=req.syllabus_context,
        )
        return result
    except ValueError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Notes generation failed: {exc}",
        ) from exc


# ── MCQ generation ────────────────────────────────────────────────────────────

class MCQRequest(BaseModel):
    topic_id: str
    topic_name: str
    subject: str
    count: int = 10
    difficulty: str = "mixed"
    syllabus_context: list[str] = []


@app.post("/agent/generate-mcq")
async def agent_generate_mcq(req: MCQRequest):
    """
    Generate an MCQ set for a topic. Returns the full MCQ contract JSON.
    Raises 502 if the model returns malformed output after retries.
    """
    try:
        result = generate_mcq(
            topic_name=req.topic_name,
            subject=req.subject,
            topic_id=req.topic_id,
            count=req.count,
            difficulty=req.difficulty,
            syllabus_context=req.syllabus_context,
        )
        return result
    except ValueError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"MCQ generation failed: {exc}",
        ) from exc


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=True,
    )
