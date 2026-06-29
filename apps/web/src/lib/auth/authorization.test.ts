import { describe, expect, it } from "vitest";
import { PERMISSION_KEYS, derivePermissions, hasPermission } from "@pulse/auth";
import type { AuthenticatedPrincipal } from "@pulse/types";
import { authorize } from "./assert";
import { AuthError, AuthorizationError } from "@/lib/errors";

/**
 * Authorization decision (T-20). Asserts on **permissions, not roles** — a role name
 * never appears here, so role re-mappings cannot break these tests. Covers the gate's
 * deny-by-default and the 401/403 mapping.
 */

function principalWith(permissions: string[]): AuthenticatedPrincipal {
  return {
    userId: "u1",
    email: "a@b.c",
    displayName: "Test",
    gymId: "g1",
    branchId: "br1",
    gymUserId: "gu1",
    permissions,
  };
}

describe("hasPermission", () => {
  it("grants when the key is held and denies (by default) when absent", () => {
    expect(hasPermission([PERMISSION_KEYS.DASHBOARD_VIEW], PERMISSION_KEYS.DASHBOARD_VIEW)).toBe(
      true,
    );
    expect(hasPermission([], PERMISSION_KEYS.DASHBOARD_VIEW)).toBe(false);
    expect(hasPermission([PERMISSION_KEYS.MEMBERS_READ], PERMISSION_KEYS.PAYMENTS_RECORD)).toBe(
      false,
    );
  });
});

describe("derivePermissions", () => {
  it("collects and de-duplicates permission keys from role mappings", () => {
    const rows = [
      { permission: { key: PERMISSION_KEYS.MEMBERS_READ } },
      { permission: { key: PERMISSION_KEYS.MEMBERS_READ } },
      { permission: { key: PERMISSION_KEYS.PAYMENTS_RECORD } },
    ];
    expect(derivePermissions(rows).sort()).toEqual(
      [PERMISSION_KEYS.MEMBERS_READ, PERMISSION_KEYS.PAYMENTS_RECORD].sort(),
    );
  });
});

describe("authorize (route-handler gate)", () => {
  it("throws AuthError (401) when unauthenticated", () => {
    try {
      authorize(null, PERMISSION_KEYS.DASHBOARD_VIEW);
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(AuthError);
      expect((error as AuthError).status).toBe(401);
    }
  });

  it("throws AuthorizationError (403) when the permission is absent", () => {
    try {
      authorize(principalWith([PERMISSION_KEYS.MEMBERS_READ]), PERMISSION_KEYS.DASHBOARD_VIEW);
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(AuthorizationError);
      expect((error as AuthorizationError).status).toBe(403);
    }
  });

  it("returns the actor when the permission is held", () => {
    const actor = principalWith([PERMISSION_KEYS.DASHBOARD_VIEW]);
    expect(authorize(actor, PERMISSION_KEYS.DASHBOARD_VIEW)).toBe(actor);
  });
});
