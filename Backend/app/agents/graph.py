"""
StudyOS LangGraph multi-agent pipeline.

Flow:
  Student Query
       ↓
  Planner Agent      — decides which agents to invoke
       ↓
  Retrieval Agent    — fetches relevant book/notes chunks from Qdrant
       ↓
  Notes/Quiz Agent   — generates the answer via the right LLM
       ↓
  Response
"""
from __future__ import annotations
from typing import TypedDict, Annotated
import operator
from langgraph.graph import StateGraph, END
from app.database import get_qdrant
from app.services.llm_router import call_llm, Task
from app.services.embeddings import retrieve


# ── State shared across all nodes ─────────────────────────────────────────
class AgentState(TypedDict):
    query:        str
    syllabus_id:  int
    task:         str                              # Task enum value
    context:      Annotated[list[str], operator.add]  # retrieved chunks
    response:     str
    model_used:   str


# ── Nodes ─────────────────────────────────────────────────────────────────
async def planner_node(state: AgentState) -> AgentState:
    """Route the query to the correct task type."""
    q = state["query"].lower()
    if any(k in q for k in ["explain", "notes", "what is", "define"]):
        task = Task.notes_generation
    elif any(k in q for k in ["mcq", "quiz", "question", "viva"]):
        task = Task.quiz_generation
    elif any(k in q for k in ["syllabus", "units", "parse", "extract"]):
        task = Task.syllabus_analysis
    else:
        task = Task.fast_qa
    return {**state, "task": task.value}


async def retrieval_node(state: AgentState) -> AgentState:
    """Retrieve relevant chunks from Qdrant for the query."""
    try:
        qdrant_client = get_qdrant()
    except Exception:
        return state                               # Qdrant unavailable — skip retrieval
    chunks = await retrieve(
        client=qdrant_client,
        collection="book_chunks",
        query=state["query"],
        syllabus_id=state["syllabus_id"],
        top_k=5,
    )
    return {**state, "context": chunks}


async def generation_node(state: AgentState) -> AgentState:
    """Generate the final response using the routed LLM."""
    context_block = "\n\n".join(state.get("context", []))
    prompt = f"""You are a study assistant for an Indian engineering student.

Relevant textbook context:
{context_block}

Student question: {state["query"]}

Answer clearly and concisely based on the context above."""

    task = Task(state["task"])
    text, model = await call_llm(task=task, prompt=prompt)
    return {**state, "response": text, "model_used": model}


# ── Build the graph ────────────────────────────────────────────────────────
def build_graph() -> StateGraph:
    g = StateGraph(AgentState)
    g.add_node("planner",   planner_node)
    g.add_node("retrieval", retrieval_node)
    g.add_node("generator", generation_node)

    g.set_entry_point("planner")
    g.add_edge("planner",   "retrieval")
    g.add_edge("retrieval", "generator")
    g.add_edge("generator", END)
    return g.compile()


study_graph = build_graph()
