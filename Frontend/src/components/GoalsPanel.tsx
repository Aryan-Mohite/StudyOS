"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Target, CalendarCheck, Pencil, RotateCw } from "lucide-react";
import type { DailyGoal, WeeklyGoal, RevisionItem } from "@/types";
import { getDailyGoal, updateDailyGoal, getWeeklyGoal, updateWeeklyGoal, getRevisionSchedule } from "@/lib/api";

/** Daily/weekly goal editors + spaced-repetition revision queue, for the Study Plan page. */
export function GoalsPanel() {
  const [daily, setDaily] = useState<DailyGoal | null>(null);
  const [weekly, setWeekly] = useState<WeeklyGoal | null>(null);
  const [revisions, setRevisions] = useState<RevisionItem[] | null>(null);
  const [editingDaily, setEditingDaily] = useState(false);
  const [editingWeekly, setEditingWeekly] = useState(false);
  const [dailyInput, setDailyInput] = useState("10");
  const [weeklyInput, setWeeklyInput] = useState("5");

  const load = () => {
    getDailyGoal().then((g) => { setDaily(g); setDailyInput(String(g.target_questions)); }).catch(() => setDaily(null));
    getWeeklyGoal().then((g) => { setWeekly(g); setWeeklyInput(String(g.target_topics)); }).catch(() => setWeekly(null));
    getRevisionSchedule().then((r) => setRevisions(r.items)).catch(() => setRevisions(null));
  };

  useEffect(load, []);

  const saveDaily = async () => {
    const n = Number(dailyInput);
    if (!Number.isFinite(n) || n < 1) return;
    const g = await updateDailyGoal(Math.round(n)).catch(() => null);
    if (g) setDaily(g);
    setEditingDaily(false);
  };

  const saveWeekly = async () => {
    const n = Number(weeklyInput);
    if (!Number.isFinite(n) || n < 1) return;
    const g = await updateWeeklyGoal(Math.round(n)).catch(() => null);
    if (g) setWeekly(g);
    setEditingWeekly(false);
  };

  if (!daily && !weekly && !revisions) return null; // best-effort — plan page works without this

  const dailyPct = daily ? Math.min(100, Math.round((daily.completed_questions / Math.max(1, daily.target_questions)) * 100)) : 0;
  const weeklyPct = weekly ? Math.min(100, Math.round((weekly.completed_topics / Math.max(1, weekly.target_topics)) * 100)) : 0;

  return (
    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {/* Daily goal */}
      {daily && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-gray-500">
              <Target size={12} /> Daily goal
            </h3>
            {!editingDaily && (
              <button onClick={() => setEditingDaily(true)} className="text-gray-400 hover:text-brand-500">
                <Pencil size={12} />
              </button>
            )}
          </div>
          {editingDaily ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={200}
                value={dailyInput}
                onChange={(e) => setDailyInput(e.target.value)}
                className="w-20 rounded-lg border border-border px-2 py-1 text-sm"
              />
              <span className="text-[12px] text-gray-500">questions/day</span>
              <button onClick={saveDaily} className="ml-auto text-[12px] font-semibold text-brand-500 hover:text-brand-700">Save</button>
            </div>
          ) : (
            <>
              <p className="font-display text-lg font-bold text-gray-900">
                {daily.completed_questions} / {daily.target_questions} questions
              </p>
              <div className="mt-2 h-1.5 w-full rounded-full bg-border">
                <div className="h-1.5 rounded-full bg-brand-500 transition-all" style={{ width: `${dailyPct}%` }} />
              </div>
            </>
          )}
        </div>
      )}

      {/* Weekly goal */}
      {weekly && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-gray-500">
              <CalendarCheck size={12} /> Weekly goal
            </h3>
            {!editingWeekly && (
              <button onClick={() => setEditingWeekly(true)} className="text-gray-400 hover:text-brand-500">
                <Pencil size={12} />
              </button>
            )}
          </div>
          {editingWeekly ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={50}
                value={weeklyInput}
                onChange={(e) => setWeeklyInput(e.target.value)}
                className="w-20 rounded-lg border border-border px-2 py-1 text-sm"
              />
              <span className="text-[12px] text-gray-500">topics/week</span>
              <button onClick={saveWeekly} className="ml-auto text-[12px] font-semibold text-brand-500 hover:text-brand-700">Save</button>
            </div>
          ) : (
            <>
              <p className="font-display text-lg font-bold text-gray-900">
                {weekly.completed_topics} / {weekly.target_topics} topics
              </p>
              <div className="mt-2 h-1.5 w-full rounded-full bg-border">
                <div className="h-1.5 rounded-full bg-brand-500 transition-all" style={{ width: `${weeklyPct}%` }} />
              </div>
            </>
          )}
        </div>
      )}

      {/* Revision schedule */}
      {revisions && revisions.length > 0 && (
        <div className="col-span-full rounded-xl border border-border bg-surface p-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-gray-500">
            <RotateCw size={12} /> Revision schedule
          </h3>
          <ul className="flex flex-col gap-1.5">
            {revisions.map((r) => (
              <li key={r.topic_id} className="flex items-center justify-between text-[13px]">
                <Link href={`/study/${r.topic_id}`} className="text-gray-700 hover:text-brand-600">
                  {r.topic_name} <span className="text-gray-400">· {r.subject}</span>
                </Link>
                <span className={`text-[11px] font-semibold ${r.overdue ? "text-red-500" : "text-gray-400"}`}>
                  {r.overdue ? "Overdue" : r.next_review_date}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
