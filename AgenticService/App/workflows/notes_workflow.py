"""
notes_workflow.py — LangGraph graph: (retrieve student-uploaded reference
material, if any) → generate notes → index into the RAG vector store (so
Tutor Chat can retrieve them later) → return.

Indexing failure never fails the request — notes generation succeeding is
the thing the user is waiting on; RAG indexing is best-effort plumbing.
Reference-material retrieval is likewise best-effort: no upload for this
syllabus is the expected default, not an error (see
App/workflows/README.md).
"""

from typing import Optional, TypedDict

from langgraph.graph import END, StateGraph

from App.agents.notes_agent import generate_notes
from App.services.rag_service import index_note, retrieve_reference_context


class NotesState(TypedDict):
    topic_name: str
    subject: str
    unit_title: str
    topic_id: str
    syllabus_id: Optional[str]
    syllabus_context: list[str]
    result: Optional[dict]
    error: Optional[str]


def _generate_node(state: NotesState) -> NotesState:
    reference_context: list[str] = []
    if state.get("syllabus_id"):
        try:
            hits = retrieve_reference_context(
                state["syllabus_id"], query=state["topic_name"], k=4
            )
            reference_context = [hit["text"] for hit in hits]
        except Exception:
            reference_context = []

    try:
        result = generate_notes(
            topic_name=state["topic_name"],
            subject=state["subject"],
            unit_title=state["unit_title"],
            topic_id=state["topic_id"],
            syllabus_context=state.get("syllabus_context", []),
            reference_context=reference_context,
        )
        return {**state, "result": result, "error": None}
    except ValueError as exc:
        return {**state, "result": None, "error": str(exc)}


def _index_node(state: NotesState) -> NotesState:
    if state.get("result"):
        try:
            index_note(
                topic_id=state["topic_id"],
                subject=state["subject"],
                topic_name=state["topic_name"],
                note=state["result"],
            )
        except Exception:
            # Best-effort — RAG indexing failure must not fail notes generation.
            pass
    return state


def _route_after_generate(state: NotesState) -> str:
    return "index" if state.get("result") else END


def build_notes_graph():
    graph = StateGraph(NotesState)
    graph.add_node("generate", _generate_node)
    graph.add_node("index", _index_node)
    graph.set_entry_point("generate")
    graph.add_conditional_edges("generate", _route_after_generate, {"index": "index", END: END})
    graph.add_edge("index", END)
    return graph.compile()


_GRAPH = build_notes_graph()


def run_notes_generation(
    topic_name: str,
    subject: str,
    unit_title: str,
    topic_id: str,
    syllabus_context: list[str],
    syllabus_id: Optional[str] = None,
) -> dict:
    """Entry point used by main.py. Raises ValueError on failure."""
    final_state = _GRAPH.invoke(
        {
            "topic_name": topic_name,
            "subject": subject,
            "unit_title": unit_title,
            "topic_id": topic_id,
            "syllabus_id": syllabus_id,
            "syllabus_context": syllabus_context,
            "result": None,
            "error": None,
        }
    )
    if final_state["error"]:
        raise ValueError(final_state["error"])
    return final_state["result"]
