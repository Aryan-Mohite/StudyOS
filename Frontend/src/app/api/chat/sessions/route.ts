import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPool, initDb } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

/**
 * GET /api/chat/sessions
 *
 * Returns one row per (topic_id) the current user has chatted about,
 * newest-first, with a preview of the last message — powers the
 * browsable chat-history list page.
 */
export async function GET(_req: NextRequest) {
  await initDb();
  const { userId: user_id } = await auth();
  if (!user_id) {
    return NextResponse.json({ detail: "Not signed in." }, { status: 401 });
  }

  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
       m.topic_id,
       m.topic_name,
       m.subject,
       COUNT(*) AS message_count,
       MAX(m.created_at) AS last_message_at,
       SUBSTRING(
         (SELECT content FROM chat_messages
          WHERE session_id = m.session_id
          ORDER BY created_at DESC, id DESC LIMIT 1),
         1, 140
       ) AS last_message_preview
     FROM chat_messages m
     WHERE m.user_id = ?
     GROUP BY m.topic_id, m.topic_name, m.subject
     ORDER BY last_message_at DESC`,
    [user_id],
  );

  return NextResponse.json({ sessions: rows });
}
