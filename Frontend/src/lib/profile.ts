/**
 * StudyOS — Profile helper
 *
 * Server-side only (used from Route Handlers). Fetches the signed-in user's
 * profile and derives the `student_context` string forwarded to
 * AgenticService so generation can be calibrated to course/year — purely
 * additive, generation works identically when no profile exists.
 */

import { getPool, initDb } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export interface UserProfile {
  user_id: string;
  name: string | null;
  education_level: string | null;
  course: string | null;
  university: string | null;
  completed: boolean;
}

function deriveCompleted(row: {
  name: string | null;
  education_level: string | null;
  course: string | null;
  university: string | null;
}): boolean {
  return Boolean(row.name && row.education_level && row.course && row.university);
}

/** Returns null if the user has never saved a profile. */
export async function getProfile(userId: string): Promise<UserProfile | null> {
  await initDb();
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT user_id, name, education_level, course, university
     FROM user_profile WHERE user_id = ? LIMIT 1`,
    [userId],
  );
  const row = rows[0];
  if (!row) return null;

  return {
    user_id: row.user_id,
    name: row.name,
    education_level: row.education_level,
    course: row.course,
    university: row.university,
    completed: deriveCompleted(row as UserProfile),
  };
}

/**
 * Builds the one-line context string sent to AgenticService as
 * `student_context`, e.g. "B.Tech 2nd Year, CS, SPPU".
 * Returns undefined when the profile is missing or incomplete — callers
 * should omit the field entirely rather than send a partial string.
 */
export async function getStudentContext(userId: string): Promise<string | undefined> {
  const profile = await getProfile(userId);
  if (!profile || !profile.completed) return undefined;
  return `${profile.education_level}, ${profile.course}, ${profile.university}`;
}
