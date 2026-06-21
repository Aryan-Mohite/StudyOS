import json
from typing import Literal, Optional

import aiosqlite
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from database import get_db
from services.mcq_service import generate_mcq

router = APIRouter(prefix="/mcq", tags=["mcq"])


# ── Request / Response models ────────────────────────────────────────────────

class GenerateMCQRequest(BaseModel):
    topic_id: str
    topic_name: str
    subject: str
    count: int = Field(default=10, ge=1, le=20)
    difficulty: Literal["easy", "medium", "hard", "mixed"] = "mixed"
    syllabus_context: list[str] = []
    syllabus_id: Optional[str] = None
    force_regenerate: bool = False


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/generate")
async def generate_mcq_endpoint(
    req: GenerateMCQRequest,
    db: aiosqlite.Connection = Depends(get_db),
) -> JSONResponse:
    """
    Generate an MCQ set for a topic.

    If an MCQ set already exists for this topic_id and force_regenerate is
    False, returns the cached version immediately (no LLM call, no cost).
    Cache is keyed by topic_id only — matching the Notes pattern — since
    the UI does not yet expose count/difficulty selection.
    """
    # ── Cache check ──────────────────────────────────────────────────────────
    if not req.force_regenerate:
        cursor = await db.execute(
            "SELECT content_json FROM mcq_sets WHERE topic_id = ? ORDER BY created_at DESC LIMIT 1",
            (req.topic_id,),
        )
        row = await cursor.fetchone()
        if row:
            cached = json.loads(row["content_json"])
            cached["_cached"] = True          # tell frontend this was cached
            return JSONResponse(content=cached)

    # ── Generate ─────────────────────────────────────────────────────────────
    try:
        mcq_set = generate_mcq(
            topic_name=req.topic_name,
            subject=req.subject,
            topic_id=req.topic_id,
            count=req.count,
            difficulty=req.difficulty,
            syllabus_context=req.syllabus_context,
        )
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=f"MCQ generation failed: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {exc}")

    # ── Cache result ─────────────────────────────────────────────────────────
    await db.execute(
        """INSERT OR REPLACE INTO mcq_sets
           (id, syllabus_id, topic_id, topic_name, subject, difficulty, content_json)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (
            mcq_set["mcq_set_id"],
            req.syllabus_id or "",
            req.topic_id,
            req.topic_name,
            req.subject,
            req.difficulty,
            json.dumps(mcq_set),
        ),
    )
    await db.commit()

    mcq_set["_cached"] = False
    return JSONResponse(content=mcq_set)


@router.get("/{topic_id}")
async def get_mcq(
    topic_id: str,
    db: aiosqlite.Connection = Depends(get_db),
) -> JSONResponse:
    """Fetch a previously generated MCQ set for a topic (no LLM call)."""
    cursor = await db.execute(
        "SELECT content_json FROM mcq_sets WHERE topic_id = ? ORDER BY created_at DESC LIMIT 1",
        (topic_id,),
    )
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="MCQ set not found for this topic.")
    return JSONResponse(content=json.loads(row["content_json"]))


@router.delete("/{topic_id}")
async def delete_mcq(
    topic_id: str,
    db: aiosqlite.Connection = Depends(get_db),
) -> JSONResponse:
    """Delete the cached MCQ set so it will be regenerated on next request."""
    await db.execute("DELETE FROM mcq_sets WHERE topic_id = ?", (topic_id,))
    await db.commit()
    return JSONResponse(content={"deleted": True, "topic_id": topic_id})
