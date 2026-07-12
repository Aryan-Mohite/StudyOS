"""
numericals_workflow.py — LangGraph graph for solved-numericals generation:
generate → validate quality (empty `given`, placeholder answers, skipped
derivation steps, lopsided difficulty) → repair once if issues are found →
return.

Same rationale as mcq_workflow.py (see App/workflows/README.md's history
note on why the old no-op single-node wrappers were removed, and why this
one is different: a real conditional repair edge, bounded to one attempt).
"""

from typing import Optional, TypedDict

from langgraph.graph import END, StateGraph

from App.agents.numericals_agent import (
    generate_numericals,
    repair_numericals,
    validate_numericals_quality,
)


class NumericalsState(TypedDict):
    topic_name: str
    subject: str
    topic_id: str
    count: int
    difficulty: str
    syllabus_context: list[str]
    result: Optional[dict]
    issues: list[str]
    retried: bool
    error: Optional[str]


def _generate_node(state: NumericalsState) -> NumericalsState:
    try:
        result = generate_numericals(
            topic_name=state["topic_name"],
            subject=state["subject"],
            topic_id=state["topic_id"],
            count=state["count"],
            difficulty=state["difficulty"],
            syllabus_context=state.get("syllabus_context", []),
        )
        return {**state, "result": result, "error": None}
    except ValueError as exc:
        return {**state, "result": None, "error": str(exc)}


def _validate_node(state: NumericalsState) -> NumericalsState:
    issues = validate_numericals_quality(
        state["result"], requested_difficulty=state["difficulty"]
    )
    return {**state, "issues": issues}


def _repair_node(state: NumericalsState) -> NumericalsState:
    try:
        repaired = repair_numericals(
            problem_set=state["result"],
            issues=state["issues"],
            topic_name=state["topic_name"],
            subject=state["subject"],
        )
        return {**state, "result": repaired, "retried": True, "error": None}
    except ValueError:
        # Repair failing must not lose the original, already-contract-valid
        # set — fall back to what generate produced.
        return {**state, "retried": True}


def _route_after_generate(state: NumericalsState) -> str:
    return "validate" if state.get("result") else END


def _route_after_validate(state: NumericalsState) -> str:
    if state.get("issues") and not state.get("retried"):
        return "repair"
    return END


def build_numericals_graph():
    graph = StateGraph(NumericalsState)
    graph.add_node("generate", _generate_node)
    graph.add_node("validate", _validate_node)
    graph.add_node("repair", _repair_node)
    graph.set_entry_point("generate")
    graph.add_conditional_edges("generate", _route_after_generate, {"validate": "validate", END: END})
    graph.add_conditional_edges("validate", _route_after_validate, {"repair": "repair", END: END})
    graph.add_edge("repair", END)
    return graph.compile()


_GRAPH = build_numericals_graph()


def run_numericals_generation(
    topic_name: str,
    subject: str,
    topic_id: str,
    count: int,
    difficulty: str,
    syllabus_context: list[str],
) -> dict:
    """Entry point used by main.py. Raises ValueError on failure."""
    final_state = _GRAPH.invoke(
        {
            "topic_name": topic_name,
            "subject": subject,
            "topic_id": topic_id,
            "count": count,
            "difficulty": difficulty,
            "syllabus_context": syllabus_context,
            "result": None,
            "issues": [],
            "retried": False,
            "error": None,
        }
    )
    if final_state["error"]:
        raise ValueError(final_state["error"])
    return final_state["result"]
