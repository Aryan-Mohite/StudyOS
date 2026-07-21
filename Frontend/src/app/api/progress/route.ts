import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getTopicMastery } from "@/lib/db";

// ── GET /api/progress ───────────────────────────────────────────────────────
// Full per-topic mastery list (weakest first) for the /progress page.
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ detail: "Not signed in." }, { status: 401 });
  }

  const topics = await getTopicMastery(userId);
  const totalAttempts = topics.reduce((a, t) => a + t.total_attempts, 0);
  const totalCorrect = topics.reduce((a, t) => a + t.correct_attempts, 0);
  const overallAccuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : null;

  return NextResponse.json({ topics, overall_accuracy: overallAccuracy, total_attempts: totalAttempts });
}
