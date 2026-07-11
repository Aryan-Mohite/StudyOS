# App/workflows/

Only features with genuine multi-step logic get a LangGraph `StateGraph`
wrapper here:

- **notes_workflow.py** — generate → index into the RAG vector store
  (best-effort, non-blocking). Two real nodes.
- **tutor_workflow.py** — retrieve (RAG context) → generate, with
  `MemorySaver` checkpointing per `session_id`. Two real nodes + memory.

MCQ, Numericals, and Syllabus parsing are single LLM-call-in, JSON-out
operations with no branching. They used to have their own single-node
`StateGraph` wrappers (`mcq_workflow.py`, `numericals_workflow.py`,
`syllabus_workflow.py`) that added ~70 lines of boilerplate each without
doing anything a plain function call didn't already do. That logic now
lives directly in `App/agents/{mcq,numericals,syllabus}_agent.py` as
`run_mcq_generation`, `run_numericals_generation`, and `run_syllabus_parse`.

If one of these ever needs real branching (e.g. "re-parse on low
confidence" for syllabus), promote it back to a `StateGraph` here — the
call signature from `main.py` won't need to change either way.
