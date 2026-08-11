"""
rag_service.py — Vector store over student-uploaded reference material
(textbook chapters, lecture PDFs, past-paper solutions), used to ground
Notes and MCQ generation in real source material instead of trained LLM
knowledge alone.

Embeddings run via the Gemini Embedding API (gemini-embedding-001), not
locally. This is a deliberate change from the original sentence-transformers
approach: sentence-transformers pulls in torch, which needs 400-600MB RAM
once the model is loaded — more than Render's free-tier 512MB cap, and it
was OOM-crashing the service on startup before a single request landed.
Gemini's free tier (1,500 requests/day, no credit card) has no such memory
cost since embedding happens on Google's infrastructure, not this process.
This means GEMINI_API_KEY is now required for RAG regardless of which
LLM_PROVIDER generates notes/MCQs — see config.py's validation.

Vector storage backend: Qdrant.
  - QDRANT_URL set (Qdrant Cloud free tier, or any self-hosted Qdrant) ->
    connects over HTTP, storage lives outside this process entirely.
  - QDRANT_URL unset (default, local dev) -> embedded on-disk Qdrant at
    QDRANT_LOCAL_PATH, zero setup required. Same caveat local Chroma had:
    if the host's disk is ephemeral (e.g. Render's free tier), this data
    does not survive a restart. See config.py's production warning.
"""

from pathlib import Path
from typing import Optional

from langchain_qdrant import QdrantVectorStore
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from qdrant_client import QdrantClient
from qdrant_client.http import models as qdrant_models
from qdrant_client.http.exceptions import UnexpectedResponse

from config import settings

# gemini-embedding-001 supports configurable output dimensionality; we pin
# it to 768 explicitly (matches the old MiniLM dimension) so collection
# creation below is deterministic. If you change EMBEDDING_DIM, you must
# also change output_dimensionality in _get_embeddings() to match, or
# collection creation will silently store the wrong dimensionality.
_EMBEDDING_DIM = 768

_embeddings: Optional[GoogleGenerativeAIEmbeddings] = None
_client: Optional[QdrantClient] = None


def _get_embeddings() -> GoogleGenerativeAIEmbeddings:
    global _embeddings
    if _embeddings is None:
        _embeddings = GoogleGenerativeAIEmbeddings(
            model=settings.embedding_model,
            google_api_key=settings.gemini_api_key,
            output_dimensionality=_EMBEDDING_DIM,
        )
    return _embeddings


def _get_client() -> QdrantClient:
    global _client
    if _client is not None:
        return _client

    if settings.qdrant_url:
        _client = QdrantClient(url=settings.qdrant_url, api_key=settings.qdrant_api_key or None)
    else:
        # Embedded mode: Qdrant's own storage engine running in-process,
        # persisted to a local path — no separate server needed. This is
        # the direct equivalent of Chroma's old persist_directory behavior.
        local_dir = Path(__file__).parent.parent.parent / settings.qdrant_local_path
        local_dir.mkdir(parents=True, exist_ok=True)
        _client = QdrantClient(path=str(local_dir))
    return _client


# ── User-uploaded reference material (optional, per-syllabus) ─────────────────
#
# Whatever a student optionally uploads (textbook chapters, lecture PDFs,
# past-paper solutions) for THEIR syllabus, so Notes/MCQ generation can be
# grounded in real source material instead of LLM trained knowledge alone.
# One Qdrant collection per syllabus_id; multiple uploaded files land in the
# same collection (metadata tags which file each chunk came from) — indexed
# together, not kept separate.

_reference_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)


def _reference_collection_name(syllabus_id: str) -> str:
    # Keep the same sanitization Chroma required (alnum/underscore/hyphen)
    # even though Qdrant is more permissive — syllabus_id is expected to be
    # a uuid already, this is just defensive.
    safe_id = "".join(c for c in syllabus_id if c.isalnum() or c in "-_")
    if not safe_id:
        raise ValueError("syllabus_id must contain at least one alnum/-/_ character")
    return f"studyos_reference_{safe_id}"


def _ensure_collection(client: QdrantClient, name: str) -> None:
    """Creates the collection if it doesn't exist yet. Idempotent — safe to call on every write."""
    try:
        client.get_collection(name)
    except (UnexpectedResponse, ValueError):
        client.create_collection(
            collection_name=name,
            vectors_config=qdrant_models.VectorParams(
                size=_EMBEDDING_DIM,
                distance=qdrant_models.Distance.COSINE,
            ),
        )


def _get_reference_store(syllabus_id: str) -> QdrantVectorStore:
    client = _get_client()
    name = _reference_collection_name(syllabus_id)
    _ensure_collection(client, name)
    return QdrantVectorStore(
        client=client,
        collection_name=name,
        embedding=_get_embeddings(),
    )


def index_reference_material(syllabus_id: str, filename: str, raw_text: str) -> int:
    """
    Chunk raw extracted text from one uploaded reference file and upsert it
    into this syllabus's reference collection. Returns chunk count indexed
    (0 if the text was empty after stripping — caller should treat that as
    a no-op, not necessarily an error).

    Call once per uploaded file. Repeated calls for different files on the
    same syllabus_id accumulate in the same collection, matching "multiple
    files, indexed together."
    """
    text = raw_text.strip()
    if not text:
        return 0

    chunks = _reference_splitter.split_text(text)
    docs = [
        Document(
            page_content=chunk,
            metadata={"syllabus_id": syllabus_id, "filename": filename},
        )
        for chunk in chunks
    ]

    store = _get_reference_store(syllabus_id)
    store.add_documents(docs)
    return len(docs)


def retrieve_reference_context(syllabus_id: str, query: str, k: int = 4) -> list[dict]:
    """
    Similarity-search a syllabus's reference-material collection.
    Returns a list of {text, filename} dicts — empty list if the student
    never uploaded anything for this syllabus. That's the expected default
    case (reference material is optional), not an error, so this never
    raises for "nothing indexed yet."
    """
    try:
        store = _get_reference_store(syllabus_id)
        results = store.similarity_search(query, k=k)
    except Exception:
        return []

    return [
        {
            "text": doc.page_content,
            "filename": doc.metadata.get("filename", ""),
            "source_type": "reference",
        }
        for doc in results
    ]


def has_reference_material(syllabus_id: str) -> bool:
    """Cheap existence check — used to decide whether retrieval is worth attempting."""
    try:
        client = _get_client()
        name = _reference_collection_name(syllabus_id)
        count = client.count(collection_name=name, exact=True)
        return count.count > 0
    except Exception:
        return False
