import { describe, expect, it } from "vitest";
import { authConfig } from "./auth.config";

/**
 * Session-lifetime security control (TD-10a). JWT sessions cannot be revoked
 * server-side, so a bounded `maxAge` is the guardrail that limits how long a
 * suspended/removed staff member's live session survives (suspension itself only
 * blocks new sign-ins). This regression test fails if the explicit bound is ever
 * dropped and the session silently reverts to the Auth.js 30-day default.
 */
describe("auth session lifetime", () => {
  it("uses JWT sessions", () => {
    expect(authConfig.session?.strategy).toBe("jwt");
  });

  it("bounds session maxAge to at most one working day", () => {
    const maxAge = authConfig.session?.maxAge;
    expect(typeof maxAge).toBe("number");
    expect(maxAge).toBeGreaterThan(0);
    // Must stay well under the Auth.js 30-day default; a working day is the ceiling.
    expect(maxAge).toBeLessThanOrEqual(60 * 60 * 24);
  });
});
