import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Design-token compliance scan (refinement R-3). Statically proves the shipped UI carries
 * **no hardcoded visual values** — every color, spacing, radius, typography, and shadow
 * comes from a PULSE token (a utility, or a `(--token)` / `bg-(color:--token)` reference).
 * The token *source* (`@pulse/design-tokens/globals.css`) legitimately holds the raw
 * values and is out of scope — only `apps/web/src` (the consuming UI) is scanned.
 *
 * Detected violations:
 *   • raw hex / rgb / hsl colors
 *   • raw `px` lengths in class/style strings
 *   • Tailwind arbitrary-value utilities (`bg-[#…]`, `p-[15px]`, `z-[999]`, `shadow-[…]`)
 *     — note arbitrary variants and selectors (`[&_svg]`, `data-[highlighted]`) are allowed.
 */
const srcRoot = resolve(import.meta.dirname, "../src");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((p) => /\.(ts|tsx|css)$/.test(p) && !/\.test\.tsx?$/.test(p))
    .map((p) => resolve(dir, p));
}

const HEX = /#[0-9a-fA-F]{3,8}\b/;
const RGB_HSL = /\b(?:rgb|rgba|hsl|hsla)\(/;
const RAW_PX = /\b\d+px\b/;
// `<utility>-[<value>]` — arbitrary VALUE utilities. The prefix list is the set of
// value-bearing utilities; arbitrary variants like `[&_svg]:` and `data-[x]:` have no
// such prefix and are intentionally NOT matched.
const ARBITRARY_VALUE =
  /\b(?:bg|text|border|ring|fill|stroke|shadow|rounded|from|via|to|p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|w|h|size|top|bottom|left|right|inset|z|opacity|leading|tracking|duration|delay|max-w|min-w|max-h|min-h)-\[[^\]]+\]/;

const CHECKS: { name: string; re: RegExp }[] = [
  { name: "raw hex color", re: HEX },
  { name: "rgb()/hsl() color", re: RGB_HSL },
  { name: "raw px length", re: RAW_PX },
  { name: "arbitrary-value utility", re: ARBITRARY_VALUE },
];

const files = sourceFiles(srcRoot);
const rel = (f: string): string => f.slice(srcRoot.length + 1).replace(/\\/g, "/");

describe("token compliance (R-3 — no hardcoded visual values in apps/web/src)", () => {
  for (const check of CHECKS) {
    it(`contains no ${check.name}`, () => {
      const offenders: string[] = [];
      for (const file of files) {
        // The app CSS entry is two `@import` lines only; it holds no values.
        const text = readFileSync(file, "utf8");
        text.split(/\r?\n/).forEach((line, i) => {
          // Skip comment-only lines, and strip inline/trailing comments, so explanatory
          // prose (e.g. "// 80rem (1280px)") never trips the value scan — only real
          // code/class strings are checked.
          const trimmed = line.trim();
          if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
            return;
          }
          const code = line
            .replace(/\/\*.*?\*\//g, "") // inline block comments
            .replace(/(?<!:)\/\/.*$/, ""); // trailing line comments (not URLs `://`)
          if (check.re.test(code)) offenders.push(`${rel(file)}:${i + 1}  ${trimmed}`);
        });
      }
      expect(offenders).toEqual([]);
    });
  }
});
