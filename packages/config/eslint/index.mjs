import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

/**
 * Shared PULSE ESLint flat config (constitution §5, code-style-guide.md).
 *
 * Enforces TypeScript-strict linting plus the part of the dependency law
 * (monorepo-strategy §5) that is expressible without project-aware tooling:
 * no deep imports into a package's internals. The full architectural-fitness
 * rules — layer direction, no cycles, no role-name branching, no hardcoded
 * permission strings, no Auth.js outside the adapter — land in T-27 (Session 5)
 * via dependency-cruiser / eslint-plugin-boundaries. Prettier formatting is
 * delegated to Prettier; `eslint-config-prettier` disables conflicting rules.
 */
export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/.turbo/**",
      "**/.next/**",
      "**/coverage/**",
      "**/*.config.mjs",
      "**/*.config.js",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  {
    rules: {
      // logging-observability.md: structured logger only, never console.
      "no-console": "error",
      // monorepo-strategy §5: import a package's public entry only.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@pulse/*/src/*", "@pulse/*/dist/*"],
              message:
                "Import a package's public entry (e.g. '@pulse/types'), never deep into its internals (monorepo-strategy §5).",
            },
          ],
        },
      ],
    },
  },
  prettier,
);
