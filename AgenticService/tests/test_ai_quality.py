"""
test_ai_quality.py — unit tests for the AI-response-quality improvements in
CHANGES-AI-QUALITY.md: notes' new quality-check pass (parity with mcq/study_plan),
and mcq's new correct-answer positional-bias check.

These test the pure validate_*_quality() functions directly — no LLM call
involved. See requirements-dev.txt's comment for why importing these agent
modules doesn't require the full provider-SDK dependency chain.
"""

from App.agents.mcq_agent import validate_mcq_quality
from App.agents.notes_agent import validate_notes_quality


def make_question(id_, correct="A", concept="concept-" , difficulty="medium"):
    return {
        "id": id_,
        "question": f"Question {id_}?",
        "options": {"A": "a", "B": "b", "C": "c", "D": "d"},
        "correct": correct,
        "explanation": f"Because reason {id_}.",
        "concept_tested": f"{concept}{id_}",
        "difficulty": difficulty,
    }


# ── MCQ positional-bias check ────────────────────────────────────────────────

def test_flags_skewed_correct_answer_distribution():
    # 6 questions, 5 of them correct="C" — clearly skewed.
    questions = [make_question(i, correct="C") for i in range(1, 6)] + [make_question(6, correct="A")]
    issues = validate_mcq_quality({"questions": questions}, requested_difficulty="mixed")

    assert any("skewed" in issue for issue in issues)


def test_does_not_flag_a_roughly_even_distribution():
    positions = ["A", "B", "C", "D", "A", "B"]
    questions = [make_question(i, correct=pos) for i, pos in enumerate(positions, start=1)]
    issues = validate_mcq_quality({"questions": questions}, requested_difficulty="mixed")

    assert not any("skewed" in issue for issue in issues)


def test_skips_the_bias_check_below_the_minimum_question_count():
    # 5 questions, all "C" — would be flagged at 6+, but the check requires
    # a large enough sample for the skew to be meaningful.
    questions = [make_question(i, correct="C") for i in range(1, 6)]
    issues = validate_mcq_quality({"questions": questions}, requested_difficulty="mixed")

    assert not any("skewed" in issue for issue in issues)


# ── Notes quality checks ─────────────────────────────────────────────────────

def make_section(heading="Heading", content=None, key_points=None):
    return {
        "heading": heading,
        "content": content or ("word " * 50).strip(),
        "key_points": key_points or ["First fact.", "Second fact."],
        "formula": None,
    }


def make_notes(**overrides):
    base = {
        "topic": "Binary Trees",
        "sections": [make_section("Definition"), make_section("Applications")],
        "summary": "This is a reasonably long summary sentence covering the concept well enough.",
        "related_topics": ["Graphs", "Linked Lists"],
    }
    base.update(overrides)
    return base


def test_clean_notes_produce_no_issues():
    assert validate_notes_quality(make_notes()) == []


def test_flags_duplicate_section_headings():
    notes = make_notes(sections=[make_section("Definition"), make_section("Definition")])
    issues = validate_notes_quality(notes)
    assert any("duplicate section headings" in i for i in issues)


def test_flags_a_thin_section():
    notes = make_notes(sections=[make_section("Definition", content="Too short.")])
    issues = validate_notes_quality(notes)
    assert any("too thin" in i for i in issues)


def test_flags_duplicate_key_points_within_a_section():
    notes = make_notes(sections=[make_section("Definition", key_points=["Same fact.", "Same fact."])])
    issues = validate_notes_quality(notes)
    assert any("duplicate key_points" in i for i in issues)


def test_flags_a_key_point_that_just_restates_the_heading():
    notes = make_notes(sections=[make_section("Thermal Resistance", key_points=["Thermal Resistance", "Another fact."])])
    issues = validate_notes_quality(notes)
    assert any("identical to its own heading" in i for i in issues)


def test_flags_the_topic_appearing_in_its_own_related_topics():
    notes = make_notes(related_topics=["Binary Trees", "Graphs"])
    issues = validate_notes_quality(notes)
    assert any("related_topics includes the topic itself" in i for i in issues)


def test_flags_a_summary_thats_too_short():
    notes = make_notes(summary="Too short.")
    issues = validate_notes_quality(notes)
    assert any("too short to serve as a revision card" in i for i in issues)
