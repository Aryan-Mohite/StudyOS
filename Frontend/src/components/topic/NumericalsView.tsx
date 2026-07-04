"use client";
import { useState } from "react";
import { Calculator, ChevronDown, ChevronUp, Zap } from "lucide-react";
import type { NumericalSet, NumericalsState } from "@/types";
import { mockGenerateNumericals } from "@/lib/mock-api";
import { generateNumericals, deleteNumericals, APIError } from "@/lib/api";
import { USE_REAL_API } from "@/lib/flags";
import { LoadingSteps } from "@/components/shared/LoadingSteps";
import { EmptyState, ErrorState, StaleWarning, FormulaBlock, IdleGenerateCard } from "@/components/shared/StateComponents";

const MOCK_STEPS = [
  "Selecting problem types for this topic…",
  "Writing step-by-step solutions…",
  "Verifying answers and difficulty spread…",
];

const REAL_STEPS = [
  "Sending to Claude…",
  "Working out each problem…",
  "Writing step-by-step solutions…",
  "Validating answers and units…",
];

const DIFFICULTY_STYLE: Record<string, string> = {
  easy: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  hard: "bg-red-50 text-red-700 border-red-200",
};

interface NumericalsViewProps {
  topicId: string;
  topicName: string;
  subject: string;
  hasNumericals: boolean;
  syllabusContext?: string[];
  syllabusId?: string;
}

export function NumericalsView({
  topicId,
  topicName,
  subject,
  hasNumericals,
  syllabusContext = [],
  syllabusId,
}: NumericalsViewProps) {
  const [status, setStatus] = useState<NumericalsState>("idle");
  const [data, setData] = useState<NumericalSet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [wasCached, setWasCached] = useState(false);
  const [currentStep, setCurrentStep] = useState("");
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const generate = async (forceRegenerate = false) => {
    setStatus(forceRegenerate ? "regenerating" : "loading");
    setCompletedSteps([]);
    setError(null);

    if (USE_REAL_API) {
      await generateReal(forceRegenerate);
    } else {
      await generateMock();
    }
  };

  const generateReal = async (forceRegenerate: boolean) => {
    const steps = REAL_STEPS;
    let stepIdx = 0;
    setCurrentStep(steps[0]);
    const ticker = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, steps.length - 1);
      setCompletedSteps(steps.slice(0, stepIdx));
      setCurrentStep(steps[stepIdx]);
    }, 4000);

    try {
      const result = await generateNumericals({
        topic_id: topicId,
        topic_name: topicName,
        subject,
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
          : "Problem generation failed.";
      setError(msg);
      setStatus("error");
    }
  };

  const generateMock = async () => {
    const steps = MOCK_STEPS;
    const onStep = (step: string) => {
      setCurrentStep(step);
      const idx = steps.indexOf(step);
      setCompletedSteps(steps.slice(0, idx));
    };
    try {
      const result = await mockGenerateNumericals(topicId, onStep);
      if (!result) {
        setStatus("empty");
      } else {
        setWasCached(false);
        setData(result);
        setStatus("success");
      }
    } catch {
      setError("Problem generation failed. Please try again.");
      setStatus("error");
    }
  };

  const handleRegenerate = async () => {
    if (USE_REAL_API) {
      try { await deleteNumericals(topicId); } catch { /* ignore if not cached */ }
    }
    await generate(true);
  };

  if (!hasNumericals && status === "idle") {
    return (
      <EmptyState
        message={`"${topicName}" is a theory topic — no standard numericals.`}
        suggestion="Try the MCQ quiz instead, or ask the AI Tutor a conceptual question."
      />
    );
  }

  if (status === "idle") {
    return (
      <IdleGenerateCard
        label="Generate Problems"
        description={`Fully solved problems with step-by-step solutions for "${topicName}".`}
        estimatedTime={USE_REAL_API ? "~30–45 seconds" : "~30 seconds (mock)"}
        onGenerate={() => generate()}
        icon={<Calculator size={22} />}
      />
    );
  }

  if (status === "loading" || status === "regenerating") {
    return (
      <LoadingSteps
        currentStep={currentStep}
        completedSteps={completedSteps}
        estimatedSeconds={USE_REAL_API ? 40 : 30}
      />
    );
  }

  if (status === "error") return <ErrorState message={error ?? undefined} onRetry={() => generate()} />;
  if (status === "empty" || !data) {
    return (
      <EmptyState
        message="This topic doesn't have standard numericals."
        suggestion="Try the MCQ quiz for theory-based practice."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {status === "stale" && <StaleWarning onRegenerate={handleRegenerate} />}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-gray-900">{data.topic}</h2>
          <div className="mt-0.5 flex items-center gap-2">
            <p className="text-xs text-gray-400">{data.problems.length} problems · {data.subject}</p>
            {wasCached && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                <Zap size={9} /> Instant (cached)
              </span>
            )}
            {USE_REAL_API && !wasCached && (
              <span className="rounded-full bg-brand-50 border border-brand-200 px-2 py-0.5 text-[10px] font-semibold text-brand-600">
                Live · Claude
              </span>
            )}
          </div>
        </div>
        <button onClick={handleRegenerate} className="text-xs text-brand-500 hover:text-brand-700 font-medium transition-colors">
          Regenerate
        </button>
      </div>

      {data.problems.map((problem) => {
        const isOpen = expandedId === problem.id;
        return (
          <div key={problem.id} className="rounded-xl border border-border bg-surface overflow-hidden">
            {/* Problem header */}
            <div
              className="flex cursor-pointer items-start gap-4 p-4 hover:bg-page transition-colors"
              onClick={() => setExpandedId(isOpen ? null : problem.id)}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500 text-[11px] font-bold text-white mt-0.5">
                {problem.id}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] text-gray-800 leading-snug">{problem.question}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${DIFFICULTY_STYLE[problem.difficulty]}`}>
                    {problem.difficulty}
                  </span>
                  <span className="text-[11px] text-gray-400">{problem.concept_tested}</span>
                </div>
              </div>
              {isOpen ? <ChevronUp size={15} className="shrink-0 text-gray-400 mt-1" /> : <ChevronDown size={15} className="shrink-0 text-gray-400 mt-1" />}
            </div>

            {/* Expanded: given, find, steps, answer */}
            {isOpen && (
              <div className="border-t border-border px-5 py-4 flex flex-col gap-4">
                {/* Given */}
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">Given</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    {Object.entries(problem.given).map(([k, v]) => (
                      <div key={k} className="flex gap-1.5">
                        <span className="text-[13px] text-gray-500 shrink-0">{k}:</span>
                        <span className="text-[13px] font-medium text-gray-800">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Find */}
                <div className="rounded-lg bg-page border border-border px-3 py-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Find: </span>
                  <span className="text-[13px] text-gray-700">{problem.find}</span>
                </div>

                {/* Steps */}
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">Solution</p>
                  <div className="flex flex-col gap-3">
                    {problem.steps.map((step) => (
                      <div key={step.step_number} className="flex gap-3">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-[11px] font-semibold text-gray-500 mt-0.5">
                          {step.step_number}
                        </span>
                        <div className="flex-1">
                          <p className="text-[13px] text-gray-600 leading-relaxed">{step.explanation}</p>
                          {step.expression && <FormulaBlock formula={step.expression} />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Answer */}
                <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Answer: </span>
                    <span className="text-[14px] font-semibold text-emerald-800">{problem.answer}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
