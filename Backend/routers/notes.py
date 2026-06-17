import json
from typing import Optional

import aiosqlite
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from database import get_db
from services.notes_service import generate_notes

router = APIRouter(prefix="/notes", tags=["notes"])


# ── Request / Response models ────────────────────────────────────────────────

class GenerateNotesRequest(BaseModel):
    topic_id: str
    topic_name: str
    subject: str
    unit_title: str
    syllabus_context: list[str] = []
    syllabus_id: Optional[str] = None
    force_regenerate: bool = False


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/generate")
async def generate_notes_endpoint(
    req: GenerateNotesRequest,
    db: aiosqlite.Connection = Depends(get_db),
) -> JSONResponse:
    """
    Generate study notes for a topic.

    If notes already exist for this topic_id and force_regenerate is False,
    returns the cached version immediately (no LLM call, no cost).
    """
    # ── Cache check ──────────────────────────────────────────────────────────
    if not req.force_regenerate:
        cursor = await db.execute(
            "SELECT content_json FROM notes WHERE topic_id = ? ORDER BY created_at DESC LIMIT 1",
            (req.topic_id,),
        )
        row = await cursor.fetchone()
        if row:
            cached = json.loads(row["content_json"])
            cached["_cached"] = True          # tell frontend this was cached
            return JSONResponse(content=cached)

    # ── Generate ─────────────────────────────────────────────────────────────
    try:
        notes = generate_notes(
            topic_name=req.topic_name,
            subject=req.subject,
            unit_title=req.unit_title,
            topic_id=req.topic_id,
            syllabus_context=req.syllabus_context,
        )
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=f"Notes generation failed: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {exc}")

    # ── Cache result ─────────────────────────────────────────────────────────
    await db.execute(
        """INSERT OR REPLACE INTO notes
           (id, syllabus_id, topic_id, topic_name, subject, content_json)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (
            notes["note_id"],
            req.syllabus_id or "",
            req.topic_id,
            req.topic_name,
            req.subject,
            json.dumps(notes),
        ),
    )
    await db.commit()

    notes["_cached"] = False
    return JSONResponse(content=notes)


@router.get("/{topic_id}")
async def get_notes(
    topic_id: str,
    db: aiosqlite.Connection = Depends(get_db),
) -> JSONResponse:
    """Fetch previously generated notes for a topic (no LLM call)."""
    cursor = await db.execute(
        "SELECT content_json FROM notes WHERE topic_id = ? ORDER BY created_at DESC LIMIT 1",
        (topic_id,),
    )
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Notes not found for this topic.")
    return JSONResponse(content=json.loads(row["content_json"]))


@router.delete("/{topic_id}")
async def delete_notes(
    topic_id: str,
    db: aiosqlite.Connection = Depends(get_db),
) -> JSONResponse:
    """Delete cached notes so they will be regenerated on next request."""
    await db.execute("DELETE FROM notes WHERE topic_id = ?", (topic_id,))
    await db.commit()
    return JSONResponse(content={"deleted": True, "topic_id": topic_id})
