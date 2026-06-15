const BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = init?.body instanceof FormData;
  const headers = isFormData
    ? { ...init?.headers }
    : { "Content-Type": "application/json", ...init?.headers };

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export const api = {
  uploadSyllabus: (file: File, subjectName: string) => {
    const form = new FormData();
    form.append("file", file);
    form.append("subject_name", subjectName);
    return request<{ syllabus_id: number; units: unknown[] }>("/syllabus/upload", {
      method: "POST", body: form,
    });
  },
  getTopics: (id: number) => request<{ topics: unknown[] }>(`/syllabus/${id}/topics`),
  generateNotes: (topicId: number, noteType: "long" | "short" | "revision") =>
    request<{ content: string }>("/notes/generate", {
      method: "POST",
      body: JSON.stringify({ topic_id: topicId, note_type: noteType }),
    }),
  chat: (syllabusId: number, messages: { role: string; content: string }[]) =>
    request<{ reply: string; sources: string[] }>("/chat/", {
      method: "POST",
      body: JSON.stringify({ syllabus_id: syllabusId, messages }),
    }),
};
