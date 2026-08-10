"""
test_config.py — unit tests for config.Settings' fail-fast validation.

Settings() reads from process env + pydantic-settings at construction time
and calls sys.exit(1) via config._fail() on invalid configuration, so these
tests import the *class* fresh per-test (not the module-level `settings`
singleton) and construct it directly against a controlled env, asserting on
SystemExit rather than importing the module (which would only construct
Settings() once, at import time, using whatever env happened to be active).
"""

import importlib

import pytest


@pytest.fixture
def config_module(monkeypatch):
    """Fresh import of config.py per test, so each test's env changes take effect."""
    import config as config_module

    importlib.reload(config_module)
    return config_module


def _clear_provider_env(monkeypatch):
    for var in ("GROQ_API_KEY", "GEMINI_API_KEY", "ANTHROPIC_API_KEY", "LLM_PROVIDER", "ENV", "INTERNAL_SERVICE_JWT_SECRET", "QDRANT_URL"):
        monkeypatch.delenv(var, raising=False)


def test_valid_groq_config_constructs_successfully(monkeypatch, config_module):
    _clear_provider_env(monkeypatch)
    monkeypatch.setenv("LLM_PROVIDER", "groq")
    monkeypatch.setenv("GROQ_API_KEY", "test-key")

    settings = config_module.Settings()

    assert settings.llm_provider == "groq"


def test_unknown_provider_fails_fast(monkeypatch, config_module):
    _clear_provider_env(monkeypatch)
    monkeypatch.setenv("LLM_PROVIDER", "openai")  # not one of groq/gemini/anthropic
    monkeypatch.setenv("GROQ_API_KEY", "test-key")

    with pytest.raises(SystemExit):
        config_module.Settings()


def test_missing_api_key_for_selected_provider_fails_fast(monkeypatch, config_module):
    _clear_provider_env(monkeypatch)
    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    # GEMINI_API_KEY intentionally left unset

    with pytest.raises(SystemExit):
        config_module.Settings()


def test_production_without_jwt_secret_fails_fast(monkeypatch, config_module):
    _clear_provider_env(monkeypatch)
    monkeypatch.setenv("LLM_PROVIDER", "groq")
    monkeypatch.setenv("GROQ_API_KEY", "test-key")
    monkeypatch.setenv("ENV", "production")
    # INTERNAL_SERVICE_JWT_SECRET intentionally left unset

    with pytest.raises(SystemExit):
        config_module.Settings()


def test_production_with_jwt_secret_but_no_qdrant_url_only_warns(monkeypatch, config_module, capsys):
    """Missing QDRANT_URL in production is a logged warning, not a fatal error — local-path Qdrant still works."""
    _clear_provider_env(monkeypatch)
    monkeypatch.setenv("LLM_PROVIDER", "groq")
    monkeypatch.setenv("GROQ_API_KEY", "test-key")
    monkeypatch.setenv("ENV", "production")
    monkeypatch.setenv("INTERNAL_SERVICE_JWT_SECRET", "x" * 32)

    settings = config_module.Settings()  # should not raise

    assert settings.env == "production"
    captured = capsys.readouterr()
    assert "WARNING" in captured.err


def test_development_env_does_not_require_jwt_secret(monkeypatch, config_module):
    _clear_provider_env(monkeypatch)
    monkeypatch.setenv("LLM_PROVIDER", "groq")
    monkeypatch.setenv("GROQ_API_KEY", "test-key")
    monkeypatch.setenv("ENV", "development")

    settings = config_module.Settings()  # should not raise

    assert settings.internal_service_jwt_secret == ""
