/**
 * serviceAuth.ts — Mints the service-to-service JWT sent to AgenticService.
 *
 * AgenticService is an internal-only AI layer (see lib/agentic.ts) that
 * used to accept requests from anyone who could reach its port — nothing
 * but CORS stood between it and an unauthenticated caller burning LLM/OCR
 * budget. This signs a short-lived HS256 token on every outbound call,
 * which AgenticService's App/core/security.py verifies before doing any
 * work.
 *
 * This is NOT user auth — Clerk remains the user-facing auth layer. This
 * token only proves "this call came from our Next.js backend."
 */

import { SignJWT } from "jose";
import { getEnv } from "./env";

const ISSUER = "studyos-frontend";
const AUDIENCE = "studyos-agentic";
const TOKEN_TTL_SECONDS = 60; // generous for even the slowest AgenticService call to *start*; AgenticService only checks validity at request time, not throughout

let cachedSecret: Uint8Array | null = null;

function secretKey(): Uint8Array {
  if (!cachedSecret) {
    cachedSecret = new TextEncoder().encode(getEnv().INTERNAL_SERVICE_JWT_SECRET);
  }
  return cachedSecret;
}

/** Returns a freshly-signed, short-lived bearer token for one AgenticService call. */
export async function getServiceToken(): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(secretKey());
}
