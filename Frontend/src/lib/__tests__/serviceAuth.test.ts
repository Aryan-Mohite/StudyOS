// @vitest-environment node
//
// jose's Uint8Array checks are realm-sensitive — jsdom's global TextEncoder
// produces a Uint8Array from a different realm than Node's, which trips
// jose's `instanceof Uint8Array` guard. This file doesn't need a DOM, so
// it runs in the plain Node environment instead of the project default.
import { describe, it, expect } from "vitest";
import { jwtVerify } from "jose";
import { getServiceToken } from "@/lib/serviceAuth";

// These constants intentionally duplicate App/core/security.py's ISSUER/AUDIENCE
// on the Python side — this test exists precisely to catch drift between the
// two if either side's constants are ever edited without the other.
const ISSUER = "studyos-frontend";
const AUDIENCE = "studyos-agentic";

describe("getServiceToken", () => {
  it("mints a token that verifies with the shared secret, issuer, and audience", async () => {
    const token = await getServiceToken();
    const secret = new TextEncoder().encode(process.env.INTERNAL_SERVICE_JWT_SECRET);

    const { payload, protectedHeader } = await jwtVerify(token, secret, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    expect(protectedHeader.alg).toBe("HS256");
    expect(payload.iss).toBe(ISSUER);
    expect(payload.aud).toBe(AUDIENCE);
    expect(payload.exp).toBeDefined();
  });

  it("rejects verification against the wrong secret", async () => {
    const token = await getServiceToken();
    const wrongSecret = new TextEncoder().encode("a-completely-different-secret-value");

    await expect(jwtVerify(token, wrongSecret, { issuer: ISSUER, audience: AUDIENCE })).rejects.toThrow();
  });

  it("sets a short expiry (<= 60s TTL)", async () => {
    const token = await getServiceToken();
    const secret = new TextEncoder().encode(process.env.INTERNAL_SERVICE_JWT_SECRET);
    const { payload } = await jwtVerify(token, secret, { issuer: ISSUER, audience: AUDIENCE });

    const ttlSeconds = (payload.exp as number) - (payload.iat as number);
    expect(ttlSeconds).toBeLessThanOrEqual(60);
    expect(ttlSeconds).toBeGreaterThan(0);
  });
});
