"""
notes_workflow.py — LangGraph graph: (retrieve student-uploaded reference
material, if any) → generate notes → return.

Reference-material retrieval is best-effort: no upload for this syllabus is
the expected default, not an error (see App/workflows/README.md).
"""

from typing import Optional, TypedDict

from langgraph.graph import END, StateGraph

from App.agents.notes_agent import generate_notes
from App.services.rag_service import retrieve_reference_context


class NotesState(TypedDict):
    topic_name: str
    subject: str
    unit_title: str
    topic_id: str
    syllabus_id: Optional[str]
    syllabus_context: list[str]
    student_context: Optional[str]
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
            student_context=state.get("student_context"),
        )
        return {**state, "result": result, "error": None}
    except ValueError as exc:
        return {**state, "result": None, "error": str(exc)}


def build_notes_graph():
    graph = StateGraph(NotesState)
    graph.add_node("generate", _generate_node)
    graph.set_entry_point("generate")
    graph.add_edge("generate", END)
    return graph.compile()


_GRAPH = build_notes_graph()


def run_notes_generation(
    topic_name: str,
    subject: str,
    unit_title: str,
    topic_id: str,
    syllabus_context: list[str],
    syllabus_id: Optional[str] = None,
    student_context: Optional[str] = None,
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
            "student_context": student_context,
            "result": None,
            "error": None,
        }
    )
    if final_state["error"]:
        raise ValueError(final_state["error"])
    return final_state["result"]
