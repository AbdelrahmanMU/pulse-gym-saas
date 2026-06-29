import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * UI layering fitness (refinement R-1). Enforces that shadcn is a **primitive library
 * only**, never the application's design system:
 *
 *   • `@radix-ui/*` (the raw shadcn primitives) is imported ONLY inside
 *     `src/components/ui/**` — the internal primitive layer.
 *   • `@/components/ui/*` is imported ONLY by the PULSE layer (`src/components/pulse/**`).
 *     Application/route code (`src/app/**`) and everything else compose PULSE components,
 *     so they never depend directly on a raw shadcn primitive.
 *
 * A violation means the app reached past the PULSE layer into a primitive — exactly what
 * R-1 forbids.
 */
const srcRoot = resolve(import.meta.dirname, "../src");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((p) => /\.(ts|tsx)$/.test(p) && !/\.test\.tsx?$/.test(p))
    .map((p) => resolve(dir, p));
}

function imports(file: string): string[] {
  const text = readFileSync(file, "utf8");
  const specifiers: string[] = [];
  const re = /(?:import|export)[^"']*from\s*["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m[1]) specifiers.push(m[1]);
  }
  return specifiers;
}

const files = sourceFiles(srcRoot);
const rel = (f: string): string => f.slice(srcRoot.length + 1).replace(/\\/g, "/");

describe("UI layering fitness (R-1 — shadcn is a primitive layer only)", () => {
  it("imports @radix-ui ONLY inside components/ui", () => {
    const offenders = files.filter((f) => {
      const inUi = rel(f).startsWith("components/ui/");
      return !inUi && imports(f).some((s) => s.startsWith("@radix-ui/"));
    });
    expect(offenders.map(rel)).toEqual([]);
  });

  it("imports @/components/ui ONLY from the PULSE layer (components/pulse)", () => {
    const offenders = files.filter((f) => {
      const inAllowed =
        rel(f).startsWith("components/ui/") || rel(f).startsWith("components/pulse/");
      return !inAllowed && imports(f).some((s) => s.startsWith("@/components/ui"));
    });
    expect(offenders.map(rel)).toEqual([]);
  });
});
