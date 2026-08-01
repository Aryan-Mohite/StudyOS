import { NextRequest, NextResponse } from "next/server";
import { getPool, initDb } from "@/lib/db";
import { getProfile } from "@/lib/profile";
import { withApiHandler, ApiContext } from "@/lib/apiHandler";
import { parseBody, profileUpdateSchema, ValidationError } from "@/lib/validation";

// ── GET /api/profile ────────────────────────────────────────────────────────
export const GET = withApiHandler(
  async (_req: NextRequest, ctx: ApiContext) => {
    await initDb();
    const userId = ctx.userId as string;

    const profile = await getProfile(userId);
    if (!profile) {
      return NextResponse.json({ exists: false, profile: null });
    }

    return NextResponse.json({ exists: true, profile });
  },
  { rateLimit: "read" },
);

// ── POST /api/profile (create or update) ────────────────────────────────────
export const POST = withApiHandler(
  async (req: NextRequest, ctx: ApiContext) => {
    await initDb();
    const userId = ctx.userId as string;

    let body;
    try {
      body = await parseBody(req, profileUpdateSchema);
    } catch (err) {
      if (err instanceof ValidationError) {
        return NextResponse.json({ detail: err.issues.join("; ") }, { status: 400 });
      }
      throw err;
    }
    const { name, education_level, course, university } = body;

    const pool = getPool();
    await pool.query(
      `INSERT INTO user_profile (user_id, name, education_level, course, university)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         education_level = VALUES(education_level),
         course = VALUES(course),
         university = VALUES(university)`,
      [userId, name.trim(), education_level.trim(), course.trim(), university.trim()],
    );

    const profile = await getProfile(userId);
    return NextResponse.json({ success: true, profile });
  },
  { rateLimit: "write" },
);
