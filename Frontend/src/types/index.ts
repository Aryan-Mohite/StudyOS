/**
 * StudyOS — Contract Types
 *
 * Derived from /contracts/*.contract.json
 * These types are the single source of truth for data shapes across the app.
 * Phase 1 mock data must satisfy these types.
 * Phase 2+ API responses must be validated against these types before use.
 */

// ─────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────

export interface UserProfile {
  user_id: string;
  name: string | null;
  education_level: string | null;
  course: string | null;
  university: string | null;
  /** Server-derived — true only when all fields above are non-empty. */
  completed: boolean;
}

export type ProfileState = "idle" | "loading" | "success" | "saving" | "error";

// ─────────────────────────────────────────
// SYLLABUS
// ─────────────────────────────────────────

export interface SyllabusTopic {
  topic_id: string;
  name: string;
  subtopics: string[];
  difficulty_hint: "easy" | "medium" | "hard" | null;
}

export interface SyllabusUnit {
  unit_number: number;
  title: string;
  topics: SyllabusTopic[];
}

export interface SyllabusSubject {
  subject_id: string;
  name: string;
  code: string | null;
  credits: number | null;
  units: SyllabusUnit[];
}

export interface Syllabus {
  syllabus_id: string;
  university: string | null;
  program: string | null;
  semester: number | null;
  uploaded_at: string; // ISO 8601
  subjects: SyllabusSubject[];
}

/** One student-uploaded textbook/lecture PDF indexed for a syllabus (see /api/reference). */
export interface ReferenceMaterial {
  id: string;
  filename: string;
  chunks_indexed: number;
  created_at: string;
}

// ─────────────────────────────────────────
// NOTES
// ─────────────────────────────────────────

export interface NoteSection {
  heading: string;
  content: string; // markdown allowed
  key_points: string[];
  formula: string | null; // LaTeX notation
}

export interface Note {
  note_id: string;
  topic_id: string;
  topic: string;
  subject: string;
  generated_at: string; // ISO 8601
  sections: NoteSection[];
  summary: string;
  related_topics: string[];
}

// ─────────────────────────────────────────
// MCQ
// ─────────────────────────────────────────

export type MCQOption = "A" | "B" | "C" | "D";

export interface MCQQuestion {
  id: number;
  question: string;
  options: Record<MCQOption, string>;
  correct: MCQOption;
  explanation: string;
  concept_tested: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface MCQSet {
  mcq_set_id: string;
  topic_id: string;
  topic: string;
  subject: string;
  generated_at: string; // ISO 8601
  total_questions: number;
  questions: MCQQuestion[];
}

// ─────────────────────────────────────────
// STUDY PLAN
//
// No shared type here — the Study Plan contract (study_plan_id, days[]
// with session_type/topics/focus_note) lives in
// AgenticService/App/agents/study_plan_agent.py and is consumed directly
// via a local interface in app/(dashboard)/plan/page.tsx. An earlier
// weeks/days/tasks-shaped draft used to live here; it never matched what
// the backend actually returns and nothing imported it, so it's been
// removed rather than left to mislead the next person who reaches for it.
// ─────────────────────────────────────────

// ─────────────────────────────────────────
// PERSONALIZED LEARNING
// ─────────────────────────────────────────

export interface AttemptSubmitInput {
  topic_id: string;
  topic_name: string;
  subject: string;
  syllabus_id: string;
  content_type: "mcq";
  difficulty: "easy" | "medium" | "hard";
  is_correct: boolean;
}

export interface AttemptRollup {
  mastery_score: number;
  total_attempts: number;
  correct_attempts: number;
  next_review_date: string; // YYYY-MM-DD
}

export interface TopicMastery {
  topic_id: string;
  topic_name: string;
  subject: string;
  total_attempts: number;
  correct_attempts: number;
  mastery_score: number; // 0-100
  last_attempted_at: string;
}

export interface RevisionItem {
  topic_id: string;
  topic_name: string;
  subject: string;
  next_review_date: string; // YYYY-MM-DD
  overdue: boolean;
}

export interface DailyGoal {
  goal_date: string;
  target_questions: number;
  completed_questions: number;
}

export interface WeeklyGoal {
  week_start: string;
  target_topics: number;
  completed_topics: number;
}

export interface DashboardAnalytics {
  streak_days: number;
  daily_goal: DailyGoal;
  weekly_goal: WeeklyGoal;
  weak_topics: TopicMastery[]; // lowest mastery first, capped server-side
  upcoming_revisions: RevisionItem[];
  overall_accuracy: number | null; // 0-100, null if no attempts yet
  total_attempts: number;
}

export type SuggestedDifficulty = "easy" | "medium" | "hard" | "mixed";

// ─────────────────────────────────────────
// UI STATES
// ─────────────────────────────────────────

export type SyllabusUploadState =
  | "idle"
  | "file_selected"
  | "uploading"
  | "parsing"
  | "success"
  | "error_upload"
  | "error_parse"
  | "error_format";

export type NotesState =
  | "idle"
  | "loading"
  | "streaming"
  | "success"
  | "stale"
  | "error"
  | "empty"
  | "regenerating";

export type MCQState =
  | "idle"
  | "loading"
  | "success"
  | "question_answered"
  | "in_progress"
  | "completed"
  | "stale"
  | "error"
  | "empty"
  | "regenerating";

// ─────────────────────────────────────────
// SHARED / UTILITY
// ─────────────────────────────────────────

/** Wraps any feature's data with its current UI state — use in React component state */
export interface FeatureState<TData, TState extends string> {
  state: TState;
  data: TData | null;
  error: string | null;
}

/** Convenience types for each feature's full state shape */
export type NotesFeatureState = FeatureState<Note, NotesState>;
export type MCQFeatureState = FeatureState<MCQSet, MCQState>;
