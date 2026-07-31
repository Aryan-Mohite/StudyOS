# App/workflows/

Only features with genuine multi-step logic get a LangGraph `StateGraph`
wrapper here:

- **notes_workflow.py** — retrieve any student-uploaded reference material
  (best-effort) → generate. One real node; the retrieval step happens
  inline before generation rather than as a separate graph node.
- **mcq_workflow.py** — generate → validate quality (duplicate concepts,
  lopsided difficulty distribution, lazy explanations) → repair once if
  issues are found. Real conditional edge, bounded to one repair attempt.
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

History: MCQ, Study Plan, and Syllabus parsing all used to be plain
function calls (an earlier single-node `StateGraph` wrapper for all of them
was removed for adding boilerplate without adding behavior — see git
history). They were promoted back here once a real second node existed for
each: a quality-validation pass with an actual conditional repair edge, not
just architectural symmetry. Contract validation (Pydantic) still lives in
`App/agents/`; the workflow only adds the "is this actually good, and can I
fix it" loop on top.

The AI Tutor Chat feature (`tutor_workflow.py`, RAG retrieve → generate with
`MemorySaver` session checkpointing) and Numericals generation
(`numericals_workflow.py`, same shape as `mcq_workflow.py`) have been
removed from the product; their workflow, agent, and prompt files no longer
exist in this directory.
