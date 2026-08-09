"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * Wraps next-themes so `dark:` Tailwind classes and our CSS-variable color
 * tokens (see globals.css) respond to the user's preference. Uses the
 * `class` attribute strategy — next-themes toggles `class="dark"` on <html>.
 * `disableTransitionOnChange` avoids a flash of transitioning colors when
 * the user actively switches themes.
 */
export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange {...props}>
      {children}
    </NextThemesProvider>
  );
}
