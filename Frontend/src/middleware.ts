import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Everything under (dashboard) — dashboard, upload, plan, study/[topicId] —
// requires a signed-in user. Sign-in/sign-up and API health stay public.
//
// API routes are matched here too. Previously only the *page* routes were
// gated — every /api/** route handler was reachable anonymously and fell
// back to a shared "dev-user-01" identity, so unauthenticated callers could
// hit LLM-calling endpoints (notes/mcq/numericals/plan generation, tutor
// chat, upload) for free and have their data land in one shared bucket.
// Gate every API route that costs money or touches per-user data; leave
// /api/health public since it does neither.
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/upload(.*)",
  "/plan(.*)",
  "/study(.*)",
  "/profile(.*)",
  "/api/upload(.*)",
  "/api/notes(.*)",
  "/api/mcq(.*)",
  "/api/numericals(.*)",
  "/api/plan(.*)",
  "/api/chat(.*)",
  "/api/profile(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
