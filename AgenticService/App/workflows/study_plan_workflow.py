"""
study_plan_workflow.py — LangGraph graph for study plan generation:
generate -> validate quality (topic coverage, day-sequence, revision days) ->
repair once if issues are found -> return.

Mirrors App/workflows/mcq_workflow.py's shape (generate -> validate ->
conditional repair, bounded to one repair attempt via `retried`).
"""

from datetime import date, datetime
from typing import Optional, TypedDict

from langgraph.graph import END, StateGraph

from App.agents.study_plan_agent import (
    flatten_syllabus_topics,
    generate_study_plan,
    repair_study_plan,
    validate_study_plan_quality,
)


class StudyPlanState(TypedDict):
    syllabus_id: str
    syllabus: dict
    exam_date: str
    days_available: int
    topics: list[dict]
    result: Optional[dict]
    issues: list[str]
    retried: bool
    error: Optional[str]


def _generate_node(state: StudyPlanState) -> StudyPlanState:
    try:
        result = generate_study_plan(
            syllabus_id=state["syllabus_id"],
            exam_date=state["exam_date"],
            days_available=state["days_available"],
            topics=state["topics"],
        )
        return {**state, "result": result, "error": None}
    except ValueError as exc:
        return {**state, "result": None, "error": str(exc)}


def _validate_node(state: StudyPlanState) -> StudyPlanState:
    expected_ids = [t["topic_id"] for t in state["topics"]]
    issues = validate_study_plan_quality(
        state["result"], expected_topic_ids=expected_ids, days_available=state["days_available"]
    )
    return {**state, "issues": issues}


def _repair_node(state: StudyPlanState) -> StudyPlanState:
    try:
        repaired = repair_study_plan(
            plan=state["result"],
            issues=state["issues"],
            expected_topics=state["topics"],
            days_available=state["days_available"],
        )
        return {**state, "result": repaired, "retried": True, "error": None}
    except ValueError:
        # Repair failing must not lose the original, already-contract-valid
        # plan — fall back to what generate produced.
        return {**state, "retried": True}


def _route_after_generate(state: StudyPlanState) -> str:
    return "validate" if state.get("result") else END


def _route_after_validate(state: StudyPlanState) -> str:
    if state.get("issues") and not state.get("retried"):
        return "repair"
    return END


def build_study_plan_graph():
    graph = StateGraph(StudyPlanState)
    graph.add_node("generate", _generate_node)
    graph.add_node("validate", _validate_node)
    graph.add_node("repair", _repair_node)
    graph.set_entry_point("generate")
    graph.add_conditional_edges("generate", _route_after_generate, {"validate": "validate", END: END})
    graph.add_conditional_edges("validate", _route_after_validate, {"repair": "repair", END: END})
    graph.add_edge("repair", END)
    return graph.compile()


_GRAPH = build_study_plan_graph()


def run_study_plan_generation(syllabus_id: str, syllabus: dict, exam_date: str) -> dict:
    """Entry point used by main.py. Raises ValueError on failure or on an
    invalid/past exam date."""
    try:
        exam_dt = datetime.strptime(exam_date, "%Y-%m-%d").date()
    except ValueError as exc:
        raise ValueError(f"exam_date must be YYYY-MM-DD: {exc}") from exc

    today = date.today()
    days_available = (exam_dt - today).days + 1  # inclusive of today and exam-eve
    if days_available < 1:
        raise ValueError("exam_date must be today or in the future.")
    # Cap at a sane planning horizon — beyond ~180 days the per-day plan is
    # low-signal and blows past the LLM's practical output size.
    days_available = min(days_available, 180)

    topics = flatten_syllabus_topics(syllabus)
    if not topics:
        raise ValueError("Syllabus has no topics to schedule.")

    final_state = _GRAPH.invoke(
        {
            "syllabus_id": syllabus_id,
            "syllabus": syllabus,
            "exam_date": exam_date,
            "days_available": days_available,
            "topics": topics,
            "result": None,
            "issues": [],
            "retried": False,
            "error": None,
        }
    )
    if final_state["error"]:
        raise ValueError(final_state["error"])
    return final_state["result"]
