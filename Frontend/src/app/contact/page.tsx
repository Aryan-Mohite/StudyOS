import Link from "next/link";
import { Brain, Mail, Github } from "lucide-react";

export const metadata = { title: "Contact · StudyOS" };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-500">
          <Brain size={14} className="text-white" />
        </div>
        <span className="font-display text-sm font-bold text-ink">StudyOS</span>
      </Link>

      <h1 className="font-display text-2xl font-bold text-ink">Contact</h1>
      <p className="mt-2 text-sm text-ink-2">
        Questions, feedback, or found a bug? Reach out through either of these.
      </p>

      <div className="mt-8 flex flex-col gap-3">
        <a
          href="mailto:support@studyos.app"
          className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 text-sm text-ink hover:border-brand-300 dark:border-brand-500/40 transition-colors"
        >
          <Mail size={16} className="text-brand-500" />
          support@studyos.app
        </a>
        <a
          href="https://github.com/Aryan-Mohite/StudyOS"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 text-sm text-ink hover:border-brand-300 dark:border-brand-500/40 transition-colors"
        >
          <Github size={16} className="text-brand-500" />
          github.com/Aryan-Mohite/StudyOS
        </a>
      </div>
    </div>
  );
}
