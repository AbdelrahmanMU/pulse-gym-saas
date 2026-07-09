# @pulse/config — Shared Tooling Configuration

**Scope: shared developer-tooling configuration ONLY.**

This package owns the shared configuration files that every workspace package
and application consumes to enforce a consistent toolchain:

- **ESLint** — `./eslint` — flat-config base (TS-strict, import-boundaries, no-console, role-name guards, design-literal guards)
- **Prettier** — `./prettier` — deterministic formatting config
- **TypeScript** — `./tsconfig.base.json` — strict TS compiler base extended by each package

## Non-negotiable scope restriction

`@pulse/config` is a **build-time / developer-tooling package**. It is **never** a
runtime package. The following are permanently forbidden here:

- Helper functions or utility code of any kind
- Constants, environment values, or feature flags
- Business logic or domain types
- Any runtime import (`import '@pulse/config/...'` inside application code is a bug)

If a shared value is needed at runtime it belongs in `@pulse/types` (interfaces /
contracts) or in the package that owns the concern (`@pulse/auth`, `@pulse/db`, etc.).
Adding runtime exports to `@pulse/config` is a violation of the dependency law
(`monorepo-strategy.md` §4) and will be flagged by the architectural fitness tests.

## Dependents

Every workspace package and `apps/web` extends this package's configs in their own
`eslint.config.mjs` / `prettier.config.mjs` / `tsconfig.json`. The package itself
has **no workspace dependents at runtime** — it is a pure dev-dependency.
