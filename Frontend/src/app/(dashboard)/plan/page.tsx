"use client";

import { useEffect, useState } from "react";
import { Calendar, ListChecks, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, IdleGenerateCard } from "@/components/StateComponents";
import { LoadingSteps } from "@/components/LoadingSteps";
import { GoalsPanel } from "@/components/GoalsPanel";

interface PlanTopic {
  topic_id: string;
  topic_name: string;
  subject: string;
}

interface PlanDay {
  day_number: number;
  session_type: "learn" | "revision" | "mock_test" | "rest";
  topics: PlanTopic[];
  focus_note: string;
}

interface StudyPlan {
  study_plan_id: string;
  syllabus_id: string;
  exam_date: string;
  total_days: number;
  days: PlanDay[];
  _cached?: boolean;
}

interface SyllabusSummary {
  syllabus_id: string;
  university?: string | null;
  program?: string | null;
}

const SESSION_STYLES: Record<PlanDay["session_type"], string> = {
  learn: "border-border bg-surface",
  revision: "border-brand-200 dark:border-brand-500/30 bg-brand-50 dark:bg-brand-500/10",
  mock_test: "border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10",
  rest: "border-border bg-muted",
};

const SESSION_LABELS: Record<PlanDay["session_type"], string> = {
  learn: "Learn",
  revision: "Revision",
  mock_test: "Mock Test",
  rest: "Rest",
};

export default function PlanPage() {
  const [syllabus, setSyllabus] = useState<SyllabusSummary | null>(null);
  const [syllabusLoading, setSyllabusLoading] = useState(true);
  const [examDate, setExamDate] = useState("");
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  // Load the user's most recent syllabus so we know what to plan against.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/upload/latest");
        if (res.ok) {
          const data = await res.json();
          setSyllabus({
            syllabus_id: data.syllabus_id,
            university: data.university,
            program: data.program,
          });
        }
      } finally {
        setSyllabusLoading(false);
      }
    })();
  }, []);

  async function generatePlan(forceRegenerate = false) {
    if (!syllabus || !examDate) return;
    setStatus("loading");
    setErrorMessage(undefined);
    try {
      const res = await fetch("/api/plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          syllabus_id: syllabus.syllabus_id,
          exam_date: examDate,
          force_regenerate: forceRegenerate,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.detail ?? "Study plan generation failed.");
        setStatus("error");
        return;
      }
      setPlan(data);
      setStatus("idle");
    } catch {
      setErrorMessage("Could not reach the study plan service.");
      setStatus("error");
    }
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink">Study Plan</h1>
        <p className="mt-0.5 text-sm text-ink-2">
          Day-by-day scheduling based on your syllabus
        </p>
      </div>

      <GoalsPanel syllabusId={syllabus?.syllabus_id} />

      {syllabusLoading ? (
        <LoadingSteps currentStep="Loading your syllabus" completedSteps={[]} />
      ) : !syllabus ? (
        <EmptyState
          message="No syllabus uploaded yet"
          suggestion="Upload a syllabus PDF first, then come back to build a study plan."
        />
      ) : (
        <>
          {/* Exam date picker */}
          <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <label htmlFor="exam-date" className="text-xs font-semibold text-ink-2">
                Exam date
              </label>
              <input
                id="exam-date"
                type="date"
                min={todayStr}
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="mt-1 block rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-brand-400 dark:border-brand-500/50 focus:outline-none [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>
            <Button
              onClick={() => generatePlan(!!plan)}
              disabled={!examDate || status === "loading"}
            >
              {plan ? (
                <>
                  <RefreshCw size={14} /> Regenerate plan
                </>
              ) : (
                "Generate plan"
              )}
            </Button>
          </div>

          {status === "loading" && (
            <LoadingSteps
              currentStep="Building your day-by-day schedule"
              completedSteps={["Reading syllabus topics"]}
              estimatedSeconds={30}
            />
          )}

          {status === "error" && (
            <ErrorState message={errorMessage} onRetry={() => generatePlan(true)} />
          )}

          {status === "idle" && !plan && (
            <IdleGenerateCard
              label="Generate plan"
              description="Build a full day-by-day schedule up to your exam date"
              estimatedTime="~30 seconds"
              icon={<Calendar size={22} />}
              disabled={!examDate}
              onGenerate={() => generatePlan(false)}
            />
          )}

          {status === "idle" && plan && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-medium text-ink-2">
                  {plan.total_days} day{plan.total_days === 1 ? "" : "s"} until {plan.exam_date}
                  {plan._cached ? " · cached" : ""}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                {plan.days.map((day) => (
                  <div
                    key={day.day_number}
                    className={`rounded-xl border p-4 ${SESSION_STYLES[day.session_type]}`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-ink">
                        Day {day.day_number}
                      </span>
                      <span className="rounded-full bg-surface/70 px-2 py-0.5 text-[11px] font-semibold text-ink-2">
                        {SESSION_LABELS[day.session_type]}
                      </span>
                    </div>
                    {day.topics.length > 0 ? (
                      <ul className="flex flex-col gap-1">
                        {day.topics.map((t) => (
                          <li
                            key={t.topic_id}
                            className="flex items-center gap-2 text-sm text-ink"
                          >
                            <ListChecks size={13} className="shrink-0 text-brand-400" />
                            <span>
                              {t.topic_name}{" "}
                              <span className="text-ink-3">· {t.subject}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-ink-3">No new topics — revisit earlier material.</p>
                    )}
                    {day.focus_note && (
                      <p className="mt-2 text-xs italic text-ink-3">{day.focus_note}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
