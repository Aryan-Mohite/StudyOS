/**
 * Next.js instrumentation hook — runs once when the server process starts,
 * before any request is handled. Used here purely for fail-fast env
 * validation (see src/lib/env.ts) so a missing DATABASE_URL or JWT secret
 * shows up immediately in the deploy logs instead of as a 500 on someone's
 * first request.
 *
 * Requires no extra Next.js config — the instrumentation hook is on by
 * default as of Next.js 15.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnv } = await import("./lib/env");
    validateEnv();
  }
}
