"""
conftest.py — test-time environment setup.

main.py imports App.workflows.* at module load time, which transitively
pulls in langchain/langgraph/sentence-transformers/torch — a multi-GB
dependency chain that isn't needed to test the HTTP layer (auth, routing,
validation, error mapping) these tests actually target. Those modules are
exercised separately at the unit level (App/services/pdf_service.py has
its own tests) and are the AgenticService's actual AI logic, not something
a fast CI-friendly test suite should need a GPU-capable box to import.

So: before anything imports `main`, register lightweight fake modules for
App.workflows.* in sys.modules. Each fake exposes the same function names
main.py imports, replaced with a MagicMock — tests then monkeypatch
individual functions' return values per-test via `App.workflows.<x>.<fn>`.

Also sets required env vars for config.py's fail-fast validation, so
importing `config`/`main` doesn't SystemExit before tests even run.
"""

import sys
import types
from unittest.mock import MagicMock

import pytest

# ── Required env for config.Settings' fail-fast validation ──────────────────
import os

os.environ.setdefault("LLM_PROVIDER", "groq")
os.environ.setdefault("GROQ_API_KEY", "test-groq-key")
os.environ.setdefault("INTERNAL_SERVICE_JWT_SECRET", "test-secret-at-least-32-characters-long")
os.environ.setdefault("ENV", "development")


def _stub_module(name: str, **attrs):
    mod = types.ModuleType(name)
    for key, value in attrs.items():
        setattr(mod, key, value)
    sys.modules[name] = mod
    return mod


# ── Stub the workflow modules main.py imports directly ──────────────────────
_stub_module("App.workflows.mcq_workflow", run_mcq_generation=MagicMock(name="run_mcq_generation"))
_stub_module("App.workflows.notes_workflow", run_notes_generation=MagicMock(name="run_notes_generation"))
_stub_module(
    "App.workflows.reference_material_workflow",
    run_reference_ingestion=MagicMock(name="run_reference_ingestion"),
)
_stub_module(
    "App.workflows.study_plan_workflow",
    run_study_plan_generation=MagicMock(name="run_study_plan_generation"),
)
_stub_module("App.workflows.syllabus_workflow", run_pdf_analysis=MagicMock(name="run_pdf_analysis"))


@pytest.fixture
def workflow_mocks():
    """Access to the stubbed workflow entry points, for setting return values / assertions per-test."""
    return {
        "run_mcq_generation": sys.modules["App.workflows.mcq_workflow"].run_mcq_generation,
        "run_notes_generation": sys.modules["App.workflows.notes_workflow"].run_notes_generation,
        "run_reference_ingestion": sys.modules["App.workflows.reference_material_workflow"].run_reference_ingestion,
        "run_study_plan_generation": sys.modules["App.workflows.study_plan_workflow"].run_study_plan_generation,
        "run_pdf_analysis": sys.modules["App.workflows.syllabus_workflow"].run_pdf_analysis,
    }


@pytest.fixture(autouse=True)
def _reset_workflow_mocks(workflow_mocks):
    """Every test starts with clean mocks, regardless of what a previous test configured."""
    for mock in workflow_mocks.values():
        mock.reset_mock(return_value=True, side_effect=True)
    yield
