/**
 * roles.ts — User roles, layered on top of Clerk auth.
 *
 * StudyOS currently has exactly one role in practice ("student") — there
 * are no admin-only routes today. This exists so that when one is needed
 * (content moderation, usage dashboards, etc.) it's a one-line addition
 * instead of a new auth mechanism: set `role: "admin"` in a user's Clerk
 * publicMetadata (dashboard or backend API), then guard the route with
 * `requireRole(sessionClaims, "admin")`.
 *
 * Deliberately reads publicMetadata, not privateMetadata — publicMetadata
 * is readable client-side too (e.g. to conditionally show an admin nav
 * link), while still being writable only from the Clerk backend/dashboard,
 * never by the user themselves.
 */

import type { SessionClaims } from "./types-clerk";

export type Role = "student" | "admin";

export function getUserRole(sessionClaims: SessionClaims | null | undefined): Role {
  const role = sessionClaims?.metadata?.role;
  return role === "admin" ? "admin" : "student";
}

export class ForbiddenError extends Error {
  constructor(message = "You don't have permission to do that.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** Throws ForbiddenError if the session's role doesn't match. Call inside a try/catch, or let it surface as a 500 → adjust in route if you want a clean 403 instead. */
export function requireRole(sessionClaims: SessionClaims | null | undefined, required: Role): void {
  if (getUserRole(sessionClaims) !== required) {
    throw new ForbiddenError();
  }
}
