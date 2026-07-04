"""
numericals_workflow.py — LangGraph graph wrapper around
numericals_agent.generate_numericals.
"""

from typing import Optional, TypedDict

from langgraph.graph import END, StateGraph

from App.agents.numericals_agent import generate_numericals


class NumericalsState(TypedDict):
    topic_name: str
    subject: str
    topic_id: str
    count: int
    difficulty: str
    syllabus_context: list[str]
    result: Optional[dict]
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


def build_numericals_graph():
    graph = StateGraph(NumericalsState)
    graph.add_node("generate", _generate_node)
    graph.set_entry_point("generate")
    graph.add_edge("generate", END)
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
            "error": None,
        }
    )
    if final_state["error"]:
        raise ValueError(final_state["error"])
    return final_state["result"]
