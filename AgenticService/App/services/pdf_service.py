"""
pdf_service.py — PDF text extraction. Pure I/O, no LLM calls here.
(Syllabus parsing via the LLM lives in App/agents/syllabus_agent.py)
"""

import io

import pdfplumber

try:
    import fitz  # PyMuPDF — fallback extractor for PDFs pdfplumber misses
except ImportError:  # pragma: no cover
    fitz = None


def _extract_with_pdfplumber(file_bytes: bytes) -> str:
    text_pages: list[str] = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text and page_text.strip():
                text_pages.append(page_text)
    return "\n\n".join(text_pages)


def _extract_with_pymupdf(file_bytes: bytes) -> str:
    if fitz is None:
        return ""
    text_pages: list[str] = []
    with fitz.open(stream=file_bytes, filetype="pdf") as pdf:
        for page in pdf:
            page_text = page.get_text()
            if page_text and page_text.strip():
                text_pages.append(page_text)
    return "\n\n".join(text_pages)


def extract_pdf_text(file_bytes: bytes) -> str:
    """Extract all text from a PDF given its raw bytes.

    Two-tier fallback:
    1. pdfplumber — fast, works for most normal PDFs.
    2. PyMuPDF — recovers text pdfplumber misses on PDFs with unusual/
       subsetted font encodings (common in Word/Canva exports), even
       though those PDFs aren't actually scanned images.

    No OCR tier: genuinely scanned/photographed PDFs with no embedded text
    layer at all will return empty here (caller surfaces this as an error
    asking for a text-based PDF instead — see reference_material_workflow.py
    and syllabus_agent.py). OCR (Tesseract) was deliberately dropped along
    with the Dockerfile — it needs a system binary that Render's native
    Python runtime (no Docker) can't install, and it was the only thing
    forcing this service onto Docker in the first place.
    """
    text = _extract_with_pdfplumber(file_bytes)
    if text.strip():
        return text

    fallback_text = _extract_with_pymupdf(file_bytes)
    if fallback_text.strip():
        return fallback_text

    return text