"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare, ChevronRight } from "lucide-react";
import { EmptyState, ErrorState } from "@/components/StateComponents";
import { LoadingSteps } from "@/components/LoadingSteps";

interface ChatSession {
  topic_id: string;
  topic_name: string;
  subject: string;
  message_count: number;
  last_message_at: string;
  last_message_preview: string;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<ChatSession[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/chat/sessions")
      .then((res) => {
        if (!res.ok) throw new Error("Could not load chat history.");
        return res.json();
      })
      .then((data) => setSessions(data.sessions ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load history."));
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-gray-900">Chat History</h1>
        <p className="mt-0.5 text-sm text-gray-500">Your past conversations with the AI Tutor</p>
      </div>

      {error && <ErrorState message={error} onRetry={() => location.reload()} />}

      {!error && sessions === null && (
        <LoadingSteps currentStep="Loading your conversations" completedSteps={[]} />
      )}

      {!error && sessions !== null && sessions.length === 0 && (
        <EmptyState
          message="No conversations yet"
          suggestion="Open any topic and ask the AI Tutor a question — it'll show up here."
        />
      )}

      {!error && sessions !== null && sessions.length > 0 && (
        <div className="flex flex-col gap-2">
          {sessions.map((s) => (
            <Link
              key={s.topic_id}
              href={`/study/${s.topic_id}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-brand-300"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                <MessageSquare size={15} className="text-brand-500" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-gray-900">{s.topic_name}</p>
                  <span className="shrink-0 text-[11px] text-gray-400">
                    {timeAgo(s.last_message_at)}
                  </span>
                </div>
                <p className="truncate text-xs text-gray-400">
                  {s.subject} · {s.message_count} message{s.message_count === 1 ? "" : "s"}
                </p>
                {s.last_message_preview && (
                  <p className="mt-1 truncate text-xs text-gray-500">{s.last_message_preview}</p>
                )}
              </div>
              <ChevronRight size={15} className="shrink-0 text-gray-300" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
