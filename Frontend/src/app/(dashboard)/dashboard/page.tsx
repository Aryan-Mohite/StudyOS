import Link from "next/link";
import { Upload, Calendar, BookOpen, ArrowRight, Beaker, FileUp } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { SyllabusTree } from "@/components/dashboard/SyllabusTree";
import { Button } from "@/components/ui/button";
import { mockSyllabus } from "@/mocks";
import { getPool, initDb } from "@/lib/db";
import { USE_REAL_API } from "@/lib/flags";
import type { RowDataPacket } from "mysql2";
import type { Syllabus, SyllabusSubject } from "@/types";

/** Fetch the signed-in user's most recently uploaded syllabus from MySQL. */
async function fetchLatestSyllabus(): Promise<Syllabus | null> {
  const { userId } = await auth();
  if (!userId) return null;

  await initDb();
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT parsed_json FROM syllabi WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
    [userId],
  );
  const row = rows[0];
  return row ? (JSON.parse(row.parsed_json) as Syllabus) : null;
}

export default async function DashboardPage() {
  // Live mode: use the real, per-user syllabus. Falls back to mock data
  // (and never touches MySQL) when NEXT_PUBLIC_USE_REAL_API is off.
  const syllabus = USE_REAL_API ? await fetchLatestSyllabus() : mockSyllabus;

  if (!syllabus) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-5 px-5 py-24 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50">
          <FileUp size={26} className="text-brand-500" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-gray-900">
            No syllabus yet
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Upload your university syllabus PDF and StudyOS will turn it into
            notes, MCQs, numericals, and a scoped AI tutor.
          </p>
        </div>
        <Link href="/upload">
          <Button size="lg">
            <Upload size={16} />
            Upload your syllabus
          </Button>
        </Link>
      </div>
    );
  }

  const totalTopics = syllabus.subjects.reduce(
    (a: number, s: SyllabusSubject) => a + s.units.reduce((b: number, u) => b + u.topics.length, 0), 0
  );
  const totalWithNumericals = syllabus.subjects.reduce(
    (a: number, s: SyllabusSubject) => a + s.units.reduce((b: number, u) => b + u.topics.filter((t) => t.has_numericals).length, 0), 0
  );

  return (
    <div className="mx-auto flex max-w-screen-xl gap-0 px-5 py-6">
      {/* Left: Syllabus tree */}
      <aside className="w-64 shrink-0 pr-6">
        <div className="sticky top-[60px] rounded-xl border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[12px] font-bold uppercase tracking-widest text-gray-400">Your Syllabus</h2>
            <Link href="/upload" className="text-[11px] text-brand-500 hover:text-brand-700 font-medium">Replace</Link>
          </div>
          <SyllabusTree syllabus={syllabus} />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-gray-900">Good morning, Student 👋</h1>
          <p className="mt-1 text-sm text-gray-500">
            {syllabus.university} · Semester {syllabus.semester} · {syllabus.subjects.length} subjects
          </p>
        </div>

        {/* Quick stats */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          {[
            { label: "Total Topics", value: totalTopics, sub: "across all subjects" },
            { label: "Numericals", value: totalWithNumericals, sub: "topics with solved problems" },
            { label: "Days to Exam", value: 45, sub: "Nov 15, 2024" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-surface p-4">
              <p className="font-display text-2xl font-bold text-brand-500">{stat.value}</p>
              <p className="mt-0.5 text-[13px] font-medium text-gray-700">{stat.label}</p>
              <p className="text-[11px] text-gray-400">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          <Link href="/plan" className="group rounded-xl border border-border bg-surface p-5 transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-brand-500/10 hover:border-brand-300">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
              <Calendar size={18} className="text-brand-500" />
            </div>
            <h3 className="text-[14px] font-semibold text-gray-900">Study Plan</h3>
            <p className="mt-1 text-[12px] text-gray-500">30-day plan ready · Exam Nov 15</p>
            <span className="mt-3 flex items-center gap-1 text-[12px] font-medium text-brand-500 group-hover:gap-2 transition-all">
              Open plan <ArrowRight size={12} />
            </span>
          </Link>
          <Link href="/upload" className="group rounded-xl border border-dashed border-border bg-page p-5 transition-all hover:border-brand-300 hover:bg-brand-50/30">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
              <Upload size={18} className="text-gray-500" />
            </div>
            <h3 className="text-[14px] font-semibold text-gray-700">Upload New Syllabus</h3>
            <p className="mt-1 text-[12px] text-gray-400">Replace or add another subject</p>
          </Link>
        </div>

        {/* Subject cards */}
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-[16px] font-semibold text-gray-900">Subjects</h2>
          <span className="text-[12px] text-gray-400">Click any topic to start studying</span>
        </div>
        <div className="flex flex-col gap-3">
          {syllabus.subjects.map((subject: SyllabusSubject, si: number) => {
            const icons = [BookOpen, Beaker];
            const IconComp = icons[si % icons.length];
            const colorSets = [
              { icon: "text-brand-500", iconBg: "bg-brand-50", border: "border-brand-200", headerBg: "bg-brand-50" },
              { icon: "text-rose-500",  iconBg: "bg-rose-50",  border: "border-rose-200",  headerBg: "bg-rose-50"  },
            ];
            const colors = colorSets[si % colorSets.length];
            const topicCount = subject.units.reduce((a: number, u) => a + u.topics.length, 0);

            return (
              <div key={subject.subject_id} className={`rounded-xl border ${colors.border} overflow-hidden`}>
                <div className={`flex items-center gap-3 ${colors.headerBg} px-5 py-4`}>
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${colors.iconBg}`}>
                    <IconComp size={17} className={colors.icon} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-[15px] font-bold text-gray-900">{subject.name}</h3>
                    <p className="text-[12px] text-gray-500">{subject.code} · {subject.units.length} units · {topicCount} topics</p>
                  </div>
                  <Link href={`/study/${subject.units[0].topics[0].topic_id}`}>
                    <Button size="sm" variant="outline" className="text-[12px]">
                      Start Studying <ArrowRight size={12} />
                    </Button>
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2 bg-surface px-5 py-4">
                  {subject.units.flatMap((u) => u.topics).slice(0, 8).map((topic) => (
                    <Link key={topic.topic_id} href={`/study/${topic.topic_id}`}>
                      <span className="cursor-pointer rounded-full border border-border bg-page px-3 py-1 text-[12px] text-gray-600 hover:border-brand-300 hover:text-brand-600 transition-colors">
                        {topic.name}
                      </span>
                    </Link>
                  ))}
                  {topicCount > 8 && (
                    <span className="rounded-full border border-border bg-page px-3 py-1 text-[12px] text-gray-400">
                      +{topicCount - 8} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
