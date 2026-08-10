"use client";
import { useState, useEffect } from "react";
import { HelpCircle, CheckCircle2, XCircle, RotateCcw, Trophy, Zap, TrendingUp } from "lucide-react";
import type { MCQSet, MCQOption, MCQState, SuggestedDifficulty } from "@/types";
import { generateMCQ, deleteMCQ, submitAttempt, getSuggestedDifficulty, APIError } from "@/lib/api";
import { LoadingSteps } from "@/components/LoadingSteps";
import { ErrorState, StaleWarning, IdleGenerateCard } from "@/components/StateComponents";
import { Button } from "@/components/ui/button";

const REAL_STEPS = ["Sending to StudyOS…", "Writing question stems…", "Crafting plausible distractors…", "Validating output…"];
const OPTIONS: MCQOption[] = ["A", "B", "C", "D"];

const DIFFICULTY_STYLE: Record<string, string> = {
  easy: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30",
  medium: "text-amber-600 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30",
  hard: "text-red-600 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30",
};

const DIFFICULTY_CHOICES: { value: SuggestedDifficulty; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
  { value: "mixed", label: "Mixed" },
];

// Selected-state styling per difficulty — mirrors DIFFICULTY_STYLE's palette
// so the picker and the in-quiz badge read as the same visual language.
const DIFFICULTY_SELECTED_STYLE: Record<SuggestedDifficulty, string> = {
  easy: "border-emerald-400 dark:border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700",
  medium: "border-amber-400 dark:border-amber-500/50 bg-amber-50 dark:bg-amber-500/10 text-amber-700",
  hard: "border-red-400 dark:border-red-500/50 bg-red-50 dark:bg-red-500/10 text-red-700",
  mixed: "border-brand-400 dark:border-brand-500/50 bg-brand-50 dark:bg-brand-500/10 text-brand-700",
};

interface MCQQuizProps {
  topicId: string;
  topicName: string;
  subject: string;
  syllabusContext?: string[];
  syllabusId?: string;
}

