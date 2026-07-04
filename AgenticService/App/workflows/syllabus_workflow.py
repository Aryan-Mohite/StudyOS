"""
syllabus_workflow.py — LangGraph wrapper around syllabus_agent.parse_syllabus.

A single-node graph today (extract → done). It's still a graph, not a bare
function call, so the exact same shape can grow a "clarify with student"
or "re-parse on low confidence" branch later without changing main.py.
"""

from typing import Optional, TypedDict

from langgraph.graph import END, StateGraph

from App.agents.syllabus_agent import parse_syllabus


class SyllabusState(TypedDict):
    raw_text: str
    filename: str
    result: Optional[dict]
    error: Optional[str]


def _parse_node(state: SyllabusState) -> SyllabusState:
    try:
        result = parse_syllabus(state["raw_text"], state["filename"])
        return {**state, "result": result, "error": None}
    except ValueError as exc:
        return {**state, "result": None, "error": str(exc)}


def build_syllabus_graph():
    graph = StateGraph(SyllabusState)
    graph.add_node("parse", _parse_node)
    graph.set_entry_point("parse")
    graph.add_edge("parse", END)
    return graph.compile()


_GRAPH = build_syllabus_graph()


def run_syllabus_parse(raw_text: str, filename: str) -> dict:
    """Entry point used by main.py. Raises ValueError on failure."""
    final_state = _GRAPH.invoke({"raw_text": raw_text, "filename": filename, "result": None, "error": None})
    if final_state["error"]:
        raise ValueError(final_state["error"])
    return final_state["result"]
