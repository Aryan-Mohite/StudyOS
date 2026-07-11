"use client";
import { useState } from "react";
import { FileText, ChevronRight, Zap } from "lucide-react";
import type { Note, NotesState } from "@/types";
import { generateNotes, deleteNotes, APIError } from "@/lib/api";
import { LoadingSteps } from "@/components/LoadingSteps";
import { EmptyState, ErrorState, StaleWarning, FormulaBlock, IdleGenerateCard } from "@/components/StateComponents";

const REAL_STEPS = [
  "Sending to StudyOS…",
  "Structuring sections…",
  "Generating key points and formulas…",
  "Validating output…",
];

interface NotesViewProps {
  topicId: string;
  topicName: string;
  subject: string;
  unitTitle: string;
  syllabusContext: string[];
  syllabusId?: string;
}

export function NotesView({
  topicId,
  topicName,
  subject,
  unitTitle,
  syllabusContext,
  syllabusId,
}: NotesViewProps) {
  const [status, setStatus] = useState<NotesState>("idle");
  const [data, setData] = useState<Note | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wasCached, setWasCached] = useState(false);
  const [currentStep, setCurrentStep] = useState("");
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  // ── Generation ─────────────────────────────────────────────────────────────

  const generate = async (forceRegenerate = false) => {
    setStatus(forceRegenerate ? "regenerating" : "loading");
    setCompletedSteps([]);
    setError(null);

    const steps = REAL_STEPS;
    // Animate steps while waiting for the API (it takes 10–25 s)
    let stepIdx = 0;
    setCurrentStep(steps[0]);

    const ticker = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, steps.length - 1);
      setCompletedSteps(steps.slice(0, stepIdx));
      setCurrentStep(steps[stepIdx]);
    }, 4000);

    try {
      const result = await generateNotes({
        topic_id: topicId,
        topic_name: topicName,
        subject,
        unit_title: unitTitle,
        syllabus_context: syllabusContext,
        syllabus_id: syllabusId,
        force_regenerate: forceRegenerate,
      });

      clearInterval(ticker);
      setWasCached(result._cached ?? false);
      setData(result);
      setStatus("success");
    } catch (err) {
      clearInterval(ticker);
      const msg =
        err instanceof APIError
          ? err.detail
          : err instanceof Error
          ? err.message
          : "Notes generation failed.";
      setError(msg);
      setStatus("error");
    }
  };

  const handleRegenerate = async () => {
    // Delete cache first, then regenerate
    try { await deleteNotes(topicId); } catch { /* ignore if not cached */ }
    await generate(true);
  };

  // ── Render states ──────────────────────────────────────────────────────────

  if (status === "idle") {
    return (
      <IdleGenerateCard
        label="Generate Notes"
        description={`AI-structured notes for "${topicName}" — sections, formulas, and key points.`}
        estimatedTime="~20–30 seconds"
        onGenerate={() => generate()}
        icon={<FileText size={22} />}
      />
    );
  }

  if (status === "loading" || status === "regenerating") {
    return (
      <LoadingSteps
        currentStep={currentStep}
        completedSteps={completedSteps}
        estimatedSeconds={25}
      />
    );
  }

  if (status === "error") {
    return <ErrorState message={error ?? undefined} onRetry={() => generate()} />;
  }

  if (status === "empty" || !data) {
    return (
      <EmptyState
        message="This topic has limited content in your syllabus."
        suggestion="Try a neighbouring topic or ask the AI tutor directly."
      />
    );
  }

  // ── Success ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      {status === "stale" && (
        <StaleWarning onRegenerate={handleRegenerate} />
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-gray-900">{data.topic}</h2>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-xs text-gray-400">
              {data.subject} · Generated {new Date(data.generated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </p>
            {wasCached && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                <Zap size={9} /> Instant (cached)
              </span>
            )}
            {!wasCached && (
              <span className="rounded-full bg-brand-50 border border-brand-200 px-2 py-0.5 text-[10px] font-semibold text-brand-600">
                Live · StudyOS
              </span>
            )}
          </div>
        </div>
        <button
          onClick={handleRegenerate}
          className="text-xs text-brand-500 hover:text-brand-700 font-medium transition-colors"
        >
          Regenerate
        </button>
      </div>

      {/* Sections */}
      <div className="flex flex-col gap-5">
        {data.sections.map((section, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-5">
            <h3 className="mb-3 font-display text-[15px] font-semibold text-gray-900">
              {section.heading}
            </h3>
            <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed text-[14px] whitespace-pre-wrap">
              {section.content}
            </div>
            {section.formula && <FormulaBlock formula={section.formula} />}
            {section.key_points.length > 0 && (
              <div className="mt-4 rounded-lg bg-page p-3">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">Key Points</p>
                <ul className="flex flex-col gap-1.5">
                  {section.key_points.map((pt, j) => (
                    <li key={j} className="flex items-start gap-2 text-[13px] text-gray-600">
                      <ChevronRight size={13} className="mt-0.5 shrink-0 text-brand-400" />
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="rounded-xl border border-brand-200 bg-brand-50 p-5">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-brand-400">Summary</p>
        <p className="text-[14px] leading-relaxed text-brand-800">{data.summary}</p>
      </div>

      {/* Related topics */}
      {data.related_topics.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">Related Topics</p>
          <div className="flex flex-wrap gap-2">
            {data.related_topics.map((t) => (
              <span key={t} className="rounded-full border border-border bg-page px-3 py-1 text-xs font-medium text-gray-600 hover:border-brand-300 hover:text-brand-600 transition-colors cursor-pointer">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
