import { NextResponse } from "next/server";
import { getTopicMastery } from "@/lib/db";
import { withApiHandler } from "@/lib/apiHandler";

// ── GET /api/progress ───────────────────────────────────────────────────────
// Full per-topic mastery list (weakest first) for the /progress page.
export const GET = withApiHandler(
  async (_req, ctx) => {
    const userId = ctx.userId as string;
    const topics = await getTopicMastery(userId);
    const totalAttempts = topics.reduce((a, t) => a + t.total_attempts, 0);
    const totalCorrect = topics.reduce((a, t) => a + t.correct_attempts, 0);
    const overallAccuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : null;

    return NextResponse.json({ topics, overall_accuracy: overallAccuracy, total_attempts: totalAttempts });
  },
  { rateLimit: "read" },
);
