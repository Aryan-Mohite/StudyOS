"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { TopicMastery } from "@/types";
import { getProgress, APIError } from "@/lib/api";
import { LoadingSteps } from "@/components/LoadingSteps";
import { ErrorState, EmptyState } from "@/components/StateComponents";

function masteryColor(score: number): string {
  if (score < 40) return "bg-red-500";
  if (score < 70) return "bg-amber-500";
  return "bg-emerald-500";
}

function masteryLabel(score: number): { label: string; icon: typeof TrendingUp } {
  if (score < 40) return { label: "Needs work", icon: TrendingDown };
  if (score < 70) return { label: "Improving", icon: Minus };
  return { label: "Strong", icon: TrendingUp };
}

export default function ProgressPage() {
  const [topics, setTopics] = useState<TopicMastery[] | null>(null);
  const [overallAccuracy, setOverallAccuracy] = useState<number | null>(null);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProgress()
      .then((res) => {
        setTopics(res.topics);
        setOverallAccuracy(res.overall_accuracy);
        setTotalAttempts(res.total_attempts);
      })
      .catch((err) => setError(err instanceof APIError ? err.detail : "Could not load your progress."));
  }, []);

  // Group by subject for easier scanning.
  const bySubject = (topics ?? []).reduce<Record<string, TopicMastery[]>>((acc, t) => {
    (acc[t.subject] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-gray-900">Your Progress</h1>
        <p className="mt-0.5 text-sm text-gray-500">Mastery per topic, based on your quiz and problem attempts</p>
      </div>

      {error && <ErrorState message={error} onRetry={() => window.location.reload()} />}

      {!error && !topics && <LoadingSteps currentStep="Loading your progress" completedSteps={[]} />}

      {!error && topics && topics.length === 0 && (
        <EmptyState
          message="No attempts yet"
          suggestion="Take an MCQ quiz or work through some numericals — your progress will show up here."
        />
      )}

      {!error && topics && topics.length > 0 && (
        <>
          <div className="mb-6 flex gap-3">
            <div className="flex-1 rounded-xl border border-border bg-surface p-4">
              <p className="font-display text-2xl font-bold text-brand-500">
                {overallAccuracy !== null ? `${overallAccuracy}%` : "—"}
              </p>
              <p className="text-[13px] font-medium text-gray-700">Overall accuracy</p>
            </div>
            <div className="flex-1 rounded-xl border border-border bg-surface p-4">
              <p className="font-display text-2xl font-bold text-brand-500">{totalAttempts}</p>
              <p className="text-[13px] font-medium text-gray-700">Questions answered</p>
            </div>
            <div className="flex-1 rounded-xl border border-border bg-surface p-4">
              <p className="font-display text-2xl font-bold text-brand-500">{topics.length}</p>
              <p className="text-[13px] font-medium text-gray-700">Topics practiced</p>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {Object.entries(bySubject).map(([subject, subjectTopics]) => (
              <div key={subject}>
                <h2 className="mb-2 font-display text-[15px] font-bold text-gray-900">{subject}</h2>
                <div className="flex flex-col gap-2">
                  {subjectTopics.map((t) => {
                    const { label, icon: Icon } = masteryLabel(t.mastery_score);
                    return (
                      <Link
                        key={t.topic_id}
                        href={`/study/${t.topic_id}`}
                        className="rounded-xl border border-border bg-surface p-3.5 hover:border-brand-300 transition-colors"
                      >
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="text-[13px] font-medium text-gray-800">{t.topic_name}</span>
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-500">
                            <Icon size={11} /> {label} · {Math.round(t.mastery_score)}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-border">
                          <div
                            className={`h-1.5 rounded-full transition-all ${masteryColor(t.mastery_score)}`}
                            style={{ width: `${t.mastery_score}%` }}
                          />
                        </div>
                        <p className="mt-1 text-[11px] text-gray-400">
                          {t.correct_attempts}/{t.total_attempts} correct
                        </p>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
