# Monorepo Strategy
### PULSE Gym SaaS · Architecture Governance

| | |
|---|---|
| **Status** | ✅ Authoritative — repository structure and dependency law |
| **Tooling** | Turborepo + pnpm workspaces (`decision-log.md` ADR-015) |
| **Principle** | Design for future apps **without** burdening the MVP. Ship one app; structure for many. |
| **References** | ADR (modular monolith), `bounded-contexts.md`, `authorization-architecture.md`, `code-style-guide.md` |

> **Optimized for Claude Terminal:** one repository, predictable workspace names, and strict one-directional dependencies so the AI always knows *where code goes* and *what it may import*. The monorepo is a navigation aid, not a complexity tax — the MVP remains a single deployable web app (the modular monolith) living in one app workspace.

---

## 1. Applications (`/apps`)
| App | Status | Purpose |
|---|---|---|
| `web` | **MVP (now)** | The gym staff web application (the modular monolith). The only app built in MVP. |
| `member-portal` | Future | Member self-service (view membership, renew requests). |
| `mobile` | Future | Member/staff mobile app. |
| `super-admin` | Future | Platform operator console (manage gyms/tenants). |
| `marketing` | Future | Public marketing website. |
| `public-api` | Future | External/public API surface (versioned). |

**Rule:** Future apps are **not scaffolded** in MVP — they exist only in this strategy. They are added when actually built, reusing the shared packages below with no restructuring.

## 2. Shared Packages (`/packages`)
Created **only as a real second consumer appears** (avoid premature extraction). The MVP `web` app may begin with internal modules and extract to packages when sharing starts.

| Package | Purpose | Notes |
|---|---|---|
| `@pulse/design-tokens` | The PULSE token source (→ `globals.css` + machine-readable tokens) | UI authority |
| `@pulse/ui` | Catalog components built on tokens (shadcn-derived) | No business logic, no data access |
| `@pulse/domain` | Business rules, state machines, capabilities (pure, framework-free) | The contexts' logic; no UI, no DB driver |
| `@pulse/auth` | Permission keys, capability/role mappings, permission-check logic | Canonical authorization (`authorization-architecture.md`) |
| `@pulse/validation` | Shared Zod schemas (money, contact, common inputs) | Used at every boundary |
| `@pulse/db` | Data access (Prisma client + schema) | Server-only; never imported by UI |
| `@pulse/utils` | Pure cross-cutting helpers (money, date/timezone, ids) | **No business rules** |
| `@pulse/types` | Shared types/contracts | Derived, not duplicated |
| `@pulse/config` | Shared tooling config (TS, ESLint, Tailwind, Prettier) | DX consistency |
| `@pulse/emails` | Future | Notification templates when channels arrive |

## 3. Ownership Rules
- **Each package/app has one clear responsibility** (mirrors `bounded-contexts.md`). The owning context's logic lives in `@pulse/domain` (+ `@pulse/auth` for IAM authorization).
- **Apps own composition, not domain rules.** `apps/web` wires UI + domain + db; it does not define business rules (those are in `@pulse/domain`).
- **`@pulse/auth` is the sole home of authorization;** no app or other package re-implements permission logic.

## 4. Dependency Rules (the law)
Dependencies flow **one direction**: `apps → packages → lower packages`. Never upward, never sideways at the same layer where it creates cycles.

```
apps/*  ──►  @pulse/ui, @pulse/domain, @pulse/auth, @pulse/validation, @pulse/db, @pulse/utils, @pulse/types
@pulse/ui ──► @pulse/design-tokens, @pulse/utils, @pulse/types
@pulse/domain ──► @pulse/utils, @pulse/types        (framework-free, no UI, no DB driver)
@pulse/auth ──► @pulse/types, @pulse/utils
@pulse/db ──► @pulse/types                          (server-only)
@pulse/validation ──► @pulse/types
```

## 5. Import Rules
- **Apps never import apps.** *(No `apps/web` ↔ `apps/member-portal`.)* Share via packages.
- **Packages never import apps.** *(Dependencies point down.)*
- **`@pulse/ui` never imports `@pulse/db`** or any server-only/secret-bearing package. UI is presentation.
- **`@pulse/domain` is framework- and infrastructure-free** — no Next.js, no Prisma client, no React. Pure business logic so it's testable and reusable across all apps.
- **No deep imports into a package's internals** — import its public entry only (mirrors ADR §6 module-boundary rule).
- **No circular dependencies**, ever (Turbo/lint enforce).

## 6. Folder Strategy
```
/
├─ apps/
│  └─ web/                 # MVP app (modular monolith; feature slices per ADR §5 live here or in @pulse/domain)
├─ packages/
│  ├─ design-tokens/  ui/  domain/  auth/  validation/  db/  utils/  types/  config/
├─ docs/                   # all governance (product, architecture, design, engineering, domain)
├─ turbo.json              # build/test pipeline
├─ pnpm-workspace.yaml
└─ package.json
```
*(The MVP may keep feature logic inside `apps/web` initially and extract to `@pulse/domain` when a second app needs it — extraction is mechanical because domain logic is already framework-free.)*

## 7. Versioning
- **Internal packages are unversioned and linked by `workspace:*`** — one cohesive codebase, atomic changes across packages in a single commit/PR. *Why:* no internal package-publishing overhead; the AI changes a package and its consumers together.
- **`public-api` (future) versions its external contract** (`/v1`), independently of internal package state.
- App release versioning follows `git-workflow.md` (SemVer).

## 8. Build Strategy
- **Turborepo orchestrates** build/lint/test/type-check with caching and correct task ordering (a package builds before its consumers).
- **One command builds the world**; Turbo only rebuilds what changed (cache). *Why:* fast feedback for AI iteration, low token/time cost.
- **CI runs the Turbo pipeline**; red blocks merge (`testing-standards.md`).

## 9. Testing Strategy (repo-level)
- **Domain logic is unit-tested in `@pulse/domain`** (P0 invariants), framework-free → fast and stable.
- **Authorization is tested in `@pulse/auth`** by **permission**, never role (`authorization-architecture.md` §11).
- **Apps run integration/E2E** against their composition.
- **Tests live beside the code they cover**, in their package/app.

## 10. Future Expansion
- New app = new `apps/<name>` consuming existing packages — **no restructuring** of MVP code.
- New shared concern = new package, created at the moment a **second** consumer appears (not before).
- Member Portal/Mobile reuse `@pulse/domain` + `@pulse/auth` + `@pulse/design-tokens`/`@pulse/ui`; Public API reuses `@pulse/domain` + `@pulse/auth`.

## 11. Forbidden Dependencies
- ❌ App → App. ❌ Package → App. ❌ `@pulse/ui` → `@pulse/db` (or any secret/server package).
- ❌ `@pulse/domain` → React/Next/Prisma-client (must stay pure).
- ❌ Business rules in `@pulse/ui`, `@pulse/utils`, or `@pulse/config`.
- ❌ Authorization logic anywhere but `@pulse/auth`.
- ❌ Circular dependencies; deep/internal imports across package boundaries.
- ❌ Scaffolding future apps "just in case" (premature complexity).

## Open Assumptions
- **A1** — MVP may start with domain logic **inside `apps/web`** and extract to `@pulse/domain` at the first shared consumer. Recommended, to avoid premature package overhead while keeping the extraction trivial (domain stays framework-free from day one). Confirm.
