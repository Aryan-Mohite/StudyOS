# CHANGES-TESTING.md — Unit + integration testing (items 6, 7)

Scope: test infrastructure and coverage for both layers. Deliberately
targeted the highest-value logic (security/ownership enforcement, request
validation, fail-fast config, the PDF extraction fallback chain) rather than
chasing coverage % everywhere — see "What's not covered" below for the
honest gap list.

Delivered as changed/new files only — extract at repo root, overwriting
existing paths.

## Frontend — Vitest

New files:
- `vitest.config.ts` / `vitest.setup.ts` — jsdom environment, `@/` path alias via `vite-tsconfig-paths`, seeds the env vars `lib/env.ts` requires so importing `lib/db.ts`/`lib/serviceAuth.ts` in tests doesn't throw.
- `src/lib/__tests__/rateLimit.test.ts` — fixed-window limiter: allow/deny at the boundary, per-key isolation, window reset (fake timers).
- `src/lib/__tests__/roles.test.ts` — `getUserRole` fallback behavior, `requireRole` throwing `ForbiddenError`.
- `src/lib/__tests__/validation.test.ts` — every Zod schema in `lib/validation.ts`: bounds, enums, defaults, `parseBody`'s malformed-JSON and multi-issue-collection paths.
- `src/lib/__tests__/utils.test.ts` — `cn()` conflict resolution and falsy-value handling.
- `src/lib/__tests__/serviceAuth.test.ts` — the outbound JWT `getServiceToken()` mints verifies against the shared secret/issuer/audience, rejects a wrong secret, and stays under the 60s TTL. Runs under `// @vitest-environment node` (see inline comment — jsdom's `TextEncoder` produces a cross-realm `Uint8Array` that trips `jose`'s `instanceof` check).
- `src/lib/__tests__/apiHandler.test.ts` — integration-level tests for the `withApiHandler` wrapper itself: 401 when unauthenticated, `requireAuth: false` bypass, `ForbiddenError` → 403, any other thrown error → generic 500 (and asserts the real error message is *not* in the response — the whole point of that mapping), 429 + `Retry-After` once a rate-limit tier is exhausted, `x-request-id` on every response.
- `src/app/api/goals/daily/__tests__/route.test.ts` — full route integration test for `GET`/`POST /api/goals/daily`, mocking Clerk `auth()` and `lib/db.ts`: unauthenticated → 401, missing `syllabus_id` → 400, **ownership mismatch → 404 and the downstream DB write is never called** (this is the ownership-check pattern used across every syllabus-scoped route, so this test doubles as regression coverage for that pattern generally), invalid body → 400 before the ownership check even runs, success path returns the goal.

