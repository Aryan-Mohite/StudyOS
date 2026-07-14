"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Upload, Video, Sparkles } from "lucide-react";
import { Button }  from "@/components/ui/button";
import { Badge }   from "@/components/ui/badge";
import { Mockup }  from "./Mockup";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y:  0 },
  transition: { duration: 0.5, delay, ease: "easeOut" },
});

export function Hero() {
  return (
    <section className="border-b border-border px-6 py-20">
      <div className="mx-auto flex max-w-5xl items-center gap-14">

        {/* Copy */}
        <div className="flex-1">
          <motion.div {...fadeUp(0)}>
            <Badge className="mb-6">
              <Sparkles size={11} /> Syllabus-first · AI-powered
            </Badge>
          </motion.div>

          <motion.h1
            {...fadeUp(0.1)}
            className="font-display text-[46px] font-bold leading-[1.12] tracking-tight text-gray-900"
          >
            Your syllabus.<br />
            <span className="text-brand-500">Your OS for studying.</span>
          </motion.h1>

          <motion.p {...fadeUp(0.2)} className="mt-5 max-w-md text-[17px] leading-relaxed text-gray-500">
            Upload any university syllabus and instantly get structured notes,
            solved problems, video picks, MCQs, and a personal AI tutor —
            all scoped to your exact curriculum.
          </motion.p>

          <motion.div {...fadeUp(0.3)} className="mt-8 flex flex-wrap gap-3">
            <Link href="/upload">
              <Button size="lg">
                <Upload size={16} /> Upload syllabus — free
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline">
                <Video size={15} /> See how it works
              </Button>
            </a>
          </motion.div>

          {/* Stats */}
          <motion.div {...fadeUp(0.4)} className="mt-10 flex gap-7">
            {[
              { n: "9",    l: "AI agents"        },
              { n: "6+",   l: "output types"     },
              { n: "Any",  l: "Indian university" },
            ].map((s) => (
              <div key={s.n} className="flex items-baseline gap-1.5">
                <span className="font-display text-xl font-bold text-brand-500">{s.n}</span>
                <span className="text-sm text-gray-400">{s.l}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Mockup — slide in from right */}
        <motion.div
          className="hidden w-[400px] shrink-0 lg:block"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x:  0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
        >
          <Mockup />
        </motion.div>
      </div>
    </section>
  );
}
