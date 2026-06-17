import json
import uuid
from datetime import datetime, timezone

import aiosqlite
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from config import settings
from database import get_db
from services.pdf_parser import extract_pdf_text, parse_syllabus

router = APIRouter(prefix="/upload", tags=["upload"])

_MAX_BYTES = settings.max_pdf_size_mb * 1024 * 1024


@router.post("")
async def upload_syllabus(
    file: UploadFile = File(...),
    user_id: str = Form(default="dev-user-01"),
    db: aiosqlite.Connection = Depends(get_db),
) -> JSONResponse:
    """
    Accept a PDF syllabus, extract text, parse it with Claude,
    store the result in SQLite, and return the structured syllabus JSON.
    """
    # ── Validate file ────────────────────────────────────────────────────────
    filename = file.filename or "syllabus.pdf"

    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    # Check content-length header first for a fast-fail
    if file.size and file.size > _MAX_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File must be under {settings.max_pdf_size_mb} MB.",
        )

    # ── Extract text ─────────────────────────────────────────────────────────
    try:
        raw_text = await extract_pdf_text(file)
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Could not open PDF: {exc}. Make sure the file is not corrupted.",
        )

    if not raw_text.strip():
        raise HTTPException(
            status_code=422,
            detail=(
                "No text could be extracted from this PDF. "
                "Try a text-based PDF — scanned image PDFs are not yet supported."
            ),
        )

    # ── Parse with Claude ────────────────────────────────────────────────────
    try:
        parsed = parse_syllabus(raw_text, filename)
    except ValueError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Syllabus parsing failed: {exc}",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error during parsing: {exc}",
        )

    # Stamp upload time
    parsed["uploaded_at"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    # ── Persist ──────────────────────────────────────────────────────────────
    syllabus_id = parsed["syllabus_id"]
    await db.execute(
        """INSERT OR REPLACE INTO syllabi
           (id, user_id, filename, raw_text, parsed_json)
           VALUES (?, ?, ?, ?, ?)""",
        (
            syllabus_id,
            user_id,
            filename,
            raw_text[:50_000],      # cap stored raw text at 50 k chars
            json.dumps(parsed),
        ),
    )
    await db.commit()

    return JSONResponse(content=parsed, status_code=200)


@router.get("/latest")
async def get_latest_syllabus(
    user_id: str = "dev-user-01",
    db: aiosqlite.Connection = Depends(get_db),
) -> JSONResponse:
    """Return the most recently uploaded syllabus for a user."""
    cursor = await db.execute(
        "SELECT parsed_json FROM syllabi WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
        (user_id,),
    )
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="No syllabus found for this user.")
    return JSONResponse(content=json.loads(row["parsed_json"]))
