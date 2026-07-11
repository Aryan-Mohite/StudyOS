"use client";
import { Calendar } from "lucide-react";

export default function PlanPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-gray-900">Study Plan</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Day-by-day scheduling based on your syllabus
        </p>
      </div>

      <div className="flex flex-col items-center gap-5 rounded-2xl border border-dashed border-border bg-surface py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50">
          <Calendar size={26} className="text-brand-500" />
        </div>
        <div>
          <p className="text-[15px] font-semibold text-gray-800">Study Plan is coming soon</p>
          <p className="mt-1 text-sm text-gray-400 max-w-sm">
            Notes, MCQs, Numericals, and the AI Tutor are live. The Study
            Plan generator is still in development.
          </p>
        </div>
      </div>
    </div>
  );
}
