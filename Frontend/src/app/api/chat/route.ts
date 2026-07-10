import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { tutorChat as callAgenticTutor, AgenticError } from "@/lib/agentic";

/**
 * POST /api/chat
 *
 * Forwards a single tutor-chat turn to the AgenticService. No MySQL caching
 * here by design — each answer is generated fresh — conversation memory is
 * handled server-side by the AgenticService's LangGraph checkpointer, keyed
 * by `session_id` (stable per user+topic conversation).
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
    const response = await callAgenticTutor({
      session_id,
      question,
      topic_id,
      topic_name,
      subject,
      syllabus_context,
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
