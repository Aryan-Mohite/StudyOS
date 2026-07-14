/**
 * StudyOS — AgenticService client
 *
 * Replaces the axios calls that used to live in Backend-Express/src/routes/*.js.
 * Used only inside Next.js Route Handlers (server-side) — never imported into
 * client components, since AGENTIC_SERVICE_URL is an internal-only address.
 *
 * Configure via AGENTIC_SERVICE_URL in .env.local, e.g.:
 *   AGENTIC_SERVICE_URL=https://studyos-agentic.up.railway.app   (prod)
 *   AGENTIC_SERVICE_URL=http://localhost:8000                    (dev)
 */

const AGENTIC = process.env.AGENTIC_SERVICE_URL ?? "http://localhost:8000";

export class AgenticError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(detail);
    this.name = "AgenticError";
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `AgenticService HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // ignore — keep default detail
    }
    throw new AgenticError(res.status, detail);
  }
  return res.json() as Promise<T>;
}

/** Forwards a raw PDF file to /agent/parse-syllabus. */
export async function parseSyllabus(file: File): Promise<unknown> {
  const form = new FormData();
  form.append("file", file, file.name);
  form.append("filename", file.name);

  const res = await fetch(`${AGENTIC}/agent/parse-syllabus`, {
    method: "POST",
    body: form,
    // 210s budget: covers the OCR fallback path (several seconds/page for
    // scanned PDFs, up to 40 pages) plus the LLM parse call.
    signal: AbortSignal.timeout(210_000),
  });
  return handle(res);
}

export interface GenerateNotesPayload {
  topic_id: string;
  topic_name: string;
  subject: string;
  unit_title: string;
  syllabus_context: string[];
  syllabus_id?: string;
  student_context?: string;
  notebook_id?: string;
}

export async function generateNotes(
  payload: GenerateNotesPayload,
): Promise<{ note_id: string; [key: string]: unknown }> {
  const res = await fetch(`${AGENTIC}/agent/generate-notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(90_000),
  });
  return handle(res);
}

export interface GenerateMCQPayload {
  topic_id: string;
  topic_name: string;
  subject: string;
  count: number;
  difficulty: string;
  syllabus_context: string[];
  syllabus_id?: string;
  student_context?: string;
}

export async function generateMCQ(
  payload: GenerateMCQPayload,
): Promise<{ mcq_set_id: string; [key: string]: unknown }> {
  const res = await fetch(`${AGENTIC}/agent/generate-mcq`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(90_000),
  });
  return handle(res);
}

export interface GenerateNumericalsPayload {
  topic_id: string;
  topic_name: string;
  subject: string;
  count: number;
  difficulty: string;
  syllabus_context: string[];
  syllabus_id?: string;
  student_context?: string;
}

export async function generateNumericals(
  payload: GenerateNumericalsPayload,
): Promise<{ numerical_set_id: string; [key: string]: unknown }> {
  const res = await fetch(`${AGENTIC}/agent/generate-numericals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    // Numericals can take longer than notes/MCQ — worked steps for each problem.
    signal: AbortSignal.timeout(105_000),
  });
  return handle(res);
}

export interface GenerateStudyPlanPayload {
  syllabus_id: string;
  syllabus: unknown; // full parsed syllabus contract
  exam_date: string; // YYYY-MM-DD
}

export async function generateStudyPlan(
  payload: GenerateStudyPlanPayload,
): Promise<{ study_plan_id: string; [key: string]: unknown }> {
  const res = await fetch(`${AGENTIC}/agent/generate-study-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    // Plans can span many days/topics — allow more budget than MCQ/Numericals.
    signal: AbortSignal.timeout(120_000),
  });
  return handle(res);
}

export interface TutorChatPayload {
  session_id: string;
  question: string;
  topic_id: string;
  topic_name: string;
  subject: string;
  syllabus_context: string[];
  notebook_id?: string;
}

export async function tutorChat(
  payload: TutorChatPayload,
): Promise<{ message_id: string; [key: string]: unknown }> {
  const res = await fetch(`${AGENTIC}/agent/tutor-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(75_000),
  });
  return handle(res);
}