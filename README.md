# PULSE Gym SaaS

Multi-tenant gym-membership management SaaS — a modular monolith built per the
engineering constitution (`CLAUDE.md`) and the frozen Foundation v1.0 governance
in `docs/`.

> **Read `CLAUDE.md` before any implementation.** It is the authoritative summary
> of how this project is built and points to the ranked governance docs.

## Repository layout (monorepo-strategy.md §6)

```
/
├─ apps/                    # applications (only apps/web in MVP — added in T-06)
├─ packages/                # shared packages (Turborepo + pnpm workspaces)
│  ├─ config/               # @pulse/config — shared TS / ESLint / Prettier config
│  ├─ types/                # @pulse/types — dependency-free shared contracts
│  ├─ db/                   # @pulse/db — Prisma client + schema (server-only)
│  ├─ auth/                 # @pulse/auth — permission keys + check (sole authz home)
│  └─ design-tokens/        # @pulse/design-tokens — PULSE token source
├─ docs/                    # frozen Foundation v1.0 governance (product, arch, design, …)
├─ turbo.json               # build / lint / type-check / test pipeline
├─ pnpm-workspace.yaml
└─ package.json             # private workspace root
```

Internal packages are **unversioned** and linked by `workspace:*`. Dependencies
flow one direction only — `apps → packages → lower packages`; `@pulse/ui` never
imports `@pulse/db`; no cycles (monorepo-strategy.md §4–5).

## Prerequisites

- **Node** ≥ 20.11 (`.nvmrc` pins 20.20.0)
- **pnpm** 9.15.4 — provided via Corepack: `corepack enable`

## Command surface (run from the repo root)

| Script              | Action                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------ |
| `pnpm install`      | Install + link the workspace                                                                                 |
| `pnpm verify`       | **Standard pre-commit check** — build → lint → type-check → format:check in sequence; stops on first failure |
| `pnpm build`        | `turbo run build` — build every package (cached)                                                             |
| `pnpm lint`         | `turbo run lint` — ESLint (TS-strict + dependency law)                                                       |
| `pnpm type-check`   | `turbo run type-check` — `tsc --noEmit` per package                                                          |
| `pnpm test`         | `turbo run test` — _toolchain lands in T-23 (Session 2)_                                                     |
| `pnpm dev`          | `turbo run dev` — _app dev server lands in T-06 (Session 2)_                                                 |
| `pnpm format`       | Prettier write across the repo                                                                               |
| `pnpm format:check` | Prettier check (CI / verification)                                                                           |
| `pnpm db:migrate`   | `prisma migrate dev` — _dormant until T-09 (Session 2) wires Prisma_                                         |
| `pnpm db:seed`      | `prisma db seed` — _dormant until T-11 (Session 2)_                                                          |
| `pnpm db:reset`     | `prisma migrate reset` — _dormant until T-09/T-11 (Session 2)_                                               |

The `dev`, `test`, and `db:*` scripts are defined now so the command surface is
stable, but their underlying tooling (Next.js app, Vitest, Prisma) is delivered
in later Sprint 0 sessions. `dev`/`test` no-op cleanly until then.

## Status

Sprint 0 · **Session 1 (Workspace & Build Platform)** complete — tooling and
scaffolding only. No app, database, auth, or UI yet (those are Sessions 2–4).
See `docs/sprints/sprint-0-technical-specification.md` §7.1.
