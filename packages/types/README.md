# @pulse/types — Shared Cross-Package TypeScript Contracts

**`@pulse/types` is the sole package responsible for shared cross-package TypeScript types in this monorepo.**

No other package exposes shared application types. If a type needs to cross a
package boundary it lives here — derived from source (Prisma + `z.infer`) or
declared as an interface. This rule is enforced by the architectural fitness tests.

## What belongs here

- **Platform-adapter interfaces** (`IClock`, `IIdGenerator`, `ICurrentUser`) —
  declared here so domain/application code depends on stable interfaces, not
  framework/runtime APIs. Concrete implementations live in `apps/web` until a
  second consumer justifies extraction (YAGNI / A1).
- **Authentication-Adapter interface** (`AuthenticationAdapter`) — the contract
  the Auth.js implementation must satisfy; domain/business code depends only on
  this interface, never on `next-auth` or Auth.js directly.
- **Shared value-object / DTO types** derived from Prisma models or Zod schemas
  that multiple packages or the app need to reference.

## Strict dependency rule

`@pulse/types` has **zero runtime dependencies** and imports **nothing** from
other `@pulse/*` packages. It is dependency-free by design — it sits at the
bottom of the package graph and is safe to import from anywhere.

## What does NOT belong here

- Business logic, helper functions, or utility code → belongs in the package
  that owns the concern (`@pulse/auth`, `@pulse/db`, etc.)
- ESLint / Prettier / TypeScript config → belongs in `@pulse/config`
- Design tokens or CSS → belongs in `@pulse/design-tokens`
- Permission keys or authorization helpers → belongs in `@pulse/auth`
- Database client or Prisma schema → belongs in `@pulse/db`

## Current exports

The package exports from `./dist/index.js` (built via `tsc`). During Sprint 0
Sessions 1–2 the index is an empty stub (`export {}`); platform-adapter and
auth-adapter interfaces are populated in Session 3 (T-19, T-26).
