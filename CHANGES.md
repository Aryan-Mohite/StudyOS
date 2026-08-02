# CHANGES.md — Multi-notebook isolation fix

## The bug

Uploading a new syllabus correctly showed its own topics, but the
**Progress**, **Dashboard** (streak/weak-topics/revisions), and **Plan**
(goals/revision queue) pages kept showing data from whichever syllabus the
student had uploaded *previously*. Root cause: every read for that data
filtered by `user_id` only — never `syllabus_id` — so a student with two
syllabi shared one pool of mastery scores, streaks, goals, and revision
items across both.

Notes/MCQ content itself was **not** affected — topic IDs are random UUIDs
generated fresh per syllabus parse, so per-topic content was already
correctly isolated. The "notes of a previous syllabus" symptom was really
the dashboard's weak-topics/revision widgets linking to `/study/:topicId`
for topic IDs that no longer exist in the newly-uploaded syllabus.

## Decision confirmed with Aryan

Daily/weekly goals and the study streak were, before this fix, tracked as
one continuous counter per user (not per syllabus). Asked whether these
should also reset per syllabus or stay as one cross-syllabus habit
tracker — **confirmed: scope per syllabus**, same as progress/revisions.

## Schema changes (`Frontend/src/lib/db.ts`)

- `daily_goals` and `weekly_goals` gained a `syllabus_id` column and their
  primary key changed from `(user_id, goal_date)` / `(user_id, week_start)`
  to `(user_id, syllabus_id, goal_date)` / `(user_id, syllabus_id,
  week_start)`.
- **Migration note**: on an existing database, `migrateSchema()` detects
  the old schema (no `syllabus_id` column) and drops + recreates these two
  tables rather than migrating rows in place. Old rows can't be
  retroactively attributed to a syllabus, and this project has no
  production data yet (per prior sessions — not yet deployed), so a clean
  rebuild was the simplest correct option. Flagging explicitly since it is
  destructive to any local dev data in these two tables. `topic_mastery`
  and `revision_schedule` were **not** schema-changed — their rows were
  already uniquely tied to a syllabus via the topic's UUID `topic_id`,
  they just weren't being *filtered* by it on read.
- Added `syllabusBelongsToUser(syllabusId, userId)` — a reusable ownership
  check now used by every route below, same pattern already used in
  `/api/reference` and `/api/plan/generate`.

## Functions re-scoped to `(userId, syllabusId)`

`getTopicMastery`, `getUpcomingRevisions`, `getOrCreateDailyGoal`,
`setDailyGoalTarget`, `getOrCreateWeeklyGoal`, `setWeeklyGoalTarget`,
`getStreakDays`. `recordAttempt`'s `syllabusId` is now a required string
(was optional/nullable) and is threaded into the `daily_goals` upsert too.

## API routes changed

- `GET /api/progress` — now requires `?syllabus_id=`, verifies ownership.
- `GET /api/analytics/dashboard` — now requires `?syllabus_id=`, verifies
  ownership, scopes streak/goals/weak-topics/revisions.
- `GET /api/revision` — now requires `?syllabus_id=`, verifies ownership.
- `GET`/`POST /api/goals/daily` and `/api/goals/weekly` — now require
  `syllabus_id` (query param on GET, body field on POST via
  `dailyGoalSchema`/`weeklyGoalSchema`), verify ownership.
- `POST /api/attempts/submit` — `syllabus_id` is now required (was
  optional/nullable) in `attemptSubmitSchema`, and ownership is verified
  before the attempt is recorded (previously any string could be passed
  through untrusted).

## Frontend changes

- `lib/api.ts` — `getProgress`, `getDailyGoal`, `updateDailyGoal`,
  `getWeeklyGoal`, `updateWeeklyGoal`, `getRevisionSchedule`,
  `getDashboardAnalytics` all now take a required `syllabusId` param.
- `types/index.ts` — `AttemptSubmitInput.syllabus_id` is now required
  (`string`, was `string | undefined`).
- `progress/page.tsx` — rewritten to load the current syllabus first
  (same pattern as `plan/page.tsx`), then fetch progress scoped to it;
  shows "No syllabus uploaded yet" if none exists.
- `dashboard/page.tsx` — passes `syllabusId={syllabus.syllabus_id}` into
  `<DashboardAnalyticsPanel>`.
- `components/DashboardAnalytics.tsx` — now takes a required `syllabusId`
  prop, included in the fetch effect's dependency array so switching
  syllabi refetches.
- `plan/page.tsx` — passes `syllabusId={syllabus?.syllabus_id}` into
  `<GoalsPanel>`.
- `components/GoalsPanel.tsx` — now takes an optional `syllabusId` prop;
  renders nothing until it's known (same "best-effort widget" pattern it
  already used), refetches when it changes.
- `components/MCQQuiz.tsx` — attempt submission is now guarded on
  `syllabusId` being present (it always will be in practice, since the
  study page waits on the syllabus before rendering this component at
  all, but this avoids a malformed request in the edge case).

## Verification

- `tsc --noEmit` — clean, no errors.
- `npm run build` — webpack compile, lint, and type-check all passed.
  Static prerendering of `/_not-found` fails only because this sandbox
  has a placeholder Clerk key (`pk_test_your-key-here` from
  `.env.local.example`), not because of anything in this change — you'll
  see this resolve with real Clerk credentials.
- No AgenticService (Python) changes were needed — this was purely a
  MySQL query-scoping issue in the Next.js layer.

## Not in scope / flagged for later

- `getSuggestedDifficulty` (topic_mastery lookup by `topic_id` alone) was
  left as-is — `topic_id` is already a syllabus-unique UUID, so no
  cross-syllabus leak is possible there, adding `syllabus_id` would be
  redundant.
- `/api/notes/[topicId]` and `/api/mcq/[topicId]` (GET/DELETE) still don't
  check that the requesting user owns the syllabus that topic belongs to
  — low practical risk since `topic_id` is an unguessable UUID, but it's
  the same category of gap `/api/reference` used to have before it added
  an ownership check. Worth a follow-up pass if you want defense in depth
  there too.
