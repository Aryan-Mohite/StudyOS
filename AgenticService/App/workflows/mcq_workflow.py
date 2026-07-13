"""
mcq_workflow.py — LangGraph graph for MCQ generation: generate → validate
quality (duplicate concepts, lopsided difficulty, lazy explanations) →
repair once if issues are found → return.

This replaces the plain-function call MCQ used to have (see
App/workflows/README.md's history note). The difference from that removed
single-node wrapper is real: there's now a conditional edge that can route
back for a single targeted repair pass instead of silently shipping a
flawed set. Bounded to one repair attempt via `retried` to avoid loops.
"""

from typing import Optional, TypedDict

from langgraph.graph import END, StateGraph

from App.agents.mcq_agent import generate_mcq, repair_mcq, validate_mcq_quality
from App.services.rag_service import retrieve_reference_context


class MCQState(TypedDict):
    topic_name: str
    subject: str
    topic_id: str
    count: int
    difficulty: str
    syllabus_id: Optional[str]
    syllabus_context: list[str]
    student_context: Optional[str]
    result: Optional[dict]
    issues: list[str]
    retried: bool
    error: Optional[str]


def _generate_node(state: MCQState) -> MCQState:
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
        result = generate_mcq(
            topic_name=state["topic_name"],
            subject=state["subject"],
            topic_id=state["topic_id"],
            count=state["count"],
            difficulty=state["difficulty"],
            syllabus_context=state.get("syllabus_context", []),
            reference_context=reference_context,
            student_context=state.get("student_context"),
        )
        return {**state, "result": result, "error": None}
    except ValueError as exc:
        return {**state, "result": None, "error": str(exc)}


def _validate_node(state: MCQState) -> MCQState:
    issues = validate_mcq_quality(state["result"], requested_difficulty=state["difficulty"])
    return {**state, "issues": issues}


def _repair_node(state: MCQState) -> MCQState:
    try:
        repaired = repair_mcq(
            mcq_set=state["result"],
            issues=state["issues"],
            topic_name=state["topic_name"],
            subject=state["subject"],
        )
        return {**state, "result": repaired, "retried": True, "error": None}
    except ValueError:
        # Repair failing must not lose the original, already-contract-valid
        # set — fall back to what generate produced.
        return {**state, "retried": True}


def _route_after_generate(state: MCQState) -> str:
    return "validate" if state.get("result") else END


def _route_after_validate(state: MCQState) -> str:
    if state.get("issues") and not state.get("retried"):
        return "repair"
    return END


def build_mcq_graph():
    graph = StateGraph(MCQState)
    graph.add_node("generate", _generate_node)
    graph.add_node("validate", _validate_node)
    graph.add_node("repair", _repair_node)
    graph.set_entry_point("generate")
    graph.add_conditional_edges("generate", _route_after_generate, {"validate": "validate", END: END})
    graph.add_conditional_edges("validate", _route_after_validate, {"repair": "repair", END: END})
    graph.add_edge("repair", END)
    return graph.compile()


_GRAPH = build_mcq_graph()


def run_mcq_generation(
    topic_name: str,
    subject: str,
    topic_id: str,
    count: int,
    difficulty: str,
    syllabus_context: list[str],
    syllabus_id: Optional[str] = None,
    student_context: Optional[str] = None,
) -> dict:
    """Entry point used by main.py. Raises ValueError on failure."""
    final_state = _GRAPH.invoke(
        {
            "topic_name": topic_name,
            "subject": subject,
            "topic_id": topic_id,
            "count": count,
            "difficulty": difficulty,
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
