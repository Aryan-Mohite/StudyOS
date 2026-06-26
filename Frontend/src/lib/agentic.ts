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
    // 60s budget for PDF parsing + Claude call
    signal: AbortSignal.timeout(60_000),
  });
  return handle(res);
}

export interface GenerateNotesPayload {
  topic_id: string;
  topic_name: string;
  subject: string;
  unit_title: string;
  syllabus_context: string[];
}

export async function generateNotes(
  payload: GenerateNotesPayload,
): Promise<{ note_id: string; [key: string]: unknown }> {
  const res = await fetch(`${AGENTIC}/agent/generate-notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60_000),
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
}

export async function generateMCQ(
  payload: GenerateMCQPayload,
): Promise<{ mcq_set_id: string; [key: string]: unknown }> {
  const res = await fetch(`${AGENTIC}/agent/generate-mcq`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60_000),
  });
  return handle(res);
}
