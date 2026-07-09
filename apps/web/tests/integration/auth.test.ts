import { afterAll, beforeAll, describe, expect, it } from "vitest";
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

// The DB is the source of truth for the owner's phone: the seed sets a default only
// when none exists and preserves an edited one, so an env assumption would be a lie.
let OWNER_PHONE: string;

beforeAll(async () => {
  const owner = await prisma.user.findUniqueOrThrow({ where: { email: OWNER_EMAIL } });
  if (!owner.phone) throw new Error("Seeded owner has no phone — seed did not run?");
  OWNER_PHONE = owner.phone;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("integration: credential resolution (T-19)", () => {
  it("resolves valid Owner credentials into a gym-scoped principal with permissions", async () => {
    const principal = await resolvePrincipalFromCredentials({
      identifier: OWNER_EMAIL,
      password: OWNER_PASSWORD,
    });

    expect(principal).not.toBeNull();
    // Gym/branch tenant context established from the session, not from input.
    expect(principal?.gymId).toBeTruthy();
    expect(principal?.branchId).toBeTruthy();
    expect(principal?.gymUserId).toBeTruthy();
    expect(principal?.email).toBe(OWNER_EMAIL);
    // Owner holds every permission (41 after Sprint-1 Epic-1 added gym.view) —
    // checked by permission, not role.
    expect(principal?.permissions.length).toBe(41);
    expect(principal?.permissions).toContain(PERMISSION_KEYS.DASHBOARD_VIEW);
    expect(principal?.permissions).toContain(PERMISSION_KEYS.PAYMENTS_RECORD);
    expect(principal?.permissions).toContain(PERMISSION_KEYS.GYM_VIEW);
  });

  it("rejects a wrong password (no principal)", async () => {
    const principal = await resolvePrincipalFromCredentials({
      identifier: OWNER_EMAIL,
      password: "definitely-not-the-password",
    });
    expect(principal).toBeNull();
  });

  it("rejects an unknown email (no enumeration difference)", async () => {
    const principal = await resolvePrincipalFromCredentials({
      identifier: "nobody@pulse.local",
      password: OWNER_PASSWORD,
    });
    expect(principal).toBeNull();
  });

  it("rejects the inactive reserved system-actor regardless of input", async () => {
    const principal = await resolvePrincipalFromCredentials({
      identifier: "system-actor@pulse.internal",
      password: OWNER_PASSWORD,
    });
    expect(principal).toBeNull();
  });
});

describe("integration: phone-identifier sign-in (Pilot Readiness)", () => {
  it("resolves the Owner by the seeded phone", async () => {
    const principal = await resolvePrincipalFromCredentials({
      identifier: OWNER_PHONE,
      password: OWNER_PASSWORD,
    });
    expect(principal).not.toBeNull();
    expect(principal?.email).toBe(OWNER_EMAIL);
  });

  it("resolves a formatted phone (spaces/dashes) to the same user", async () => {
    // "01000000000" typed as "0100 000-0000" — normalization must bridge them.
    const spaced = `${OWNER_PHONE.slice(0, 4)} ${OWNER_PHONE.slice(4, 7)}-${OWNER_PHONE.slice(7)}`;
    const principal = await resolvePrincipalFromCredentials({
      identifier: spaced,
      password: OWNER_PASSWORD,
    });
    expect(principal?.email).toBe(OWNER_EMAIL);
  });

  it("resolves Arabic-Indic digits (Arabic keyboard) to the same user", async () => {
    const arabicIndic = OWNER_PHONE.replace(/\d/g, (d) =>
      String.fromCharCode(d.charCodeAt(0) - 0x30 + 0x0660),
    );
    const principal = await resolvePrincipalFromCredentials({
      identifier: arabicIndic,
      password: OWNER_PASSWORD,
    });
    expect(principal?.email).toBe(OWNER_EMAIL);
  });

  it("rejects an unknown phone and non-phone garbage with the same generic null", async () => {
    expect(
      await resolvePrincipalFromCredentials({
        identifier: "01099999999",
        password: OWNER_PASSWORD,
      }),
    ).toBeNull();
    expect(
      await resolvePrincipalFromCredentials({
        identifier: "not a phone",
        password: OWNER_PASSWORD,
      }),
    ).toBeNull();
  });

  it("fails closed when two users share a phone (ambiguity never picks a winner)", async () => {
    // User.phone has no unique constraint — the resolver must reject 2+ matches.
    const phone = "01055555555";
    const emails = ["amb-one@pilot.test", "amb-two@pilot.test"];
    await prisma.user.createMany({
      data: emails.map((email) => ({
        email,
        displayName: "Ambiguous Phone",
        phone,
        passwordHash: "!ambiguity-fixture-no-login",
      })),
    });
    try {
      const principal = await resolvePrincipalFromCredentials({
        identifier: phone,
        password: OWNER_PASSWORD,
      });
      expect(principal).toBeNull();
    } finally {
      await prisma.user.deleteMany({ where: { email: { in: emails } } });
    }
  });
});
