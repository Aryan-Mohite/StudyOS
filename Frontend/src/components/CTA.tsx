"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTA() {
  return (
    <section className="border-t border-border bg-page px-6 py-20">
      <motion.div
        className="mx-auto max-w-xl text-center"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <span className="font-display text-[13px] font-semibold uppercase tracking-[0.14em] text-brand-500">
          Unit 01 of your syllabus
        </span>
        <h2 className="mt-3 font-display text-[34px] font-bold tracking-tight text-gray-900">
          Start with your syllabus.
        </h2>
        <p className="mx-auto mt-4 max-w-sm text-[16px] leading-relaxed text-gray-500">
          Go from &quot;I don&apos;t know where to start&quot; to a full study plan in minutes.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link href="/upload">
            <Upload size={16} /> Upload syllabus — it&apos;s free
          </Link>
        </Button>
        <p className="mt-4 text-[13px] text-gray-400">
          No credit card · Works for any Indian university
        </p>
      </motion.div>
    </section>
  );
}
