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

// Import-boundary patterns (dependency law — monorepo-strategy §5). Reused so the
// Authentication-Adapter override can re-include them while dropping ONLY the
// next-auth ban (ESLint's no-restricted-imports options REPLACE, never merge — so an
// override that forgets these would silently re-open the boundary).
const DEEP_IMPORT_PATTERNS = [
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
];

// D-8/T-19/T-27 rule ⑥: domain/business code never imports Auth.js — neither the
// bare specifier NOR a subpath (`next-auth/providers/credentials`, `next-auth/jwt`).
// The single exception is the Authentication-Adapter implementation (override below).
const NEXT_AUTH_BAN_MESSAGE =
  "No Auth.js import outside the Authentication Adapter (apps/web/src/lib/auth/**). D-8; T-27 rule ⑥.";
const NEXT_AUTH_PATHS = [{ name: "next-auth", message: NEXT_AUTH_BAN_MESSAGE }];
const NEXT_AUTH_PATTERNS = [{ group: ["next-auth/*"], message: NEXT_AUTH_BAN_MESSAGE }];

// T-26/T-27 platform-adapter rule: domain/business code (feature slices under
// `modules/**`) must obtain time and ids through the injected platform adapters
// (`IClock` / `IIdGenerator`, @pulse/types), never via raw runtime calls — so it
// stays deterministically testable and free of hidden non-determinism. The adapter
// IMPLEMENTATIONS (`lib/platform/**`) and cross-cutting infra (`lib/**`) legitimately
// call these primitives, so the ban is scoped to `modules/**` only (which lands with
// the first feature). Zero matches today → lint stays green; the rule is proven by a
// planted-violation test in the architectural-fitness suite (T-27).
const PLATFORM_CALL_GUARDS = [
  {
    selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
    message:
      "No Date.now() in domain code — inject IClock (@pulse/types) so time is deterministic. T-26/T-27.",
  },
  {
    selector: "NewExpression[callee.name='Date'][arguments.length=0]",
    message:
      "No `new Date()` (current time) in domain code — inject IClock (@pulse/types). T-26/T-27.",
  },
  {
    selector:
      "CallExpression[callee.property.name='randomUUID'], CallExpression[callee.name='randomUUID']",
    message:
      "No crypto.randomUUID() in domain code — inject IIdGenerator (@pulse/types). T-26/T-27.",
  },
];

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
          patterns: [...DEEP_IMPORT_PATTERNS, ...NEXT_AUTH_PATTERNS],
          paths: NEXT_AUTH_PATHS,
        },
      ],
    },
  },
  // The @pulse/auth permission-key file and the DB seed legitimately enumerate the
  // permission catalog as string literals (they ARE the reference-data source), so
  // the hardcoded-permission guard — and the role-name guards, which they never
  // trip — are off for them. Every other file must reference the key constants.
  {
    files: ["**/keys.ts", "**/seed.ts"],
    rules: { "no-restricted-syntax": "off" },
  },
  // The Authentication-Adapter implementation is the SINGLE place Auth.js may be
  // imported (D-8). Re-include the deep-import / no-app bans (options replace, not
  // merge) while lifting ONLY the next-auth ban. This glob matches only apps/web.
  {
    files: ["**/lib/auth/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: DEEP_IMPORT_PATTERNS }],
    },
  },
  // Domain/business feature slices (`modules/**`) additionally ban raw time/id calls
  // (T-26 platform-adapter rule). `no-restricted-syntax` options REPLACE (never merge),
  // so the role-name + hardcoded-permission guards are re-included here; dropping them
  // would silently re-open those holes inside feature code.
  {
    files: ["**/modules/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        ...ROLE_NAME_GUARDS,
        HARDCODED_PERMISSION_GUARD,
        ...PLATFORM_CALL_GUARDS,
      ],
    },
  },
  prettier,
);
