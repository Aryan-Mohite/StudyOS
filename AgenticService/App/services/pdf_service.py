"""
pdf_service.py — PDF text extraction. Pure I/O, no LLM calls here.
(Syllabus parsing via the LLM lives in App/agents/syllabus_agent.py)
"""

import io

import pdfplumber

try:
    import fitz  # PyMuPDF — fallback extractor
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

    pdfplumber (built on pdfminer) fails to extract any text from a
    meaningful number of real-world PDFs — e.g. ones exported from Word/
    Canva with subsetted or non-standard-encoded embedded fonts — even
    though the PDF is not actually a scanned image. In that case we retry
    with PyMuPDF, which uses a different, more permissive text-extraction
    path and recovers text pdfplumber misses.
    """
    text = _extract_with_pdfplumber(file_bytes)
    if text.strip():
        return text

    fallback_text = _extract_with_pymupdf(file_bytes)
    if fallback_text.strip():
        return fallback_text

    return text
