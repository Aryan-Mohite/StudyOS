# Drop Docker — switch to Render's native Python runtime

## Why this was possible now
The only thing forcing this service onto Docker was installing
`tesseract-ocr` as a system binary (`apt-get install tesseract-ocr`) for
the OCR PDF-extraction fallback — Render's native Python runtime can't
install OS packages, only `pip install`. So dropping Docker requires
dropping the OCR tier.

## What changed

**Dropped: OCR fallback tier.** `extract_pdf_text()` in `pdf_service.py`
is now pdfplumber → PyMuPDF only (was pdfplumber → PyMuPDF → Tesseract
OCR). A genuinely scanned/photographed PDF with no embedded text layer at
all will now return empty text (surfaced as a client-facing error by the
caller, e.g. `reference_material_workflow.py`) instead of being OCR'd.
Normal digitally-authored PDFs (Word/Canva/LaTeX exports, which is most
university syllabi) are unaffected — pdfplumber and PyMuPDF handle those
fine on their own.

**`AgenticService/Dockerfile` — deleted.** See `DELETED_FILES.txt`; zips
can't represent deletions, so you need to `rm AgenticService/Dockerfile`
manually.

**`render.yaml`** — `runtime: docker` + `dockerfilePath` → `runtime: python`
with explicit `buildCommand: pip install -r requirements.txt` and
`startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT`. Render
injects `$PORT` itself on the native runtime, so the old hardcoded `PORT`
env var entry was dropped too — no longer needed.

**`requirements.txt`** — removed `pytesseract` and `pillow` (Pillow was
only used for OCR page-image rendering; verified it isn't imported
anywhere else in the codebase).

**`tests/test_pdf_service.py`** — rewritten for the two-tier chain. Net
one fewer test (44 vs 45 previously): removed the OCR-specific tests
(`test_falls_back_to_ocr_when_both_text_layers_are_empty`,
`test_ocr_unavailable_error_is_raised_when_deps_missing`), kept everything
else, added one new test confirming graceful degradation when PyMuPDF
itself isn't installed.

**`DEPLOYMENT.md`** — step 3 wording updated ("native Python runtime, no
Docker" instead of "Docker image build").

## Verified
- `py_compile` clean on all changed files.
- Fresh venv install of the trimmed `requirements.txt`: confirmed no
  `torch`, `tesseract`, or `sentence-transformers` in the tree (Pillow
  still appears, but only as someone else's transitive dependency — not
  something this project imports or requires directly anymore).
- `main.py` imports cleanly and `uvicorn`'s `app` object is constructed
  without errors.
- Full pytest suite: 44 passed, 0 failed.

## What you need to do
1. Delete `AgenticService/Dockerfile` (see `DELETED_FILES.txt`).
2. Push. Render's Blueprint sync will pick up `runtime: python` from the
   new `render.yaml` on next deploy — no dashboard reconfiguration needed
   since Blueprint-managed services resync from the yaml.
3. If Render's dashboard doesn't auto-pick-up the runtime-type change from
   a Blueprint sync (some platforms treat runtime type as immutable per
   service), you may need to delete and recreate the `studyos-agentic`
   service via the Blueprint rather than in-place update. Flagging this as
   a possibility, not confirmed either way — Render's own docs are the
   source of truth if the sync doesn't take.

## What's not covered
- No fallback path added for scanned PDFs. If a real user uploads a
  photographed/scanned syllabus, they'll get an error instead of OCR'd
  text. This was flagged as an explicit trade-off before implementing, not
  discovered after the fact.
- Didn't re-verify the OCR-removal decision against how often scanned
  PDFs actually show up in practice — that's a product judgment call for
  you, not something I can assess from the code.
