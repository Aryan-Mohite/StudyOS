import { NextRequest, NextResponse } from "next/server";
import { getOrCreateDailyGoal, setDailyGoalTarget, syllabusBelongsToUser } from "@/lib/db";
import { withApiHandler, ApiContext } from "@/lib/apiHandler";
import { parseBody, dailyGoalSchema, ValidationError } from "@/lib/validation";

// ── GET /api/goals/daily?syllabus_id=... ─────────────────────────────────────
export const GET = withApiHandler(
  async (req: NextRequest, ctx: ApiContext) => {
    const userId = ctx.userId as string;
    const syllabusId = req.nextUrl.searchParams.get("syllabus_id");
    if (!syllabusId) {
      return NextResponse.json({ detail: "syllabus_id is required." }, { status: 400 });
    }
    if (!(await syllabusBelongsToUser(syllabusId, userId))) {
      return NextResponse.json({ detail: "Syllabus not found." }, { status: 404 });
    }
    const goal = await getOrCreateDailyGoal(userId, syllabusId);
    return NextResponse.json(goal);
  },
  { rateLimit: "read" },
);

// ── POST /api/goals/daily (update today's target for a syllabus) ────────────
export const POST = withApiHandler(
  async (req: NextRequest, ctx: ApiContext) => {
    const userId = ctx.userId as string;
    let body;
    try {
      body = await parseBody(req, dailyGoalSchema);
    } catch (err) {
      if (err instanceof ValidationError) {
        return NextResponse.json({ detail: err.issues.join("; ") }, { status: 400 });
      }
      throw err;
    }
    if (!(await syllabusBelongsToUser(body.syllabus_id, userId))) {
      return NextResponse.json({ detail: "Syllabus not found." }, { status: 404 });
    }
    const goal = await setDailyGoalTarget(userId, body.syllabus_id, body.target_questions);
    return NextResponse.json(goal);
  },
  { rateLimit: "write" },
);
