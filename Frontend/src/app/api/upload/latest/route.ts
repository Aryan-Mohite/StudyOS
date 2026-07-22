import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPool, initDb } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

// ── GET /api/upload/latest ────────────────────────────────────────────────────
export async function GET(_req: NextRequest) {
  await initDb();

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ detail: "Not signed in." }, { status: 401 });
  }
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
