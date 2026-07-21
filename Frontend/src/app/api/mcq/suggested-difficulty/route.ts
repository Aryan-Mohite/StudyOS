import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSuggestedDifficulty } from "@/lib/db";

// ── GET /api/mcq/suggested-difficulty?topic_id=... ──────────────────────────
// A suggestion only — the student still picks the difficulty themselves in
// MCQQuiz. Derived from their own accuracy on this topic, not shown until
// there are at least 3 prior attempts.
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ detail: "Not signed in." }, { status: 401 });
  }

  const topicId = req.nextUrl.searchParams.get("topic_id");
  if (!topicId) {
    return NextResponse.json({ detail: "topic_id query param is required." }, { status: 400 });
  }

  const suggested = await getSuggestedDifficulty(userId, topicId);
  return NextResponse.json({ topic_id: topicId, suggested_difficulty: suggested });
}