Changed:
- `package.json` — added `test` / `test:watch` / `test:coverage` scripts and the new devDependencies (`vitest`, `@vitejs/plugin-react`, `vite-tsconfig-paths`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`). `package-lock.json` is **not** included — run `npm install` after extracting.

Run with: `npm test` (or `npm run test:watch` while developing).

## AgenticService — pytest

New files:
- `pytest.ini` — sets `pythonpath = .` so `App.*` and `tests.*` both import cleanly regardless of cwd.
- `requirements-dev.txt` — `pytest`, `pytest-asyncio`, `httpx`. Kept separate from `requirements.txt` on purpose (see the file's own comment): the test suite never actually imports the langchain/langgraph/sentence-transformers/torch chain, so CI doesn't need that multi-GB install just to run these tests.
- `tests/conftest.py` — the key piece that makes the above possible: stubs `App.workflows.{mcq,notes,reference_material,study_plan,syllabus}_workflow` in `sys.modules` *before* `main.py` is imported, with `MagicMock`s standing in for each `run_*` entry point. A `workflow_mocks` fixture exposes them for per-test `return_value`/`side_effect` configuration, auto-reset between tests. Also seeds the env vars `config.Settings` needs so importing `main` doesn't `SystemExit` before collection even finishes.
- `tests/helpers.py` — `make_service_token()`, mirroring `App/core/security.py`'s issuer/audience/algorithm, with flags for expired/wrong-issuer/wrong-audience tokens.
- `tests/test_security.py` — `verify_service_token` unit tests: valid token, missing header, missing `Bearer` prefix, wrong secret, expired, wrong issuer, wrong audience, and the fail-closed-when-unconfigured case (503, not silent accept).
- `tests/test_config.py` — `Settings`' fail-fast validation: valid config constructs, unknown `LLM_PROVIDER` exits, missing API key for the selected provider exits, production without a JWT secret exits, production without `QDRANT_URL` only *warns* (doesn't exit — this is intentionally non-fatal per the code's own comment), development doesn't require a JWT secret at all.
- `tests/test_pdf_service.py` — the pdfplumber → PyMuPDF → OCR fallback chain in `extract_pdf_text`: each tier's mocked return value decides whether the next tier runs at all, whitespace-only text is treated as "nothing extracted", full failure returns `""` rather than raising, and `OCRUnavailableError` propagates correctly when OCR deps are unavailable.
- `tests/test_main.py` — full-stack `TestClient` integration tests against the real `app`: `/health` reachable without auth; every `/agent/*` route requires a valid service token (missing header, malformed JWT); Pydantic field constraints (`count` > 50, invalid `difficulty`, malformed `exam_date`) return 422 before the workflow even runs; a workflow raising `ValueError` maps to 502; `/agent/parse-syllabus` rejects non-PDF files, empty files, and files over the 15MB cap with the right status codes.

Run with (from `AgenticService/`):
```
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
pytest -v
```
(No need to `pip install -r requirements.txt` first — see the conftest.py note above. If you add a test that imports a real workflow module rather than mocking it, you will need the full runtime requirements installed too.)

## Verification performed
- Frontend: `npx vitest run` → **54/54 passed**, 7 test files.
- AgenticService: `pytest -v` (lean venv, requirements-dev.txt only) → **35/35 passed**.
- Re-ran `test_main.py` twice in the same process to check for rate-limiter state bleeding across tests (slowapi's limiter is a module-level singleton) — no flakiness at the current request volume (well under the 20/min generation limit).

## What's not covered (flagging honestly, per usual practice)
- **Frontend component/UI tests**: none. `@testing-library/react` and `jsdom` are installed and configured (`vitest.config.ts` is ready for `.tsx` component tests), but no component tests were written this pass — scope was the security/logic-critical `lib/` and API layer, which carries materially more risk than rendering correctness.
- **Frontend route coverage**: only `/api/goals/daily` got a full route integration test. It's representative of the ownership-check pattern used by `/api/goals/weekly`, `/api/attempts/submit`, `/api/reference`, `/api/plan/generate`, etc. — but those individual routes aren't each separately tested. Extending the same pattern to the rest is mechanical (copy the mock setup, swap the schema/db calls) if you want full route coverage.
- **`lib/db.ts` itself**: not unit tested — it's a thin layer over `mysql2` queries, and testing it meaningfully wants either a real MySQL test container or extensive query-shape mocking that mostly re-asserts the SQL string. Lower value than the ownership-check integration test above, which already exercises `syllabusBelongsToUser`'s *contract* via the route.
- **AgenticService agents/workflows**: the actual LangGraph generate → validate → repair logic (`App/agents/*.py`, `App/workflows/*.py`) has zero test coverage — this is deliberately out of scope for this pass (see conftest.py's docstring) since testing it meaningfully means either mocking the LLM provider's response shape at every node or hitting a real API, both bigger asks than fit here. This is the single biggest testing gap in the whole project and the natural next target if you want to keep going.
- **`App/services/rag_service.py`**: untested — Qdrant-dependent, same "needs a real or heavily-mocked external service" issue as the workflows above.
- No CI workflow file (GitHub Actions etc.) was added to actually run these on push — say the word if you want one; happy to wire it up next.
