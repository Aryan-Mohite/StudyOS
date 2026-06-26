/**
 * Feature flags for real-API switching.
 *
 * Set in Frontend/.env.local:
 *   NEXT_PUBLIC_USE_REAL_API=true
 *
 * API_URL defaults to "" (same origin) since the API now lives inside this
 * Next.js app as Route Handlers — only override it if you split the API out.
 *
 * With USE_REAL_API=false (default), all features use mock data.
 * With USE_REAL_API=true, wired features (Notes, Upload, MCQ) use the real API.
 * Unwired features (Numericals, Chat, Plan) still fall back to mock until
 * their Phase 3 turn.
 */

export const USE_REAL_API =
  process.env.NEXT_PUBLIC_USE_REAL_API === "true";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "";
