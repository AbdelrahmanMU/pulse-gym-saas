import { resolve } from "node:path";
import { ESLint } from "eslint";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * Architectural-fitness suite — T-27 layer (a), the AST / import-specifier rules,
 * proven by running the REAL shared ESLint config (`@pulse/config/eslint`) over
 * planted violations via the ESLint Node API. This is the authoritative proof that
 * each rule is *wired and fires* — not a re-implementation of the rule as a regex.
 *
 * Rules proven here (graph rules ① cycle / ③ cross-context / ④ ui→db live in the
 * dependency-cruiser suite, `architecture.test.ts`, because `import/no-cycle` does
 * not fire on this Windows/flat-config/eslint-plugin-import setup — see that file):
 *
 *   ② no direct role checks      (requireRole / role === / switch(role))
 *   ⑤ no hardcoded permission keys (must reference the @pulse/auth constants)
 *   ⑥ no Auth.js import outside the Authentication Adapter (lib/auth/**)
 *   + platform-adapter rule       (no raw Date.now() / new Date() / randomUUID()
 *                                  in domain code — inject IClock / IIdGenerator)
 *
 * Each rule gets a planted-violation case (must flag) AND a clean case (must pass),
 * per the spec's "planted-violation test per rule" Definition of Done.
 */
const appRoot = resolve(import.meta.dirname, "..");

// A representative domain/business file path — feature slices live under modules/**,
// where every guard (incl. the platform-adapter ban) is in force.
const DOMAIN_FILE = "src/modules/billing/service.ts";

let eslint: ESLint;
beforeAll(() => {
  eslint = new ESLint({
    overrideConfigFile: resolve(appRoot, "eslint.config.mjs"),
    cwd: appRoot,
  });
});

async function ruleIds(code: string, relPath: string): Promise<string[]> {
  const results = await eslint.lintText(code, { filePath: resolve(appRoot, relPath) });
  const ids = results.flatMap((r) => r.messages).map((m) => m.ruleId);
  return [...new Set(ids.filter((id): id is string => id !== null))];
}

describe("lint fitness ② — no direct role checks (authorization-architecture §10)", () => {
  it.each([
    ["requireRole call", `export function f() {\n  return requireRole("owner");\n}\n`],
    ["role === literal", `export function f(role: string) {\n  return role === "owner";\n}\n`],
    [
      "switch(role)",
      `export function f(role: string) {\n  switch (role) {\n    case "owner":\n      return 1;\n    default:\n      return 0;\n  }\n}\n`,
    ],
  ])("flags %s", async (_label, code) => {
    expect(await ruleIds(code, DOMAIN_FILE)).toContain("no-restricted-syntax");
  });

  it("passes permission-based code (no role branch, no key literal)", async () => {
    const code = `export function f(can: (k: string) => boolean, key: string) {\n  return can(key);\n}\n`;
    expect(await ruleIds(code, "src/lib/x.ts")).not.toContain("no-restricted-syntax");
  });
});

describe("lint fitness ⑤ — no hardcoded permission keys", () => {
  it("flags a raw '<resource>.<action>' permission literal", async () => {
    const code = `export const required = "payments.record";\n`;
    expect(await ruleIds(code, DOMAIN_FILE)).toContain("no-restricted-syntax");
  });

  it("passes a reference to the @pulse/auth key constants", async () => {
    const code = `import { PERMISSION_KEYS } from "@pulse/auth";\nexport const required = PERMISSION_KEYS;\n`;
    expect(await ruleIds(code, DOMAIN_FILE)).not.toContain("no-restricted-syntax");
  });
});

describe("lint fitness ⑥ — no Auth.js import outside the Authentication Adapter", () => {
  it.each([
    ["bare specifier", `import NextAuth from "next-auth";\nexport const x = NextAuth;\n`],
    ["subpath", `import { JWT } from "next-auth/jwt";\nexport type T = JWT;\n`],
  ])("flags %s in domain code", async (_label, code) => {
    expect(await ruleIds(code, DOMAIN_FILE)).toContain("no-restricted-imports");
  });

  it("ALLOWS Auth.js inside the adapter (lib/auth/**)", async () => {
    const code = `import NextAuth from "next-auth";\nexport const x = NextAuth;\n`;
    expect(await ruleIds(code, "src/lib/auth/adapter.ts")).not.toContain("no-restricted-imports");
  });
});

describe("lint fitness (platform adapters, T-26) — no raw time/id calls in domain", () => {
  it.each([
    ["Date.now()", `export const t = Date.now();\n`],
    ["new Date()", `export const d = new Date();\n`],
    [
      "crypto.randomUUID()",
      `import { randomUUID } from "node:crypto";\nexport const id = randomUUID();\n`,
    ],
  ])("flags %s in domain code", async (_label, code) => {
    expect(await ruleIds(code, DOMAIN_FILE)).toContain("no-restricted-syntax");
  });

  it("ALLOWS raw time/id calls in the platform-adapter implementations (lib/platform/**)", async () => {
    const code = `export const t = Date.now();\n`;
    expect(await ruleIds(code, "src/lib/platform/clock.ts")).not.toContain("no-restricted-syntax");
  });
});
