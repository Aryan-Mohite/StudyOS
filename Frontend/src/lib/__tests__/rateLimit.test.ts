import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkRateLimit } from "@/lib/rateLimit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows the first request for a fresh key", () => {
    const result = checkRateLimit("test:allow-first", 5, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.retryAfterSeconds).toBe(0);
  });

  it("allows requests up to the limit, then denies the next one", () => {
    const key = "test:up-to-limit";
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit(key, 3, 60_000).allowed).toBe(true);
    }
    const blocked = checkRateLimit(key, 3, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("resets the window after windowMs elapses", () => {
    const key = "test:window-reset";
    checkRateLimit(key, 1, 1_000);
    expect(checkRateLimit(key, 1, 1_000).allowed).toBe(false);

    vi.advanceTimersByTime(1_001);

    expect(checkRateLimit(key, 1, 1_000).allowed).toBe(true);
  });

  it("tracks separate keys independently", () => {
    checkRateLimit("test:key-a", 1, 60_000);
    const blockedA = checkRateLimit("test:key-a", 1, 60_000);
    const allowedB = checkRateLimit("test:key-b", 1, 60_000);

    expect(blockedA.allowed).toBe(false);
    expect(allowedB.allowed).toBe(true);
  });

  it("reports a retryAfterSeconds that roughly matches the remaining window", () => {
    const key = "test:retry-after";
    checkRateLimit(key, 1, 10_000);
    vi.advanceTimersByTime(4_000);
    const blocked = checkRateLimit(key, 1, 10_000);

    expect(blocked.allowed).toBe(false);
    // ~6 seconds left in the window
    expect(blocked.retryAfterSeconds).toBeGreaterThanOrEqual(5);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(6);
  });
});
