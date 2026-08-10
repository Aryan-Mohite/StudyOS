import { NextRequest, NextResponse } from "next/server";
import { getPool, initDb, syllabusBelongsToUser } from "@/lib/db";
import { getStudentContext } from "@/lib/profile";
import { generateMCQ as callAgenticMCQ, AgenticError } from "@/lib/agentic";
import { withApiHandler, ApiContext } from "@/lib/apiHandler";
import { parseBody, mcqGenerateSchema, ValidationError } from "@/lib/validation";
import type { RowDataPacket } from "mysql2";

// ── POST /api/mcq/generate ────────────────────────────────────────────────────
export const POST = withApiHandler(
  async (req: NextRequest, ctx: ApiContext) => {
    await initDb();

    let body;
    try {
      body = await parseBody(req, mcqGenerateSchema);
    } catch (err) {
      if (err instanceof ValidationError) {
        return NextResponse.json({ detail: err.issues.join("; ") }, { status: 400 });
      }
      throw err;
    }
    const { topic_id, topic_name, subject, count, difficulty, syllabus_context, syllabus_id, force_regenerate } = body;

    // BUG FIX (see CHANGES-BUGFIXES.md): syllabus_id is client-supplied and
    // feeds AgenticService's RAG grounding — a caller could previously pass
    // *any* syllabus_id here and have MCQs generated grounded in another
    // student's uploaded reference material. Verify ownership before using
    // it for anything, same as every other route that accepts a syllabus_id.
    if (syllabus_id && !(await syllabusBelongsToUser(syllabus_id, ctx.userId as string))) {
      return NextResponse.json({ detail: "Syllabus not found." }, { status: 404 });
    }

    const pool = getPool();

    // ── Cache check ──────────────────────────────────────────────────────────
    if (!force_regenerate) {
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT content_json FROM mcq_sets
         WHERE topic_id = ? AND syllabus_id = ?
         ORDER BY created_at DESC LIMIT 1`,
        [topic_id, syllabus_id],
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
      const student_context = ctx.userId ? await getStudentContext(ctx.userId) : undefined;

      const mcqSet = await callAgenticMCQ({
        topic_id,
        topic_name,
        subject,
        count,
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
  },
  { rateLimit: "generation" },
);
