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
- **study_plan_workflow.py** — generate → validate quality (topic coverage,
  day-sequence, revision days) → repair once if issues are found. Same
  shape as mcq_workflow.py.
- **syllabus_workflow.py** — parse → validate quality (empty units,
  placeholder names, unparsed raw lines, duplicate topics) → repair once
  against the original source text if issues are found. Same shape as
  mcq_workflow.py. `main.py` calls this workflow's `run_pdf_analysis`, not
  `App/agents/syllabus_agent.py`'s `run_syllabus_parse` directly — that
  function is kept only for callers (tests, scripts) that want the raw
  single-shot parse without the quality loop.

History: MCQ, Numericals, Study Plan, and Syllabus parsing all used to be
plain function calls (an earlier single-node `StateGraph` wrapper for all
four was removed for adding boilerplate without adding behavior — see git
history). They were promoted back here once a real second node existed for
each: a quality-validation pass with an actual conditional repair edge, not
just architectural symmetry. Contract validation (Pydantic) still lives in
`App/agents/`; the workflow only adds the "is this actually good, and can I
fix it" loop on top.
