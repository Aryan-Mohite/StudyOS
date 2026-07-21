import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateDailyGoal, setDailyGoalTarget } from "@/lib/db";

// ── GET /api/goals/daily ─────────────────────────────────────────────────────
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ detail: "Not signed in." }, { status: 401 });
  }
  const goal = await getOrCreateDailyGoal(userId);
  return NextResponse.json(goal);
}

// ── POST /api/goals/daily (update today's target) ───────────────────────────
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ detail: "Not signed in." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const target = Number(body?.target_questions);
  if (!Number.isFinite(target) || target < 1 || target > 200) {
    return NextResponse.json({ detail: "target_questions must be a number between 1 and 200." }, { status: 400 });
  }

  const goal = await setDailyGoalTarget(userId, Math.round(target));
  return NextResponse.json(goal);
}
