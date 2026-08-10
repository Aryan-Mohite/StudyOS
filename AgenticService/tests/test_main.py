"""
test_main.py — integration tests for the FastAPI app's HTTP layer.

Uses TestClient against the real `app` object from main.py, with the heavy
workflow modules stubbed by conftest.py (see its docstring) and a real
short-lived JWT minted per-test for the routes that require ServiceAuth.
These tests deliberately target the cross-cutting concerns (auth, request
validation, size limits, error-status mapping) rather than generation
quality, which lives in the AI layer itself.
"""

import io

import pytest
from fastapi.testclient import TestClient

from tests.helpers import make_service_token

SECRET = "test-secret-at-least-32-characters-long"


@pytest.fixture
def client(monkeypatch):
    from App.core import security

    monkeypatch.setattr(security.settings, "internal_service_jwt_secret", SECRET)
    import main

    return TestClient(main.app)


@pytest.fixture
def auth_headers():
    token = make_service_token(SECRET)
    return {"Authorization": f"Bearer {token}"}


def minimal_pdf_bytes() -> bytes:
    # Not a structurally valid PDF — fine here, since these tests target the
    # auth/validation layer in front of extraction, not extraction itself.
    return b"%PDF-1.4\n%fake pdf content for upload tests\n%%EOF"


# ── Health ────────────────────────────────────────────────────────────────

def test_health_is_reachable_without_auth(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


# ── Auth enforcement on /agent/* routes ─────────────────────────────────────

def test_generate_notes_requires_auth(client):
    res = client.post("/agent/generate-notes", json={
        "topic_id": "t1", "topic_name": "Arrays", "subject": "DS", "unit_title": "Unit 1",
    })
    assert res.status_code == 401


def test_generate_mcq_rejects_a_malformed_bearer_token(client):
    res = client.post(
        "/agent/generate-mcq",
        json={"topic_id": "t1", "topic_name": "Arrays", "subject": "DS"},
        headers={"Authorization": "Bearer not-a-real-jwt"},
    )
    assert res.status_code == 401


def test_parse_syllabus_requires_auth(client):
    res = client.post(
        "/agent/parse-syllabus",
        files={"file": ("syllabus.pdf", io.BytesIO(minimal_pdf_bytes()), "application/pdf")},
    )
    assert res.status_code == 401


# ── Notes generation ─────────────────────────────────────────────────────────

def test_generate_notes_returns_the_workflow_result_when_authorized(client, auth_headers, workflow_mocks):
    workflow_mocks["run_notes_generation"].return_value = {"notes": "## Arrays\n...", "topic_id": "t1"}

    res = client.post(
        "/agent/generate-notes",
        json={"topic_id": "t1", "topic_name": "Arrays", "subject": "DS", "unit_title": "Unit 1"},
        headers=auth_headers,
    )

    assert res.status_code == 200
    assert res.json()["topic_id"] == "t1"


def test_generate_notes_rejects_a_body_missing_required_fields(client, auth_headers):
    res = client.post(
        "/agent/generate-notes",
        json={"topic_id": "t1"},  # missing topic_name, subject, unit_title
        headers=auth_headers,
    )
    assert res.status_code == 422


def test_generate_notes_maps_workflow_valueerror_to_502(client, auth_headers, workflow_mocks):
    workflow_mocks["run_notes_generation"].side_effect = ValueError("LLM returned malformed JSON")

    res = client.post(
        "/agent/generate-notes",
        json={"topic_id": "t1", "topic_name": "Arrays", "subject": "DS", "unit_title": "Unit 1"},
        headers=auth_headers,
    )

    assert res.status_code == 502


# ── MCQ generation — Pydantic field constraints ──────────────────────────────

def test_generate_mcq_rejects_count_above_fifty(client, auth_headers):
    res = client.post(
        "/agent/generate-mcq",
        json={"topic_id": "t1", "topic_name": "Arrays", "subject": "DS", "count": 51},
        headers=auth_headers,
    )
    assert res.status_code == 422


def test_generate_mcq_rejects_an_invalid_difficulty(client, auth_headers):
    res = client.post(
        "/agent/generate-mcq",
        json={"topic_id": "t1", "topic_name": "Arrays", "subject": "DS", "difficulty": "impossible"},
        headers=auth_headers,
    )
    assert res.status_code == 422


def test_generate_mcq_succeeds_with_a_valid_body(client, auth_headers, workflow_mocks):
    workflow_mocks["run_mcq_generation"].return_value = {"questions": [], "topic_id": "t1"}

    res = client.post(
        "/agent/generate-mcq",
        json={"topic_id": "t1", "topic_name": "Arrays", "subject": "DS", "count": 5, "difficulty": "easy"},
        headers=auth_headers,
    )

    assert res.status_code == 200


# ── Study plan generation ────────────────────────────────────────────────────

def test_generate_study_plan_rejects_a_malformed_exam_date(client, auth_headers):
    res = client.post(
        "/agent/generate-study-plan",
        json={"syllabus_id": "s1", "syllabus": {}, "exam_date": "12/01/2026"},
        headers=auth_headers,
    )
    assert res.status_code == 422


def test_generate_study_plan_succeeds_with_a_valid_body(client, auth_headers, workflow_mocks):
    workflow_mocks["run_study_plan_generation"].return_value = {"plan": [], "syllabus_id": "s1"}

    res = client.post(
        "/agent/generate-study-plan",
        json={"syllabus_id": "s1", "syllabus": {"units": []}, "exam_date": "2026-12-01"},
        headers=auth_headers,
    )

    assert res.status_code == 200


# ── PDF upload size / type guards on /agent/parse-syllabus ──────────────────

def test_parse_syllabus_rejects_a_non_pdf_file(client, auth_headers):
    res = client.post(
        "/agent/parse-syllabus",
        files={"file": ("syllabus.txt", io.BytesIO(b"not a pdf"), "text/plain")},
        headers=auth_headers,
    )
    assert res.status_code == 400


def test_parse_syllabus_rejects_an_empty_file(client, auth_headers):
    res = client.post(
        "/agent/parse-syllabus",
        files={"file": ("syllabus.pdf", io.BytesIO(b""), "application/pdf")},
        headers=auth_headers,
    )
    assert res.status_code == 400


def test_parse_syllabus_rejects_a_file_over_the_size_limit(client, auth_headers):
    oversized = b"%PDF-1.4\n" + b"0" * (15 * 1024 * 1024 + 1)
    res = client.post(
        "/agent/parse-syllabus",
        files={"file": ("syllabus.pdf", io.BytesIO(oversized), "application/pdf")},
        headers=auth_headers,
    )
    assert res.status_code == 413
