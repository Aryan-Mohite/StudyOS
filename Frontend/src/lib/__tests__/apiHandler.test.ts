import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { withApiHandler } from "@/lib/apiHandler";
import { ForbiddenError } from "@/lib/roles";

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

function req(url = "http://localhost/api/test") {
  return new NextRequest(url);
}

describe("withApiHandler", () => {
  beforeEach(() => {
    authMock.mockReset();
    authMock.mockResolvedValue({ userId: "user_123" });
  });

  it("returns 401 and never calls the handler when unauthenticated", async () => {
    authMock.mockResolvedValue({ userId: null });
    const handler = vi.fn();
    const route = withApiHandler(handler);

    const res = await route(req(), undefined);

    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it("skips the auth check when requireAuth is false", async () => {
    authMock.mockResolvedValue({ userId: null });
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const route = withApiHandler(handler, { requireAuth: false });

    const res = await route(req(), undefined);

    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
  });

  it("calls the handler and passes ctx.userId through when authenticated", async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const route = withApiHandler(handler);

    await route(req(), undefined);

    expect(handler).toHaveBeenCalledOnce();
    const ctxArg = handler.mock.calls[0][1];
    expect(ctxArg.userId).toBe("user_123");
    expect(ctxArg.requestId).toEqual(expect.any(String));
  });

  it("treats auth() throwing as unauthenticated rather than crashing", async () => {
    authMock.mockRejectedValue(new Error("Clerk misconfigured"));
    const handler = vi.fn();
    const route = withApiHandler(handler);

    const res = await route(req(), undefined);

    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it("maps a thrown ForbiddenError to a 403 with its message", async () => {
    const handler = vi.fn().mockRejectedValue(new ForbiddenError("Not your syllabus."));
    const route = withApiHandler(handler);

    const res = await route(req(), undefined);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.detail).toBe("Not your syllabus.");
  });

  it("maps any other thrown error to a generic 500 without leaking internals", async () => {
    const handler = vi.fn().mockRejectedValue(new Error("db connection string leaked: mysql://secret"));
    const route = withApiHandler(handler);

    const res = await route(req(), undefined);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.detail).toBe("Something went wrong. Please try again.");
    expect(JSON.stringify(body)).not.toContain("mysql://secret");
  });

  it("enforces the configured rate limit tier, returning 429 with Retry-After once exceeded", async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    // rateLimit keys include the route path, so use a route unique to this test
    // to avoid cross-test bucket contamination (the limiter is a module-level singleton).
    const route = withApiHandler(handler, { rateLimit: "write" });
    const uniqueUrl = "http://localhost/api/rate-limit-test-unique";

    // RATE_LIMITS.write = { limit: 30, windowMs: 60_000 }
    for (let i = 0; i < 30; i++) {
      const res = await route(req(uniqueUrl), undefined);
      expect(res.status).toBe(200);
    }

    const blocked = await route(req(uniqueUrl), undefined);
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toEqual(expect.any(String));
  });

  it("stamps every response with an x-request-id header", async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const route = withApiHandler(handler);

    const res = await route(req(), undefined);

    expect(res.headers.get("x-request-id")).toEqual(expect.any(String));
  });
});
