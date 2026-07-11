"""
pdf_service.py — PDF text extraction. Pure I/O, no LLM calls here.
(Syllabus parsing via the LLM lives in App/agents/syllabus_agent.py)
"""

import io

import pdfplumber

try:
    import fitz  # PyMuPDF — fallback extractor + OCR page rendering
except ImportError:  # pragma: no cover
    fitz = None

try:
    import pytesseract
    from PIL import Image
except ImportError:  # pragma: no cover
    pytesseract = None
    Image = None


class OCRUnavailableError(RuntimeError):
    """Raised when a PDF needs OCR but Tesseract isn't installed."""


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


def _extract_with_ocr(file_bytes: bytes, max_pages: int = 15) -> str:
    """Render each page to an image with PyMuPDF and OCR it with Tesseract.

    This is the last resort for genuinely scanned PDFs (photographed or
    scanned syllabi with no embedded text layer at all — pdfplumber and
    PyMuPDF's text extraction both come back empty because there's simply
    no text to extract, only pixels).
    """
    if fitz is None or pytesseract is None or Image is None:
        raise OCRUnavailableError(
            "OCR dependencies (pymupdf, pytesseract, pillow) aren't installed, "
            "or the Tesseract OCR binary isn't on PATH."
        )

    text_pages: list[str] = []
    with fitz.open(stream=file_bytes, filetype="pdf") as pdf:
        for i, page in enumerate(pdf):
            if i >= max_pages:
                break
            # 2x zoom improves OCR accuracy on small syllabus fonts.
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            page_text = pytesseract.image_to_string(img)
            if page_text and page_text.strip():
                text_pages.append(page_text)
    return "\n\n".join(text_pages)


def extract_pdf_text(file_bytes: bytes) -> str:
    """Extract all text from a PDF given its raw bytes.

    Three-tier fallback:
    1. pdfplumber — fast, works for most normal PDFs.
    2. PyMuPDF — recovers text pdfplumber misses on PDFs with unusual/
       subsetted font encodings (common in Word/Canva exports), even
       though those PDFs aren't actually scanned images.
    3. OCR (PyMuPDF page rendering + Tesseract) — last resort for PDFs
       that are genuinely scanned/photographed with no text layer at all.
       Slower (several seconds per page) but works on real scans.
    """
    text = _extract_with_pdfplumber(file_bytes)
    if text.strip():
        return text

    fallback_text = _extract_with_pymupdf(file_bytes)
    if fallback_text.strip():
        return fallback_text

    ocr_text = _extract_with_ocr(file_bytes)
    if ocr_text.strip():
        return ocr_text

    return text