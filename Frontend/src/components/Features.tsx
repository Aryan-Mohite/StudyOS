"use client";
import { motion } from "framer-motion";
import { FileText, HelpCircle, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  { icon: FileText,   color: "#4650E0", bg: "#EEF0FF", title: "Structured Notes",      desc: "Long notes, short notes, and revision sheets — grounded in your syllabus and textbook." },
  { icon: HelpCircle, color: "#D97706", bg: "#FFFBEB", title: "MCQs & Practice",      desc: "Auto-generated practice questions mapped to your topic list, with adjustable difficulty." },
  { icon: Calendar,   color: "#059669", bg: "#ECFDF5", title: "Smart Study Plans",     desc: "Day-by-day plans tailored to your exam date and current progress." },
] as const;

export function Features() {
  return (
    <section id="features" className="bg-surface px-6 py-20">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="mb-12 max-w-lg">
          <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-brand-500">
            What you get
          </span>
          <h2 className="font-display text-[30px] font-bold tracking-tight text-ink">
            Everything a student needs.
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
            Upload your syllabus once. StudyOS builds a complete learning environment
            — no manual searching across PDFs or question banks.
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
                  <h3 className="mb-1.5 text-[14px] font-semibold text-ink">{f.title}</h3>
                  <p className="text-[13px] leading-relaxed text-ink-2">{f.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
