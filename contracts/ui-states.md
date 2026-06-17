# StudyOS — UI States Reference

**Purpose:** Every component in Phase 1 is built against exactly one of these states. If a state isn't listed here, it doesn't exist yet — define it here first, then build against it.

---

## Global States (App-Level)

| State | Description | What to render |
|---|---|---|
| `unauthenticated` | No user session | Redirect to landing page |
| `no_syllabus` | User is logged in but has no uploaded syllabus | Upload prompt (Screen 1) |
| `syllabus_loaded` | Syllabus exists and is parsed | Main app (Screens 2–5) |

---

## Feature 0: Syllabus Upload & Parsing

| State | Trigger | UI Behaviour |
|---|---|---|
| `idle` | User has no syllabus | Show upload zone (drag + click). Show "Supported: PDF" label. |
| `file_selected` | User picks a file before upload | Show filename + file size. Show "Upload & Analyse" button. Allow cancel. |
| `uploading` | File transfer in progress | Show upload progress bar (0–100%). Label: "Uploading your syllabus…" |
| `parsing` | PDF text extraction + LLM structuring in progress | Show animated step labels: "Reading PDF" → "Identifying subjects" → "Mapping topics". Estimated time: "~30 seconds". |
| `success` | Syllabus contract returned | Navigate to Screen 2 (Dashboard / Topic View). |
| `error_upload` | Network failure during upload | Show: "Upload failed. Check your connection and try again." + Retry button. |
| `error_parse` | LLM failed to extract structure | Show: "We couldn't read this syllabus. Try a text-based PDF (not a scan)." + Upload different file button. |
| `error_format` | File is not a PDF or exceeds size limit | Show: "Please upload a PDF under 10MB." |

**Notes:**
- Never show a bare spinner alone. Always pair with a text label explaining what's happening.
- `parsing` state should show step-by-step progress labels, not indeterminate.

---

## Feature 1: Notes Generator

| State | Trigger | UI Behaviour |
|---|---|---|
| `idle` | Topic selected, no notes generated yet | Show "Generate Notes" button with estimated time label ("~20 seconds"). Show topic name + subject as context. |
| `loading` | Notes pipeline running | Disable button. Show step labels: "Structuring sections" → "Adding formulas" → "Linking related topics". Show estimated time countdown. |
| `streaming` | Notes content arriving chunk by chunk | Render sections as they appear. Use skeleton placeholders for sections not yet received. Show partial content progressively. |
| `success` | Full notes contract received | Render all sections, key points, formulas (LaTeX rendered), summary, and related topics chips. Show generation timestamp. |
| `stale` | Notes exist but syllabus was updated after generation | Show a banner: "Your syllabus was updated. These notes may be outdated." + "Regenerate" button. |
| `error` | Pipeline failed | Show: "Notes generation failed. [Specific reason if available]." + Retry button. |
| `empty` | Topic has no subtopics / LLM returns empty sections | Show: "This topic has limited content in your syllabus. Try a neighbouring topic." + show related_topics chips. |
| `regenerating` | User manually requested fresh notes | Same as `loading` but label: "Regenerating notes…" |

**Loading state copy (in order):**
1. "Reading your syllabus context…"
2. "Structuring key sections…"
3. "Adding formulas and key points…"
4. "Finalising your notes…"

---

## Feature 2: Solved Numericals

| State | Trigger | UI Behaviour |
|---|---|---|
| `idle` | Topic selected, no numericals yet | Show "Generate Problems" button. Show: "5 solved problems with step-by-step solutions". |
| `loading` | Numericals pipeline running | Step labels: "Selecting problem types" → "Solving step by step" → "Verifying answers". Estimated time: "~30 seconds". |
| `success` | Numericals contract received | Render problem list. Each problem: question → Given table → Find → Steps (collapsible by default, expand on click) → Answer chip. Show difficulty badge. |
| `stale` | Same as notes stale — syllabus updated post-generation | Banner + regenerate option. |
| `error` | Pipeline failed | "Problem generation failed." + Retry. |
| `empty` | LLM determines topic has no numerical component | "This topic doesn't have standard solved numericals (e.g. it's a theory-only topic). Try the MCQ quiz instead." |
| `regenerating` | User requests new set | Same UI as loading. |
| `step_expanded` | User clicks a problem to expand steps | Show all steps with LaTeX rendered. Collapse others (accordion behaviour). |

**Important UX note:** Steps should be **hidden by default** and revealed on click. Don't dump 10 fully-expanded problems — it's overwhelming.

---

## Feature 3: MCQ Generator

