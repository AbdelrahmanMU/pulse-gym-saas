import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@pulse/db";
import { PERMISSION_KEYS } from "@pulse/auth";
import { resolvePrincipalFromCredentials } from "@/lib/auth/principal";

/**
 * Credential resolution against the **real** seeded test database (T-19). This is the
 * authentication path the Auth.js Credentials `authorize` callback runs: it exercises
 * the real scrypt verify, the gym/branch tenant-context resolution, and permission
 * derivation. Asserts on **behaviour and permissions**, never role names.
 *
 * Uses the same Owner password the seed used (OWNER_INITIAL_PASSWORD or its dev
 * default) — the seed set a real scrypt hash, replacing the Session-2 placeholder.
 */
const OWNER_EMAIL = "owner@pulse.local";
const OWNER_PASSWORD = process.env.OWNER_INITIAL_PASSWORD ?? "ChangeMe!Owner1";

afterAll(async () => {
  await prisma.$disconnect();
});

describe("integration: credential resolution (T-19)", () => {
  it("resolves valid Owner credentials into a gym-scoped principal with permissions", async () => {
    const principal = await resolvePrincipalFromCredentials({
      email: OWNER_EMAIL,
      password: OWNER_PASSWORD,
    });

    expect(principal).not.toBeNull();
    // Gym/branch tenant context established from the session, not from input.
    expect(principal?.gymId).toBeTruthy();
    expect(principal?.branchId).toBeTruthy();
    expect(principal?.gymUserId).toBeTruthy();
    expect(principal?.email).toBe(OWNER_EMAIL);
    // Owner holds every permission (40) — checked by permission, not role.
    expect(principal?.permissions.length).toBe(40);
    expect(principal?.permissions).toContain(PERMISSION_KEYS.DASHBOARD_VIEW);
    expect(principal?.permissions).toContain(PERMISSION_KEYS.PAYMENTS_RECORD);
  });

  it("rejects a wrong password (no principal)", async () => {
    const principal = await resolvePrincipalFromCredentials({
      email: OWNER_EMAIL,
      password: "definitely-not-the-password",
    });
    expect(principal).toBeNull();
  });

  it("rejects an unknown email (no enumeration difference)", async () => {
    const principal = await resolvePrincipalFromCredentials({
      email: "nobody@pulse.local",
      password: OWNER_PASSWORD,
    });
    expect(principal).toBeNull();
  });

  it("rejects the inactive reserved system-actor regardless of input", async () => {
    const principal = await resolvePrincipalFromCredentials({
      email: "system-actor@pulse.internal",
      password: OWNER_PASSWORD,
    });
    expect(principal).toBeNull();
  });
});
