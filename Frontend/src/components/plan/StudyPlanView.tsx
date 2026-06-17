"use client";
import { useState } from "react";
import { Check, BookOpen, RefreshCcw, FlaskConical, FileText } from "lucide-react";
import type { StudyPlan, TaskType } from "@/types";

const TASK_TYPE_STYLE: Record<TaskType, { label: string; color: string; icon: typeof BookOpen }> = {
  study:     { label: "Study",     color: "text-brand-600 bg-brand-50 border-brand-200",   icon: BookOpen },
  revise:    { label: "Revise",    color: "text-amber-600 bg-amber-50 border-amber-200",   icon: RefreshCcw },
  practice:  { label: "Practice",  color: "text-violet-600 bg-violet-50 border-violet-200", icon: FlaskConical },
  mock_test: { label: "Mock Test", color: "text-red-600 bg-red-50 border-red-200",         icon: FileText },
};

interface StudyPlanViewProps {
  plan: StudyPlan;
}

export function StudyPlanView({ plan }: StudyPlanViewProps) {
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [activeWeek, setActiveWeek] = useState(1);

  const toggleTask = (taskId: string) =>
    setCompletedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) { next.delete(taskId); } else { next.add(taskId); }
      return next;
    });

  const totalTasks = plan.weeks.flatMap((w) => w.days.flatMap((d) => d.tasks)).length;
  const completedCount = completedTasks.size;
  const pct = Math.round((completedCount / totalTasks) * 100);

  const currentWeek = plan.weeks.find((w) => w.week_number === activeWeek) ?? plan.weeks[0];

  const daysUntilExam = Math.ceil(
    (new Date(plan.exam_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-surface p-4 text-center">
          <p className="font-display text-2xl font-bold text-brand-500">{daysUntilExam}</p>
          <p className="mt-0.5 text-xs text-gray-400">days until exam</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 text-center">
          <p className="font-display text-2xl font-bold text-gray-900">{completedCount}/{totalTasks}</p>
          <p className="mt-0.5 text-xs text-gray-400">tasks done</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 text-center">
          <p className="font-display text-2xl font-bold text-emerald-500">{pct}%</p>
          <p className="mt-0.5 text-xs text-gray-400">complete</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full rounded-full bg-border">
        <div
          className="h-2 rounded-full bg-brand-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Week tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {plan.weeks.map((week) => {
          const weekTasks = week.days.flatMap((d) => d.tasks);
          const weekDone = weekTasks.filter((t) => completedTasks.has(t.task_id)).length;
          const isActive = week.week_number === activeWeek;
          return (
            <button
              key={week.week_number}
              onClick={() => setActiveWeek(week.week_number)}
              className={`flex shrink-0 flex-col items-center gap-0.5 rounded-lg border px-4 py-2 text-center transition-colors ${
                isActive
                  ? "border-brand-400 bg-brand-500 text-white"
                  : "border-border bg-surface text-gray-600 hover:border-brand-300"
              }`}
            >
              <span className="text-[12px] font-semibold">Week {week.week_number}</span>
              <span className={`text-[10px] ${isActive ? "text-brand-100" : "text-gray-400"}`}>
                {weekDone}/{weekTasks.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Week theme */}
      <div>
        <h2 className="font-display text-[16px] font-bold text-gray-900">{currentWeek.theme}</h2>
        <p className="text-xs text-gray-400 mt-0.5">{currentWeek.days.length} days · {currentWeek.days.flatMap(d => d.tasks).length} tasks</p>
      </div>

      {/* Day cards */}
      <div className="flex flex-col gap-3">
        {currentWeek.days.map((day) => {
          const dayDone = day.tasks.every((t) => completedTasks.has(t.task_id));
          const totalMin = day.tasks.reduce((a, t) => a + t.duration_minutes, 0);

          return (
            <div key={day.date} className={`rounded-xl border overflow-hidden ${day.is_buffer ? "border-amber-200" : "border-border"}`}>
              {/* Day header */}
              <div className={`flex items-center justify-between px-4 py-3 ${day.is_buffer ? "bg-amber-50" : "bg-page"}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-semibold text-gray-800">{day.day_label}</p>
                    {day.is_buffer && (
                      <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                        Revision Day
                      </span>
                    )}
                    {dayDone && (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        <Check size={9} /> Done
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400">{Math.floor(totalMin / 60)}h {totalMin % 60 > 0 ? `${totalMin % 60}m` : ""} total</p>
                </div>
              </div>

              {/* Tasks */}
              <div className="divide-y divide-border">
                {day.tasks.map((task) => {
                  const isDone = completedTasks.has(task.task_id);
                  const style = TASK_TYPE_STYLE[task.task_type];
                  const IconComp = style.icon;

                  return (
                    <div
                      key={task.task_id}
                      className={`flex items-start gap-3 px-4 py-3 transition-colors ${isDone ? "bg-emerald-50/50" : "bg-surface hover:bg-page"}`}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleTask(task.task_id)}
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all ${
                          isDone
                            ? "border-emerald-500 bg-emerald-500"
                            : "border-gray-300 hover:border-brand-400"
                        }`}
                      >
                        {isDone && <Check size={10} className="text-white" strokeWidth={3} />}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-[13px] font-medium ${isDone ? "text-gray-400 line-through" : "text-gray-800"}`}>
                            {task.topic}
                          </p>
                          <span className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${style.color}`}>
                            <IconComp size={9} />
                            {style.label}
                          </span>
                          {task.priority === "high" && (
                            <span className="rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                              High priority
                            </span>
                          )}
                        </div>
                        <p className={`text-[11px] mt-0.5 ${isDone ? "text-gray-300" : "text-gray-400"}`}>
                          {task.subject} · {task.duration_minutes} min
                        </p>
                        {task.notes && !isDone && (
                          <p className="mt-1 text-[11px] text-brand-600 leading-snug">
                            💡 {task.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
