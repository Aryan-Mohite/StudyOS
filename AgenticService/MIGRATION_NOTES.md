# AgenticService — LangChain/LangGraph Migration Notes

## What changed

**Old structure (deleted):**
```
AgenticService/
  main.py
  config.py
  prompts/*.md
  services/
    llm.py            ← raw anthropic.Anthropic client
    notes_service.py
    mcq_service.py
    pdf_parser.py      ← extraction + syllabus parsing mixed together
```

**New structure:**
```
AgenticService/
  App/
    agents/            ← pure LLM-call + Pydantic-validation logic, one file per feature
      syllabus_agent.py
      notes_agent.py
      mcq_agent.py
      numericals_agent.py   ← NEW, see below
      tutor_agent.py        ← NEW, see below
    services/
      llm_service.py    ← LangChain `ChatAnthropic` wrapper (replaces services/llm.py)
      pdf_service.py     ← extraction only now (syllabus parsing moved to syllabus_agent)
      rag_service.py     ← NEW: Chroma vector store over generated notes
    workflows/          ← LangGraph graphs, one per feature — these are what main.py calls
      syllabus_workflow.py
      notes_workflow.py       (generate → index into RAG)
      mcq_workflow.py
      numericals_workflow.py
      tutor_workflow.py       (retrieve → generate, with checkpointed memory)
    prompts/*.md         ← unchanged content, moved under App/
  vector_db/             ← Chroma persistence — replaces the reference image's "Assets" folder
  main.py                ← same endpoints, now delegating to workflows/
  config.py              ← added vector_db_dir, embedding_model, model_name
  requirements.txt        ← added langchain/langgraph/langchain-anthropic/chromadb/sentence-transformers
```

## Why each feature is (or isn't) a "real" graph

- **Notes / MCQ / Numericals**: still fundamentally one prompt → one validated JSON response. Wrapping them in a 1-node LangGraph graph doesn't add capability today, but it gives Notes a second node (index into RAG) and gives all three a consistent shape to extend later (e.g. add a "regenerate on validation failure" branch) without restructuring again.
- **Tutor Chat**: this is the one that actually needed LangGraph — it has two real steps (retrieve relevant notes, then reason over them + conversation history) and state that must persist turn-to-turn. It uses LangGraph's `MemorySaver` checkpointer keyed by `session_id` for that.

## What's new vs. what's ported

- `syllabus_agent.py`, `notes_agent.py`, `mcq_agent.py`, `llm_service.py`, `pdf_service.py` — **direct ports** of your existing logic, just moved and re-wrapped in LangChain's `ChatAnthropic` instead of the raw `anthropic` SDK. Contract shapes and Pydantic validation are unchanged.
- `numericals_agent.py` — **not a port**. Your uploaded snapshot didn't include a working Numericals backend (only the frontend mock existed). This was built fresh from the `NumericalStep/NumericalProblem/NumericalSetResponse` contract in your roadmap. **Review this one closely** — test it against your actual prompt-iteration notes from when you originally built Numericals, since I don't have that history.
- `tutor_agent.py` / `tutor_workflow.py` / `rag_service.py` — **new build**, this is Phase 3 Feature 4 which hadn't been started yet.

## Vector DB instead of Assets

- Uses `langchain-chroma` with local `sentence-transformers` embeddings (`all-MiniLM-L6-v2`) — no extra paid API key needed for embeddings, only the Anthropic key for generation/reasoning.
- Every successful Notes generation is automatically chunked and upserted into `vector_db/` (see `notes_workflow.py`'s `index` node). Tutor Chat retrieves from there, filtered by `topic_id`.
- `vector_db/` persists to disk under `AgenticService/vector_db/` — gitignored except for a `.gitkeep`, same pattern as your old SQLite cache file.

## Install

```bash
cd AgenticService
python -m venv .venv && source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env   # fill in ANTHROPIC_API_KEY
python main.py
```

First run will download the `all-MiniLM-L6-v2` embedding model (~80MB) — expect a one-time delay.

## What did NOT change

- API contract at the HTTP layer: same endpoint paths (`/agent/parse-syllabus`, `/agent/generate-notes`, `/agent/generate-mcq`), same request/response shapes — plus two new endpoints (`/agent/generate-numericals`, `/agent/tutor-chat`). Your Express gateway / Next.js routes should need **zero changes** for the three existing endpoints.
- Pydantic contract models for Notes and MCQ — byte-for-byte identical to before.
- No caching or DB added at this layer — that's still the Express gateway's job, per your architecture.

## Open item for you to decide

Your `Backend-Express` folder in the uploaded zip only contained a `.env` file — no route/server code was present to inspect. If the Express gateway needs updating to call the two new endpoints (`generate-numericals`, `tutor-chat`), that's a separate piece of work — let me know if you want help with it once you confirm what's actually in that gateway today.
