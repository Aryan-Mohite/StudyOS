"""
syllabus_workflow.py — LangGraph graph for the PDF Analysis Agent: parse →
validate quality (empty units, placeholder names, unparsed raw lines,
duplicate topics) → repair once against the original source text if issues
are found → return.

Same shape as mcq_workflow.py / study_plan_workflow.py: a conditional edge
that can route back for a single targeted repair pass instead of silently
shipping a thin or placeholder-riddled syllabus structure. Bounded to one
repair attempt via `retried` to avoid loops.

Promotes syllabus parsing from the plain-function call it used to be (see
App/workflows/README.md's history note) now that there's a real second
node: a quality-validation pass with an actual conditional repair edge that
re-reads the original PDF text, not just architectural symmetry with the
other three agents.
"""

from typing import Optional, TypedDict

from langgraph.graph import END, StateGraph

from App.agents.syllabus_agent import (
    parse_syllabus,
    repair_syllabus,
    validate_syllabus_quality,
)


class SyllabusState(TypedDict):
    raw_text: str
    filename: str
    result: Optional[dict]
    issues: list[str]
    retried: bool
    error: Optional[str]


def _generate_node(state: SyllabusState) -> SyllabusState:
    try:
        result = parse_syllabus(state["raw_text"], state["filename"])
        return {**state, "result": result, "error": None}
    except ValueError as exc:
        return {**state, "result": None, "error": str(exc)}


def _validate_node(state: SyllabusState) -> SyllabusState:
    issues = validate_syllabus_quality(state["result"])
    return {**state, "issues": issues}


def _repair_node(state: SyllabusState) -> SyllabusState:
    try:
        repaired = repair_syllabus(
            parsed=state["result"],
            issues=state["issues"],
            raw_text=state["raw_text"],
            filename=state["filename"],
        )
        return {**state, "result": repaired, "retried": True, "error": None}
    except ValueError:
        # Repair failing must not lose the original, already-contract-valid
        # parse — fall back to what generate produced.
        return {**state, "retried": True}


def _route_after_generate(state: SyllabusState) -> str:
    return "validate" if state.get("result") else END


def _route_after_validate(state: SyllabusState) -> str:
    if state.get("issues") and not state.get("retried"):
        return "repair"
    return END


def build_syllabus_graph():
    graph = StateGraph(SyllabusState)
    graph.add_node("generate", _generate_node)
    graph.add_node("validate", _validate_node)
    graph.add_node("repair", _repair_node)
    graph.set_entry_point("generate")
    graph.add_conditional_edges("generate", _route_after_generate, {"validate": "validate", END: END})
    graph.add_conditional_edges("validate", _route_after_validate, {"repair": "repair", END: END})
    graph.add_edge("repair", END)
    return graph.compile()


_GRAPH = build_syllabus_graph()


def run_pdf_analysis(raw_text: str, filename: str) -> dict:
    """Entry point used by main.py for the PDF Analysis Agent. Raises
    ValueError on failure."""
    final_state = _GRAPH.invoke(
        {
            "raw_text": raw_text,
            "filename": filename,
            "result": None,
            "issues": [],
            "retried": False,
            "error": None,
        }
    )
    if final_state["error"]:
        raise ValueError(final_state["error"])
    return final_state["result"]