import Link from "next/link";
import { Brain } from "lucide-react";

const links = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms",   href: "/terms"   },
  { label: "Contact", href: "/contact" },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface py-6">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-6 sm:flex-row">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-500">
            <Brain size={14} className="text-white" />
          </div>
          <span className="font-display text-sm font-bold text-gray-900">StudyOS</span>
        </Link>
        <p className="text-xs text-gray-400">© 2025 StudyOS · Built for Indian engineering students</p>
        <nav className="flex gap-4">
          {links.map((l) => (
            <Link key={l.label} href={l.href}
              className="text-xs text-gray-400 transition-colors hover:text-brand-600">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
