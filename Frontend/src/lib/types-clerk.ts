/**
 * Shape of the `sessionClaims` object returned by Clerk's `auth()`, extended
 * with the custom `metadata.role` claim used by src/lib/roles.ts.
 *
 * To actually populate this claim, add a custom session token claim in the
 * Clerk dashboard (Sessions → Customize session token):
 *   { "metadata": { "role": "{{user.public_metadata.role}}" } }
 * Until that's configured, getUserRole() safely falls back to "student".
 */
export interface SessionClaims {
  metadata?: {
    role?: string;
  };
}
