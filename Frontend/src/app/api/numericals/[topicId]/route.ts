import { NextRequest, NextResponse } from "next/server";
import { getPool, initDb } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

// ── GET /api/numericals/:topicId ──────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ topicId: string }> },
) {
  await initDb();
  const { topicId } = await params;
  const pool = getPool();

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT content_json FROM numerical_sets
     WHERE topic_id = ?
     ORDER BY created_at DESC LIMIT 1`,
    [topicId],
  );

  const row = rows[0];
  if (!row) {
    return NextResponse.json({ detail: "Numericals not found for this topic." }, { status: 404 });
  }
  return NextResponse.json(JSON.parse(row.content_json));
}

// ── DELETE /api/numericals/:topicId ───────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ topicId: string }> },
) {
  await initDb();
  const { topicId } = await params;
  const pool = getPool();

  await pool.query(`DELETE FROM numerical_sets WHERE topic_id = ?`, [topicId]);
  return NextResponse.json({ deleted: true, topic_id: topicId });
}
