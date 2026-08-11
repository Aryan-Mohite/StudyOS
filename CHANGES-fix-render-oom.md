# Fix: Render free-tier OOM on deploy

## What broke
`studyos-agentic` deploy failed on Render free tier: "Ran out of memory
(used over 512MB) while running your code." This happened at container
startup, before any request landed — not from a syllabus upload.

## Root cause
Embeddings ran locally via `sentence-transformers` + `torch`
(`HuggingFaceEmbeddings` in `rag_service.py`). Even though the embedding
model itself was lazy-loaded, importing `torch` + `sentence-transformers`
at process startup already consumed enough RAM (typically 400-600MB once
warm) to blow past Render's 512MB free-tier cap.

## Fix chosen (free option, no code you have to run again)
Swapped local embeddings for the **Gemini Embedding API**
(`gemini-embedding-001`), via `langchain-google-genai` — a package your
requirements.txt already included for LLM generation, so no new dependency
family. Free tier: 1,500 requests/day, 10M tokens/min, no credit card.

Result: `torch` and `sentence-transformers` are gone from the dependency
tree entirely (confirmed — full install is 364MB total site-packages, was
much larger before). Nothing loads a model into this process's memory
anymore; embedding calls go out over HTTP to Google.

## Files changed
- `AgenticService/App/services/rag_service.py` — `HuggingFaceEmbeddings` →
  `GoogleGenerativeAIEmbeddings`; `_EMBEDDING_DIM` 384 → 768
  (`output_dimensionality=768` pinned explicitly for deterministic Qdrant
  collection creation).
- `AgenticService/config.py` — `embedding_model` default now
  `"models/gemini-embedding-001"`; added a startup warning (not a hard
  fail — RAG is optional) if `GEMINI_API_KEY` is unset, since embeddings
  now depend on it regardless of `LLM_PROVIDER`.
- `AgenticService/requirements.txt` — removed `sentence-transformers`,
  `langchain-huggingface`.
- `render.yaml` — dropped the now-unused `EMBEDDING_MODEL` env var;
  `GEMINI_API_KEY` comment updated to make clear it's required even on
  `LLM_PROVIDER=groq`.
- `DEPLOYMENT.md` — step 3 and "Known limitations" updated to reflect the
  fix and the new `GEMINI_API_KEY` requirement.

## What you need to do
1. **Set `GEMINI_API_KEY` on Render**, even though `LLM_PROVIDER=groq`.
   Free key, no card: https://aistudio.google.com/apikey.
2. Redeploy `studyos-agentic` on Render (push this zip's changes, or
   trigger Manual Deploy — Render will pick up the new `requirements.txt`
   and `render.yaml` on next Blueprint sync).
3. If you already had a Qdrant collection from a prior local test with the
   old 384-dim MiniLM vectors, delete it — the new 768-dim Gemini vectors
   are a different shape and won't mix with old collection metadata.
   Collections are auto-created per-syllabus on next upload, so this is a
   one-time throwaway, not a migration you need to write.

## What's not covered
- No new automated test asserts the embedding call itself hits Gemini
  (RAG workflow tests already stub the whole module per `conftest.py`'s
  existing pattern — this change doesn't touch that boundary).
- No retry/backoff added around the 1,500 req/day Gemini free-tier limit.
  Unlikely to matter for expected traffic, but flagging it as an
  unaddressed edge case, not a silent assumption.
- Did not touch `libgl1` in the Dockerfile's apt-get install — it's likely
  dead weight now (was probably there for the old torch/PIL chain) but I
  didn't verify PyMuPDF/pytesseract don't need it, so left it in rather
  than guess.
