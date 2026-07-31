"""
rag_service.py — Vector store over student-uploaded reference material
(textbook chapters, lecture PDFs, past-paper solutions), used to ground
Notes and MCQ generation in real source material instead of trained LLM
knowledge alone.

Embeddings run locally via sentence-transformers (no extra paid API,
consistent with "lean infra until justified").
"""

from pathlib import Path
from typing import Optional

from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from config import settings

_VECTOR_DIR = Path(__file__).parent.parent.parent / settings.vector_db_dir
_VECTOR_DIR.mkdir(parents=True, exist_ok=True)

_embeddings: Optional[HuggingFaceEmbeddings] = None


def _get_embeddings() -> HuggingFaceEmbeddings:
    global _embeddings
    if _embeddings is None:
        _embeddings = HuggingFaceEmbeddings(model_name=settings.embedding_model)
    return _embeddings


# ── User-uploaded reference material (optional, per-syllabus) ─────────────────
#
# Whatever a student optionally uploads (textbook chapters, lecture PDFs,
# past-paper solutions) for THEIR syllabus, so Notes/MCQ generation can be
# grounded in real source material instead of LLM trained knowledge alone.
# One Chroma collection per syllabus_id; multiple uploaded files land in the
# same collection (metadata tags which file each chunk came from) — indexed
# together, not kept separate.

_reference_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)


def _reference_collection_name(syllabus_id: str) -> str:
    # Chroma collection names must be alnum/underscore/hyphen; syllabus_id is
    # expected to be a uuid already, but strip defensively regardless.
    safe_id = "".join(c for c in syllabus_id if c.isalnum() or c in "-_")
    if not safe_id:
        raise ValueError("syllabus_id must contain at least one alnum/-/_ character")
    return f"studyos_reference_{safe_id}"


def _get_reference_store(syllabus_id: str) -> Chroma:
    return Chroma(
        collection_name=_reference_collection_name(syllabus_id),
        embedding_function=_get_embeddings(),
        persist_directory=str(_VECTOR_DIR),
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
        store = _get_reference_store(syllabus_id)
        return store._collection.count() > 0
    except Exception:
        return False
