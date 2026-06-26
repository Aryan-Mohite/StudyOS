import { NextRequest, NextResponse } from "next/server";
import { getPool, initDb } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

// ── GET /api/upload/latest ────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  await initDb();

  const userId = req.nextUrl.searchParams.get("user_id") ?? "dev-user-01";
  const pool = getPool();

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT parsed_json FROM syllabi
     WHERE user_id = ?
     ORDER BY created_at DESC LIMIT 1`,
    [userId],
  );

  const row = rows[0];
  if (!row) {
    return NextResponse.json(
      { detail: "No syllabus found for this user." },
      { status: 404 },
    );
  }

  return NextResponse.json(JSON.parse(row.parsed_json));
}
