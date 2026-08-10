import { describe, it, expect } from "vitest";
import { getUserRole, requireRole, ForbiddenError } from "@/lib/roles";
import type { SessionClaims } from "@/lib/types-clerk";

function claimsWithRole(role: unknown): SessionClaims {
  return { metadata: { role } } as unknown as SessionClaims;
}

describe("getUserRole", () => {
  it("returns 'student' when there are no session claims", () => {
    expect(getUserRole(null)).toBe("student");
    expect(getUserRole(undefined)).toBe("student");
  });

  it("returns 'student' when metadata has no role set", () => {
    expect(getUserRole(claimsWithRole(undefined))).toBe("student");
  });

  it("returns 'student' for any non-admin value, not just missing ones", () => {
    expect(getUserRole(claimsWithRole("superuser"))).toBe("student");
    expect(getUserRole(claimsWithRole(""))).toBe("student");
  });

  it("returns 'admin' only for the exact string 'admin'", () => {
    expect(getUserRole(claimsWithRole("admin"))).toBe("admin");
  });
});

describe("requireRole", () => {
  it("does not throw when the role matches", () => {
    expect(() => requireRole(claimsWithRole("admin"), "admin")).not.toThrow();
  });

  it("throws ForbiddenError when the role does not match", () => {
    expect(() => requireRole(claimsWithRole("student"), "admin")).toThrow(ForbiddenError);
  });

  it("throws ForbiddenError with no session claims at all", () => {
    expect(() => requireRole(null, "admin")).toThrow(ForbiddenError);
  });
});
