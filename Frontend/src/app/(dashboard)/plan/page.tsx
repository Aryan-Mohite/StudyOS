"use client";
import { useState } from "react";
import { Calendar, Loader2 } from "lucide-react";
import { StudyPlanView } from "@/components/plan/StudyPlanView";
import { Button } from "@/components/ui/button";
import { mockGenerateStudyPlan } from "@/lib/mock-api";
import type { StudyPlan } from "@/types";
import { LoadingSteps } from "@/components/shared/LoadingSteps";

export default function PlanPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [currentStep, setCurrentStep] = useState("");
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const STEPS = [
    "Counting your topics…",
    "Mapping week-by-week schedule…",
    "Prioritising high-weight topics…",
    "Scheduling revision and buffer days…",
  ];

  const generate = async () => {
    setStatus("loading");
    setCompletedSteps([]);

    const result = await mockGenerateStudyPlan((step) => {
      setCurrentStep(step);
      setCompletedSteps(() => {
        const idx = STEPS.indexOf(step);
        return STEPS.slice(0, idx);
      });
    });

    setPlan(result);
    setStatus("success");
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Study Plan</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Exam: Nov 15, 2024 · {plan ? plan.total_topics : "23"} topics across 2 subjects
          </p>
        </div>
        {status === "success" && (
          <Button variant="outline" size="sm" onClick={generate}>
            <Loader2 size={13} />
            Regenerate
          </Button>
        )}
      </div>

      {status === "idle" && (
        <div className="flex flex-col items-center gap-6 rounded-2xl border border-dashed border-border bg-surface py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50">
            <Calendar size={26} className="text-brand-500" />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-gray-800">
              Generate your personalised study plan
            </p>
            <p className="mt-1 text-sm text-gray-400">
              Based on your syllabus · 5 weeks · Exam Nov 15
            </p>
          </div>
          <Button size="lg" onClick={generate}>
            <Calendar size={16} />
            Create Study Plan
          </Button>
        </div>
      )}

      {status === "loading" && (
        <div className="rounded-2xl border border-border bg-surface py-4">
          <LoadingSteps
            currentStep={currentStep}
            completedSteps={completedSteps}
            estimatedSeconds={20}
          />
        </div>
      )}

      {status === "success" && plan && (
        <StudyPlanView plan={plan} />
      )}
    </div>
  );
}
