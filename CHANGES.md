# Personalized Learning — Changes

Delivered as changed/new files only, paths mirror the repo root. Extract over
your working copy of `StudyOS/`.

Built against a fresh clone of `github.com/Aryan-Mohite/StudyOS` (main), read
before writing per usual. Verified with `npx tsc --noEmit` (clean) and
`npx next build` (compiles + lints clean; the prerender error you may see
locally if you build with a dummy Clerk key is unrelated to these changes —
it's Clerk rejecting a fake publishable key, not a bug in this code).

## The core problem this closes

Nothing in the app recorded whether a student got an MCQ or numerical right.
`mcq_sets` / `numerical_sets` only ever stored generated question content.
Without an attempt record, weak-topic detection, a progress tracker,
dashboard analytics, and revision scheduling had no data to work from — they
were impossible to build honestly. Everything below exists to close that gap
and then build the requested features on top of it.

## Scope decision: no AgenticService / LangGraph involvement

Mastery scoring, streaks, spaced-repetition scheduling, and weak-topic
detection are deterministic aggregation over MySQL rows — no LLM call is
involved anywhere in this feature. Consistent with the project's existing
"LangGraph only when genuinely multi-step" and infra-leanness principles, I
kept all of it in Next.js Route Handlers reading/writing MySQL directly. The
Python layer is untouched.

## New DB tables (`Frontend/src/lib/db.ts`)

- **`attempts`** — one row per graded interaction (MCQ answer or numerical
  self-assessment): user, topic, subject, content_type, difficulty,
  is_correct, timestamp.
- **`topic_mastery`** — per-user-per-topic rollup (`total_attempts`,
  `correct_attempts`, `mastery_score` 0–100), updated on every attempt via a
  single `ON DUPLICATE KEY UPDATE` so reads never scan raw attempts.
- **`revision_schedule`** — simplified SM-2-style spaced repetition: correct
  answers double the interval (capped at 30 days), incorrect answers reset it
  to 1 day. Read-then-write rather than pure SQL, because doubling needs the
  previous interval — fine at this write volume (one row per answered
  question), no queue/worker introduced.
- **`daily_goals`** / **`weekly_goals`** — target + completed counters,
  keyed by `(user_id, date)` / `(user_id, week_start)`.

All four are additive `CREATE TABLE IF NOT EXISTS` — no migration needed for
existing installs, same pattern as every other table in this file.

## New API routes

| Route | Purpose |
|---|---|
| `POST /api/attempts/submit` | Records one attempt, updates mastery + revision schedule + today's goal in one call |
| `GET /api/progress` | Full per-topic mastery list, weakest first, for `/progress` |
| `GET/POST /api/goals/daily` | Read/update today's question target |
| `GET/POST /api/goals/weekly` | Read/update this week's topic target |
| `GET /api/revision` | Topics due for spaced revision in the next 7 days |
| `GET /api/analytics/dashboard` | Combined read (streak, goals, weak topics, revisions) for the dashboard widgets, one request instead of five |
| `GET /api/mcq/suggested-difficulty?topic_id=` | Suggests easy/medium/hard from the student's own accuracy on that topic — a hint only |

All Clerk-authenticated, same `auth()` + 401 pattern as `/api/profile`.

## Difficulty-based MCQs — kept manual, per your call

`suggested-difficulty` never overrides the student's manual selection in
`MCQQuiz.tsx`. It just surfaces a small badge ("you might be ready for hard
questions") above the Start Quiz button once there are ≥3 prior attempts on
that topic. Below 3 attempts it shows nothing rather than guessing.

## UI changes

- **`MCQQuiz.tsx`** — `handleAnswer` now fires `submitAttempt()`
  (fire-and-forget; a failed write never blocks or interrupts the quiz).
  Suggested-difficulty badge added to the idle state.
- **`NumericalsView.tsx`** — numericals are self-checked (no multiple choice
  to grade automatically), so I added "Got it / Needs review" buttons under
  each solved problem. This is a softer signal than MCQ correctness but still
  feeds weak-topic detection — flagging this as a judgment call in case you'd
  rather numericals stay purely read-only.
- **New `/progress` page** — per-subject mastery breakdown with color-coded
  bars (red <40%, amber <70%, green ≥70%), correct/total counts, links back
  into `/study/[topicId]`.
- **New `GoalsPanel`** (added to `/plan`) — inline-editable daily/weekly
  goal targets with progress bars, plus the upcoming revision queue.
- **New `DashboardAnalyticsPanel`** (added to `/dashboard`) — streak, today's
  goal ring, overall accuracy, weak-topic count, and expanded weak-topics +
  revisions lists when either is non-empty. Client-fetched so it can't block
  the server-rendered syllabus content, and fails silently (renders nothing)
  rather than breaking the dashboard if analytics can't load — same
  best-effort posture as the rest of the widget.
- **`AppNavbar.tsx`** — added a "Progress" link.

## Files touched

**Modified:**
`lib/db.ts`, `types/index.ts`, `lib/api.ts`, `components/MCQQuiz.tsx`,
`components/NumericalsView.tsx`, `components/AppNavbar.tsx`,
`app/(dashboard)/dashboard/page.tsx`, `app/(dashboard)/plan/page.tsx`

**New:**
`app/api/attempts/submit/route.ts`, `app/api/progress/route.ts`,
`app/api/goals/daily/route.ts`, `app/api/goals/weekly/route.ts`,
`app/api/revision/route.ts`, `app/api/analytics/dashboard/route.ts`,
`app/api/mcq/suggested-difficulty/route.ts`,
`components/DashboardAnalytics.tsx`, `components/GoalsPanel.tsx`,
`app/(dashboard)/progress/page.tsx`

## Left open — needs your call, not fixed silently

- **Numericals self-assessment is honesty-based**, not verified. It's
  directionally useful for weak-topic detection but noisier than MCQ signal.
  If you'd rather keep numericals purely read-only and rely on MCQ alone for
  mastery, that's a small revert (drop the two handlers + button block in
  `NumericalsView.tsx`).
- **No backfill** — mastery/streaks start from zero for every existing user
  on deploy; there's no history to reconstruct since nothing was tracked
  before this.
- **`dev-user-01` fallback** — untouched, same as before. Not relevant here
  since every new route requires real Clerk auth, but noting it's still
  pending your removal decision from the last audit.
