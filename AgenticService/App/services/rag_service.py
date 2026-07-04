"""
rag_service.py — Vector store over generated Notes content, used by the
Tutor Chat workflow for retrieval-augmented answers.

This replaces the old "Assets" folder from the reference architecture:
instead of storing raw uploaded files, we persist embedded Notes chunks
in a local Chroma DB on disk (App-level vector_db/ folder).

Embeddings run locally via sentence-transformers (no extra paid API,
consistent with "lean infra until justified" — we only add the vector
DB itself because Tutor Chat genuinely needs retrieval).
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
_splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100)

_COLLECTION_NAME = "studyos_notes"


def _get_embeddings() -> HuggingFaceEmbeddings:
    global _embeddings
    if _embeddings is None:
        _embeddings = HuggingFaceEmbeddings(model_name=settings.embedding_model)
    return _embeddings


def _get_store() -> Chroma:
    return Chroma(
        collection_name=_COLLECTION_NAME,
        embedding_function=_get_embeddings(),
        persist_directory=str(_VECTOR_DIR),
    )


def index_note(topic_id: str, subject: str, topic_name: str, note: dict) -> int:
    """
    Chunk a generated Notes contract object and upsert it into the vector store.
    Call this right after Notes generation succeeds. Returns chunk count indexed.
    """
    text_parts: list[str] = []
    for section in note.get("sections", []):
        heading = section.get("heading", "")
        content = section.get("content", "")
        text_parts.append(f"{heading}\n{content}")
    if note.get("summary"):
        text_parts.append(f"Summary\n{note['summary']}")

    full_text = "\n\n".join(text_parts).strip()
    if not full_text:
        return 0

    chunks = _splitter.split_text(full_text)
    docs = [
        Document(
            page_content=chunk,
            metadata={"topic_id": topic_id, "topic": topic_name, "subject": subject},
        )
        for chunk in chunks
    ]

    store = _get_store()
    store.add_documents(docs)
    return len(docs)


def retrieve_context(query: str, topic_id: Optional[str] = None, k: int = 4) -> list[dict]:
    """
    Similarity-search the vector store for chunks relevant to `query`.
    If topic_id is given, restrict retrieval to that topic's notes.
    Returns a list of {text, topic, subject} dicts (empty list if nothing indexed yet).
    """
    store = _get_store()
    filter_ = {"topic_id": topic_id} if topic_id else None

    try:
        results = store.similarity_search(query, k=k, filter=filter_)
    except Exception:
        # Empty/uninitialized collection — no notes indexed yet for this scope.
        return []

    return [
        {
            "text": doc.page_content,
            "topic": doc.metadata.get("topic", ""),
            "subject": doc.metadata.get("subject", ""),
        }
        for doc in results
    ]
