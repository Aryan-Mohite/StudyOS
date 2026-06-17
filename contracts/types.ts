/**
 * StudyOS — Contract Types
 *
 * Derived from /contracts/*.contract.json
 * These types are the single source of truth for data shapes across the app.
 * Phase 1 mock data must satisfy these types.
 * Phase 2+ API responses must be validated against these types before use.
 */

// ─────────────────────────────────────────
// SYLLABUS
// ─────────────────────────────────────────

export interface SyllabusTopic {
  topic_id: string;
  name: string;
  subtopics: string[];
  has_numericals: boolean;
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
// NUMERICALS
// ─────────────────────────────────────────

export interface NumericalStep {
  step_number: number;
  explanation: string;
  expression: string | null; // LaTeX
}

export interface NumericalProblem {
  id: number;
  question: string;
  given: Record<string, string>; // e.g. { "Mass (m)": "5 kg" }
  find: string;
  steps: NumericalStep[];
  answer: string;
  unit: string | null;
  difficulty: "easy" | "medium" | "hard";
  concept_tested: string;
}

export interface NumericalSet {
  numerical_set_id: string;
  topic_id: string;
  topic: string;
  subject: string;
  generated_at: string; // ISO 8601
  problems: NumericalProblem[];
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
// ─────────────────────────────────────────

export type TaskType = "study" | "revise" | "practice" | "mock_test";
export type Priority = "high" | "medium" | "low";

export interface StudyTask {
  task_id: string;
  topic_id: string;
  subject: string;
  topic: string;
  duration_minutes: number;
  task_type: TaskType;
  priority: Priority;
  notes: string | null;
}

export interface StudyDay {
  date: string; // YYYY-MM-DD
  day_label: string;
  is_buffer: boolean;
  tasks: StudyTask[];
}

export interface StudyWeek {
  week_number: number;
  theme: string;
  days: StudyDay[];
}

export interface StudyPlan {
  plan_id: string;
  syllabus_id: string;
  exam_date: string; // YYYY-MM-DD
  generated_at: string; // ISO 8601
  total_days: number;
  total_topics: number;
  daily_hours: number;
  weeks: StudyWeek[];
}

// ─────────────────────────────────────────
// CHAT / AI TUTOR
// ─────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export type ChatConfidence = "high" | "medium" | "low";

export interface TutorResponse {
  message_id: string;
  answer: string; // markdown allowed
  confidence: ChatConfidence;
  sources_referenced: string[]; // topic names from the syllabus
  follow_up_suggestions: string[];
  out_of_scope: boolean;
}

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

export type NumericalsState =
  | "idle"
  | "loading"
  | "success"
  | "stale"
  | "error"
  | "empty"
  | "regenerating"
  | "step_expanded";

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

export type StudyPlanState =
  | "idle"
  | "loading"
  | "success"
  | "regenerating"
  | "error"
  | "empty"
  | "task_complete"
  | "day_complete";

export type ChatState =
  | "idle"
  | "typing"
  | "loading"
  | "streaming"
  | "success"
  | "out_of_scope"
  | "error"
  | "context_lost";

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
export type NumericalsFeatureState = FeatureState<NumericalSet, NumericalsState>;
export type MCQFeatureState = FeatureState<MCQSet, MCQState>;
export type StudyPlanFeatureState = FeatureState<StudyPlan, StudyPlanState>;
export type ChatFeatureState = FeatureState<TutorResponse[], ChatState>;
