"""
notes_workflow.py — LangGraph graph: (retrieve student-uploaded reference
material, if any) → generate notes → validate quality (thin sections,
duplicate headings/key_points, throwaway summary) → repair once if issues
are found → return.

Reference-material retrieval is best-effort: no upload for this syllabus is
the expected default, not an error (see App/workflows/README.md).

AI RESPONSE IMPROVEMENT (see CHANGES-AI-QUALITY.md): this used to be a
single generate-then-return node — the only one of the three generation
workflows (mcq, notes, study_plan) without a quality-check/repair pass.
Brought up to parity with mcq_workflow.py's pattern: a conditional edge
that can route back for one bounded repair attempt instead of silently
shipping notes with a thin section or a duplicate heading.
"""

from typing import Optional, TypedDict

from langgraph.graph import END, StateGraph

from App.agents.notes_agent import generate_notes, repair_notes, validate_notes_quality
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
    issues: list[str]
    retried: bool
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


def _validate_node(state: NotesState) -> NotesState:
    issues = validate_notes_quality(state["result"])
    return {**state, "issues": issues}


def _repair_node(state: NotesState) -> NotesState:
    try:
        repaired = repair_notes(
            notes=state["result"],
            issues=state["issues"],
            topic_name=state["topic_name"],
            subject=state["subject"],
        )
        return {**state, "result": repaired, "retried": True, "error": None}
    except ValueError:
        # Repair failing must not lose the original, already-contract-valid
        # notes — fall back to what generate produced.
        return {**state, "retried": True}


def _route_after_generate(state: NotesState) -> str:
    return "validate" if state.get("result") else END


def _route_after_validate(state: NotesState) -> str:
    if state.get("issues") and not state.get("retried"):
        return "repair"
    return END


def build_notes_graph():
    graph = StateGraph(NotesState)
    graph.add_node("generate", _generate_node)
    graph.add_node("validate", _validate_node)
    graph.add_node("repair", _repair_node)
    graph.set_entry_point("generate")
    graph.add_conditional_edges("generate", _route_after_generate, {"validate": "validate", END: END})
    graph.add_conditional_edges("validate", _route_after_validate, {"repair": "repair", END: END})
    graph.add_edge("repair", END)
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
            "issues": [],
            "retried": False,
            "error": None,
        }
    )
    if final_state["error"]:
        raise ValueError(final_state["error"])
    return final_state["result"]
