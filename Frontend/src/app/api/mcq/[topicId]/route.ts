import { NextRequest, NextResponse } from "next/server";
import { getPool, initDb, syllabusBelongsToUser } from "@/lib/db";
import { withApiHandler, ApiContext } from "@/lib/apiHandler";
import type { RowDataPacket } from "mysql2";

type RouteParams = { params: Promise<{ topicId: string }> };

// See app/api/notes/[topicId]/route.ts's requireSyllabusOwnership doc comment
// for why this check exists — same bug, same fix, mirrored for mcq_sets.
async function requireSyllabusOwnership(req: NextRequest, userId: string): Promise<NextResponse | null> {
  const syllabusId = req.nextUrl.searchParams.get("syllabus_id");
  if (!syllabusId) {
    return NextResponse.json({ detail: "syllabus_id is required." }, { status: 400 });
  }
  if (!(await syllabusBelongsToUser(syllabusId, userId))) {
    return NextResponse.json({ detail: "MCQ set not found for this topic." }, { status: 404 });
  }
  return null;
}

// ── GET /api/mcq/:topicId?syllabus_id=... ────────────────────────────────────
export const GET = withApiHandler<RouteParams>(
  async (req, ctx: ApiContext, { params }) => {
    await initDb();
    const { topicId } = await params;

    const denied = await requireSyllabusOwnership(req, ctx.userId as string);
    if (denied) return denied;

    const syllabusId = req.nextUrl.searchParams.get("syllabus_id");
    const pool = getPool();

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT content_json FROM mcq_sets
       WHERE topic_id = ? AND syllabus_id = ?
       ORDER BY created_at DESC LIMIT 1`,
      [topicId, syllabusId],
    );

    const row = rows[0];
    if (!row) {
      return NextResponse.json({ detail: "MCQ set not found for this topic." }, { status: 404 });
    }
    return NextResponse.json(JSON.parse(row.content_json));
  },
  { rateLimit: "read" },
);

// ── DELETE /api/mcq/:topicId?syllabus_id=... ─────────────────────────────────
export const DELETE = withApiHandler<RouteParams>(
  async (req, ctx: ApiContext, { params }) => {
    await initDb();
    const { topicId } = await params;

    const denied = await requireSyllabusOwnership(req, ctx.userId as string);
    if (denied) return denied;

    const syllabusId = req.nextUrl.searchParams.get("syllabus_id");
    const pool = getPool();

    await pool.query(`DELETE FROM mcq_sets WHERE topic_id = ? AND syllabus_id = ?`, [topicId, syllabusId]);
    return NextResponse.json({ deleted: true, topic_id: topicId });
  },
  { rateLimit: "write" },
);
