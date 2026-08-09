"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

/**
 * Compact light/dark toggle. Renders a neutral placeholder until mounted so
 * server and client markup match (next-themes only knows the real theme
 * after hydration, since it reads localStorage / prefers-color-scheme).
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className={`h-8 w-8 shrink-0 rounded-md ${className}`} aria-hidden="true" />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-2 transition-colors hover:bg-brand-50 dark:hover:bg-brand-500/10 hover:text-brand-600 ${className}`}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
