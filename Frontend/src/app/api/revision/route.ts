import { NextResponse } from "next/server";
import { getUpcomingRevisions } from "@/lib/db";
import { withApiHandler } from "@/lib/apiHandler";

// ── GET /api/revision ────────────────────────────────────────────────────────
// Topics due for spaced-repetition revision in the next 7 days (overdue first).
export const GET = withApiHandler(
  async (_req, ctx) => {
    const items = await getUpcomingRevisions(ctx.userId as string);
    return NextResponse.json({ items });
  },
  { rateLimit: "read" },
);
