import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateWeeklyGoal, setWeeklyGoalTarget } from "@/lib/db";

// ── GET /api/goals/weekly ─────────────────────────────────────────────────────
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ detail: "Not signed in." }, { status: 401 });
  }
  const goal = await getOrCreateWeeklyGoal(userId);
  return NextResponse.json(goal);
}

// ── POST /api/goals/weekly (update this week's target) ──────────────────────
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ detail: "Not signed in." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const target = Number(body?.target_topics);
  if (!Number.isFinite(target) || target < 1 || target > 50) {
    return NextResponse.json({ detail: "target_topics must be a number between 1 and 50." }, { status: 400 });
  }

  const goal = await setWeeklyGoalTarget(userId, Math.round(target));
  return NextResponse.json(goal);
}
