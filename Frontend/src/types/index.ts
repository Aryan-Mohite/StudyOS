export interface Subtopic { name: string; difficulty: "easy" | "medium" | "hard"; }
export interface Unit { unit_number: number; title: string; subtopics: Subtopic[]; }
export interface Syllabus { syllabus_id: number; subject: string; units: Unit[]; }
export interface Note { topic_id: number; note_type: "long" | "short" | "revision"; content: string; generated_at: string; }
export interface ChatMessage { role: "user" | "assistant"; content: string; }
