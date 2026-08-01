import { NextRequest, NextResponse } from "next/server";
import { getPool, initDb } from "@/lib/db";
import { generateStudyPlan as callAgenticPlan, AgenticError } from "@/lib/agentic";
import { withApiHandler, ApiContext } from "@/lib/apiHandler";
import { parseBody, planGenerateSchema, ValidationError } from "@/lib/validation";
import type { RowDataPacket } from "mysql2";

// ── POST /api/plan/generate ───────────────────────────────────────────────────
export const POST = withApiHandler(
  async (req: NextRequest, ctx: ApiContext) => {
    await initDb();

    let body;
    try {
      body = await parseBody(req, planGenerateSchema);
    } catch (err) {
      if (err instanceof ValidationError) {
        return NextResponse.json({ detail: err.issues.join("; ") }, { status: 400 });
      }
      throw err;
    }
    const { syllabus_id, exam_date, force_regenerate } = body;

    const pool = getPool();
    const userId = ctx.userId as string; // withApiHandler already enforced auth

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
    // Ownership check: previously this trusted any client-supplied
    // syllabus_id without verifying it belongs to the caller, letting one
    // signed-in user generate a plan off another user's syllabus by guessing
    // or observing an id. Scoped to (id, user_id) now, same as every other
    // per-user read in this codebase.
    const [syllabusRows] = await pool.query<RowDataPacket[]>(
      `SELECT parsed_json FROM syllabi WHERE id = ? AND user_id = ? LIMIT 1`,
      [syllabus_id, userId],
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
  },
  { rateLimit: "generation" },
);
