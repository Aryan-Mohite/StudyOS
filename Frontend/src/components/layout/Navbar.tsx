"use client";
import Link from "next/link";
import { Brain, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export function Navbar() {
  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="sticky top-0 z-50 border-b border-border bg-surface/90 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500">
            <Brain size={16} className="text-white" />
          </div>
          <span className="font-display text-[17px] font-bold tracking-tight text-gray-900">
            StudyOS
          </span>
        </Link>

        {/* Links */}
        <div className="hidden items-center gap-1 md:flex">
          {["Features", "Agents", "Pricing"].map((l) => (
            <Link
              key={l}
              href={`#${l.toLowerCase()}`}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-brand-50 hover:text-brand-600"
            >
              {l}
            </Link>
          ))}
        </div>

        {/* Auth — Phase 1: hardcoded nav; Clerk re-added in Phase 4 */}
        <div className="flex items-center gap-2">
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              Sign in
            </Button>
          </Link>
          <Link href="/upload">
            <Button size="sm">
              Get started <ArrowRight size={13} />
            </Button>
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}
