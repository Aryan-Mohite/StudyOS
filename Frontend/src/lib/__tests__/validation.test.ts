import { describe, it, expect } from "vitest";
import {
  parseBody,
  ValidationError,
  notesGenerateSchema,
  mcqGenerateSchema,
  planGenerateSchema,
  attemptSubmitSchema,
  dailyGoalSchema,
  weeklyGoalSchema,
  profileUpdateSchema,
} from "@/lib/validation";

function fakeRequest(body: unknown): Request {
  return new Request("http://localhost/api/test", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function fakeInvalidJsonRequest(): Request {
  return new Request("http://localhost/api/test", {
    method: "POST",
    body: "{not valid json",
  });
}

describe("parseBody", () => {
  it("rejects a request body that isn't valid JSON", async () => {
    await expect(parseBody(fakeInvalidJsonRequest(), profileUpdateSchema)).rejects.toThrow(ValidationError);
  });

  it("returns typed, parsed data on success", async () => {
    const req = fakeRequest({ name: "Aryan", education_level: "B.Tech 3rd Year", course: "CS", university: "SPPU" });
    const data = await parseBody(req, profileUpdateSchema);
    expect(data).toEqual({ name: "Aryan", education_level: "B.Tech 3rd Year", course: "CS", university: "SPPU" });
  });

  it("collects all schema violations into ValidationError.issues", async () => {
    const req = fakeRequest({ name: "x".repeat(300), education_level: "", course: "", university: "" });
    try {
      await parseBody(req, profileUpdateSchema);
      expect.fail("expected parseBody to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).issues.length).toBeGreaterThan(0);
    }
  });
});

describe("notesGenerateSchema", () => {
  const valid = {
    topic_id: "t1",
    topic_name: "Binary Trees",
    subject: "Data Structures",
    unit_title: "Unit 2",
  };

  it("accepts a minimal valid payload and fills in defaults", () => {
    const result = notesGenerateSchema.parse(valid);
    expect(result.syllabus_context).toEqual([]);
    expect(result.force_regenerate).toBe(false);
  });

  it("rejects an empty topic_id", () => {
    expect(notesGenerateSchema.safeParse({ ...valid, topic_id: "" }).success).toBe(false);
  });

  it("rejects a topic_name over the max length", () => {
    expect(notesGenerateSchema.safeParse({ ...valid, topic_name: "x".repeat(600) }).success).toBe(false);
  });
});

describe("mcqGenerateSchema", () => {
  const valid = { topic_id: "t1", topic_name: "AVL Trees", subject: "DS" };

  it("defaults count to 10 and difficulty to 'mixed'", () => {
    const result = mcqGenerateSchema.parse(valid);
    expect(result.count).toBe(10);
    expect(result.difficulty).toBe("mixed");
  });

  it("rejects a count above 50", () => {
    expect(mcqGenerateSchema.safeParse({ ...valid, count: 51 }).success).toBe(false);
  });

  it("rejects a count below 1", () => {
    expect(mcqGenerateSchema.safeParse({ ...valid, count: 0 }).success).toBe(false);
  });

  it("rejects an unrecognized difficulty", () => {
    expect(mcqGenerateSchema.safeParse({ ...valid, difficulty: "impossible" }).success).toBe(false);
  });

  it("accepts each valid difficulty value", () => {
    for (const difficulty of ["easy", "medium", "hard", "mixed"]) {
      expect(mcqGenerateSchema.safeParse({ ...valid, difficulty }).success).toBe(true);
    }
  });
});

describe("planGenerateSchema", () => {
  it("accepts a well-formed exam_date", () => {
    expect(planGenerateSchema.safeParse({ syllabus_id: "s1", exam_date: "2026-12-01" }).success).toBe(true);
  });

  it("rejects a malformed exam_date", () => {
    expect(planGenerateSchema.safeParse({ syllabus_id: "s1", exam_date: "12/01/2026" }).success).toBe(false);
    expect(planGenerateSchema.safeParse({ syllabus_id: "s1", exam_date: "not-a-date" }).success).toBe(false);
  });

  it("rejects a missing syllabus_id", () => {
    expect(planGenerateSchema.safeParse({ exam_date: "2026-12-01" }).success).toBe(false);
  });
});

describe("attemptSubmitSchema", () => {
  const valid = {
    topic_id: "t1",
    topic_name: "AVL Trees",
    subject: "DS",
    syllabus_id: "s1",
    content_type: "mcq",
    difficulty: "medium",
    is_correct: true,
  };

  it("accepts a valid attempt", () => {
    expect(attemptSubmitSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a content_type other than 'mcq'", () => {
    expect(attemptSubmitSchema.safeParse({ ...valid, content_type: "essay" }).success).toBe(false);
  });

  it("rejects 'mixed' as a per-attempt difficulty (only easy/medium/hard)", () => {
    expect(attemptSubmitSchema.safeParse({ ...valid, difficulty: "mixed" }).success).toBe(false);
  });
});

describe("dailyGoalSchema / weeklyGoalSchema", () => {
  it("enforces the 1..200 bound on daily target_questions", () => {
    expect(dailyGoalSchema.safeParse({ syllabus_id: "s1", target_questions: 0 }).success).toBe(false);
    expect(dailyGoalSchema.safeParse({ syllabus_id: "s1", target_questions: 201 }).success).toBe(false);
    expect(dailyGoalSchema.safeParse({ syllabus_id: "s1", target_questions: 10 }).success).toBe(true);
  });

  it("enforces the 1..50 bound on weekly target_topics", () => {
    expect(weeklyGoalSchema.safeParse({ syllabus_id: "s1", target_topics: 0 }).success).toBe(false);
    expect(weeklyGoalSchema.safeParse({ syllabus_id: "s1", target_topics: 51 }).success).toBe(false);
    expect(weeklyGoalSchema.safeParse({ syllabus_id: "s1", target_topics: 5 }).success).toBe(true);
  });

  it("rejects non-integer targets", () => {
    expect(dailyGoalSchema.safeParse({ syllabus_id: "s1", target_questions: 5.5 }).success).toBe(false);
  });
});
