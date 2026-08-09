"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Brain, LayoutDashboard, Calendar, Upload, TrendingUp, BookOpen, Menu, X } from "lucide-react";
import { ProfileBadge } from "@/components/ProfileBadge";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/plan", label: "Study Plan", icon: Calendar },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/upload", label: "Upload Syllabus", icon: Upload },
  { href: "/reference", label: "Reference Material", icon: BookOpen },
];

export function AppNavbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile menu whenever the route changes.
  useEffect(() => setMobileOpen(false), [pathname]);

  return (
    <nav className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-screen-xl items-center gap-6 px-4 py-3 sm:px-5">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500">
            <Brain size={14} className="text-white" />
          </div>
          <span className="font-display text-[15px] font-bold tracking-tight text-ink">StudyOS</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname?.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  isActive
                    ? "bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400"
                    : "text-ink-2 hover:bg-brand-50 dark:hover:bg-brand-500/10 hover:text-brand-600"
                }`}
              >
                <Icon size={13} />
                {label}
              </Link>
            );
          })}
        </div>

        {/* Right side: theme, profile, user, mobile trigger */}
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle className="hidden sm:flex" />
          <div className="hidden sm:block">
            <ProfileBadge />
          </div>
          <UserButton afterSignOutUrl="/sign-in" />
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="app-mobile-menu"
            className="flex h-8 w-8 items-center justify-center rounded-md text-ink-2 hover:bg-brand-50 dark:hover:bg-brand-500/10 hover:text-brand-600 lg:hidden"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div id="app-mobile-menu" className="border-t border-border bg-surface px-4 py-3 lg:hidden">
          <div className="flex flex-col gap-0.5" aria-label="Primary">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || pathname?.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400"
                      : "text-ink-2 hover:bg-brand-50 dark:hover:bg-brand-500/10 hover:text-brand-600"
                  }`}
                >
                  <Icon size={15} />
                  {label}
                </Link>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2 sm:hidden">
            <ProfileBadge />
            <ThemeToggle />
          </div>
        </div>
      )}
    </nav>
  );
}
