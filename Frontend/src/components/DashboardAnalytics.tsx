"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Flame, Target, AlertCircle, RotateCw, ArrowRight } from "lucide-react";
import type { DashboardAnalytics } from "@/types";
import { getDashboardAnalytics } from "@/lib/api";

/**
 * Client-fetched so it doesn't block the dashboard's server-rendered
 * syllabus content, and so a brand-new user (no attempts yet) just sees
 * empty-friendly zeros rather than the whole page failing.
 */
export function DashboardAnalyticsPanel() {
  const [data, setData] = useState<DashboardAnalytics | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getDashboardAnalytics()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded) {
    return <div className="mb-6 h-24 animate-pulse rounded-xl border border-border bg-surface" />;
  }
  if (!data) return null; // best-effort widget — dashboard works fine without it

  const dailyPct = Math.min(100, Math.round((data.daily_goal.completed_questions / Math.max(1, data.daily_goal.target_questions)) * 100));

  return (
    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-4">
      {/* Streak */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center gap-2 text-orange-500">
          <Flame size={16} />
          <span className="font-display text-xl font-bold text-gray-900">{data.streak_days}</span>
        </div>
        <p className="mt-0.5 text-[12px] font-medium text-gray-700">Day streak</p>
        <p className="text-[11px] text-gray-400">{data.streak_days > 0 ? "Keep it going" : "Answer a question today"}</p>
      </div>

      {/* Today's goal */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center gap-2 text-brand-500">
          <Target size={16} />
          <span className="font-display text-xl font-bold text-gray-900">
            {data.daily_goal.completed_questions}/{data.daily_goal.target_questions}
          </span>
        </div>
        <p className="mt-0.5 text-[12px] font-medium text-gray-700">Today&apos;s goal</p>
        <div className="mt-1.5 h-1.5 w-full rounded-full bg-border">
          <div className="h-1.5 rounded-full bg-brand-500 transition-all" style={{ width: `${dailyPct}%` }} />
        </div>
      </div>

      {/* Overall accuracy */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center gap-2 text-emerald-600">
          <span className="font-display text-xl font-bold text-gray-900">
            {data.overall_accuracy !== null ? `${data.overall_accuracy}%` : "—"}
          </span>
        </div>
        <p className="mt-0.5 text-[12px] font-medium text-gray-700">Overall accuracy</p>
        <p className="text-[11px] text-gray-400">{data.total_attempts} question{data.total_attempts === 1 ? "" : "s"} answered</p>
      </div>

      {/* Weak topics / revisions */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center gap-2 text-amber-500">
          <AlertCircle size={16} />
          <span className="font-display text-xl font-bold text-gray-900">{data.weak_topics.length}</span>
        </div>
        <p className="mt-0.5 text-[12px] font-medium text-gray-700">Weak topic{data.weak_topics.length === 1 ? "" : "s"}</p>
        <Link href="/progress" className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-brand-500 hover:text-brand-700">
          View progress <ArrowRight size={10} />
        </Link>
      </div>

      {/* Weak topics list + upcoming revisions, spanning full width when present */}
      {(data.weak_topics.length > 0 || data.upcoming_revisions.length > 0) && (
        <div className="col-span-full grid grid-cols-1 gap-3 sm:grid-cols-2">
          {data.weak_topics.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-amber-700">
                <AlertCircle size={12} /> Focus areas
              </h3>
              <ul className="flex flex-col gap-1.5">
                {data.weak_topics.map((t) => (
                  <li key={t.topic_id} className="flex items-center justify-between text-[13px]">
                    <Link href={`/study/${t.topic_id}`} className="text-gray-700 hover:text-brand-600 truncate">
                      {t.topic_name}
                    </Link>
                    <span className="ml-2 shrink-0 text-[11px] font-semibold text-amber-600">{Math.round(t.mastery_score)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data.upcoming_revisions.length > 0 && (
            <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-brand-600">
                <RotateCw size={12} /> Due for revision
              </h3>
              <ul className="flex flex-col gap-1.5">
                {data.upcoming_revisions.map((r) => (
                  <li key={r.topic_id} className="flex items-center justify-between text-[13px]">
                    <Link href={`/study/${r.topic_id}`} className="text-gray-700 hover:text-brand-600 truncate">
                      {r.topic_name}
                    </Link>
                    <span className={`ml-2 shrink-0 text-[11px] font-semibold ${r.overdue ? "text-red-500" : "text-gray-400"}`}>
                      {r.overdue ? "Overdue" : r.next_review_date}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
