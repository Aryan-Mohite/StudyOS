# CHANGES-UIUX.md — UI/UX pass (responsive, loading, navigation, dark mode, accessibility)

Scope: items 1–5 of the TODO list. No backend/AgenticService changes; Frontend only.
Delivered as changed/new files only — extract at repo root, overwriting existing paths.

## New files
- `Frontend/src/components/ThemeProvider.tsx` — wraps `next-themes`, class-based dark mode.
- `Frontend/src/components/ThemeToggle.tsx` — light/dark toggle button, used in both navbars.
- `Frontend/src/components/PageTransition.tsx` — Framer Motion fade/slide on dashboard route change; respects `prefers-reduced-motion`.
- `Frontend/src/components/Skeleton.tsx` — shimmer skeleton primitive (CSS animation in `globals.css`).
- `Frontend/src/app/(dashboard)/{dashboard,plan,progress,upload,reference,profile,study/[topicId]}/loading.tsx` — route-level skeletons shown during navigation/data fetch.

## Dependency added
- `next-themes` (^0.4) — class-strategy theme switching, SSR-safe.
- `package.json` is included with this bump; `package-lock.json` is **not** included (run `npm install` after extracting to regenerate it and pull in `next-themes`).

## 1. Dark mode
- `globals.css` now defines light/dark values for semantic tokens (`--color-page`, `--color-surface`, `--color-muted`, `--color-border`, `--color-ink` / `-2` / `-3`) that flip when `.dark` is applied to `<html>`.
- `tailwind.config.ts` maps `page` / `surface` / `muted` / `border` / `ink` to these CSS vars via `rgb(var(...) / <alpha-value>)`, so opacity modifiers (`bg-surface/70` etc.) keep working.
- Every raw `text-gray-*`, `bg-gray-50/100`, and `bg-white` utility across the whole `src/` tree was converted to the new tokens (`text-ink`, `text-ink-2`, `text-ink-3`, `bg-muted`, `bg-surface`) — this was scripted, then spot-checked; `tsc`/`next lint`/build all pass clean afterward.
- Pastel accent surfaces (`bg-brand-50`, `bg-amber-50`, `bg-emerald-50`, `bg-red-50`, `bg-rose-50` and their `-200`/`-300`/`-400` borders) got matching `dark:bg-*-500/10` / `dark:border-*-500/30-50` variants so status cards, badges, and callouts stay legible instead of glowing on a dark background.
- `<ThemeToggle />` added to `AppNavbar` (desktop + mobile drawer) and the marketing `Navbar`.

## 2. Better navigation
- `AppNavbar` rewritten: mobile hamburger menu (`lg:hidden`), active-route highlighting via `usePathname` + `aria-current="page"`, closes automatically on route change.
- Marketing `Navbar`: added the theme toggle, tightened spacing so it doesn't overflow on narrow phones.
- `layout.tsx` (dashboard) now wraps `{children}` in `<PageTransition>` for a subtle fade between routes.

## 3. Responsive design
- Dashboard overview (`(dashboard)/dashboard/page.tsx`): the previously fixed `w-64` sidebar is now a native `<details>` collapsible panel below `lg`, and a proper `<aside>` at `lg:` and up (no client JS needed — server component preserved). Both stat/quick-action `grid-cols-2` sections now stack on mobile (`grid-cols-1 xs:grid-cols-2`).
- Progress page: the three stat tiles (`flex gap-3`, could overflow at narrow widths) are now a responsive grid (`grid-cols-1 xs:grid-cols-3`).
- Added an `xs: 420px` breakpoint to `tailwind.config.ts` for a middle step between "stacked" and `sm:` (640px), used across the above.
- Marketing `Navbar` auth buttons no longer risk overflow on ~360px screens (reduced gap, `px-4` on mobile).

## 4. Loading animations
- `PageTransition` gives dashboard route switches a quick fade/slide instead of an abrupt swap.
- `loading.tsx` added per dashboard segment (uses `<Skeleton>` shapes matching each page's real layout) so both server-fetched (`dashboard`) and client-fetched (`plan`, `progress`, etc.) routes show a shimmer skeleton during the Suspense boundary / initial chunk load, in addition to the existing `LoadingSteps` component used for in-page async actions.
- Shimmer keyframe (`.skeleton`) added to `globals.css`, already respects the existing `prefers-reduced-motion` block.

## 5. Accessibility
- Skip-to-content link added in root `layout.tsx` (`.skip-link`, visually hidden until focused); dashboard layout and landing page both expose a `#main-content` focus target.
- `AppNavbar`'s mobile menu button has `aria-label` / `aria-expanded` / `aria-controls`; nav links get `aria-current="page"` when active.
- `ThemeToggle` has `aria-label` (reflects the action, not the current state) and `aria-pressed`.
- Two icon-only buttons in `GoalsPanel` (pencil/edit for daily & weekly goals) were missing labels — added `aria-label="Edit daily goal"` / `"Edit weekly goal"`.
- Verified: no bare `<img>` tags exist anywhere in the app (all visuals are icon components), so no alt-text gaps there.

## Known follow-ups (not done in this pass — flagging per usual practice)
- Landing-page decorative elements (`Features.tsx` icon chips, `Mockup.tsx`) use hardcoded hex colors via inline `style={{ background: ... }}` rather than the token system — they're illustrative/marketing-only and were left as-is to avoid scope creep, but will look slightly too-bright in dark mode. Low priority since they're above the fold on the landing page only.
- No dedicated color-contrast audit (WCAG AA numeric check) was run against the new dark palette — visually verified only.
- Skeletons on client-fetched routes (`plan`, `progress`, `upload`, `reference`, `profile`, `study`) only cover the Next.js route-transition/initial-load window; the in-page async states (e.g. "generating your plan") already had `LoadingSteps` and were left untouched.
- Items 6–10 (unit testing, integration testing, bug fixing, performance optimization, AI response improvements) are separate workstreams per your scope split and weren't touched here.

## Verification performed
- `npx tsc --noEmit` — clean.
- `npx next lint` — "No ESLint warnings or errors".
- `npm run build` — compiled successfully; the only build failure was `_not-found` prerendering with a placeholder Clerk key (expected — needs real `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, not a regression from this change).
