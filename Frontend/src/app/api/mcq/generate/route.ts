import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPool, initDb } from "@/lib/db";
import { getStudentContext } from "@/lib/profile";
import { generateMCQ as callAgenticMCQ, AgenticError } from "@/lib/agentic";
import type { RowDataPacket } from "mysql2";

const VALID_DIFFICULTIES = new Set(["easy", "medium", "hard", "mixed"]);

// ── POST /api/mcq/generate ────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  await initDb();

  const body = await req.json();
  const {
    topic_id,
    topic_name,
    subject,
    count = 10,
    difficulty = "mixed",
    syllabus_context = [],
    syllabus_id = "",
    force_regenerate = false,
  } = body ?? {};

  if (!topic_id || !topic_name || !subject) {
    return NextResponse.json(
      { detail: "topic_id, topic_name, and subject are required." },
      { status: 400 },
    );
  }

  if (!VALID_DIFFICULTIES.has(difficulty)) {
    return NextResponse.json(
      { detail: `difficulty must be one of: ${[...VALID_DIFFICULTIES].join(", ")}` },
      { status: 400 },
    );
  }

  const safeCount = Math.max(1, Math.min(Number(count) || 10, 20));
  const pool = getPool();

  // ── Cache check ──────────────────────────────────────────────────────────
  if (!force_regenerate) {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT content_json FROM mcq_sets
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

    const mcqSet = await callAgenticMCQ({
      topic_id,
      topic_name,
      subject,
      count: safeCount,
      difficulty,
      syllabus_context,
      syllabus_id: syllabus_id || undefined,
      student_context,
    });

    await pool.query(
      `INSERT INTO mcq_sets
         (id, syllabus_id, topic_id, topic_name, subject, difficulty, content_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         syllabus_id = VALUES(syllabus_id),
         topic_name = VALUES(topic_name),
         subject = VALUES(subject),
         difficulty = VALUES(difficulty),
         content_json = VALUES(content_json)`,
      [
        mcqSet.mcq_set_id,
        syllabus_id,
        topic_id,
        topic_name,
        subject,
        difficulty,
        JSON.stringify(mcqSet),
      ],
    );

    (mcqSet as Record<string, unknown>)._cached = false;
    return NextResponse.json(mcqSet);
  } catch (err) {
    if (err instanceof AgenticError) {
      return NextResponse.json({ detail: err.detail }, { status: err.status || 502 });
    }
    const detail = err instanceof Error ? err.message : "MCQ generation failed.";
    return NextResponse.json({ detail }, { status: 502 });
  }
}
