import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@pulse/auth/password";

/**
 * Password hashing (scrypt) — the shared seed/adapter scheme. Verifies the roundtrip,
 * that wrong passwords fail, and the security-critical property that
 * **sentinel/malformed hashes verify to `false` and never throw** (so a non-loginable
 * seeded user — incl. `system-actor` — can never authenticate, and a corrupt hash is
 * a denial, not a 500).
 */
describe("password (scrypt)", () => {
  it("hashes to the self-describing scrypt format and verifies the same password", async () => {
    const hash = await hashPassword("Correct!Horse1");
    expect(hash).toMatch(/^scrypt\$n=32768,r=8,p=1\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
    expect(await verifyPassword("Correct!Horse1", hash)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("Correct!Horse1");
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("returns false (never throws) for the Session-2 sentinel hashes", async () => {
    expect(await verifyPassword("anything", "!set-in-session-3-t19")).toBe(false);
    expect(await verifyPassword("anything", "!system-actor-no-login")).toBe(false);
  });

  it("returns false (never throws) for malformed/unknown hashes", async () => {
    expect(await verifyPassword("anything", "garbage")).toBe(false);
    expect(await verifyPassword("anything", "")).toBe(false);
    expect(await verifyPassword("anything", "bcrypt$x$y$z")).toBe(false);
  });

  it("produces a distinct hash per call (random salt)", async () => {
    const a = await hashPassword("same-password");
    const b = await hashPassword("same-password");
    expect(a).not.toEqual(b);
    expect(await verifyPassword("same-password", a)).toBe(true);
    expect(await verifyPassword("same-password", b)).toBe(true);
  });
});
