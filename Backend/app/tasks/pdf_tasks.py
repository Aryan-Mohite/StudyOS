"""
Background PDF processing tasks.
Never run these synchronously — they can take 30-120s for large PDFs.
"""
import tempfile, os
from app.tasks.celery_app import celery_app


@celery_app.task(bind=True, name="app.tasks.pdf_tasks.process_syllabus_pdf")
def process_syllabus_pdf(self, syllabus_id: int, pdf_url: str) -> dict:
    """
    1. Download PDF from R2
    2. Extract text (PyPDF2 + Tesseract OCR fallback)
    3. Parse units/topics with Claude
    4. Save structured data to MySQL
    5. Trigger embedding generation
    """
    self.update_state(state="PROGRESS", meta={"step": "downloading"})
    # TODO: implement full pipeline
    # from app.services.storage import get_presigned_url
    # from app.services.llm_router import call_llm, Task
    self.update_state(state="PROGRESS", meta={"step": "parsing"})
    self.update_state(state="PROGRESS", meta={"step": "saving"})
    return {"syllabus_id": syllabus_id, "status": "parsed"}


@celery_app.task(bind=True, name="app.tasks.pdf_tasks.process_book_pdf")
def process_book_pdf(self, book_id: int, pdf_url: str, syllabus_id: int) -> dict:
    """
    1. Download book PDF from R2
    2. Chunk into sections (by chapter/heading)
    3. Trigger embedding for each chunk
    """
    self.update_state(state="PROGRESS", meta={"step": "chunking"})
    # TODO: implement chunking + send to embedding_tasks
    return {"book_id": book_id, "status": "chunked"}
