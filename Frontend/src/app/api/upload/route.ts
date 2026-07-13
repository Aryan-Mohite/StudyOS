import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { auth } from "@clerk/nextjs/server";
import { getPool, initDb } from "@/lib/db";
import { parseSyllabus, AgenticError } from "@/lib/agentic";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB — same limit as the old multer config

// ── POST /api/upload ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  await initDb();

  const { userId: clerkUserId } = await auth();
  const form = await req.formData();
  const file = form.get("file");
  // Prefer the authenticated Clerk user; fall back to the form field (or
  // dev-user-01) only if this route is ever hit outside Clerk middleware.
  const userId = clerkUserId ?? (form.get("user_id") as string) ?? "dev-user-01";

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
    // Forward raw bytes to Python AgenticService for parsing
    const parsed = (await parseSyllabus(file)) as {
      syllabus_id: string;
      [key: string]: unknown;
    };

    // Cache in MySQL — every syllabus upload auto-creates its own notebook,
    // the container that reference-PDF uploads and RAG namespacing will
    // attach to. No explicit "create notebook" step needed (see product
    // decision: auto-create).
    const pool = getPool();

    const parsedTyped = parsed as { subjects?: Array<{ name?: string }> };
    const subjectName = parsedTyped.subjects?.[0]?.name ?? file.name.replace(/\.pdf$/i, "");
    const notebookId = randomUUID();

    await pool.query(
      `INSERT INTO notebooks (id, user_id, subject_name) VALUES (?, ?, ?)`,
      [notebookId, userId, subjectName],
    );

    await pool.query(
      `INSERT INTO syllabi (id, user_id, notebook_id, filename, parsed_json)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         user_id = VALUES(user_id),
         notebook_id = VALUES(notebook_id),
         filename = VALUES(filename),
         parsed_json = VALUES(parsed_json)`,
      [parsed.syllabus_id, userId, notebookId, file.name, JSON.stringify(parsed)],
    );

    return NextResponse.json({ ...parsed, notebook_id: notebookId });
  } catch (err) {
    if (err instanceof AgenticError) {
      return NextResponse.json({ detail: err.detail }, { status: err.status || 502 });
    }
    // TEMP DEBUG: "fetch failed" hides the real cause (ECONNREFUSED, proxy
    // interference, DNS, etc.) inside err.cause. Log it to find the real issue.
    console.error("Upload failed — full error:", err);
    if (err instanceof Error && "cause" in err) {
      console.error("Upload failed — cause:", err.cause);
    }
    const detail = err instanceof Error ? err.message : "Syllabus parsing failed.";
    return NextResponse.json({ detail }, { status: 502 });
  }
}