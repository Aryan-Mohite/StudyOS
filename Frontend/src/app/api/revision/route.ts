import { NextRequest, NextResponse } from "next/server";
import { getUpcomingRevisions, syllabusBelongsToUser } from "@/lib/db";
import { withApiHandler } from "@/lib/apiHandler";

// ── GET /api/revision?syllabus_id=... ───────────────────────────────────────
// Topics due for spaced-repetition revision in the next 7 days (overdue
// first), scoped to one syllabus.
export const GET = withApiHandler(
  async (req: NextRequest, ctx) => {
    const userId = ctx.userId as string;
    const syllabusId = req.nextUrl.searchParams.get("syllabus_id");
    if (!syllabusId) {
      return NextResponse.json({ detail: "syllabus_id is required." }, { status: 400 });
    }
    if (!(await syllabusBelongsToUser(syllabusId, userId))) {
      return NextResponse.json({ detail: "Syllabus not found." }, { status: 404 });
    }

    const items = await getUpcomingRevisions(userId, syllabusId);
    return NextResponse.json({ items });
  },
  { rateLimit: "read" },
);