export function MCQQuiz({ topicId, topicName, subject, syllabusContext = [], syllabusId }: MCQQuizProps) {
  const [status, setStatus] = useState<MCQState>("idle");
  const [data, setData] = useState<MCQSet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, MCQOption>>({});
  const [currentStep, setCurrentStep] = useState("");
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [wasCached, setWasCached] = useState(false);
  const [suggested, setSuggested] = useState<SuggestedDifficulty | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<SuggestedDifficulty>("mixed");
  // Tracks the difficulty actually sent on the last successful generate, so
  // switching the picker to a different value forces a fresh request instead
  // of silently returning a cached set built at the old difficulty (the
  // cache below is keyed on topic_id only, not difficulty).
  const [lastGeneratedDifficulty, setLastGeneratedDifficulty] = useState<SuggestedDifficulty | null>(null);

  // Fetch a difficulty suggestion based on the student's own accuracy on this
  // topic — shown as a hint only; they still tap "Start Quiz" themselves and
  // difficulty selection elsewhere stays manual.
  useEffect(() => {
    getSuggestedDifficulty(topicId)
      .then((d) => setSuggested(d === "mixed" ? null : d))
      .catch(() => setSuggested(null));
  }, [topicId]);

  const generate = async (forceRegenerate = false) => {
    // A different difficulty than what's cached must bypass the cache too,
    // or the student taps "Hard" and silently gets back the old "Mixed" set.
    const difficultyChanged =
      lastGeneratedDifficulty !== null && lastGeneratedDifficulty !== selectedDifficulty;
    const effectiveForce = forceRegenerate || difficultyChanged;

    setStatus(effectiveForce ? "regenerating" : "loading");
    setCompletedSteps([]);
    setCurrentIndex(0);
    setAnswers({});
    setError(null);

    const steps = REAL_STEPS;
    let stepIdx = 0;
    setCurrentStep(steps[0]);

    // Animate steps while waiting for the API (it takes ~15–25 s)
    const ticker = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, steps.length - 1);
      setCompletedSteps(steps.slice(0, stepIdx));
      setCurrentStep(steps[stepIdx]);
    }, 4000);

    try {
      if (difficultyChanged) {
        // Same belt-and-suspenders pattern as handleRegenerate: clear the
        // cached row before asking for a fresh one at the new difficulty.
        if (syllabusId) { try { await deleteMCQ(topicId, syllabusId); } catch { /* ignore if not cached */ } }
      }

      const result = await generateMCQ({
        topic_id: topicId,
        topic_name: topicName,
        subject,
        count: 10,
        difficulty: selectedDifficulty,
        syllabus_context: syllabusContext,
        syllabus_id: syllabusId,
        force_regenerate: effectiveForce,
      });

      clearInterval(ticker);
      setWasCached(result._cached ?? false);
      setData(result);
      setLastGeneratedDifficulty(selectedDifficulty);
      setStatus("in_progress");
    } catch (err) {
      clearInterval(ticker);
      const msg =
        err instanceof APIError
          ? err.detail
          : err instanceof Error
          ? err.message
          : "Quiz generation failed.";
      setError(msg);
      setStatus("error");
    }
  };

  const handleRegenerate = async () => {
    // Delete cache first so a stale syllabus produces genuinely new questions
    if (syllabusId) { try { await deleteMCQ(topicId, syllabusId); } catch { /* ignore if not cached */ } }
    await generate(true);
  };

  const handleAnswer = (option: MCQOption) => {
    if (answers[currentIndex] !== undefined || !data) return; // already answered
    setAnswers((prev) => ({ ...prev, [currentIndex]: option }));
    setStatus("question_answered");

    const question = data.questions[currentIndex];
    // Fire-and-forget: recording the attempt shouldn't block or interrupt the
    // quiz. syllabusId should always be set by the time a student can answer
    // (the study page waits on the syllabus before rendering this component
    // at all) — but skip rather than send a malformed request if it's ever
    // missing, since progress tracking is best-effort.
    if (syllabusId) {
      submitAttempt({
        topic_id: topicId,
        topic_name: topicName,
        subject,
        syllabus_id: syllabusId,
        content_type: "mcq",
        difficulty: question.difficulty,
        is_correct: option === question.correct,
      }).catch(() => { /* progress tracking is best-effort */ });
    }
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
    const pickedDescription =
      selectedDifficulty === "mixed"
        ? "10 questions, mix of easy, medium, and hard."
        : `10 ${selectedDifficulty} questions.`;

    return (
      <div className="flex flex-col items-center gap-4">
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {DIFFICULTY_CHOICES.map(({ value, label }) => {
            const isSelected = selectedDifficulty === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setSelectedDifficulty(value)}
                aria-pressed={isSelected}
                className={`rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors ${
                  isSelected
                    ? DIFFICULTY_SELECTED_STYLE[value]
                    : "border-border bg-surface text-ink-2 hover:border-brand-200 dark:border-brand-500/30 hover:text-brand-600"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <IdleGenerateCard
          label="Start Quiz"
          description={`${topicName} — ${pickedDescription}`}
          estimatedTime="~15–25 seconds"
          onGenerate={() => generate()}
          icon={<HelpCircle size={22} />}
        />

        {suggested && selectedDifficulty !== suggested && (
          <button
            type="button"
            onClick={() => setSelectedDifficulty(suggested)}
            className="flex items-center gap-1.5 rounded-full border border-brand-200 dark:border-brand-500/30 bg-brand-50 dark:bg-brand-500/10 px-3 py-1 text-[11px] font-medium text-brand-600 transition-colors hover:border-brand-300 dark:border-brand-500/40 hover:bg-brand-100"
          >
            <TrendingUp size={11} />
            Based on your past attempts, you might be ready for {suggested} — tap to use it
          </button>
        )}
      </div>
    );
  }

  if (status === "loading" || status === "regenerating") {
    return (
      <LoadingSteps
        currentStep={currentStep}
        completedSteps={completedSteps}
        estimatedSeconds={20}
      />
    );
  }

  if (status === "error") return <ErrorState message={error ?? undefined} onRetry={() => generate()} />;
  if (status === "empty" || !data) return <ErrorState message="Not enough content to generate a quiz for this topic." onRetry={() => generate()} />;

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
          <p className="font-display text-3xl font-bold text-ink">{correct}/{total}</p>
          <p className="mt-1 text-sm text-ink-2">{pct}% correct on {topicName}</p>
        </div>
        {/* Per-question review */}
        <div className="w-full max-w-md flex flex-col gap-2">
          {data.questions.map((q, i) => {
            const userAns = answers[i];
            const isCorrect = userAns === q.correct;
            return (
              <div key={q.id} className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${isCorrect ? "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10" : "border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10"}`}>
                {isCorrect
                  ? <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  : <XCircle size={15} className="text-red-400 shrink-0" />}
                <p className="text-[13px] text-ink text-left leading-snug line-clamp-2">{q.question}</p>
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
      {status === "stale" && <StaleWarning onRegenerate={handleRegenerate} />}

      {/* Progress bar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-ink-2">Question {currentIndex + 1} of {total}</span>
            {currentIndex === 0 && !isAnswered && wasCached && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                <Zap size={9} /> Instant (cached)
              </span>
            )}
            {currentIndex === 0 && !isAnswered && !wasCached && (
              <span className="rounded-full bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/30 px-2 py-0.5 text-[10px] font-semibold text-brand-600">
                Live · StudyOS
              </span>
            )}
          </div>
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
      <p className="text-[15px] font-medium text-ink leading-snug">{question.question}</p>

      {/* Options */}
      <div className="flex flex-col gap-2.5">
        {OPTIONS.map((opt) => {
          const isSelected = userAnswer === opt;
          const isCorrectOpt = opt === question.correct;
          let style = "border-border bg-surface text-ink hover:border-brand-300 dark:border-brand-500/40 hover:bg-brand-50 dark:hover:bg-brand-500/10";
          if (isAnswered) {
            if (isCorrectOpt) style = "border-emerald-400 dark:border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 font-medium";
            else if (isSelected) style = "border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 text-red-700";
            else style = "border-border bg-surface text-ink-3";
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
        <div className="rounded-xl border border-brand-200 dark:border-brand-500/30 bg-brand-50 dark:bg-brand-500/10 p-4">
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
