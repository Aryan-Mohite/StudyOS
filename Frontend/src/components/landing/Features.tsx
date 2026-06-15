"use client";
import { motion } from "framer-motion";
import { FileText, Calculator, Youtube, HelpCircle, Calendar, TrendingUp, MessageSquare, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  { icon: FileText,   color: "#4650E0", bg: "#EEF0FF", title: "Structured Notes",      desc: "Long notes, short notes, and revision sheets — grounded in your syllabus and textbook." },
  { icon: Calculator, color: "#7C3AED", bg: "#F5F3FF", title: "Solved Numericals",     desc: "Step-by-step derivations for Maths, Physics, Statistics, and DSA problems." },
  { icon: Youtube,    color: "#DB2777", bg: "#FDF2F8", title: "Video Picks",           desc: "Best-matched NPTEL, YouTube, and MIT OCW videos per topic." },
  { icon: HelpCircle, color: "#D97706", bg: "#FFFBEB", title: "MCQs & Viva Qs",       desc: "Auto-generated practice questions mapped to your topic list and previous year papers." },
  { icon: Calendar,   color: "#059669", bg: "#ECFDF5", title: "Smart Study Plans",     desc: "7-day to 60-day plans tailored to your exam date and current progress." },
  { icon: TrendingUp, color: "#DC2626", bg: "#FEF2F2", title: "Exam Predictions",      desc: "PYQ analysis surfaces High, Medium, Low priority topics before your exam." },
] as const;

const prompts = [
  "Explain AVL rotations",
  "Numerical on Dijkstra",
  "MCQs for Unit 3",
  "7-day revision plan",
  "High-priority PYQ topics",
  "DBMS viva questions",
];

export function Features() {
  return (
    <section id="features" className="bg-surface px-6 py-20">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="mb-12 max-w-lg">
          <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-brand-500">
            What you get
          </span>
          <h2 className="font-display text-[30px] font-bold tracking-tight text-gray-900">
            Everything a student needs.
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-gray-500">
            Upload your syllabus once. StudyOS builds a complete learning environment
            — no manual searching across YouTube, PDFs, or question banks.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
            >
              <Card className="h-full transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:shadow-brand-500/10">
                <CardContent className="pt-5">
                  <div style={{ background: f.bg }} className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl">
                    <f.icon size={19} style={{ color: f.color }} />
                  </div>
                  <h3 className="mb-1.5 text-[14px] font-semibold text-gray-900">{f.title}</h3>
                  <p className="text-[13px] leading-relaxed text-gray-500">{f.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* AI Tutor strip */}
        <div className="mt-6 rounded-xl border border-border bg-page p-4">
          <div className="mb-3 flex items-center gap-2">
            <MessageSquare size={14} className="text-brand-500" />
            <span className="text-xs font-semibold text-gray-500">AI Tutor — ask anything, scoped to your syllabus</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {prompts.map((p) => (
              <button key={p} type="button"
                className="flex cursor-pointer items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-600 transition-colors hover:bg-brand-100">
                {p} <ChevronRight size={11} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
