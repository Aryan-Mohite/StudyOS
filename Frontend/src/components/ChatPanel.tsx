"use client";
import { useState, useRef, useEffect } from "react";
import { Send, MessageSquare, Bot, User } from "lucide-react";
import type { TutorResponse } from "@/types";
import { sendChatMessage, APIError } from "@/lib/api";

const DEFAULT_SUGGESTIONS = [
  "Summarise the most important topics in this chapter",
  "What are the common exam questions from this topic?",
  "Explain the key formula and when to use it",
];

interface ChatPanelProps {
  topicId: string | null;
  topicName: string | null;
  subject?: string;
  syllabusContext?: string[];
}

interface DisplayMessage {
  role: "user" | "assistant";
  content: string;
  isOutOfScope?: boolean;
}

export function ChatPanel({ topicId, topicName, subject, syllabusContext = [] }: ChatPanelProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const suggested = DEFAULT_SUGGESTIONS;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const send = async (text: string) => {
    if (!text.trim() || isLoading || !topicId || !topicName) return;
    const userMsg: DisplayMessage = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const response: TutorResponse = await sendChatMessage({
        // Placeholder — the API route derives the real session_id
        // server-side from the authenticated Clerk user + topicId.
        session_id: `pending:${topicId}`,
        question: text.trim(),
        topic_id: topicId,
        topic_name: topicName,
        subject: subject ?? "",
        syllabus_context: syllabusContext,
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.answer, isOutOfScope: response.out_of_scope },
      ]);
    } catch (err) {
      const msg =
        err instanceof APIError
          ? err.detail
          : "Couldn't get a response. Try again.";
      setMessages((prev) => [...prev, { role: "assistant", content: msg }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Panel header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500">
          <MessageSquare size={13} className="text-white" />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-gray-900">AI Tutor</p>
          {topicName && (
            <p className="text-[10px] text-gray-400 leading-none mt-0.5">Scoped to {topicName}</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-[12px] text-gray-400 text-center">
              {topicName ? `Ask anything about ${topicName}` : "Select a topic to start"}
            </p>
            <div className="flex flex-col gap-2">
              {suggested.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="rounded-lg border border-border bg-page px-3 py-2.5 text-left text-[12px] text-gray-600 hover:border-brand-300 hover:text-brand-700 transition-colors leading-snug"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${msg.role === "user" ? "bg-brand-500" : "bg-gray-200"}`}>
                  {msg.role === "user"
                    ? <User size={12} className="text-white" />
                    : <Bot size={12} className="text-gray-600" />}
                </div>
                <div className={`max-w-[82%] rounded-xl px-3 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-brand-500 text-white rounded-tr-sm"
                    : msg.isOutOfScope
                    ? "bg-amber-50 border border-amber-200 text-amber-900 rounded-tl-sm"
                    : "bg-page border border-border text-gray-700 rounded-tl-sm"
                }`}>
                  {msg.isOutOfScope && (
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-amber-500">Outside your syllabus</span>
                  )}
                  {msg.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-200">
                  <Bot size={12} className="text-gray-600" />
                </div>
                <div className="flex items-center gap-1 rounded-xl rounded-tl-sm border border-border bg-page px-3 py-2.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="inline-block h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border px-3 py-3">
        <div className="flex items-end gap-2 rounded-xl border border-border bg-surface px-3 py-2 focus-within:border-brand-400 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={topicName ? `Ask about ${topicName}…` : "Ask anything…"}
            rows={1}
            disabled={isLoading}
            className="flex-1 resize-none bg-transparent text-[13px] text-gray-800 placeholder:text-gray-400 focus:outline-none min-h-[20px] max-h-[80px]"
            style={{ lineHeight: "20px" }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || isLoading}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white transition-opacity disabled:opacity-40 hover:bg-brand-600"
          >
            <Send size={12} />
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-gray-400">
          Scoped to your syllabus · Press ↵ to send
        </p>
      </div>
    </div>
  );
}
