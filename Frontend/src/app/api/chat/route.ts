import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { tutorChat as callAgenticTutor, AgenticError } from "@/lib/agentic";
import { getNotebookIdForSyllabus, getPool, initDb } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

/**
 * GET /api/chat?topic_id=...
 *
 * Returns the persisted message history for the current user's session on
 * this topic, oldest first — used by ChatPanel to resume a conversation
 * instead of starting blank.
 */
export async function GET(req: NextRequest) {
  await initDb();
  const { userId: user_id } = await auth();
  if (!user_id) {
    return NextResponse.json({ detail: "Not signed in." }, { status: 401 });
  }

  const topic_id = req.nextUrl.searchParams.get("topic_id");
  if (!topic_id) {
    return NextResponse.json({ detail: "topic_id is required." }, { status: 400 });
  }

  const session_id = `${user_id}:${topic_id}`;
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT role, content, out_of_scope, created_at FROM chat_messages
     WHERE session_id = ? ORDER BY created_at ASC, id ASC`,
    [session_id],
  );

  return NextResponse.json({
    session_id,
    messages: rows.map((r) => ({
      role: r.role,
      content: r.content,
      isOutOfScope: !!r.out_of_scope,
    })),
  });
}

/**
 * POST /api/chat
 *
 * Forwards a single tutor-chat turn to the AgenticService. Conversation
 * memory for the *live* turn is handled server-side by the AgenticService's
 * LangGraph checkpointer, keyed by `session_id` (stable per user+topic
 * conversation) — but that checkpointer is in-process and doesn't survive a
 * restart or power a "past conversations" UI, so every turn is also
 * persisted to `chat_messages` here for durable, browsable history.
 *
 * `syllabus_id`, when provided, is resolved to its notebook so RAG
 * retrieval only pulls notes generated for that subject — without it,
 * retrieval falls back to the legacy global collection.
 */
export async function POST(req: NextRequest) {
  await initDb();
  const { userId: user_id } = await auth();
  if (!user_id) {
    return NextResponse.json({ detail: "Not signed in." }, { status: 401 });
  }

  const body = await req.json();
  const {
    question,
    topic_id,
    topic_name,
    subject,
    syllabus_context = [],
    syllabus_id,
  } = body ?? {};

  if (!question || !topic_id || !topic_name || !subject) {
    return NextResponse.json(
      { detail: "question, topic_id, topic_name, and subject are required." },
      { status: 400 },
    );
  }

  const session_id = `${user_id}:${topic_id}`;
  const pool = getPool();

  try {
    const notebook_id = syllabus_id
      ? (await getNotebookIdForSyllabus(syllabus_id)) ?? undefined
      : undefined;

    const response = await callAgenticTutor({
      session_id,
      question,
      topic_id,
      topic_name,
      subject,
      syllabus_context,
      notebook_id,
    });

    // Persist both turns. Best-effort: a persistence failure shouldn't cost
    // the student the answer they already got back from the LLM.
    try {
      await pool.query(
        `INSERT INTO chat_messages (session_id, user_id, topic_id, topic_name, subject, role, content, out_of_scope)
         VALUES (?, ?, ?, ?, ?, 'user', ?, FALSE),
                (?, ?, ?, ?, ?, 'assistant', ?, ?)`,
        [
          session_id, user_id, topic_id, topic_name, subject, question,
          session_id, user_id, topic_id, topic_name, subject, response.answer, !!response.out_of_scope,
        ],
      );
    } catch (persistErr) {
      console.error("chat_messages persistence failed:", persistErr);
    }

    return NextResponse.json(response);
  } catch (err) {
    if (err instanceof AgenticError) {
      return NextResponse.json({ detail: err.detail }, { status: err.status || 502 });
    }
    const detail = err instanceof Error ? err.message : "Tutor response failed.";
    return NextResponse.json({ detail }, { status: 502 });
  }
}
