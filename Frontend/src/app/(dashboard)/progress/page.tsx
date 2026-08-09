"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { TopicMastery } from "@/types";
import { getProgress, getLatestSyllabus, APIError } from "@/lib/api";
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
  const [syllabusId, setSyllabusId] = useState<string | null>(null);
  const [syllabusLoading, setSyllabusLoading] = useState(true);
  const [topics, setTopics] = useState<TopicMastery[] | null>(null);
  const [overallAccuracy, setOverallAccuracy] = useState<number | null>(null);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Progress is scoped to the current syllabus, so load it first — this is
  // what keeps a freshly-uploaded notebook from showing mastery data left
  // over from a previous one.
  useEffect(() => {
    getLatestSyllabus()
      .then((s) => setSyllabusId(s.syllabus_id))
      .catch(() => setSyllabusId(null))
      .finally(() => setSyllabusLoading(false));
  }, []);

  useEffect(() => {
    if (!syllabusId) return;
    setTopics(null);
    setError(null);
    getProgress(syllabusId)
      .then((res) => {
        setTopics(res.topics);
        setOverallAccuracy(res.overall_accuracy);
        setTotalAttempts(res.total_attempts);
      })
      .catch((err) => setError(err instanceof APIError ? err.detail : "Could not load your progress."));
  }, [syllabusId]);

  // Group by subject for easier scanning.
  const bySubject = (topics ?? []).reduce<Record<string, TopicMastery[]>>((acc, t) => {
    (acc[t.subject] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink">Your Progress</h1>
        <p className="mt-0.5 text-sm text-ink-2">Mastery per topic, based on your quiz attempts</p>
      </div>

      {syllabusLoading && <LoadingSteps currentStep="Loading your syllabus" completedSteps={[]} />}

      {!syllabusLoading && !syllabusId && (
        <EmptyState
          message="No syllabus uploaded yet"
          suggestion="Upload a syllabus PDF first, then come back to see your progress."
        />
      )}

      {!syllabusLoading && syllabusId && error && (
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      )}

      {!syllabusLoading && syllabusId && !error && !topics && (
        <LoadingSteps currentStep="Loading your progress" completedSteps={[]} />
      )}

      {!syllabusLoading && syllabusId && !error && topics && topics.length === 0 && (
        <EmptyState
          message="No attempts yet"
          suggestion="Take an MCQ quiz — your progress will show up here."
        />
      )}

      {!syllabusLoading && syllabusId && !error && topics && topics.length > 0 && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-3 xs:grid-cols-3">
            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="font-display text-2xl font-bold text-brand-500">
                {overallAccuracy !== null ? `${overallAccuracy}%` : "—"}
              </p>
              <p className="text-[13px] font-medium text-ink">Overall accuracy</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="font-display text-2xl font-bold text-brand-500">{totalAttempts}</p>
              <p className="text-[13px] font-medium text-ink">Questions answered</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="font-display text-2xl font-bold text-brand-500">{topics.length}</p>
              <p className="text-[13px] font-medium text-ink">Topics practiced</p>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {Object.entries(bySubject).map(([subject, subjectTopics]) => (
              <div key={subject}>
                <h2 className="mb-2 font-display text-[15px] font-bold text-ink">{subject}</h2>
                <div className="flex flex-col gap-2">
                  {subjectTopics.map((t) => {
                    const { label, icon: Icon } = masteryLabel(t.mastery_score);
                    return (
                      <Link
                        key={t.topic_id}
                        href={`/study/${t.topic_id}`}
                        className="rounded-xl border border-border bg-surface p-3.5 hover:border-brand-300 dark:border-brand-500/40 transition-colors"
                      >
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="text-[13px] font-medium text-ink">{t.topic_name}</span>
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-ink-2">
                            <Icon size={11} /> {label} · {Math.round(t.mastery_score)}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-border">
                          <div
                            className={`h-1.5 rounded-full transition-all ${masteryColor(t.mastery_score)}`}
                            style={{ width: `${t.mastery_score}%` }}
                          />
                        </div>
                        <p className="mt-1 text-[11px] text-ink-3">
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
