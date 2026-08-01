import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getPool, getReferenceMaterials, initDb, insertReferenceMaterial } from "@/lib/db";
import { ingestReferenceMaterial, AgenticError } from "@/lib/agentic";
import { withApiHandler, ApiContext } from "@/lib/apiHandler";
import type { RowDataPacket } from "mysql2";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB — same limit as syllabus upload

/**
 * Confirms `syllabusId` belongs to `userId` before any read/write against
 * it. Previously this route trusted any client-supplied syllabus_id
 * outright — a signed-in user could list or attach reference material to
 * another user's syllabus by guessing/observing its id. Scoped the same
 * way every other per-user table in this codebase already is.
 */
async function assertOwnsSyllabus(syllabusId: string, userId: string): Promise<boolean> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT 1 FROM syllabi WHERE id = ? AND user_id = ? LIMIT 1`,
    [syllabusId, userId],
  );
  return rows.length > 0;
}

/**
 * GET /api/reference?syllabus_id=...
 *
 * Lists reference files already uploaded for a syllabus (newest first), so
 * the upload page can show what's already there instead of a blank form
 * every visit.
 */
export const GET = withApiHandler(
  async (req: NextRequest, ctx: ApiContext) => {
    await initDb();
    const userId = ctx.userId as string;

    const syllabusId = req.nextUrl.searchParams.get("syllabus_id");
    if (!syllabusId) {
      return NextResponse.json({ detail: "syllabus_id is required." }, { status: 400 });
    }

    if (!(await assertOwnsSyllabus(syllabusId, userId))) {
      return NextResponse.json({ detail: `No syllabus found for syllabus_id "${syllabusId}".` }, { status: 404 });
    }

    const materials = await getReferenceMaterials(syllabusId);
    return NextResponse.json({ materials });
  },
  { rateLimit: "read" },
);

/**
 * POST /api/reference
 *
 * Forwards one uploaded textbook/lecture PDF to the AgenticService for
 * extraction + indexing into that syllabus's reference-material Chroma
 * collection, then records the filename in MySQL so it can be listed back.
 * Optional feature — Notes/MCQ generation already falls back to
 * trained knowledge alone when nothing's been uploaded (see
 * `grounded_in_reference` on generation responses).
 */
export const POST = withApiHandler(
  async (req: NextRequest, ctx: ApiContext) => {
    await initDb();
    const userId = ctx.userId as string;

    const form = await req.formData();
    const file = form.get("file");
    const syllabusId = form.get("syllabus_id");

    if (!syllabusId || typeof syllabusId !== "string") {
      return NextResponse.json({ detail: "syllabus_id is required." }, { status: 400 });
    }

    if (!(await assertOwnsSyllabus(syllabusId, userId))) {
      return NextResponse.json({ detail: `No syllabus found for syllabus_id "${syllabusId}".` }, { status: 404 });
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ detail: "No PDF file provided." }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ detail: "Only PDF files are accepted." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ detail: "File exceeds 10 MB limit." }, { status: 400 });
    }

    try {
      const result = await ingestReferenceMaterial(syllabusId, file);

      const id = randomUUID();
      await insertReferenceMaterial({
        id,
        userId,
        syllabusId,
        filename: result.filename,
        chunksIndexed: result.chunks_indexed,
      });

      return NextResponse.json({ id, ...result });
    } catch (err) {
      if (err instanceof AgenticError) {
        return NextResponse.json({ detail: err.detail }, { status: err.status || 502 });
      }
      const detail = err instanceof Error ? err.message : "Reference material upload failed.";
      return NextResponse.json({ detail }, { status: 502 });
    }
  },
  { rateLimit: "generation" },
);
