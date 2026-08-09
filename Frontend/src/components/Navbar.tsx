"use client";
import Link from "next/link";
import { Brain, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { motion } from "framer-motion";

export function Navbar() {
  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="sticky top-0 z-50 border-b border-border bg-surface/90 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500">
            <Brain size={16} className="text-white" />
          </div>
          <span className="font-display text-[17px] font-bold tracking-tight text-ink">
            StudyOS
          </span>
        </Link>

        {/* Links */}
        <div className="hidden items-center gap-1 md:flex">
          {["Features"].map((l) => (
            <Link
              key={l}
              href={`#${l.toLowerCase()}`}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-ink-2 transition-colors hover:bg-brand-50 dark:hover:bg-brand-500/10 hover:text-brand-600"
            >
              {l}
            </Link>
          ))}
        </div>

        {/* Auth */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle className="hidden sm:flex" />
          <Button asChild variant="outline" size="sm">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/sign-up">
              <span className="hidden xs:inline">Get started</span>
              <span className="xs:hidden">Start</span>
              <ArrowRight size={13} />
            </Link>
          </Button>
        </div>
      </div>
    </motion.nav>
  );
}
