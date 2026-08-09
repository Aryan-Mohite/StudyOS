"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, BookOpen, Beaker } from "lucide-react";
import type { Syllabus } from "@/types";

const SUBJECT_COLORS: Record<string, { bg: string; text: string; icon: typeof BookOpen }> = {
  "sub-ds": { bg: "bg-brand-50 dark:bg-brand-500/10", text: "text-brand-600", icon: BookOpen },
  "sub-ht": { bg: "bg-rose-50 dark:bg-rose-500/10", text: "text-rose-600", icon: Beaker },
};

interface SyllabusTreeProps {
  syllabus: Syllabus;
  activeTopicId?: string;
  /** If provided, clicking a topic calls this instead of navigating */
  onTopicClick?: (topicId: string) => void;
}

export function SyllabusTree({ syllabus, activeTopicId, onTopicClick }: SyllabusTreeProps) {
  // All subjects/units expanded by default
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(
    new Set(syllabus.subjects.map((s) => s.subject_id))
  );
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(
    new Set(syllabus.subjects.flatMap((s) => s.units.map((u) => `${s.subject_id}-${u.unit_number}`)))
  );

  const toggleSubject = (id: string) =>
    setExpandedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });

  const toggleUnit = (key: string) =>
    setExpandedUnits((prev) => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); } else { next.add(key); }
      return next;
    });

  return (
    <div className="flex flex-col gap-1">
      <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-ink-3">
        {syllabus.subjects.length} Subjects · Sem {syllabus.semester}
      </p>

      {syllabus.subjects.map((subject) => {
        const isSubOpen = expandedSubjects.has(subject.subject_id);
        const colors = SUBJECT_COLORS[subject.subject_id] ?? { bg: "bg-muted", text: "text-ink-2", icon: BookOpen };
        const IconComp = colors.icon;
        const topicCount = subject.units.reduce((a, u) => a + u.topics.length, 0);

        return (
          <div key={subject.subject_id}>
            {/* Subject header */}
            <button
              onClick={() => toggleSubject(subject.subject_id)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-page transition-colors"
            >
              <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${colors.bg}`}>
                <IconComp size={12} className={colors.text} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-ink truncate">{subject.name}</p>
                <p className="text-[10px] text-ink-3">{subject.code} · {topicCount} topics</p>
              </div>
              {isSubOpen
                ? <ChevronDown size={13} className="shrink-0 text-ink-3" />
                : <ChevronRight size={13} className="shrink-0 text-ink-3" />}
            </button>

            {/* Units and topics */}
            {isSubOpen && (
              <div className="ml-3 border-l border-border pl-3">
                {subject.units.map((unit) => {
                  const unitKey = `${subject.subject_id}-${unit.unit_number}`;
                  const isUnitOpen = expandedUnits.has(unitKey);

                  return (
                    <div key={unitKey}>
                      <button
                        onClick={() => toggleUnit(unitKey)}
                        className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left hover:bg-page transition-colors"
                      >
                        {isUnitOpen
                          ? <ChevronDown size={11} className="shrink-0 text-ink-3" />
                          : <ChevronRight size={11} className="shrink-0 text-ink-3" />}
                        <span className="text-[11px] font-semibold text-ink-2 truncate">
                          Unit {unit.unit_number}: {unit.title}
                        </span>
                      </button>

                      {isUnitOpen && (
                        <div className="ml-3 flex flex-col gap-0.5 pb-1">
                          {unit.topics.map((topic) => {
                            const isActive = topic.topic_id === activeTopicId;
                            const content = (
                              <span
                                className={`block rounded-md px-2 py-1.5 text-[12px] leading-snug transition-colors ${
                                  isActive
                                    ? "bg-brand-500 text-white font-medium"
                                    : "text-ink-2 hover:bg-brand-50 dark:hover:bg-brand-500/10 hover:text-brand-700"
                                }`}
                              >
                                {topic.name}
                              </span>
                            );

                            if (onTopicClick) {
                              return (
                                <button
                                  key={topic.topic_id}
                                  onClick={() => onTopicClick(topic.topic_id)}
                                  className="text-left w-full"
                                >
                                  {content}
                                </button>
                              );
                            }

                            return (
                              <Link key={topic.topic_id} href={`/study/${topic.topic_id}`}>
                                {content}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
