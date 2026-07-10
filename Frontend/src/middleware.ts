import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Everything under (dashboard) — dashboard, upload, plan, study/[topicId] —
// requires a signed-in user. Sign-in/sign-up and API health stay public.
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/upload(.*)",
  "/plan(.*)",
  "/study(.*)",
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
