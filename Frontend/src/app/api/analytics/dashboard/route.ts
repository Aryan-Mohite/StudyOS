import { NextResponse } from "next/server";
import {
  getStreakDays,
  getOrCreateDailyGoal,
  getOrCreateWeeklyGoal,
  getTopicMastery,
  getUpcomingRevisions,
} from "@/lib/db";
import { withApiHandler } from "@/lib/apiHandler";

const WEAK_TOPIC_LIMIT = 5;

// ── GET /api/analytics/dashboard ─────────────────────────────────────────────
// Single combined read for the dashboard widgets — streak, today's/this
// week's goal progress, weakest topics, and upcoming revisions — so the
// dashboard page makes one request instead of five.
export const GET = withApiHandler(
  async (_req, ctx) => {
    const userId = ctx.userId as string;

    const [streakDays, dailyGoal, weeklyGoal, topics, revisions] = await Promise.all([
      getStreakDays(userId),
      getOrCreateDailyGoal(userId),
      getOrCreateWeeklyGoal(userId),
      getTopicMastery(userId),
      getUpcomingRevisions(userId),
    ]);

    const totalAttempts = topics.reduce((a, t) => a + t.total_attempts, 0);
    const totalCorrect = topics.reduce((a, t) => a + t.correct_attempts, 0);
    const overallAccuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : null;

    // Only surface topics with enough attempts to be a meaningful signal, and
    // that are actually weak — otherwise a single wrong first guess on a topic
    // the student hasn't touched again would wrongly flag it.
    const weakTopics = topics.filter((t) => t.total_attempts >= 2 && t.mastery_score < 70).slice(0, WEAK_TOPIC_LIMIT);

    return NextResponse.json({
      streak_days: streakDays,
      daily_goal: dailyGoal,
      weekly_goal: weeklyGoal,
      weak_topics: weakTopics,
      upcoming_revisions: revisions.slice(0, 5),
      overall_accuracy: overallAccuracy,
      total_attempts: totalAttempts,
    });
  },
  { rateLimit: "read" },
);
