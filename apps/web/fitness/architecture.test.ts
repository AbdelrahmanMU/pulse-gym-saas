import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cruise } from "dependency-cruiser";

/**
 * Architectural-fitness suite (T-27 layer b — the initial subset pulled forward
 * per spec §7.1). It asserts, across the whole `packages` + `apps` source graph,
 * the structural rules ESLint can't express cleanly in a per-package run:
 *
 *   • no circular dependencies (monorepo-strategy §5)
 *   • packages never import an app (dependency law — apps → packages, never up)
 *   • `@pulse/ui` never imports `@pulse/db` (UI never touches server-only data;
 *     ready now, `@pulse/ui` lands when a feature needs it)
 *
 * The full six-rule T-27 suite + CI wiring land in Session 5. dependency-cruiser
 * resolves module paths relative to the process cwd, so we run from the repo root.
 */
const repoRoot = resolve(import.meta.dirname, "../../..");
const originalCwd = process.cwd();

beforeAll(() => {
  process.chdir(repoRoot);
});
afterAll(() => {
  process.chdir(originalCwd);
});

const forbidden = [
  {
    name: "no-circular",
    severity: "error" as const,
    comment: "Circular dependencies are forbidden (monorepo-strategy §5).",
    from: {},
    to: { circular: true },
  },
  {
    name: "packages-not-to-apps",
    severity: "error" as const,
    comment: "Packages must never import an app (dependency law: apps → packages).",
    from: { path: "^packages/" },
    to: { path: "^apps/" },
  },
  {
    name: "ui-not-to-db",
    severity: "error" as const,
    comment: "@pulse/ui must never import @pulse/db (UI never touches server-only data).",
    from: { path: "^packages/ui/" },
    to: { path: "^packages/db/" },
  },
];

describe("architectural fitness (T-27 initial suite)", () => {
  it("has no circular deps, no package→app imports, no ui→db imports", async () => {
    const result = await cruise(["packages", "apps/web/src"], {
      ruleSet: { forbidden },
      validate: true, // run the ruleSet — without this, rules compute but never flag
      doNotFollow: { path: "node_modules" },
      exclude: {
        path: "node_modules|/dist/|\\.next|src/generated|\\.test\\.ts$|/fitness/",
      },
      tsPreCompilationDeps: true,
    });

    const summary = (result.output as { summary: { violations: unknown[] } }).summary;
    expect(summary.violations).toEqual([]);
  });
});
