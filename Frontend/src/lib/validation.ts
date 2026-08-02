/**
 * validation.ts — Zod schemas for API route request bodies.
 *
 * Centralized so every write route validates with the same bounds (string
 * lengths, numeric ranges, enums) instead of each route hand-rolling its
 * own ad-hoc checks with different limits or gaps. `parseBody` returns a
 * typed, clean object or throws a ValidationError the route can turn into
 * a 400.
 */

import { z, ZodSchema } from "zod";

export class ValidationError extends Error {
  constructor(public issues: string[]) {
    super(issues.join("; "));
    this.name = "ValidationError";
  }
}

export async function parseBody<T>(req: Request, schema: ZodSchema<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ValidationError(["Request body must be valid JSON."]);
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new ValidationError(result.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`));
  }
  return result.data;
}

// Shared building blocks
const topicId = z.string().min(1).max(128);
const topicName = z.string().min(1).max(512);
const subject = z.string().min(1).max(256);
const syllabusId = z.string().min(1).max(64);
const syllabusContext = z.array(z.string().max(2000)).max(100).default([]);
const difficulty = z.enum(["easy", "medium", "hard", "mixed"]);

export const notesGenerateSchema = z.object({
  topic_id: topicId,
  topic_name: topicName,
  subject,
  unit_title: z.string().min(1).max(512),
  syllabus_context: syllabusContext,
  syllabus_id: z.string().max(64).optional().default(""),
  force_regenerate: z.boolean().optional().default(false),
});

export const mcqGenerateSchema = z.object({
  topic_id: topicId,
  topic_name: topicName,
  subject,
  count: z.number().int().min(1).max(50).default(10),
  difficulty: difficulty.default("mixed"),
  syllabus_context: syllabusContext,
  syllabus_id: z.string().max(64).optional().default(""),
  force_regenerate: z.boolean().optional().default(false),
});

export const planGenerateSchema = z.object({
  syllabus_id: syllabusId,
  exam_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "exam_date must be YYYY-MM-DD"),
  force_regenerate: z.boolean().optional().default(false),
});

export const attemptSubmitSchema = z.object({
  topic_id: topicId,
  topic_name: topicName,
  subject,
  syllabus_id: syllabusId,
  content_type: z.literal("mcq"),
  difficulty: z.enum(["easy", "medium", "hard"]),
  is_correct: z.boolean(),
});

export const dailyGoalSchema = z.object({
  syllabus_id: syllabusId,
  target_questions: z.number().int().min(1).max(200),
});

export const weeklyGoalSchema = z.object({
  syllabus_id: syllabusId,
  target_topics: z.number().int().min(1).max(50),
});

export const profileUpdateSchema = z.object({
  name: z.string().max(255),
  education_level: z.string().max(100),
  course: z.string().max(100),
  university: z.string().max(100),
});
