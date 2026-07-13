import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPool, initDb, getNotebookIdForSyllabus } from "@/lib/db";
import { generateNotes as callAgenticNotes, AgenticError } from "@/lib/agentic";
import { getStudentContext } from "@/lib/profile";
import type { RowDataPacket } from "mysql2";

// ── POST /api/notes/generate ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  await initDb();

  const body = await req.json();
  const {
    topic_id,
    topic_name,
    subject,
    unit_title,
    syllabus_context = [],
    syllabus_id = "",
    force_regenerate = false,
  } = body ?? {};

  if (!topic_id || !topic_name || !subject || !unit_title) {
    return NextResponse.json(
      { detail: "topic_id, topic_name, subject, and unit_title are required." },
      { status: 400 },
    );
  }

  const pool = getPool();

  // ── Cache check ──────────────────────────────────────────────────────────
  if (!force_regenerate) {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT content_json FROM notes
       WHERE topic_id = ?
       ORDER BY created_at DESC LIMIT 1`,
      [topic_id],
    );
    const row = rows[0];
    if (row) {
      const cached = JSON.parse(row.content_json);
      cached._cached = true;
      return NextResponse.json(cached);
    }
  }

  // ── Delegate to AgenticService ───────────────────────────────────────────
  try {
    const { userId } = await auth();
    const student_context = userId ? await getStudentContext(userId) : undefined;
    const notebook_id = syllabus_id
      ? (await getNotebookIdForSyllabus(syllabus_id)) ?? undefined
      : undefined;

    const notes = await callAgenticNotes({
      topic_id,
      topic_name,
      subject,
      unit_title,
      syllabus_context,
      syllabus_id: syllabus_id || undefined,
      student_context,
      notebook_id,
    });

    await pool.query(
      `INSERT INTO notes (id, syllabus_id, topic_id, topic_name, subject, content_json)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         syllabus_id = VALUES(syllabus_id),
         topic_name = VALUES(topic_name),
         subject = VALUES(subject),
         content_json = VALUES(content_json)`,
      [notes.note_id, syllabus_id, topic_id, topic_name, subject, JSON.stringify(notes)],
    );

    (notes as Record<string, unknown>)._cached = false;
    return NextResponse.json(notes);
  } catch (err) {
    if (err instanceof AgenticError) {
      return NextResponse.json({ detail: err.detail }, { status: err.status || 502 });
    }
    const detail = err instanceof Error ? err.message : "Notes generation failed.";
    return NextResponse.json({ detail }, { status: 502 });
  }
}
