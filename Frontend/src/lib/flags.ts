/**
 * Feature flags for Phase 2 API switching.
 *
 * Set in Frontend/.env.local:
 *   NEXT_PUBLIC_USE_REAL_API=true
 *   NEXT_PUBLIC_API_URL=http://localhost:8000
 *
 * With USE_REAL_API=false (default), all features use mock data.
 * With USE_REAL_API=true, only wired features (Notes, Upload) use real API.
 * Unwired features (MCQ, Numericals, Chat, Plan) always use mock in Phase 2.
 */

export const USE_REAL_API =
  process.env.NEXT_PUBLIC_USE_REAL_API === "true";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
