import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPool, initDb } from "@/lib/db";
import { getProfile } from "@/lib/profile";

// ── GET /api/profile ────────────────────────────────────────────────────────
export async function GET() {
  await initDb();

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ detail: "Not signed in." }, { status: 401 });
  }

  const profile = await getProfile(userId);
  if (!profile) {
    return NextResponse.json({ exists: false, profile: null });
  }

  return NextResponse.json({ exists: true, profile });
}

// ── POST /api/profile (create or update) ────────────────────────────────────
export async function POST(req: NextRequest) {
  await initDb();

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ detail: "Not signed in." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { name, education_level, course, university } = body ?? {};

  if (
    typeof name !== "string" ||
    typeof education_level !== "string" ||
    typeof course !== "string" ||
    typeof university !== "string"
  ) {
    return NextResponse.json(
      { detail: "name, education_level, course, and university must all be provided as strings." },
      { status: 400 },
    );
  }

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
}
