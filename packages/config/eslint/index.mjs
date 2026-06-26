import js from "@eslint/js";
import tseslint from "typescript-eslint";
import importPlugin from "eslint-plugin-import";
import prettier from "eslint-config-prettier";

/**
 * Shared PULSE ESLint flat config (constitution §5, code-style-guide.md) + the
 * pulled-forward architectural-fitness ESLint layer (T-27, per the spec §7.1
 * refinement). It enforces, at lint time, the per-file rules that protect the
 * frozen architecture:
 *
 *   • no `console` (logging-observability.md — structured logger only)
 *   • deep-import ban — import a package's public entry, never its internals
 *   • circular-dependency guard (`import/no-cycle`)
 *   • role-name authorization guard (`requireRole`/`role ===`/`switch(role)`)
 *   • hardcoded-permission-string guard (raw permission keys must reference the
 *     `@pulse/auth` key constants — enforced once they exist in Session 3)
 *   • no Auth.js import outside the Authentication Adapter (readiness; D-8/T-19)
 *
 * Graph-level rules ESLint can't express cleanly across the per-package run
 * (no cycles across the full graph, layer direction, cross-context isolation)
 * live in the Vitest architectural-fitness suite via dependency-cruiser (T-27
 * layer b). File globs use a leading double-star so they scope correctly even
 * though lint runs per package (each package's own cwd).
 */

// AST selectors for the forbidden role-name authorization patterns
// (authorization-architecture.md §10). Authorize by permission, never role.
const ROLE_NAME_GUARDS = [
  {
    selector: "CallExpression[callee.name='requireRole']",
    message:
      "Authorize by permission, never by role: no requireRole(...). See authorization-architecture.md §10.",
  },
  {
    selector: "SwitchStatement[discriminant.name='role']",
    message: "No switch on a role name — branch on permissions. authorization-architecture.md §10.",
  },
  {
    selector:
      "BinaryExpression[operator=/^(===|==|!==|!=)$/][left.name='role'], BinaryExpression[operator=/^(===|==|!==|!=)$/][right.name='role']",
    message:
      "No comparison against a role name — check a permission. authorization-architecture.md §10.",
  },
  {
    selector:
      "BinaryExpression[operator=/^(===|==|!==|!=)$/][left.property.name='role'], BinaryExpression[operator=/^(===|==|!==|!=)$/][right.property.name='role']",
    message:
      "No comparison against a role name — check a permission. authorization-architecture.md §10.",
  },
];

// A raw permission-key literal (`<resource>.<action>` over the catalog resources).
// Business/gate code must reference the @pulse/auth key constants, not literals.
const HARDCODED_PERMISSION_GUARD = {
  selector:
    "Literal[value=/^(members|notes|assignments|plans|memberships|payments|notifications|dashboard|reports|settings|staff|roles|branches|gym)\\.[a-z]+$/]",
  message:
    "Hardcoded permission key — reference the @pulse/auth key constants, never a raw string. authorization-architecture.md; T-27.",
};

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/.turbo/**",
      "**/.next/**",
      "**/coverage/**",
      "**/src/generated/**", // Prisma-generated client — never linted (T-09)
      "**/next-env.d.ts", // Next.js-generated ambient types
      "**/*.config.mjs",
      "**/*.config.js",
      "**/*.config.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  {
    plugins: { import: importPlugin },
    settings: {
      "import/resolver": {
        typescript: true,
        node: true,
      },
    },
    rules: {
      // logging-observability.md: structured logger only, never console.
      "no-console": "error",
      // Allow intentional `_`-prefixed throwaways and rest-sibling omits.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      // monorepo-strategy §5: no circular dependencies, ever.
      "import/no-cycle": ["error", { maxDepth: 10 }],
      // authorization-architecture.md §10: never branch on a role name.
      // §4: never hardcode a permission-key string in business/gate code.
      "no-restricted-syntax": ["error", ...ROLE_NAME_GUARDS, HARDCODED_PERMISSION_GUARD],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@pulse/*/src/*", "@pulse/*/dist/*"],
              message:
                "Import a package's public entry (e.g. '@pulse/types'), never deep into its internals (monorepo-strategy §5).",
            },
            {
              // Dependency law: packages/other apps must never import an app.
              group: ["@pulse/web", "@pulse/web/*"],
              message: "Apps are never imported by packages or other apps (monorepo-strategy §5).",
            },
          ],
          paths: [
            {
              // D-8/T-19/T-27 rule ⑥: domain/business code never imports Auth.js.
              // The Authentication Adapter (Session 3) will scope a local exception.
              name: "next-auth",
              message:
                "No Auth.js import outside the Authentication Adapter (D-8; authorization to the adapter only). T-27 rule ⑥.",
            },
          ],
        },
      ],
    },
  },
  // The seed legitimately enumerates the permission catalog as string literals
  // (it IS the reference-data source), so the hardcoded-permission guard — and
  // role-name guards, which it never trips — are off for it.
  {
    files: ["**/seed.ts"],
    rules: { "no-restricted-syntax": "off" },
  },
  prettier,
);
