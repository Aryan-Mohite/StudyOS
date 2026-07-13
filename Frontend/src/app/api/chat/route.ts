import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { tutorChat as callAgenticTutor, AgenticError } from "@/lib/agentic";
import { getNotebookIdForSyllabus } from "@/lib/db";

/**
 * POST /api/chat
 *
 * Forwards a single tutor-chat turn to the AgenticService. No MySQL caching
 * here by design — each answer is generated fresh — conversation memory is
 * handled server-side by the AgenticService's LangGraph checkpointer, keyed
 * by `session_id` (stable per user+topic conversation).
 *
 * `syllabus_id`, when provided, is resolved to its notebook so RAG
 * retrieval only pulls notes generated for that subject — without it,
 * retrieval falls back to the legacy global collection.
 */
export async function POST(req: NextRequest) {
  const { userId: clerkUserId } = await auth();
  const body = await req.json();
  const {
    question,
    topic_id,
    topic_name,
    subject,
    syllabus_context = [],
    syllabus_id,
    user_id: bodyUserId = "dev-user-01",
  } = body ?? {};
  const user_id = clerkUserId ?? bodyUserId;

  if (!question || !topic_id || !topic_name || !subject) {
    return NextResponse.json(
      { detail: "question, topic_id, topic_name, and subject are required." },
      { status: 400 },
    );
  }

  const session_id = `${user_id}:${topic_id}`;

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
    return NextResponse.json(response);
  } catch (err) {
    if (err instanceof AgenticError) {
      return NextResponse.json({ detail: err.detail }, { status: err.status || 502 });
    }
    const detail = err instanceof Error ? err.message : "Tutor response failed.";
    return NextResponse.json({ detail }, { status: 502 });
  }
}
