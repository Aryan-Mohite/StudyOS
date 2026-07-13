# StudyOS — Profile + Auto-Notebooks + Per-Notebook RAG patch

Supersedes the earlier `StudyOS-profile-notebooks.zip`. Apply by copying
these files into your repo at the matching paths (overwrite existing files
with the same name). Folder structure mirrors the repo, so you can extract
straight over `StudyOS/`.

## Part 1 — Profile (unchanged from previous drop)
- `Frontend/src/lib/profile.ts`, `app/api/profile/route.ts`, `app/(dashboard)/profile/page.tsx`, `components/ProfileBadge.tsx`
- `student_context` forwarded into Notes/MCQ/Numericals generation

## Part 2 — Auto-notebooks (unchanged from previous drop)
- `notebooks` table, `syllabi.notebook_id`, auto-created on every syllabus upload in `app/api/upload/route.ts`

## Part 3 — Per-notebook RAG namespacing (new this drop)

This is what makes Tutor Chat and Notes indexing subject-aware instead of
pooling every student's every subject into one global vector collection.

**`AgenticService/App/services/rag_service.py`**
- `index_note()` and `retrieve_context()` now accept an optional `notebook_id`
- Collection name becomes `studyos_notes_{notebook_id}` when given
- No `notebook_id` → falls back to the original single `studyos_notes` collection, so nothing indexed before this patch is orphaned

**`AgenticService/App/workflows/notes_workflow.py`**
- `notebook_id` threaded through `NotesState` → passed to `index_note()` after generation

**`AgenticService/App/workflows/tutor_workflow.py`**
- `notebook_id` threaded through `TutorState` → passed to `retrieve_context()` before generation

**`AgenticService/main.py`**
- `NotesRequest` gains `notebook_id: Optional[str]`
- `TutorRequest` gains `notebook_id: Optional[str]`
- Both endpoints pass it straight through to their workflow entry point
- (Left off `MCQRequest`/`NumericalsRequest` — those don't write to or read from the notes vector store, so it'd be a dead field)

**Frontend**
- `lib/db.ts` — new `getNotebookIdForSyllabus(syllabusId)` helper (simple `syllabi` lookup)
- `lib/agentic.ts` — `notebook_id` added to `GenerateNotesPayload` and `TutorChatPayload`
- `app/api/notes/generate/route.ts` — resolves `notebook_id` from the request's `syllabus_id` and forwards it
- `app/api/chat/route.ts` — now accepts `syllabus_id` in the request body, resolves `notebook_id`, forwards it
- `lib/api.ts` — `SendChatMessageInput` gains optional `syllabus_id`
- `components/ChatPanel.tsx` — gains `syllabusId` prop, includes it in the chat request
- `app/(dashboard)/study/[topicId]/page.tsx` — passes `syllabus?.syllabus_id` into `ChatPanel`

### Net effect
Once a student uploads Syllabus A (Data Structures) and Syllabus B
(Thermodynamics), each gets its own notebook and its own Chroma collection.
Tutor Chat opened from a Data Structures topic only ever retrieves notes
generated within that notebook — it can no longer surface Thermodynamics
content (or another student's content, since collections are per-notebook,
not just per-subject-name).

### Not included in this patch
- Reference-PDF upload endpoint (`POST /api/notebooks/{id}/sources`) and notebook list/switch UI — still the next phase
- Migration of any pre-existing global-collection embeddings into a notebook-scoped collection — not needed since there are no real users yet

## Verified
- `npx tsc --noEmit` — clean, no type errors
- All modified `.py` files — `python3 -m py_compile` clean

## Still pending (per your call — you'll test manually)
- Real end-to-end RAG run: upload two syllabi, confirm Tutor Chat for one doesn't leak into the other's retrieved context
