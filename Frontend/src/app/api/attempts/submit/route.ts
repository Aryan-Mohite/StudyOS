import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { recordAttempt } from "@/lib/db";

// ── POST /api/attempts/submit ───────────────────────────────────────────────
// Records one graded MCQ answer or self-marked numerical, and rolls the
// result into topic_mastery, revision_schedule, and today's daily_goals.
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ detail: "Not signed in." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { topic_id, topic_name, subject, syllabus_id, content_type, difficulty, is_correct } = body ?? {};

  if (
    typeof topic_id !== "string" ||
    typeof topic_name !== "string" ||
    typeof subject !== "string" ||
    (content_type !== "mcq" && content_type !== "numerical") ||
    !["easy", "medium", "hard"].includes(difficulty) ||
    typeof is_correct !== "boolean"
  ) {
    return NextResponse.json(
      { detail: "topic_id, topic_name, subject, content_type ('mcq'|'numerical'), difficulty ('easy'|'medium'|'hard'), and is_correct (boolean) are required." },
      { status: 400 },
    );
  }

  const rollup = await recordAttempt({
    userId,
    syllabusId: typeof syllabus_id === "string" ? syllabus_id : null,
    topicId: topic_id,
    topicName: topic_name,
    subject,
    contentType: content_type,
    difficulty,
    isCorrect: is_correct,
  });

  return NextResponse.json(rollup);
}
