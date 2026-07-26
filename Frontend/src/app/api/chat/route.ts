import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { tutorChat as callAgenticTutor, AgenticError } from "@/lib/agentic";
import {
  getCachedFaqAnswer,
  getNotebookIdForSyllabus,
  getPool,
  initDb,
  normalizeQuestion,
  upsertFaqCache,
} from "@/lib/db";
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
    `SELECT role, content, out_of_scope, sources_json, created_at FROM chat_messages
     WHERE session_id = ? ORDER BY created_at ASC, id ASC`,
    [session_id],
  );

  return NextResponse.json({
    session_id,
    messages: rows.map((r) => ({
      role: r.role,
      content: r.content,
      isOutOfScope: !!r.out_of_scope,
      sources: parseSourcesJson(r.sources_json),
    })),
  });
}

function parseSourcesJson(raw: unknown): unknown[] {
  if (typeof raw !== "string" || !raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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
 * retrieval falls back to the legacy global collection. It's also passed
 * through as-is to the AgenticService so Tutor Chat can additionally
 * ground answers in student-uploaded reference material, not just
 * generated notes.
 *
 * FAQ cache: on the *first* turn of a session (no prior chat_messages for
 * this session_id), the question is fuzzy-normalized and checked against
 * `chat_faq_cache` before calling the LLM. A hit skips the AgenticService
 * call entirely and returns the stored response with `_cached: true`. This
 * is deliberately restricted to fresh sessions — reusing a cached answer
 * mid-conversation would ignore the student's actual chat history, and the
 * AgenticService's LangGraph checkpointer is also empty at that point, so
 * skipping the call there doesn't create any chat_history drift. Cache
 * misses on a first turn still populate the cache after a real answer
 * comes back, so the next student asking the same question gets it instantly.
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
    const [priorRows] = await pool.query<RowDataPacket[]>(
      `SELECT 1 FROM chat_messages WHERE session_id = ? LIMIT 1`,
      [session_id],
    );
    const isFirstTurn = priorRows.length === 0;
    const questionNormalized = normalizeQuestion(question);

    let response: Record<string, unknown> | null = null;

    if (isFirstTurn) {
      const cached = await getCachedFaqAnswer(topic_id, questionNormalized);
      if (cached) {
        response = { ...cached, _cached: true };
      }
    }

    if (!response) {
      const notebook_id = syllabus_id
        ? (await getNotebookIdForSyllabus(syllabus_id)) ?? undefined
        : undefined;

      response = await callAgenticTutor({
        session_id,
        question,
        topic_id,
        topic_name,
        subject,
        syllabus_context,
        notebook_id,
        syllabus_id,
      });

      if (isFirstTurn) {
        upsertFaqCache({
          topicId: topic_id,
          questionNormalized,
          questionOriginal: question,
          response,
        }).catch((err) => console.error("chat_faq_cache upsert failed:", err));
      }
    }

    // Persist both turns. Best-effort: a persistence failure shouldn't cost
    // the student the answer they already got back from the LLM.
    try {
      await pool.query(
        `INSERT INTO chat_messages (session_id, user_id, topic_id, topic_name, subject, role, content, out_of_scope, sources_json)
         VALUES (?, ?, ?, ?, ?, 'user', ?, FALSE, NULL),
                (?, ?, ?, ?, ?, 'assistant', ?, ?, ?)`,
        [
          session_id, user_id, topic_id, topic_name, subject, question,
          session_id, user_id, topic_id, topic_name, subject, response.answer, !!response.out_of_scope,
          JSON.stringify(response.sources ?? []),
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
