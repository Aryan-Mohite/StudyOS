"""
test_security.py — unit tests for App/core/security.py's verify_service_token.

Exercises the FastAPI dependency directly (it's a plain function taking an
`authorization` header string), rather than through the full app, so these
stay fast and isolated from routing concerns.
"""

import pytest
from fastapi import HTTPException

from App.core import security
from tests.helpers import make_service_token

SECRET = "test-secret-at-least-32-characters-long"


@pytest.fixture(autouse=True)
def _configured_secret(monkeypatch):
    monkeypatch.setattr(security.settings, "internal_service_jwt_secret", SECRET)


def test_accepts_a_valid_token():
    token = make_service_token(SECRET)
    payload = security.verify_service_token(authorization=f"Bearer {token}")
    assert payload["iss"] == security.ISSUER
    assert payload["aud"] == security.AUDIENCE


def test_rejects_missing_authorization_header():
    with pytest.raises(HTTPException) as exc_info:
        security.verify_service_token(authorization=None)
    assert exc_info.value.status_code == 401


def test_rejects_a_header_without_bearer_prefix():
    token = make_service_token(SECRET)
    with pytest.raises(HTTPException) as exc_info:
        security.verify_service_token(authorization=token)  # missing "Bearer " prefix
    assert exc_info.value.status_code == 401


def test_rejects_a_token_signed_with_the_wrong_secret():
    token = make_service_token("a-totally-different-secret-value-here")
    with pytest.raises(HTTPException) as exc_info:
        security.verify_service_token(authorization=f"Bearer {token}")
    assert exc_info.value.status_code == 401


def test_rejects_an_expired_token():
    token = make_service_token(SECRET, expired=True)
    with pytest.raises(HTTPException) as exc_info:
        security.verify_service_token(authorization=f"Bearer {token}")
    assert exc_info.value.status_code == 401
    assert "expired" in exc_info.value.detail.lower()


def test_rejects_wrong_issuer():
    token = make_service_token(SECRET, wrong_issuer=True)
    with pytest.raises(HTTPException) as exc_info:
        security.verify_service_token(authorization=f"Bearer {token}")
    assert exc_info.value.status_code == 401


def test_rejects_wrong_audience():
    token = make_service_token(SECRET, wrong_audience=True)
    with pytest.raises(HTTPException) as exc_info:
        security.verify_service_token(authorization=f"Bearer {token}")
    assert exc_info.value.status_code == 401


def test_fails_closed_when_secret_is_not_configured(monkeypatch):
    """If INTERNAL_SERVICE_JWT_SECRET isn't set, every request must be refused — never silently accepted."""
    monkeypatch.setattr(security.settings, "internal_service_jwt_secret", "")
    token = make_service_token(SECRET)
    with pytest.raises(HTTPException) as exc_info:
        security.verify_service_token(authorization=f"Bearer {token}")
    assert exc_info.value.status_code == 503
