import { NextRequest, NextResponse } from "next/server";
import { getTopicMastery, syllabusBelongsToUser } from "@/lib/db";
import { withApiHandler } from "@/lib/apiHandler";

// ── GET /api/progress?syllabus_id=... ───────────────────────────────────────
// Full per-topic mastery list (weakest first) for the /progress page,
// scoped to one syllabus so switching notebooks shows only that
// notebook's mastery data instead of every syllabus the student has ever
// uploaded.
export const GET = withApiHandler(
  async (req: NextRequest, ctx) => {
    const userId = ctx.userId as string;
    const syllabusId = req.nextUrl.searchParams.get("syllabus_id");
    if (!syllabusId) {
      return NextResponse.json({ detail: "syllabus_id is required." }, { status: 400 });
    }
    if (!(await syllabusBelongsToUser(syllabusId, userId))) {
      return NextResponse.json({ detail: "Syllabus not found." }, { status: 404 });
    }

    const topics = await getTopicMastery(userId, syllabusId);
    const totalAttempts = topics.reduce((a, t) => a + t.total_attempts, 0);
    const totalCorrect = topics.reduce((a, t) => a + t.correct_attempts, 0);
    const overallAccuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : null;

    return NextResponse.json({ topics, overall_accuracy: overallAccuracy, total_attempts: totalAttempts });
  },
  { rateLimit: "read" },
);
