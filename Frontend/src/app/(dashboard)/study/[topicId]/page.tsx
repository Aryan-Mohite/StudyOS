"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { FileText, Calculator, HelpCircle, ChevronLeft, Maximize2, Loader2, List, MessageSquare, X } from "lucide-react";
import { SyllabusTree } from "@/components/SyllabusTree";
import { NotesView } from "@/components/NotesView";
import { NumericalsView } from "@/components/NumericalsView";
import { MCQQuiz } from "@/components/MCQQuiz";
import { ChatPanel } from "@/components/ChatPanel";
import { getLatestSyllabus } from "@/lib/api";
import type { Syllabus, SyllabusTopic } from "@/types";
import Link from "next/link";

type Tab = "notes" | "problems" | "mcq";

const TABS: { id: Tab; label: string; icon: typeof FileText }[] = [
  { id: "notes",    label: "Notes",    icon: FileText   },
  { id: "problems", label: "Problems", icon: Calculator },
  { id: "mcq",      label: "Quiz",     icon: HelpCircle },
];

interface ResolvedTopic extends SyllabusTopic {
  subject: string;
  unit_title: string;
}

/** Find a topic by id in the syllabus, plus its subject/unit and sibling topic names. */
function resolveTopic(syllabus: Syllabus, topicId: string): { topic: ResolvedTopic; syllabusContext: string[] } | null {
  for (const subject of syllabus.subjects) {
    for (const unit of subject.units) {
      const topic = unit.topics.find((t) => t.topic_id === topicId);
      if (topic) {
        return {
          topic: { ...topic, subject: subject.name, unit_title: unit.title },
          syllabusContext: unit.topics.filter((t) => t.topic_id !== topicId).map((t) => t.name),
        };
      }
    }
  }
  return null;
}

export default function StudyPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const [activeTab, setActiveTab] = useState<Tab>("notes");
  const [chatExpanded, setChatExpanded] = useState(false);
  const [syllabus, setSyllabus] = useState<Syllabus | null>(null);
  const [loadError, setLoadError] = useState(false);
  // Mobile-only: the syllabus tree and tutor panel are hidden below md/lg
  // breakpoints, so they need to be reachable as overlays instead.
  const [mobilePanel, setMobilePanel] = useState<"syllabus" | "tutor" | null>(null);

  useEffect(() => {
    getLatestSyllabus()
      .then(setSyllabus)
      .catch(() => setLoadError(true));
  }, []);

  if (!syllabus && !loadError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <Loader2 size={20} className="animate-spin text-brand-500" />
        <p className="text-sm text-gray-400">Loading your syllabus…</p>
      </div>
    );
  }

  const resolved = syllabus ? resolveTopic(syllabus, topicId) : null;

  if (!resolved) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg font-medium text-gray-700">Topic not found</p>
        <Link href="/dashboard" className="text-sm text-brand-500 hover:underline">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const { topic, syllabusContext } = resolved;

  return (
    <div className="flex h-[calc(100vh-49px)] overflow-hidden">
      {/* ── Left: Syllabus navigation ─────────────────────────── */}
      <aside className="hidden w-56 shrink-0 overflow-y-auto border-r border-border bg-surface p-3 lg:block">
        <Link
          href="/dashboard"
          className="mb-3 flex items-center gap-1.5 text-[12px] text-gray-400 hover:text-brand-600 transition-colors"
        >
          <ChevronLeft size={13} /> Dashboard
        </Link>
        <SyllabusTree syllabus={syllabus!} activeTopicId={topicId} />
      </aside>

      {/* ── Center: Tab content ───────────────────────────────── */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Topic breadcrumb */}
        <div className="shrink-0 border-b border-border bg-surface px-5 py-3">
          <p className="text-[11px] text-gray-400">
            {topic.subject} · {topic.unit_title}
          </p>
          <h1 className="font-display text-[16px] font-bold text-gray-900 leading-snug">
            {topic.name}
          </h1>
        </div>

        {/* Tabs */}
        <div className="shrink-0 flex items-center justify-between border-b border-border bg-surface">
          <div className="flex">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 border-b-2 px-5 py-3 text-[13px] font-medium transition-colors ${
                  activeTab === id
                    ? "border-brand-500 text-brand-600"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>
          {/* Mobile-only access to syllabus tree and tutor, which are hidden as side panels below lg/md */}
          <div className="flex items-center gap-1 pr-3 lg:hidden">
            <button
              onClick={() => setMobilePanel("syllabus")}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-[12px] font-medium text-gray-500 hover:bg-page hover:text-brand-600 transition-colors"
              aria-label="Open syllabus"
            >
              <List size={14} />
            </button>
            <button
              onClick={() => setMobilePanel("tutor")}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-[12px] font-medium text-gray-500 hover:bg-page hover:text-brand-600 transition-colors md:hidden"
              aria-label="Open AI tutor"
            >
              <MessageSquare size={14} />
            </button>
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === "notes" && (
            <NotesView
              topicId={topicId}
              topicName={topic.name}
              subject={topic.subject}
              unitTitle={topic.unit_title}
              syllabusContext={syllabusContext}
              syllabusId={syllabus?.syllabus_id}
            />
          )}
          {activeTab === "problems" && (
            <NumericalsView
              topicId={topicId}
              topicName={topic.name}
              subject={topic.subject}
              hasNumericals={topic.has_numericals}
              syllabusContext={syllabusContext}
              syllabusId={syllabus?.syllabus_id}
            />
          )}
          {activeTab === "mcq" && (
            <MCQQuiz
              topicId={topicId}
              topicName={topic.name}
              subject={topic.subject}
              syllabusContext={syllabusContext}
              syllabusId={syllabus?.syllabus_id}
            />
          )}
        </div>
      </main>

      {/* ── Right: Chat panel ────────────────────────────────── */}
      <aside
        className={`shrink-0 border-l border-border bg-surface transition-all duration-200 ${
          chatExpanded ? "w-96" : "w-72"
        } hidden md:flex md:flex-col`}
      >
        <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Tutor</span>
          <button
            onClick={() => setChatExpanded((v) => !v)}
            className="rounded p-1 text-gray-400 hover:text-brand-500 transition-colors"
          >
            <Maximize2 size={12} />
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <ChatPanel
            topicId={topicId}
            topicName={topic.name}
            subject={topic.subject}
            syllabusContext={syllabusContext}
            syllabusId={syllabus?.syllabus_id}
          />
        </div>
      </aside>

      {/* ── Mobile overlays: syllabus tree / tutor ─────────────── */}
      {mobilePanel && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobilePanel(null)}
          />
          <div className="relative ml-auto flex h-full w-[85%] max-w-sm flex-col bg-surface shadow-xl">
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
              <span className="text-[13px] font-semibold text-gray-900">
                {mobilePanel === "syllabus" ? "Syllabus" : "AI Tutor"}
              </span>
              <button
                onClick={() => setMobilePanel(null)}
                className="rounded p-1 text-gray-400 hover:text-brand-500 transition-colors"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {mobilePanel === "syllabus" ? (
                <div className="h-full overflow-y-auto p-3">
                  <SyllabusTree syllabus={syllabus!} activeTopicId={topicId} />
                </div>
              ) : (
                <ChatPanel
                  topicId={topicId}
                  topicName={topic.name}
                  subject={topic.subject}
                  syllabusContext={syllabusContext}
                  syllabusId={syllabus?.syllabus_id}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
