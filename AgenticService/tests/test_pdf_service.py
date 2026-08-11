"""
test_pdf_service.py — unit tests for the pdfplumber -> PyMuPDF fallback chain.

Mocks each extractor tier directly rather than generating real PDF bytes,
so these tests assert the *fallback decision logic* in extract_pdf_text
(which tier is tried, and in what order, based on what the previous tier
returned) without needing real PDF fixtures.
"""

from unittest.mock import patch

from App.services import pdf_service


def test_returns_pdfplumber_text_when_available():
    with patch.object(pdf_service, "_extract_with_pdfplumber", return_value="Unit 1: Arrays and Linked Lists"):
        with patch.object(pdf_service, "_extract_with_pymupdf") as mock_pymupdf:
            result = pdf_service.extract_pdf_text(b"fake-pdf-bytes")

    assert result == "Unit 1: Arrays and Linked Lists"
    mock_pymupdf.assert_not_called()


def test_falls_back_to_pymupdf_when_pdfplumber_returns_nothing():
    with patch.object(pdf_service, "_extract_with_pdfplumber", return_value=""):
        with patch.object(pdf_service, "_extract_with_pymupdf", return_value="recovered via pymupdf") as mock_pymupdf:
            result = pdf_service.extract_pdf_text(b"fake-pdf-bytes")

    assert result == "recovered via pymupdf"
    mock_pymupdf.assert_called_once()


def test_falls_back_to_pymupdf_when_pdfplumber_returns_only_whitespace():
    with patch.object(pdf_service, "_extract_with_pdfplumber", return_value="   \n\n  "):
        with patch.object(pdf_service, "_extract_with_pymupdf", return_value="real text") as mock_pymupdf:
            result = pdf_service.extract_pdf_text(b"fake-pdf-bytes")

    assert result == "real text"
    mock_pymupdf.assert_called_once()


def test_returns_empty_string_when_every_tier_comes_back_empty():
    """A genuinely blank/corrupt/scanned-with-no-text-layer PDF —
    extract_pdf_text should not raise, just return "".

    (The caller, e.g. reference_material_workflow.py's _extract_node, is
    what turns an empty result into a client-facing error asking for a
    text-based PDF — this function's contract is just "best-effort
    extraction, empty string if nothing found.")
    """
    with patch.object(pdf_service, "_extract_with_pdfplumber", return_value=""):
        with patch.object(pdf_service, "_extract_with_pymupdf", return_value=""):
            result = pdf_service.extract_pdf_text(b"fake-pdf-bytes")

    assert result == ""


def test_pymupdf_returns_empty_when_fitz_unavailable(monkeypatch):
    """If PyMuPDF itself isn't installed, the pymupdf tier should degrade
    to empty rather than raise — pdfplumber alone still works."""
    monkeypatch.setattr(pdf_service, "fitz", None)

    with patch.object(pdf_service, "_extract_with_pdfplumber", return_value=""):
        result = pdf_service.extract_pdf_text(b"fake-pdf-bytes")

    assert result == ""
