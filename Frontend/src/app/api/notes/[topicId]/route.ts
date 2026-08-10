import { NextRequest, NextResponse } from "next/server";
import { getPool, initDb, syllabusBelongsToUser } from "@/lib/db";
import { withApiHandler, ApiContext } from "@/lib/apiHandler";
import type { RowDataPacket } from "mysql2";

type RouteParams = { params: Promise<{ topicId: string }> };

/**
 * Ownership guard shared by GET/DELETE below.
 *
 * BUG FIX (see CHANGES-BUGFIXES.md): these routes used to look up/delete
 * notes by topic_id alone. topic_id is a UUID (effectively unguessable in
 * practice), but that's not the same as an ownership check — anyone who
 * obtained another student's topic_id (a leaked link, a shared screenshot,
 * browser history sync, a referrer header) could read or delete that
 * student's notes with no verification at all. Every other syllabus-scoped
 * route in this project verifies `syllabus_id` belongs to the caller before
 * trusting a client-supplied id (see lib/db.ts's syllabusBelongsToUser doc
 * comment) — these two routes were the gap.
 *
 * Requires syllabus_id as a query param now. Returns a NextResponse to
 * short-circuit with (404/400) if the check fails, or null if it passed.
 */
async function requireSyllabusOwnership(req: NextRequest, userId: string): Promise<NextResponse | null> {
  const syllabusId = req.nextUrl.searchParams.get("syllabus_id");
  if (!syllabusId) {
    return NextResponse.json({ detail: "syllabus_id is required." }, { status: 400 });
  }
  if (!(await syllabusBelongsToUser(syllabusId, userId))) {
    // Same 404 (not 403) as every other ownership check in this codebase —
    // doesn't confirm to the caller whether the syllabus_id exists at all.
    return NextResponse.json({ detail: "Notes not found for this topic." }, { status: 404 });
  }
  return null;
}

// ── GET /api/notes/:topicId?syllabus_id=... ─────────────────────────────────
export const GET = withApiHandler<RouteParams>(
  async (req, ctx: ApiContext, { params }) => {
    await initDb();
    const { topicId } = await params;

    const denied = await requireSyllabusOwnership(req, ctx.userId as string);
    if (denied) return denied;

    const syllabusId = req.nextUrl.searchParams.get("syllabus_id");
    const pool = getPool();

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT content_json FROM notes
       WHERE topic_id = ? AND syllabus_id = ?
       ORDER BY created_at DESC LIMIT 1`,
      [topicId, syllabusId],
    );

    const row = rows[0];
    if (!row) {
      return NextResponse.json({ detail: "Notes not found for this topic." }, { status: 404 });
    }
    return NextResponse.json(JSON.parse(row.content_json));
  },
  { rateLimit: "read" },
);

// ── DELETE /api/notes/:topicId?syllabus_id=... ──────────────────────────────
export const DELETE = withApiHandler<RouteParams>(
  async (req, ctx: ApiContext, { params }) => {
    await initDb();
    const { topicId } = await params;

    const denied = await requireSyllabusOwnership(req, ctx.userId as string);
    if (denied) return denied;

    const syllabusId = req.nextUrl.searchParams.get("syllabus_id");
    const pool = getPool();

    await pool.query(`DELETE FROM notes WHERE topic_id = ? AND syllabus_id = ?`, [topicId, syllabusId]);
    return NextResponse.json({ deleted: true, topic_id: topicId });
  },
  { rateLimit: "write" },
);
