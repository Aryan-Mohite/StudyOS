"use client";
import { useState } from "react";
import { HelpCircle, CheckCircle2, XCircle, RotateCcw, Trophy } from "lucide-react";
import type { MCQSet, MCQOption, MCQState } from "@/types";
import { mockGenerateMCQ } from "@/lib/mock-api";
import { LoadingSteps } from "@/components/shared/LoadingSteps";
import { ErrorState, StaleWarning, IdleGenerateCard } from "@/components/shared/StateComponents";
import { Button } from "@/components/ui/button";

const STEPS = ["Writing question stems…", "Crafting plausible distractors…", "Adding explanations…"];
const OPTIONS: MCQOption[] = ["A", "B", "C", "D"];

const DIFFICULTY_STYLE: Record<string, string> = {
  easy: "text-emerald-600 bg-emerald-50 border-emerald-200",
  medium: "text-amber-600 bg-amber-50 border-amber-200",
  hard: "text-red-600 bg-red-50 border-red-200",
};

interface MCQQuizProps {
  topicId: string;
  topicName: string;
}

export function MCQQuiz({ topicId, topicName }: MCQQuizProps) {
  const [status, setStatus] = useState<MCQState>("idle");
  const [data, setData] = useState<MCQSet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, MCQOption>>({});
  const [currentStep, setCurrentStep] = useState("");
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const generate = async () => {
    setStatus("loading");
    setCompletedSteps([]);
    setCurrentIndex(0);
    setAnswers({});
    setError(null);

    const onStep = (step: string) => {
      setCurrentStep(step);
      const idx = STEPS.indexOf(step);
      setCompletedSteps(STEPS.slice(0, idx));
    };

    try {
      const result = await mockGenerateMCQ(topicId, onStep);
      if (!result) {
        setStatus("empty");
      } else {
        setData(result);
        setStatus("in_progress");
      }
    } catch {
      setError("Quiz generation failed. Please try again.");
      setStatus("error");
    }
  };

  const handleAnswer = (option: MCQOption) => {
    if (answers[currentIndex] !== undefined) return; // already answered
    setAnswers((prev) => ({ ...prev, [currentIndex]: option }));
    setStatus("question_answered");
  };

  const handleNext = () => {
    if (!data) return;
    if (currentIndex < data.questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setStatus("in_progress");
    } else {
      setStatus("completed");
    }
  };

  const handleReset = () => {
    setStatus("idle");
    setData(null);
    setAnswers({});
    setCurrentIndex(0);
  };

  if (status === "idle") {
    return (
      <IdleGenerateCard
        label="Start Quiz"
        description={`${topicName} — 8 questions, mix of easy, medium, and hard.`}
        estimatedTime="~20 seconds to generate"
        onGenerate={generate}
        icon={<HelpCircle size={22} />}
      />
    );
  }

  if (status === "loading" || status === "regenerating") {
    return <LoadingSteps currentStep={currentStep} completedSteps={completedSteps} estimatedSeconds={20} />;
  }

  if (status === "error") return <ErrorState message={error ?? undefined} onRetry={generate} />;
  if (status === "empty" || !data) return <ErrorState message="Not enough content to generate a quiz for this topic." onRetry={generate} />;

  // ── Completed ──
  if (status === "completed") {
    const correct = data.questions.filter((q, i) => answers[i] === q.correct).length;
    const total = data.questions.length;
    const pct = Math.round((correct / total) * 100);
    return (
      <div className="flex flex-col items-center gap-6 py-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500">
          <Trophy size={26} className="text-white" />
        </div>
        <div>
          <p className="font-display text-3xl font-bold text-gray-900">{correct}/{total}</p>
          <p className="mt-1 text-sm text-gray-500">{pct}% correct on {topicName}</p>
        </div>
        {/* Per-question review */}
        <div className="w-full max-w-md flex flex-col gap-2">
          {data.questions.map((q, i) => {
            const userAns = answers[i];
            const isCorrect = userAns === q.correct;
            return (
              <div key={q.id} className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${isCorrect ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
                {isCorrect
                  ? <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  : <XCircle size={15} className="text-red-400 shrink-0" />}
                <p className="text-[13px] text-gray-700 text-left leading-snug line-clamp-2">{q.question}</p>
                {!isCorrect && (
                  <span className="ml-auto text-[12px] font-semibold text-emerald-700 shrink-0">
                    {q.correct}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw size={13} /> Try Again
        </Button>
      </div>
    );
  }

  // ── Active Quiz ──
  const question = data.questions[currentIndex];
  const userAnswer = answers[currentIndex];
  const isAnswered = userAnswer !== undefined;
  const total = data.questions.length;

  return (
    <div className="flex flex-col gap-5">
      {status === "stale" && <StaleWarning onRegenerate={() => { setStatus("regenerating"); generate(); }} />}

      {/* Progress bar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500">Question {currentIndex + 1} of {total}</span>
          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${DIFFICULTY_STYLE[question.difficulty]}`}>
            {question.difficulty}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-border">
          <div
            className="h-1.5 rounded-full bg-brand-500 transition-all duration-300"
            style={{ width: `${((currentIndex + (isAnswered ? 1 : 0)) / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <p className="text-[15px] font-medium text-gray-900 leading-snug">{question.question}</p>

      {/* Options */}
      <div className="flex flex-col gap-2.5">
        {OPTIONS.map((opt) => {
          const isSelected = userAnswer === opt;
          const isCorrectOpt = opt === question.correct;
          let style = "border-border bg-surface text-gray-700 hover:border-brand-300 hover:bg-brand-50";
          if (isAnswered) {
            if (isCorrectOpt) style = "border-emerald-400 bg-emerald-50 text-emerald-800 font-medium";
            else if (isSelected) style = "border-red-300 bg-red-50 text-red-700";
            else style = "border-border bg-surface text-gray-400";
          }
          return (
            <button
              key={opt}
              onClick={() => handleAnswer(opt)}
              disabled={isAnswered}
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-150 ${style} ${isAnswered ? "cursor-default" : "cursor-pointer"}`}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-[11px] font-bold mt-0.5">
                {opt}
              </span>
              <span className="text-[14px] leading-snug">{question.options[opt]}</span>
              {isAnswered && isCorrectOpt && <CheckCircle2 size={15} className="ml-auto shrink-0 text-emerald-500 mt-0.5" />}
              {isAnswered && isSelected && !isCorrectOpt && <XCircle size={15} className="ml-auto shrink-0 text-red-400 mt-0.5" />}
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {isAnswered && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-brand-400">Explanation</p>
          <p className="text-[13px] text-brand-800 leading-relaxed">{question.explanation}</p>
        </div>
      )}

      {/* Next button */}
      {isAnswered && (
        <div className="flex justify-end">
          <Button size="sm" onClick={handleNext}>
            {currentIndex < total - 1 ? "Next Question →" : "See Results"}
          </Button>
        </div>
      )}
    </div>
  );
}