| State | Trigger | UI Behaviour |
|---|---|---|
| `idle` | Topic selected, no MCQs yet | Show "Start Quiz" button. Show: "10 questions — mix of easy, medium, hard". |
| `loading` | MCQ pipeline running | Step labels: "Writing questions" → "Crafting distractors" → "Adding explanations". ~20 seconds. |
| `success` (pre-attempt) | MCQs loaded, quiz not started | Show question 1. Show progress bar "0 / 10". Show difficulty badge per question. |
| `question_answered` | User selected an option | Highlight selected option. Reveal correct/incorrect colour (green/red). Show explanation block below options. Enable "Next Question" button. |
| `in_progress` | Quiz underway | Show current question number, progress bar. Disable going back to answered questions. |
| `completed` | All questions answered | Show score summary card: X/10 correct. Show per-question review list. "Try Again" button. |
| `stale` | Syllabus updated after generation | Banner: "Quiz may be outdated." + Regenerate. |
| `error` | Pipeline failed | "Quiz generation failed." + Retry. |
| `empty` | Topic has insufficient content for MCQs | "Not enough content for a full quiz. [N] questions generated." — render what's available or show message. |
| `regenerating` | User requests new question set | Loading state. Previous answers discarded. |

**Important UX notes:**
- Option buttons must be disabled after selection — no changing answers.
- Correct answer always revealed when any option is selected (immediate feedback, not end of quiz).
- "Next Question" only appears after an option is selected.

---

## Feature 4: Study Plan Generator

| State | Trigger | UI Behaviour |
|---|---|---|
| `idle` | Syllabus loaded, no plan exists | Show "Create Study Plan" prompt. Ask for exam date + daily hours. |
| `loading` | Plan generation in progress | Step labels: "Counting your topics" → "Mapping week-by-week" → "Scheduling revision days". ~20 seconds. |
| `success` | Plan contract received | Render week tabs + day cards. Show exam countdown chip. Show completion progress (X topics done). |
| `regenerating` | User changes exam date or marks many topics complete | Same as loading. Banner: "Rebuilding your plan with updated timeline…" |
| `error` | Pipeline failed | "Plan generation failed." + Retry. |
| `empty` | Exam date is today or past | "Your exam date has passed. Set a new date to generate a plan." |
| `task_complete` | User marks a task as done | Task card shows strikethrough + green checkmark. Progress bar updates. |
| `day_complete` | All tasks in a day are marked complete | Day card shows "Done" chip. |

**View modes:**
- `week_view` — overview of all weeks, collapsed days
- `day_view` — expanded single day with all tasks
- Both views must handle all states above.

---

## Feature 5: AI Tutor Chat

| State | Trigger | UI Behaviour |
|---|---|---|
| `idle` | Topic selected, chat panel open, no messages yet | Show: "Ask anything about [Topic Name]" placeholder. Show 3 suggested starter questions. |
| `typing` | User is composing a message | Enable send button when input is non-empty. |
| `loading` | Request sent, waiting for first token | Show typing indicator (animated dots) in assistant message bubble. |
| `streaming` | Tokens arriving | Render text word-by-word in message bubble. Show streaming cursor. Scroll to bottom as content arrives. |
| `success` | Full response received | Render markdown. Show follow-up suggestion chips below the message. |
| `out_of_scope` | LLM flagged question as outside syllabus | Render the polite redirect message. Style differently (e.g., subtle info badge "Outside your syllabus"). |
| `error` | API call failed | Show: "Couldn't get a response. Try again." with retry option inline in chat. |
| `context_lost` | Conversation too long (>20 turns) | Show: "Long conversation — I may have lost some context. Consider starting fresh." — banner above input. |

**Layout modes:**
- `panel_mode` — right sidebar within Topic View (default)
- `fullscreen_mode` — full-page chat experience
Both modes must handle all states above identically.

---

## Error State Design Principles

1. **Never show a raw error code** to the user. Map technical errors to plain-language messages.
2. **Every error must have an action** — Retry, Upload Again, or Contact Support. Never a dead end.
3. **Error messages must be specific** — "Notes generation failed because the topic was too short" is better than "Something went wrong."
4. **Transient errors** (network blip) → show Retry.
5. **Permanent errors** (PDF is a scan, can't OCR) → show alternative path.

---

## Empty State Design Principles

1. Empty states are not errors — style them neutrally, not with red/warning colours.
2. Always provide a next action from an empty state (e.g. "Try a neighbouring topic").
3. Use the `related_topics` from contracts to suggest next steps in empty states.

---

## Loading State Design Principles

1. **Never use a bare spinner.** Always pair with a text label.
2. **Show estimated time** when > 10 seconds: "~20 seconds".
3. **Use step labels** for multi-stage pipelines (Upload → Parse → Generate).
4. **Prefer skeleton screens** over spinners where the content structure is known (notes sections, MCQ cards).
5. Steps animate through in sequence — don't show all at once.

---

*This document is the single source of truth for UI states. If a new state is discovered during Phase 1 build, add it here before writing the component.*
