# CHANGES-AI-QUALITY.md — AI response improvements (item 10)

Found by comparing the three generation agents (mcq, notes, study_plan)
against each other — mcq_agent.py and study_plan_agent.py both already have
a LangGraph generate → validate quality → repair-once pattern (see
App/workflows/README.md's history note on why plain single-node generation
was replaced). notes_agent.py was the one outlier still doing single-shot
generation with only Pydantic structural validation. Brought it to parity,
plus added one real quality check that was missing from mcq's validation
even though the pattern for it already existed.

Delivered as changed/new files only — extract at repo root, overwriting
existing paths.

## 1. Notes generation now has a quality-check/repair pass

**Before:** `generate_notes()` → Pydantic validation → return. Pydantic
confirms "this is well-formed JSON matching the contract" (right number of
sections, key_points has ≥2 items, etc.) — it says nothing about whether
the notes are actually *good*. A section with 15 words of filler content,
two sections both titled "Applications," a key_point that just repeats its
own heading, or a 4-word summary would all sail through untouched. Meanwhile
`mcq_agent.py`/`study_plan_agent.py` both already catch this class of
problem and get one automatic repair attempt.

**Fix:** `App/agents/notes_agent.py` gains `validate_notes_quality()` and
`repair_notes()`, mirroring `mcq_agent.py`'s `validate_mcq_quality()` /
`repair_mcq()` exactly in structure. Checks:
- Duplicate section headings (model ran out of genuinely distinct facets)
- Thin sections (<40 words — the prompt asks for "detailed explanation")
- Duplicate `key_points` within a section
- A `key_point` that's just its own heading restated (vague, adds nothing)
- `related_topics` including the topic itself (confusing as a nav link)
- A `summary` under 10 words (can't cover "what/rule/significance" as the
  prompt requires — it's meant to work standalone as a revision card)

`App/workflows/notes_workflow.py` gains `validate`/`repair` nodes and the
same conditional-edge routing as `mcq_workflow.py`: generate → validate →
repair once if issues found → return. Bounded to one repair attempt via the
same `retried` flag pattern, so a persistently flawed response doesn't loop.
If repair itself fails contract validation, falls back to the original
(already contract-valid) notes rather than losing the response entirely —
same fallback behavior as mcq's repair path.

`run_notes_generation()`'s public signature is unchanged, so
`main.py`'s `/agent/generate-notes` route needed no changes.

## 2. MCQ generation now checks for correct-answer positional bias

**Before:** no check for *where* the correct answer lands across a set.
LLM-generated MCQ sets have a well-documented tendency to cluster the
correct answer in one option slot (commonly "B" or "C") rather than
distributing it roughly evenly across A/B/C/D. A student who notices "the
answer is usually C" can score well without knowing the material — which
defeats the point of a practice quiz.

**Fix:**
- `validate_mcq_quality()` now flags a set where any single option holds
  more than 50% of the correct answers, for sets of 6+ questions (below
  that, the sample is too small for "skew" to mean anything — a 5-question
  set with 3 "A"s isn't necessarily biased).
- `App/prompts/mcq_generator.md`'s **correct** field rule now explicitly
  instructs the model to vary the position rather than cluster it — cheaper
  to prevent at generation time than to always catch and repair after the
  fact.

## Tests added
- `tests/test_ai_quality.py` — 10 tests covering both changes: the
  positional-bias check (flags a skewed 6-question set, doesn't flag a
  roughly-even one, doesn't fire below the 6-question threshold) and every
  branch of `validate_notes_quality()` (clean notes → no issues, and one
  test per issue type: duplicate headings, thin section, duplicate
  key_points, heading-echoing key_point, self-referencing related_topics,
  too-short summary).
- These test the pure `validate_*_quality()` functions directly — no LLM
  call involved, so no mocking of `call_llm_json` was needed.
- `requirements-dev.txt` gained `langchain-core` (not the provider SDKs —
  see the file's updated comment): `App/agents/*.py` import
  `App.services.llm_service`, which only needs `langchain-core` at module
  load time — the actual provider SDK (`langchain_groq` etc.) is imported
  lazily inside `_build_llm()`, not at the top of the file. That laziness
  is what makes it possible to import and test the agent modules' pure
  functions without installing the full torch/sentence-transformers/
  provider-SDK chain.

## Verification performed
- `python -m py_compile` on all changed `.py` files — clean.
- `pytest -v` — **45/45 passed** (35 from the testing pass + 10 new).

## What's not covered (flagging honestly)
- `study_plan_agent.py` was already at parity with mcq's pattern — not
  touched this pass, no gap found there worth a targeted fix at this scope.
- `syllabus_agent.py` (syllabus parsing) wasn't reviewed for a
  quality-check/repair opportunity — parsing is a different kind of task
  (extraction, not generation) where the "quality" question is more about
  OCR/extraction fidelity than content quality, and felt out of scope for
  a same-shaped fix.
- The positional-bias check is a heuristic on the *output* — it doesn't
  (and structurally can't) prove the model's underlying option-generation
  process is unbiased, only that a given generated set isn't skewed enough
  to be gameable. A determined model could still pass the >50%-single-option
  threshold while having a milder but real bias (e.g. 40% "C" is allowed).
  The prompt instruction addresses this better than the check can, but
  neither is a hard guarantee.
- No evaluation harness (a golden-set of topics run through generation N
  times to measure actual quality/consistency, or an LLM-as-judge scoring
  pass) was built — these fixes are heuristic-based and reactive
  (catch problems after generation) rather than measured against a quality
  baseline. That's the natural next step if you want to go further with
  this than this pass covers.
