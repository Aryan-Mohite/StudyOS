import { NextRequest, NextResponse } from "next/server";
import { recordAttempt, syllabusBelongsToUser } from "@/lib/db";
import { withApiHandler, ApiContext } from "@/lib/apiHandler";
import { parseBody, attemptSubmitSchema, ValidationError } from "@/lib/validation";

// ── POST /api/attempts/submit ───────────────────────────────────────────────
// Records one graded MCQ answer, and rolls the result into topic_mastery,
// revision_schedule, and today's daily_goals — all keyed to the syllabus
// the attempt belongs to, so progress stays isolated per syllabus.
export const POST = withApiHandler(
  async (req: NextRequest, ctx: ApiContext) => {
    const userId = ctx.userId as string;

    let body;
    try {
      body = await parseBody(req, attemptSubmitSchema);
    } catch (err) {
      if (err instanceof ValidationError) {
        return NextResponse.json({ detail: err.issues.join("; ") }, { status: 400 });
      }
      throw err;
    }

    if (!(await syllabusBelongsToUser(body.syllabus_id, userId))) {
      return NextResponse.json({ detail: "Syllabus not found." }, { status: 404 });
    }

    const rollup = await recordAttempt({
      userId,
      syllabusId: body.syllabus_id,
      topicId: body.topic_id,
      topicName: body.topic_name,
      subject: body.subject,
      contentType: body.content_type,
      difficulty: body.difficulty,
      isCorrect: body.is_correct,
    });

    return NextResponse.json(rollup);
  },
  { rateLimit: "write" },
);
