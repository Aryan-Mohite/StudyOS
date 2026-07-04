"""
pdf_service.py — PDF text extraction. Pure I/O, no LLM calls here.
(Syllabus parsing via Claude lives in App/agents/syllabus_agent.py)
"""

import io

import pdfplumber


def extract_pdf_text(file_bytes: bytes) -> str:
    """Extract all text from a PDF given its raw bytes."""
    text_pages: list[str] = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text and page_text.strip():
                text_pages.append(page_text)
    return "\n\n".join(text_pages)
