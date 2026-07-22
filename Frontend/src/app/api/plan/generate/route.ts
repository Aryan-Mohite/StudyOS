import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPool, initDb } from "@/lib/db";
import { generateStudyPlan as callAgenticPlan, AgenticError } from "@/lib/agentic";
import type { RowDataPacket } from "mysql2";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ── POST /api/plan/generate ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  await initDb();

  const body = await req.json();
  const {
    syllabus_id,
    exam_date,
    force_regenerate = false,
  } = body ?? {};

  if (!syllabus_id || !exam_date) {
    return NextResponse.json(
      { detail: "syllabus_id and exam_date are required." },
      { status: 400 },
    );
  }

  if (!DATE_RE.test(exam_date)) {
    return NextResponse.json(
      { detail: "exam_date must be in YYYY-MM-DD format." },
      { status: 400 },
    );
  }

  const pool = getPool();
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ detail: "Not signed in." }, { status: 401 });
  }

  // ── Cache check — a plan is keyed on (user, syllabus, exam date); a new
  // exam date invalidates the previous plan rather than reusing it. ──────────
  if (!force_regenerate) {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT content_json FROM study_plans
       WHERE user_id = ? AND syllabus_id = ? AND exam_date = ?
       ORDER BY created_at DESC LIMIT 1`,
      [userId, syllabus_id, exam_date],
    );
    const row = rows[0];
    if (row) {
      const cached = JSON.parse(row.content_json);
      cached._cached = true;
      return NextResponse.json(cached);
    }
  }

  // ── Fetch the syllabus this plan is built from ──────────────────────────
  const [syllabusRows] = await pool.query<RowDataPacket[]>(
    `SELECT parsed_json FROM syllabi WHERE id = ? LIMIT 1`,
    [syllabus_id],
  );
  const syllabusRow = syllabusRows[0];
  if (!syllabusRow) {
    return NextResponse.json(
      { detail: `No syllabus found for syllabus_id "${syllabus_id}".` },
      { status: 404 },
    );
  }
  const syllabus = JSON.parse(syllabusRow.parsed_json);

  // ── Delegate to AgenticService ───────────────────────────────────────────
  try {
    const plan = await callAgenticPlan({ syllabus_id, syllabus, exam_date });

    await pool.query(
      `INSERT INTO study_plans (id, user_id, syllabus_id, exam_date, content_json)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         content_json = VALUES(content_json)`,
      [plan.study_plan_id, userId, syllabus_id, exam_date, JSON.stringify(plan)],
    );

    (plan as Record<string, unknown>)._cached = false;
    return NextResponse.json(plan);
  } catch (err) {
    if (err instanceof AgenticError) {
      return NextResponse.json({ detail: err.detail }, { status: err.status || 502 });
    }
    const detail = err instanceof Error ? err.message : "Study plan generation failed.";
    return NextResponse.json({ detail }, { status: 502 });
  }
}
