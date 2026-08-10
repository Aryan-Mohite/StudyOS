"""
test_pdf_service.py — unit tests for the pdfplumber -> PyMuPDF -> OCR fallback chain.

Mocks each extractor tier directly rather than generating real PDF bytes,
so these tests assert the *fallback decision logic* in extract_pdf_text
(which tier is tried, and in what order, based on what the previous tier
returned) without needing real PDF fixtures or the optional OCR deps
installed.
"""

from unittest.mock import patch

from App.services import pdf_service


def test_returns_pdfplumber_text_when_available():
    with patch.object(pdf_service, "_extract_with_pdfplumber", return_value="Unit 1: Arrays and Linked Lists"):
        with patch.object(pdf_service, "_extract_with_pymupdf") as mock_pymupdf:
            with patch.object(pdf_service, "_extract_with_ocr") as mock_ocr:
                result = pdf_service.extract_pdf_text(b"fake-pdf-bytes")

    assert result == "Unit 1: Arrays and Linked Lists"
    mock_pymupdf.assert_not_called()
    mock_ocr.assert_not_called()


def test_falls_back_to_pymupdf_when_pdfplumber_returns_nothing():
    with patch.object(pdf_service, "_extract_with_pdfplumber", return_value=""):
        with patch.object(pdf_service, "_extract_with_pymupdf", return_value="recovered via pymupdf") as mock_pymupdf:
            with patch.object(pdf_service, "_extract_with_ocr") as mock_ocr:
                result = pdf_service.extract_pdf_text(b"fake-pdf-bytes")

    assert result == "recovered via pymupdf"
    mock_pymupdf.assert_called_once()
    mock_ocr.assert_not_called()


def test_falls_back_to_pymupdf_when_pdfplumber_returns_only_whitespace():
    with patch.object(pdf_service, "_extract_with_pdfplumber", return_value="   \n\n  "):
        with patch.object(pdf_service, "_extract_with_pymupdf", return_value="real text") as mock_pymupdf:
            result = pdf_service.extract_pdf_text(b"fake-pdf-bytes")

    assert result == "real text"
    mock_pymupdf.assert_called_once()


def test_falls_back_to_ocr_when_both_text_layers_are_empty():
    with patch.object(pdf_service, "_extract_with_pdfplumber", return_value=""):
        with patch.object(pdf_service, "_extract_with_pymupdf", return_value=""):
            with patch.object(pdf_service, "_extract_with_ocr", return_value="scanned page text via OCR") as mock_ocr:
                result = pdf_service.extract_pdf_text(b"fake-pdf-bytes")

    assert result == "scanned page text via OCR"
    mock_ocr.assert_called_once()


def test_returns_empty_string_when_every_tier_comes_back_empty():
    """A genuinely blank/corrupt PDF — extract_pdf_text should not raise, just return "".

    (The caller, main.py's /agent/parse-syllabus, is what turns an empty
    result into a 422 for the client — this function's contract is just
    "best-effort extraction, empty string if nothing found.")
    """
    with patch.object(pdf_service, "_extract_with_pdfplumber", return_value=""):
        with patch.object(pdf_service, "_extract_with_pymupdf", return_value=""):
            with patch.object(pdf_service, "_extract_with_ocr", return_value=""):
                result = pdf_service.extract_pdf_text(b"fake-pdf-bytes")

    assert result == ""


def test_ocr_unavailable_error_is_raised_when_deps_missing(monkeypatch):
    monkeypatch.setattr(pdf_service, "fitz", None)
    monkeypatch.setattr(pdf_service, "pytesseract", None)

    with patch.object(pdf_service, "_extract_with_pdfplumber", return_value=""):
        with patch.object(pdf_service, "_extract_with_pymupdf", return_value=""):
            try:
                pdf_service.extract_pdf_text(b"fake-pdf-bytes")
                assert False, "expected OCRUnavailableError to propagate"
            except pdf_service.OCRUnavailableError:
                pass
