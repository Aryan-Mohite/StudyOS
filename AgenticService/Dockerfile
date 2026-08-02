# StudyOS AgenticService — production image for Render (or any Docker host).
#
# Two things this image needs that a plain `pip install` won't give you:
#   1. Tesseract OCR as a system binary (pytesseract is just a wrapper around
#      the `tesseract` CLI — it does nothing without this installed).
#   2. A reasonably small final image, since Render's free tier has limited
#      disk/RAM — sentence-transformers pulls in torch, which is the single
#      biggest thing in this image regardless of what we do here.
#
# NOTE on memory: sentence-transformers + torch commonly need 400-600MB RAM
# once the embedding model is loaded. Render's free web service tier gives
# you 512MB total. This can OOM on the free tier under real usage — see
# DEPLOYMENT.md for what to do if that happens (it's a known, flagged
# limitation, not something silently papered over here).

FROM python:3.11-slim

# tesseract-ocr: the OCR fallback tier in App/services/pdf_service.py
# (pdfplumber -> pymupdf -> tesseract) needs this system package; pip alone
# only installs the Python wrapper, not the actual OCR engine.
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements first so Docker layer caching skips the (slow) pip
# install step on rebuilds that only change application code.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Render sets $PORT at runtime and expects the process to bind to it —
# hence reading os.environ["PORT"] here rather than hardcoding 8000 (the
# app's own default, used for local dev via `python main.py`).
ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
