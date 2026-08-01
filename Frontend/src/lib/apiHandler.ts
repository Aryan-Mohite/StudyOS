/**
 * apiHandler.ts — Shared wrapper for Next.js API route handlers.
 *
 * Applies, consistently across every route, the parts of "secure APIs"
 * that don't belong copy-pasted into each of the 20+ route files:
 *   - structured JSON request logging (one line per request, no bodies/PII)
 *   - per-caller rate limiting (see rateLimit.ts)
 *   - a single error-handling shape, so a thrown error never leaks a raw
 *     stack trace to the client
 *
 * Auth (`auth()`/`requireRole`) and request-body validation stay in each
 * route, since they're route-specific — this wrapper only handles the
 * cross-cutting concerns.
 *
 * Usage:
 *   export const POST = withApiHandler(async (req, ctx) => {
 *     const { userId } = ctx.auth;
 *     ...
 *     return NextResponse.json(result);
 *   }, { rateLimit: RATE_LIMITS.generation });
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { randomUUID } from "crypto";
import { checkRateLimit, RATE_LIMITS } from "./rateLimit";
import { ForbiddenError } from "./roles";

type RateLimitTier = keyof typeof RATE_LIMITS;

export interface ApiContext {
  requestId: string;
  userId: string | null;
}

// RouteParams is Next.js's second handler argument for dynamic routes,
// e.g. `{ params: Promise<{ topicId: string }> }` — passed through
// untouched so wrapped dynamic routes ([topicId], etc.) keep working.
type Handler<RouteParams = unknown> = (
  req: NextRequest,
  ctx: ApiContext,
  routeParams: RouteParams,
) => Promise<NextResponse>;

interface Options {
  /** Which preset rate-limit bucket applies to this route. Omit to skip rate limiting (e.g. /api/health). */
  rateLimit?: RateLimitTier;
  /** If true (default), unauthenticated callers are rejected before the handler runs. Set false for routes that do their own public/auth branching. */
  requireAuth?: boolean;
}

function log(event: Record<string, unknown>) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), ...event }));
}

export function withApiHandler<RouteParams = unknown>(handler: Handler<RouteParams>, options: Options = {}) {
  const { rateLimit, requireAuth = true } = options;

  return async (req: NextRequest, routeParams: RouteParams) => {
    const requestId = req.headers.get("x-request-id") ?? randomUUID();
    const start = Date.now();
    const route = req.nextUrl.pathname;
    const method = req.method;

    let userId: string | null = null;
    try {
      const session = await auth();
      userId = session.userId;
    } catch {
      // auth() itself failing (misconfigured Clerk) shouldn't crash the wrapper — treat as unauthenticated.
    }

    if (requireAuth && !userId) {
      log({ level: "info", requestId, route, method, status: 401, durationMs: Date.now() - start });
      return NextResponse.json({ detail: "Not signed in." }, { status: 401 });
    }

    if (rateLimit) {
      const key = `${route}:${userId ?? req.headers.get("x-forwarded-for") ?? "anonymous"}`;
      const { limit, windowMs } = RATE_LIMITS[rateLimit];
      const result = checkRateLimit(key, limit, windowMs);
      if (!result.allowed) {
        log({ level: "warn", requestId, route, method, userId, status: 429, durationMs: Date.now() - start });
        return NextResponse.json(
          { detail: "Rate limit exceeded. Try again shortly." },
          { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } },
        );
      }
    }

    try {
      const response = await handler(req, { requestId, userId }, routeParams);
      response.headers.set("x-request-id", requestId);
      log({ level: "info", requestId, route, method, userId, status: response.status, durationMs: Date.now() - start });
      return response;
    } catch (err) {
      if (err instanceof ForbiddenError) {
        log({ level: "warn", requestId, route, method, userId, status: 403, durationMs: Date.now() - start });
        return NextResponse.json({ detail: err.message }, { status: 403 });
      }
      const detail = err instanceof Error ? err.message : "Unexpected error.";
      log({
        level: "error",
        requestId,
        route,
        method,
        userId,
        status: 500,
        durationMs: Date.now() - start,
        error: detail,
      });
      // Generic message to the client — never forward raw error internals.
      return NextResponse.json({ detail: "Something went wrong. Please try again." }, { status: 500 });
    }
  };
}
