import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { cruise, type IForbiddenRuleType } from "dependency-cruiser";

/**
 * Architectural-fitness suite — T-27 layer (b): the structural / graph rules that
 * ESLint can't express cleanly across a per-package run, asserted across the whole
 * `packages` + `apps` source graph with dependency-cruiser:
 *
 *   ① no circular dependencies (monorepo-strategy §5) — also the cross-platform
 *     cycle gate, since `import/no-cycle` does not fire on this Windows/flat-config
 *     setup (see packages/config/eslint and the Session-2 report §3.1)
 *   ③ no cross-context violations — a feature slice under `modules/<ctx>/` never
 *     imports another context's INTERNALS (only its public `index` entry)
 *   ④ no `@pulse/ui` → `@pulse/db` (UI never touches server-only data)
 *   + packages never import an app (dependency law: apps → packages, never up)
 *
 * Each rule is proven two ways: the real graph must be CLEAN, and a planted-violation
 * fixture (written to a throwaway temp dir, never the repo tree, so tsc/build/lint
 * never see it) must be FLAGGED — the spec's "planted-violation test per rule" DoD.
 *
 * The AST / import-specifier rules (② role, ⑤ permission, ⑥ Auth.js, platform
 * adapters) are proven by running the real ESLint config in `lint-rules.test.ts`.
 */
const repoRoot = resolve(import.meta.dirname, "../../..");
const originalCwd = process.cwd();

// ── The forbidden ruleset (shared by the real-graph check and the planted proofs) ──
const NO_CIRCULAR: IForbiddenRuleType = {
  name: "no-circular",
  severity: "error",
  comment: "Circular dependencies are forbidden (monorepo-strategy §5).",
  from: {},
  to: { circular: true },
};
const PACKAGES_NOT_TO_APPS: IForbiddenRuleType = {
  name: "packages-not-to-apps",
  severity: "error",
  comment: "Packages must never import an app (dependency law: apps → packages).",
  from: { path: "^packages/" },
  to: { path: "^apps/" },
};
const UI_NOT_TO_DB: IForbiddenRuleType = {
  name: "ui-not-to-db",
  severity: "error",
  comment: "@pulse/ui must never import @pulse/db (UI never touches server-only data).",
  from: { path: "^packages/ui/" },
  to: { path: "^packages/db/" },
};
// ③ cross-context: from a context, importing another context's non-index module.
// `$1` in `to.pathNot` back-references the context name captured in `from.path`,
// so same-context imports are allowed and the other context's public `index` is too.
const NO_CROSS_CONTEXT: IForbiddenRuleType = {
  name: "no-cross-context",
  severity: "error",
  comment:
    "A context must import another context only through its public entry (index), never its internals.",
  from: { path: "modules/([^/]+)/" },
  to: {
    path: "modules/([^/]+)/",
    pathNot: ["modules/$1/", "modules/[^/]+/index\\.(ts|tsx)$"],
  },
};

const forbidden: IForbiddenRuleType[] = [
  NO_CIRCULAR,
  PACKAGES_NOT_TO_APPS,
  UI_NOT_TO_DB,
  NO_CROSS_CONTEXT,
];

interface CruiseSummary {
  summary: { violations: { rule: { name: string } }[] };
}

async function violationNames(
  cruisePaths: string[],
  rules: IForbiddenRuleType[],
): Promise<string[]> {
  const result = await cruise(cruisePaths, {
    ruleSet: { forbidden: rules },
    validate: true, // run the ruleSet — without this, rules compute but never flag
    doNotFollow: { path: "node_modules" },
    exclude: { path: "node_modules|/dist/|\\.next|src/generated|\\.test\\.ts$|/fitness/" },
    tsPreCompilationDeps: true,
  });
  const { summary } = result.output as CruiseSummary;
  return summary.violations.map((v) => v.rule.name);
}

// Write a set of {relativePath: source} fixture modules to a fresh temp dir, cruise
// it (resolution is cwd-relative, so chdir in), and return the violated rule names.
let fixtureDir: string | undefined;
async function plantAndCruise(files: Record<string, string>): Promise<string[]> {
  fixtureDir = mkdtempSync(join(tmpdir(), "pulse-fitness-"));
  for (const [rel, src] of Object.entries(files)) {
    const abs = join(fixtureDir, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, src, "utf8");
  }
  process.chdir(fixtureDir);
  try {
    return await violationNames(Object.keys(files), forbidden);
  } finally {
    process.chdir(repoRoot);
  }
}

beforeAll(() => {
  process.chdir(repoRoot);
});
afterAll(() => {
  process.chdir(originalCwd);
});
afterEach(() => {
  if (fixtureDir) {
    rmSync(fixtureDir, { recursive: true, force: true });
    fixtureDir = undefined;
  }
});

describe("architectural fitness — real graph is clean (T-27 layer b)", () => {
  it("has no cycles, no package→app, no ui→db, no cross-context imports", async () => {
    process.chdir(repoRoot);
    expect(await violationNames(["packages", "apps/web/src"], forbidden)).toEqual([]);
  });
});

describe("architectural fitness — each graph rule flags a planted violation", () => {
  it("① flags a circular dependency", async () => {
    const names = await plantAndCruise({
      "a.ts": `import { b } from "./b";\nexport const a = b;\n`,
      "b.ts": `import { a } from "./a";\nexport const b = a;\n`,
    });
    expect(names).toContain("no-circular");
  });

  it("④ flags @pulse/ui → @pulse/db (via the package paths)", async () => {
    const names = await plantAndCruise({
      "packages/ui/widget.ts": `import { q } from "../db/client";\nexport const w = q;\n`,
      "packages/db/client.ts": `export const q = 1;\n`,
    });
    expect(names).toContain("ui-not-to-db");
  });

  it("③ flags a cross-context import of another context's internals", async () => {
    const names = await plantAndCruise({
      "src/modules/members/service.ts": `import { x } from "../billing/internal";\nexport const s = x;\n`,
      "src/modules/billing/internal.ts": `export const x = 1;\n`,
    });
    expect(names).toContain("no-cross-context");
  });

  it("③ ALLOWS importing another context's public index entry", async () => {
    const names = await plantAndCruise({
      "src/modules/members/service.ts": `import { pub } from "../billing/index";\nexport const s = pub;\n`,
      "src/modules/billing/index.ts": `export const pub = 1;\n`,
    });
    expect(names).not.toContain("no-cross-context");
  });
});
