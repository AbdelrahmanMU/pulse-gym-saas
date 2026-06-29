import { describe, expect, it } from "vitest";
import {
  ALL_PERMISSION_KEYS,
  CAPABILITIES,
  PERMISSION_KEYS,
  PERMISSIONS,
  ROLES,
} from "@pulse/auth";

/**
 * Authorization-catalog integrity (authorization-architecture.md §4/§6). `@pulse/auth`
 * is the single source the DB seed materializes, so these counts pin the exact shape
 * the seed writes (13 capabilities / 40 permissions / 5 roles / 102 role→permission
 * mappings — matching the Session-2 verification report). Drift here is caught before
 * it reaches the database.
 */
describe("permission keys", () => {
  it("has 40 unique keys with no duplicate values", () => {
    const values = Object.values(PERMISSION_KEYS);
    expect(values.length).toBe(40);
    expect(new Set(values).size).toBe(40);
    expect(ALL_PERMISSION_KEYS.length).toBe(40);
  });
});

describe("permission catalog", () => {
  it("defines every key exactly once, each under a known capability", () => {
    expect(PERMISSIONS.length).toBe(40);
    const keySet = new Set<string>(Object.values(PERMISSION_KEYS));
    const capKeys = new Set(CAPABILITIES.map((c) => c.key));
    for (const perm of PERMISSIONS) {
      expect(keySet.has(perm.key)).toBe(true);
      expect(capKeys.has(perm.capabilityKey)).toBe(true);
    }
    expect(new Set(PERMISSIONS.map((p) => p.key)).size).toBe(40);
  });

  it("has 13 capabilities", () => {
    expect(CAPABILITIES.length).toBe(13);
    expect(new Set(CAPABILITIES.map((c) => c.key)).size).toBe(13);
  });
});

describe("roles", () => {
  it("seeds exactly Owner+Trainer assignable and Front Desk/Manager/Accountant dormant", () => {
    expect(ROLES.length).toBe(5);
    const assignable = ROLES.filter((r) => r.isAssignable)
      .map((r) => r.key)
      .sort();
    expect(assignable).toEqual(["owner", "trainer"]);
    const dormant = ROLES.filter((r) => !r.isAssignable)
      .map((r) => r.key)
      .sort();
    expect(dormant).toEqual(["accountant", "front_desk", "manager"]);
  });

  it("grants Owner every permission and totals 102 role→permission mappings", () => {
    const owner = ROLES.find((r) => r.key === "owner");
    expect(owner?.permissionKeys.length).toBe(40);
    const total = ROLES.reduce((sum, r) => sum + r.permissionKeys.length, 0);
    expect(total).toBe(102);
  });

  it("maps every role only to known permission keys (no invented keys)", () => {
    const keySet = new Set<string>(Object.values(PERMISSION_KEYS));
    for (const role of ROLES) {
      for (const key of role.permissionKeys) {
        expect(keySet.has(key)).toBe(true);
      }
    }
  });
});
