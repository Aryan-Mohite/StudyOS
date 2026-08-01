# Fixes — Next.js Console/Runtime Errors (2026-07-31)

## 1. Hydration mismatch on `<body>` (Console Error, image 2/3)

**Cause:** A browser extension (looks like Bitdefender TrafficLight / a similar
security extension — signature is `bis_register` + `__processed_<uuid>`)
injects attributes onto `<body>` before React hydrates. React sees those
extra attributes on the client and flags a mismatch. `suppressHydrationWarning`
was already set on `<html>` in `layout.tsx` but not on `<body>`, so the
warning still fired for attributes injected on `<body>` itself.

**Fix:** `Frontend/src/app/layout.tsx` — added `suppressHydrationWarning` to
the `<body>` tag as well. This only tells React to ignore mismatches on that
one element's attributes; it does not disable hydration warnings anywhere
else in the tree, so it's safe.

This is not a bug in your app — it'll still show up for users who have a
similar extension installed, but it's cosmetic (dev-overlay-only) and this is
the standard, documented way Next.js expects you to handle it.

## 2. Clerk `<SignIn/>` "not configured correctly" (Runtime Error, image 1/3)

**Cause:** `sign-in/page.tsx` and `sign-up/page.tsx` were plain (non-catch-all)
routes. Clerk's `<SignIn/>` / `<SignUp/>` components manage their own
sub-navigation (e.g. `/sign-in/factor-one`, `/sign-in/sso-callback`) and
require the page to be mounted on a catch-all route
(`[[...rest]]`) to handle those internal steps. Your middleware itself was
fine — `/sign-in` and `/sign-up` were correctly left out of
`isProtectedRoute`, so cause #2 in the Clerk error message didn't apply here.

**Fix:**
- Moved `Frontend/src/app/(auth)/sign-in/page.tsx` →
  `Frontend/src/app/(auth)/sign-in/[[...rest]]/page.tsx`
- Moved `Frontend/src/app/(auth)/sign-up/page.tsx` →
  `Frontend/src/app/(auth)/sign-up/[[...rest]]/page.tsx`
- Component code inside each page is unchanged (still `path="/sign-in"` /
  `path="/sign-up"`). All existing links (`Navbar.tsx`, `AppNavbar.tsx`,
  `.env.local.example` Clerk URLs) already point at `/sign-in` and
  `/sign-up`, and the catch-all route still matches those exact paths, so
  nothing else needed to change.

### ⚠️ Manual step required
Since this delivery only contains new/changed files, **you need to delete
the old files yourself** after extracting this zip (git won't do it for you):
```
rm "Frontend/src/app/(auth)/sign-in/page.tsx"
rm "Frontend/src/app/(auth)/sign-up/page.tsx"
```
If you leave the old `page.tsx` next to the new `[[...rest]]/page.tsx`,
Next.js will throw a duplicate-route build error.

---

## Verification performed
- `tsc --noEmit` on the 3 touched files: **clean, zero errors**.
- `next build`: webpack compilation of these routes succeeded (no errors
  related to sign-in/sign-up/layout). Type-checking failed afterward, but
  for a completely unrelated, pre-existing reason — see below.

## ⚠️ Separate pre-existing issue found (not fixed, out of scope)
While verifying the build, `next build` failed at the type-check stage
because these files import functions that don't actually exist in their
target modules:
- `src/app/api/chat/route.ts` imports `tutorChat` from `@/lib/agentic`, and
  `getCachedFaqAnswer`, `getNotebookIdForSyllabus`, `normalizeQuestion`,
  `upsertFaqCache` from `@/lib/db` — none of these are exported.
- `src/app/api/numericals/generate/route.ts` imports `generateNumericals`
  from `@/lib/agentic` — not exported.
- `ChatPanel.tsx` and `NumericalsView.tsx` similarly import missing members
  from `@/types` and `@/lib/api`.

This means `npm run build` currently fails regardless of the two fixes
above — it's a naming/export mismatch, most likely from the Week 5 RAG/chat
work where the route handlers were written against a planned API surface
that either got renamed in `lib/agentic.ts`/`lib/db.ts` or never got added.
Flagging this now since it'll block a production build; happy to fix it in
a follow-up once you confirm the intended function names.
