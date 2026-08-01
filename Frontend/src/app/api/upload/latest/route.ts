import { NextResponse } from "next/server";
import { getPool, initDb } from "@/lib/db";
import { withApiHandler } from "@/lib/apiHandler";
import type { RowDataPacket } from "mysql2";

// ── GET /api/upload/latest ────────────────────────────────────────────────────
export const GET = withApiHandler(
  async (_req, ctx) => {
    await initDb();
    const userId = ctx.userId as string;
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
  },
  { rateLimit: "read" },
);
