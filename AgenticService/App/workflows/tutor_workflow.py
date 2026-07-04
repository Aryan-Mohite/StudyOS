"""
tutor_workflow.py — LangGraph graph for the AI Tutor: retrieve → generate,
with short-term conversation memory via LangGraph's checkpointer.

This is the one workflow in StudyOS that genuinely needs the agent/graph
treatment: it has multi-step logic (retrieve context, then reason over it)
and state that must persist across turns (chat history) — unlike Notes/
MCQ/Numericals, which are single prompt → response calls.

Memory: in-process MemorySaver keyed by thread_id (= chat session id, e.g.
f"{user_id}:{topic_id}"). This matches the roadmap's "simple in-memory
context window per session" option — swap for a persistent checkpointer
(e.g. SQLite-backed) later if sessions need to survive a server restart.
"""

from typing import Optional, TypedDict

from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, StateGraph

from App.agents.tutor_agent import generate_tutor_response
from App.services.rag_service import retrieve_context


class TutorState(TypedDict):
    question: str
    subject: str
    topic_name: str
    topic_id: str
    syllabus_context: list[str]
    chat_history: list[dict]  # accumulated across turns via the checkpointer
    retrieved_chunks: Optional[list[dict]]
    result: Optional[dict]
    error: Optional[str]


def _retrieve_node(state: TutorState) -> TutorState:
    chunks = retrieve_context(
        query=state["question"],
        topic_id=state.get("topic_id"),
        k=4,
    )
    return {**state, "retrieved_chunks": chunks}


def _generate_node(state: TutorState) -> TutorState:
    try:
        result = generate_tutor_response(
            question=state["question"],
            subject=state["subject"],
            topic_name=state["topic_name"],
            syllabus_context=state.get("syllabus_context", []),
            retrieved_chunks=state.get("retrieved_chunks") or [],
            chat_history=state.get("chat_history", []),
        )
        new_history = state.get("chat_history", []) + [
            {"role": "student", "content": state["question"]},
            {"role": "tutor", "content": result["answer"]},
        ]
        return {**state, "result": result, "chat_history": new_history, "error": None}
    except ValueError as exc:
        return {**state, "result": None, "error": str(exc)}


def build_tutor_graph():
    graph = StateGraph(TutorState)
    graph.add_node("retrieve", _retrieve_node)
    graph.add_node("generate", _generate_node)
    graph.set_entry_point("retrieve")
    graph.add_edge("retrieve", "generate")
    graph.add_edge("generate", END)
    return graph.compile(checkpointer=MemorySaver())


_GRAPH = build_tutor_graph()


def run_tutor_turn(
    session_id: str,
    question: str,
    subject: str,
    topic_name: str,
    topic_id: str,
    syllabus_context: list[str],
) -> dict:
    """
    Entry point used by main.py. `session_id` should be stable per
    student+topic conversation (e.g. f"{user_id}:{topic_id}") so the
    checkpointer can carry chat_history across turns.
    """
    config = {"configurable": {"thread_id": session_id}}

    # "chat_history" is deliberately absent from this input dict. LangGraph's
    # checkpointer merges only the keys passed here onto the persisted state
    # for this thread_id, so omitting it lets prior turns' history survive.
    # It's read back inside _generate_node via state.get("chat_history", []).
    final_state = _GRAPH.invoke(
        {
            "question": question,
            "subject": subject,
            "topic_name": topic_name,
            "topic_id": topic_id,
            "syllabus_context": syllabus_context,
            "retrieved_chunks": None,
            "result": None,
            "error": None,
        },
        config=config,
    )
    if final_state["error"]:
        raise ValueError(final_state["error"])
    return final_state["result"]
