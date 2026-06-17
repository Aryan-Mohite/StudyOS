import Link from "next/link";
import { Brain, LayoutDashboard, Calendar, Upload } from "lucide-react";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/plan", label: "Study Plan", icon: Calendar },
  { href: "/upload", label: "Upload Syllabus", icon: Upload },
];

export function AppNavbar() {
  return (
    <nav className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-screen-xl items-center gap-6 px-5 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500">
            <Brain size={14} className="text-white" />
          </div>
          <span className="font-display text-[15px] font-bold tracking-tight text-gray-900">StudyOS</span>
        </Link>

        {/* Nav */}
        <div className="flex items-center gap-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium text-gray-500 transition-colors hover:bg-brand-50 hover:text-brand-600"
            >
              <Icon size={13} />
              {label}
            </Link>
          ))}
        </div>

        {/* Dev user indicator */}
        <div className="ml-auto flex items-center gap-2">
          <span className="rounded-full border border-dashed border-gray-300 px-2.5 py-0.5 text-[11px] text-gray-400">
            dev-user-01
          </span>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-[12px] font-semibold text-brand-600">
            D
          </div>
        </div>
      </div>
    </nav>
  );
}
