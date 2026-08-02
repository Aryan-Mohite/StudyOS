import { NextRequest, NextResponse } from "next/server";
import { getOrCreateWeeklyGoal, setWeeklyGoalTarget, syllabusBelongsToUser } from "@/lib/db";
import { withApiHandler, ApiContext } from "@/lib/apiHandler";
import { parseBody, weeklyGoalSchema, ValidationError } from "@/lib/validation";

// ── GET /api/goals/weekly?syllabus_id=... ────────────────────────────────────
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
    const goal = await getOrCreateWeeklyGoal(userId, syllabusId);
    return NextResponse.json(goal);
  },
  { rateLimit: "read" },
);

// ── POST /api/goals/weekly (update this week's target for a syllabus) ───────
export const POST = withApiHandler(
  async (req: NextRequest, ctx: ApiContext) => {
    const userId = ctx.userId as string;
    let body;
    try {
      body = await parseBody(req, weeklyGoalSchema);
    } catch (err) {
      if (err instanceof ValidationError) {
        return NextResponse.json({ detail: err.issues.join("; ") }, { status: 400 });
      }
      throw err;
    }
    if (!(await syllabusBelongsToUser(body.syllabus_id, userId))) {
      return NextResponse.json({ detail: "Syllabus not found." }, { status: 404 });
    }
    const goal = await setWeeklyGoalTarget(userId, body.syllabus_id, body.target_topics);
    return NextResponse.json(goal);
  },
  { rateLimit: "write" },
);
