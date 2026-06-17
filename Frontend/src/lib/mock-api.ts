/**
 * Mock API layer for Phase 1.
 * Simulates the real backend with realistic delays and loading step sequences.
 * In Phase 2+, replace these functions with real fetch() calls to FastAPI.
 */

import type { Note, NumericalSet, MCQSet, StudyPlan, Syllabus, TutorResponse, ChatMessage } from "@/types";
import { getMockNotes, getMockNumericals, getMockMCQ, mockStudyPlan, mockSyllabus, mockTutorResponses, suggestedQuestions } from "../mocks";

// ─── Utilities ────────────────────────────────────────────────────────────────

export function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export type StepCallback = (step: string) => void;

// ─── Syllabus ─────────────────────────────────────────────────────────────────

export async function mockUploadSyllabus(
  _file: File,
  onStep: StepCallback
): Promise<Syllabus> {
  onStep("Uploading file…");
  await delay(800);
  onStep("Reading PDF content…");
  await delay(900);
  onStep("Identifying subjects and units…");
  await delay(1000);
  onStep("Mapping topics and subtopics…");
  await delay(900);
  onStep("Finalising syllabus structure…");
  await delay(600);
  return mockSyllabus;
}

export async function mockFetchSyllabus(): Promise<Syllabus> {
  await delay(400);
  return mockSyllabus;
}

// ─── Notes ───────────────────────────────────────────────────────────────────

export async function mockGenerateNotes(
  topicId: string,
  onStep: StepCallback
): Promise<Note | null> {
  onStep("Reading your syllabus context…");
  await delay(700);
  onStep("Structuring key sections…");
  await delay(900);
  onStep("Adding formulas and key points…");
  await delay(800);
  onStep("Linking related topics…");
  await delay(600);
  return getMockNotes(topicId);
}

// ─── Numericals ───────────────────────────────────────────────────────────────

export async function mockGenerateNumericals(
  topicId: string,
  onStep: StepCallback
): Promise<NumericalSet | null> {
  onStep("Selecting problem types for this topic…");
  await delay(700);
  onStep("Writing step-by-step solutions…");
  await delay(1000);
  onStep("Verifying answers and difficulty spread…");
  await delay(800);
  return getMockNumericals(topicId);
}

// ─── MCQ ─────────────────────────────────────────────────────────────────────

export async function mockGenerateMCQ(
  topicId: string,
  onStep: StepCallback
): Promise<MCQSet | null> {
  onStep("Writing question stems…");
  await delay(700);
  onStep("Crafting plausible distractors…");
  await delay(800);
  onStep("Adding explanations…");
  await delay(700);
  return getMockMCQ(topicId);
}

// ─── Study Plan ───────────────────────────────────────────────────────────────

export async function mockGenerateStudyPlan(
  onStep: StepCallback
): Promise<StudyPlan> {
  onStep("Counting your topics…");
  await delay(700);
  onStep("Mapping week-by-week schedule…");
  await delay(900);
  onStep("Prioritising high-weight topics…");
  await delay(700);
  onStep("Scheduling revision and buffer days…");
  await delay(600);
  return mockStudyPlan;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export async function mockChat(
  _messages: ChatMessage[],
  topicId: string | null
): Promise<TutorResponse> {
  await delay(1200);
  // Return a contextual response based on topic
  if (topicId === "t-ds-006") return mockTutorResponses.avl_rotation;
  return mockTutorResponses.out_of_scope;
}

export function getSuggestedQuestions(topicId: string | null): string[] {
  if (!topicId) return suggestedQuestions.default;
  return suggestedQuestions[topicId] ?? suggestedQuestions.default;
}
