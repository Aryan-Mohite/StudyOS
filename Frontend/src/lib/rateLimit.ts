/**
 * rateLimit.ts — In-memory per-key rate limiting for API routes.
 *
 * Fixed-window counter, keyed by whatever the caller passes (usually the
 * Clerk user id, falling back to IP for unauthenticated routes). Lives in
 * process memory — consistent with the project's lean-infra stance (no
 * Redis until a specific problem demands it, see CHANGES.md).
 *
 * Caveat worth knowing: this resets on deploy/restart, and if PM2 is ever
 * run in cluster mode (multiple Node processes) each process gets its own
 * counter, so the effective limit multiplies by the instance count. Fine
 * for the single-instance VPS deployment this project is planned for
 * (see ARCHITECTURE.md); revisit with a shared store (Redis) if that changes.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Periodic sweep so `buckets` doesn't grow unboundedly with one-off callers
// (e.g. IP-keyed entries for anonymous requests to /api/health).
const SWEEP_INTERVAL_MS = 5 * 60_000;
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}, SWEEP_INTERVAL_MS).unref?.();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/**
 * @param key         Unique identifier for the caller (userId or IP), prefixed by route by the caller.
 * @param limit       Max requests allowed in the window.
 * @param windowMs    Window size in milliseconds.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Preset limits by route sensitivity — generation routes cost real LLM money, reads don't. */
export const RATE_LIMITS = {
  generation: { limit: 15, windowMs: 60_000 }, // notes/mcq/plan/upload — expensive, LLM-backed
  write: { limit: 30, windowMs: 60_000 }, // attempts/goals/profile — cheap DB writes
  read: { limit: 60, windowMs: 60_000 }, // dashboard/progress/history — GETs
} as const;
