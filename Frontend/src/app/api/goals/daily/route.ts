import { NextRequest, NextResponse } from "next/server";
import { getOrCreateDailyGoal, setDailyGoalTarget } from "@/lib/db";
import { withApiHandler, ApiContext } from "@/lib/apiHandler";
import { parseBody, dailyGoalSchema, ValidationError } from "@/lib/validation";

// ── GET /api/goals/daily ─────────────────────────────────────────────────────
export const GET = withApiHandler(
  async (_req: NextRequest, ctx: ApiContext) => {
    const goal = await getOrCreateDailyGoal(ctx.userId as string);
    return NextResponse.json(goal);
  },
  { rateLimit: "read" },
);

// ── POST /api/goals/daily (update today's target) ───────────────────────────
export const POST = withApiHandler(
  async (req: NextRequest, ctx: ApiContext) => {
    let body;
    try {
      body = await parseBody(req, dailyGoalSchema);
    } catch (err) {
      if (err instanceof ValidationError) {
        return NextResponse.json({ detail: err.issues.join("; ") }, { status: 400 });
      }
      throw err;
    }
    const goal = await setDailyGoalTarget(ctx.userId as string, body.target_questions);
    return NextResponse.json(goal);
  },
  { rateLimit: "write" },
);
