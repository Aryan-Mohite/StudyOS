"""Syllabus upload, parsing, topic retrieval."""
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.syllabus import SyllabusUploadResponse, TopicOut
from app.services.storage import upload_file
from app.tasks.pdf_tasks import process_syllabus_pdf

router = APIRouter()


@router.post("/upload", response_model=SyllabusUploadResponse)
async def upload_syllabus(
    file: UploadFile = File(...),
    subject_name: str = Form("Unknown Subject"),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename or not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files accepted.")

    content = await file.read()
    key = f"syllabi/{file.filename}"
    pdf_url = upload_file(content, key)

    # TODO: save Syllabus row to MySQL, get real syllabus_id
    syllabus_id = 1

    # Kick off async PDF parsing — never block the HTTP response
    task = process_syllabus_pdf.delay(syllabus_id, pdf_url)

    return SyllabusUploadResponse(
        syllabus_id=syllabus_id,
        subject=subject_name,
        units=[],
        task_id=task.id,
    )


@router.get("/{syllabus_id}/topics", response_model=list[TopicOut])
async def get_topics(syllabus_id: int, db: AsyncSession = Depends(get_db)):
    # TODO: query Topic table filtered by syllabus_id
    return []
