/**
 * StudyOS API client
 *
 * Calls the Next.js API routes (Frontend/src/app/api/**) directly — same
 * origin, so no separate gateway service is needed. Those routes delegate
 * AI work server-side to the Python AgenticService and cache results in MySQL.
 *
 * Set NEXT_PUBLIC_API_URL in .env.local only if you ever split the API
 * routes into a separately-deployed service (default: same origin, "").
 */

import type {
  Syllabus,
  Note,
  MCQSet,
  NumericalSet,
  TutorResponse,
  ChatMessage,
  AttemptSubmitInput,
  AttemptRollup,
  TopicMastery,
  RevisionItem,
  DailyGoal,
  WeeklyGoal,
  DashboardAnalytics,
  SuggestedDifficulty,
} from "@/types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

// ─── Helpers ──────────────────────────────────────────────────────────────────

class APIError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(`API ${status}: ${detail}`);
    this.name = "APIError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = init?.body instanceof FormData;
  const headers: Record<string, string> = isFormData
    ? {}
    : { "Content-Type": "application/json" };

  const res = await fetch(`${BASE}${path}`, { ...init, headers: { ...headers, ...init?.headers } });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      detail = await res.text().catch(() => detail);
    }
    throw new APIError(res.status, detail);
  }

  return res.json() as Promise<T>;
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export async function uploadSyllabus(
  file: File,
  userId = "dev-user-01",
): Promise<Syllabus> {
  const form = new FormData();
  form.append("file", file);
  form.append("user_id", userId);
  return request<Syllabus>("/api/upload", { method: "POST", body: form });
}

export async function getLatestSyllabus(
  userId = "dev-user-01",
): Promise<Syllabus> {
  return request<Syllabus>(`/api/upload/latest?user_id=${userId}`);
}

// ─── Notes ────────────────────────────────────────────────────────────────────

export interface GenerateNotesInput {
  topic_id: string;
  topic_name: string;
  subject: string;
  unit_title: string;
  syllabus_context: string[];
  syllabus_id?: string;
  force_regenerate?: boolean;
}

export async function generateNotes(input: GenerateNotesInput): Promise<Note & { _cached: boolean }> {
  return request<Note & { _cached: boolean }>("/api/notes/generate", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getNotes(topicId: string): Promise<Note> {
  return request<Note>(`/api/notes/${topicId}`);
}

export async function deleteNotes(topicId: string): Promise<void> {
  await request<void>(`/api/notes/${topicId}`, { method: "DELETE" });
}

// ─── MCQ ───────────────────────────────────────────────────────────────────────

export interface GenerateMCQInput {
  topic_id: string;
  topic_name: string;
  subject: string;
  count?: number;
  difficulty?: "easy" | "medium" | "hard" | "mixed";
  syllabus_context?: string[];
  syllabus_id?: string;
  force_regenerate?: boolean;
}

export async function generateMCQ(input: GenerateMCQInput): Promise<MCQSet & { _cached: boolean }> {
  return request<MCQSet & { _cached: boolean }>("/api/mcq/generate", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getMCQ(topicId: string): Promise<MCQSet> {
  return request<MCQSet>(`/api/mcq/${topicId}`);
}

export async function deleteMCQ(topicId: string): Promise<void> {
  await request<void>(`/api/mcq/${topicId}`, { method: "DELETE" });
}

// ─── Health ───────────────────────────────────────────────────────────────────

export async function checkHealth(): Promise<{ status: string; version: string }> {
  return request("/api/health");
}

// ─── Numericals ─────────────────────────────────────────────────────────────────

export interface GenerateNumericalsInput {
  topic_id: string;
  topic_name: string;
  subject: string;
  count?: number;
  difficulty?: "easy" | "medium" | "hard" | "mixed";
  syllabus_context?: string[];
  syllabus_id?: string;
  force_regenerate?: boolean;
}

export async function generateNumericals(
  input: GenerateNumericalsInput,
): Promise<NumericalSet & { _cached: boolean }> {
  return request<NumericalSet & { _cached: boolean }>("/api/numericals/generate", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getNumericals(topicId: string): Promise<NumericalSet> {
  return request<NumericalSet>(`/api/numericals/${topicId}`);
}

export async function deleteNumericals(topicId: string): Promise<void> {
  await request<void>(`/api/numericals/${topicId}`, { method: "DELETE" });
}

// ─── AI Tutor Chat ────────────────────────────────────────────────────────────

export interface SendChatMessageInput {
  session_id: string;
  question: string;
  topic_id: string;
  topic_name: string;
  subject: string;
  syllabus_context?: string[];
  syllabus_id?: string; // resolved server-side to notebook_id, scopes RAG retrieval to this subject
  history?: ChatMessage[]; // for callers that also want to keep local UI history
}

export async function sendChatMessage(input: SendChatMessageInput): Promise<TutorResponse> {
  return request<TutorResponse>("/api/chat", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ─── Personalized Learning ──────────────────────────────────────────────────

export async function submitAttempt(input: AttemptSubmitInput): Promise<AttemptRollup> {
  return request<AttemptRollup>("/api/attempts/submit", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getProgress(): Promise<{ topics: TopicMastery[]; overall_accuracy: number | null; total_attempts: number }> {
  return request("/api/progress");
}

export async function getDailyGoal(): Promise<DailyGoal> {
  return request<DailyGoal>("/api/goals/daily");
}

export async function updateDailyGoal(targetQuestions: number): Promise<DailyGoal> {
  return request<DailyGoal>("/api/goals/daily", {
    method: "POST",
    body: JSON.stringify({ target_questions: targetQuestions }),
  });
}

export async function getWeeklyGoal(): Promise<WeeklyGoal> {
  return request<WeeklyGoal>("/api/goals/weekly");
}

export async function updateWeeklyGoal(targetTopics: number): Promise<WeeklyGoal> {
  return request<WeeklyGoal>("/api/goals/weekly", {
    method: "POST",
    body: JSON.stringify({ target_topics: targetTopics }),
  });
}

export async function getRevisionSchedule(): Promise<{ items: RevisionItem[] }> {
  return request("/api/revision");
}

export async function getDashboardAnalytics(): Promise<DashboardAnalytics> {
  return request<DashboardAnalytics>("/api/analytics/dashboard");
}

export async function getSuggestedDifficulty(topicId: string): Promise<SuggestedDifficulty> {
  const res = await request<{ suggested_difficulty: SuggestedDifficulty }>(
    `/api/mcq/suggested-difficulty?topic_id=${encodeURIComponent(topicId)}`,
  );
  return res.suggested_difficulty;
}

export { APIError };
