# App/workflows/

Only features with genuine multi-step logic get a LangGraph `StateGraph`
wrapper here:

- **notes_workflow.py** — generate → index into the RAG vector store
  (best-effort, non-blocking). Two real nodes.
- **tutor_workflow.py** — retrieve (RAG context) → generate, with
  `MemorySaver` checkpointing per `session_id`. Two real nodes + memory.
- **mcq_workflow.py** — generate → validate quality (duplicate concepts,
  lopsided difficulty distribution, lazy explanations) → repair once if
  issues are found. Real conditional edge, bounded to one repair attempt.
- **numericals_workflow.py** — generate → validate quality (empty `given`,
  placeholder answers, skipped derivation steps, lopsided difficulty) →
  repair once if issues are found. Same shape as mcq_workflow.py.

Syllabus parsing is still a single LLM-call-in, JSON-out operation with no
branching, so it stays a plain function: `App/agents/syllabus_agent.py`'s
`run_syllabus_parse`.

History: MCQ and Numericals used to be plain function calls too (an earlier
single-node `StateGraph` wrapper for all three was removed for adding
boilerplate without adding behavior — see git history). They were promoted
back here once a real second node existed: a quality-validation pass with
an actual conditional repair edge, not just architectural symmetry. Contract
validation (Pydantic) still lives in `App/agents/`; the workflow only adds
the "is this actually good, and can I fix it" loop on top.

If syllabus parsing ever needs real branching (e.g. "re-parse on low
confidence"), promote it back to a `StateGraph` here too — the call
signature from `main.py` won't need to change either way.
