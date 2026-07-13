"""
reference_material_workflow.py — LangGraph graph for ingesting one
student-uploaded reference file: extract → index → return.

Mirrors notes_workflow.py's shape: two distinct, independently-failable
operations chained with no branching (extraction is CPU-bound PDF I/O with
its own three-tier fallback; indexing is a separate embedding/vector-store
concern). Unlike notes_workflow's indexing step, extraction failure here IS
a real failure the caller needs to know about — a bad reference upload
should surface to the student, not fail silently.

Call run_reference_ingestion() once per uploaded file. Multiple files for
the same syllabus_id land in the same Chroma collection (see
rag_service.index_reference_material) — loop at the call site (main.py)
for multi-file upload.
"""

from typing import Optional, TypedDict

from langgraph.graph import END, StateGraph

from App.services.pdf_service import extract_pdf_text
from App.services.rag_service import index_reference_material


class ReferenceIngestState(TypedDict):
    syllabus_id: str
    filename: str
    file_bytes: bytes
    raw_text: Optional[str]
    chunks_indexed: int
    error: Optional[str]


def _extract_node(state: ReferenceIngestState) -> ReferenceIngestState:
    try:
        raw_text = extract_pdf_text(state["file_bytes"])
    except Exception as exc:
        return {**state, "raw_text": None, "error": str(exc)}

    if not raw_text.strip():
        return {
            **state,
            "raw_text": None,
            "error": (
                f"Could not extract any text from '{state['filename']}'. It may be "
                f"a scanned image with no OCR available, or an empty/corrupt PDF."
            ),
        }
    return {**state, "raw_text": raw_text, "error": None}


def _index_node(state: ReferenceIngestState) -> ReferenceIngestState:
    chunks_indexed = index_reference_material(
        syllabus_id=state["syllabus_id"],
        filename=state["filename"],
        raw_text=state["raw_text"],
    )
    return {**state, "chunks_indexed": chunks_indexed}


def _route_after_extract(state: ReferenceIngestState) -> str:
    return "index" if state.get("raw_text") else END


def build_reference_ingest_graph():
    graph = StateGraph(ReferenceIngestState)
    graph.add_node("extract", _extract_node)
    graph.add_node("index", _index_node)
    graph.set_entry_point("extract")
    graph.add_conditional_edges("extract", _route_after_extract, {"index": "index", END: END})
    graph.add_edge("index", END)
    return graph.compile()


_GRAPH = build_reference_ingest_graph()


def run_reference_ingestion(syllabus_id: str, filename: str, file_bytes: bytes) -> dict:
    """Entry point used by main.py. Raises ValueError on failure."""
    final_state = _GRAPH.invoke(
        {
            "syllabus_id": syllabus_id,
            "filename": filename,
            "file_bytes": file_bytes,
            "raw_text": None,
            "chunks_indexed": 0,
            "error": None,
        }
    )
    if final_state["error"]:
        raise ValueError(final_state["error"])
    return {
        "filename": filename,
        "chunks_indexed": final_state["chunks_indexed"],
        "text_length": len(final_state["raw_text"]),
    }
