# PULSE Gym SaaS

Multi-tenant gym-membership management SaaS — a modular monolith built per the
engineering constitution (`CLAUDE.md`) and the frozen Foundation v1.0 governance
in `docs/`.

> **Read `CLAUDE.md` before any implementation.** It is the authoritative summary
> of how this project is built and points to the ranked governance docs.

## Repository layout (monorepo-strategy.md §6)

```
/
├─ apps/
│  └─ web/                  # @pulse/web — Next.js 15 app (App Router, strict TS)
├─ packages/                # shared packages (Turborepo + pnpm workspaces)
│  ├─ config/               # @pulse/config — shared TS / ESLint / Prettier config
│  ├─ types/                # @pulse/types — dependency-free shared contracts
│  ├─ db/                   # @pulse/db — Prisma 7 client + schema + migrations + seed (server-only)
│  ├─ auth/                 # @pulse/auth — permission keys + check (sole authz home)
│  └─ design-tokens/        # @pulse/design-tokens — PULSE token source
├─ docs/                    # frozen Foundation v1.0 governance (product, arch, design, …)
├─ docker-compose.yml       # PostgreSQL 18 (dev :55432) + isolated test DB (:55433)
├─ .env.example             # required env template (copy to .env; .env is git-ignored)
├─ turbo.json               # build / lint / type-check / test pipeline
├─ pnpm-workspace.yaml
└─ package.json             # private workspace root
```

Internal packages are **unversioned** and linked by `workspace:*`. Dependencies
flow one direction only — `apps → packages → lower packages`; `@pulse/ui` never
imports `@pulse/db`; no cycles (monorepo-strategy.md §4–5).

## Prerequisites

- **Node** ≥ 20.11 (`.nvmrc` pins 20.20.0; needs ≥ 20.12 for `process.loadEnvFile`)
- **pnpm** 9.15.4 — provided via Corepack: `corepack enable`
- **Docker** (Desktop) — for the local PostgreSQL 18 + test database

## First-time setup

```bash
corepack enable
pnpm install
cp .env.example .env          # then set AUTH_SECRET (openssl rand -base64 32)
pnpm db:up                    # start PostgreSQL 18 (docker compose, :55432)
pnpm --filter @pulse/db build # generate the Prisma client + compile the seed
pnpm db:migrate               # apply the initial migration
pnpm db:seed                  # load permissions/roles + bootstrap gym/owner/system-actor
pnpm dev                      # http://localhost:3000  (health: /api/health)
```

## Command surface (run from the repo root)

| Script                   | Action                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------- |
| `pnpm install`           | Install + link the workspace                                                                      |
| `pnpm verify`            | **Standard pre-commit check** — build → lint → type-check → format:check (stops on first failure) |
| `pnpm build`             | `turbo run build` — build every package + the app (cached)                                        |
| `pnpm lint`              | `turbo run lint` — ESLint (TS-strict + dependency law + fitness rules)                            |
| `pnpm type-check`        | `turbo run type-check` — `tsc --noEmit` per package                                               |
| `pnpm test`              | `turbo run test` — unit + architectural-fitness suite (DB-free)                                   |
| `pnpm test:integration`  | Integration suite against the isolated test DB (needs `pnpm db:test:up`)                          |
| `pnpm test:e2e`          | Playwright E2E + axe-core a11y (boots the dev server)                                             |
| `pnpm dev`               | `turbo run dev` — Next.js dev server                                                              |
| `pnpm format` / `:check` | Prettier write / check                                                                            |
| `pnpm db:up` / `db:down` | Start / stop the dev PostgreSQL 18 container                                                      |
| `pnpm db:test:up`        | Start the isolated test database (:55433)                                                         |
| `pnpm db:migrate`        | `prisma migrate dev` (via `@pulse/db`)                                                            |
| `pnpm db:seed`           | Run the idempotent foundational seed                                                              |
| `pnpm db:status`         | `prisma migrate status`                                                                           |
| `pnpm db:reset`          | `prisma migrate reset` (drops + re-applies + re-seeds)                                            |

The root `.env` is the single source of env vars, loaded via Node built-ins
(`process.loadEnvFile` / `--env-file`) — no `dotenv` dependency.

## Status

Sprint 0 · **Sessions 1–2 complete** (Workspace & Build Platform; App, Data &
Runtime Foundations) — awaiting human acceptance of Session 2. Auth, the design
system/app shell, and CI/hooks land in Sessions 3–5. See
`docs/sprints/session-progress.md` and `docs/sprints/session-2-verification-report.md`.
