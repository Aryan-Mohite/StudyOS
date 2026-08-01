import { NextRequest, NextResponse } from "next/server";
import { getOrCreateWeeklyGoal, setWeeklyGoalTarget } from "@/lib/db";
import { withApiHandler, ApiContext } from "@/lib/apiHandler";
import { parseBody, weeklyGoalSchema, ValidationError } from "@/lib/validation";

// ── GET /api/goals/weekly ─────────────────────────────────────────────────────
export const GET = withApiHandler(
  async (_req: NextRequest, ctx: ApiContext) => {
    const goal = await getOrCreateWeeklyGoal(ctx.userId as string);
    return NextResponse.json(goal);
  },
  { rateLimit: "read" },
);

// ── POST /api/goals/weekly (update this week's target) ──────────────────────
export const POST = withApiHandler(
  async (req: NextRequest, ctx: ApiContext) => {
    let body;
    try {
      body = await parseBody(req, weeklyGoalSchema);
    } catch (err) {
      if (err instanceof ValidationError) {
        return NextResponse.json({ detail: err.issues.join("; ") }, { status: 400 });
      }
      throw err;
    }
    const goal = await setWeeklyGoalTarget(ctx.userId as string, body.target_topics);
    return NextResponse.json(goal);
  },
  { rateLimit: "write" },
);
