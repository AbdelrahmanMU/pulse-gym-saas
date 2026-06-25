# Prisma 7 Strategy
### PULSE Gym SaaS · ORM configuration model (Prisma 7.x)

| | |
|---|---|
| **Status** | ✅ Authoritative — the project targets **Prisma 7** (finalized 2026-06-25) |
| **Verified** | `prisma validate` (Prisma 7.x) → "The schema … is valid 🚀" against `/prisma/schema.prisma` + `/prisma.config.ts` |
| **Honors** | DDS §16 (single `schema.prisma`, Prisma Migrate), ADR §11, naming-conventions |
| **Scope** | Configuration & tooling only. No business rule, schema shape, or invariant is affected by the ORM major version. |

> Prisma 7 changed **how the schema connects and generates**, not what it models. The three breaking changes that matter to us: (1) `url` leaves the `datasource` block, (2) a new `prisma-client` generator with a required `output`, (3) driver adapters become the connection mechanism. Backward compatibility with Prisma 6 is **not** maintained.

---

## 1. What changed from Prisma 6 → 7 (and our response)

| Area | Prisma 6 | Prisma 7 (ours) |
|---|---|---|
| **Connection URL** | `url = env("DATABASE_URL")` inside `datasource` | **Removed** from `datasource`; lives in `prisma.config.ts` (`datasource.url`) |
| **`datasource` block** | `provider` + `url` | **`provider` only** |
| **Generator** | `prisma-client-js` (deprecated) | **`prisma-client`** (TS/ESM), **`output` required** |
| **Client connection** | bundled query engine, URL from schema | **driver adapter** (`@prisma/adapter-pg`) passed to `new PrismaClient({ adapter })` |
| **Config file** | optional | **`prisma.config.ts`** is the standard config (schema path, migrations path, datasource) |

---

## 2. `datasource` block (schema.prisma)

```prisma
datasource db {
  provider = "postgresql"
  // Prisma 7: connection URL is in prisma.config.ts (datasource.url).
}
```

Putting `url = env(...)` here under Prisma 7 is a **validation error** (`P1012`). Confirmed empirically during this review.

---

## 3. `generator` block (schema.prisma)

```prisma
generator client {
  provider     = "prisma-client"          // new generator (prisma-client-js is deprecated)
  output       = "../src/generated/prisma" // REQUIRED in v7; provisional path
  runtime      = "nodejs"                  // Next.js server runtime
  moduleFormat = "esm"                     // ESM-first
}
```

- `output` is **mandatory** in Prisma 7 — generated client code is emitted to an explicit path (no implicit `node_modules/.prisma/client`). **`output` path is provisional** and will be re-pointed to the correct package directory when the Turborepo monorepo (`packages/database` or `apps/web`) is scaffolded at bootstrap.
- `runtime = "nodejs"` and `moduleFormat = "esm"` suit a Next.js 15 server; adjust per deployment target (`vercel-edge`, `workerd`, etc.) only if a target demands it. The generated client must be **git-ignored** and produced by `prisma generate` in CI/postinstall.

---

## 4. `prisma.config.ts` (project root)

```ts
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
```

- This file is **configuration**, not application code — analogous to `schema.prisma` itself.
- `env("DATABASE_URL")` reads `process.env`. In dev, load `.env` via your process manager or add `import "dotenv/config";` at the top once `dotenv` is a dependency. (During this review's validation, `DATABASE_URL` was supplied through the process environment.)
- At monorepo scaffolding, the `schema`/`migrations` paths move with the database package.

---

## 5. Runtime client (specification — implemented at bootstrap, not now)

> Task constraint: **no application code is generated** in this review. This is the *target shape* for the Bootstrap sprint.

```ts
// e.g. src/lib/db.ts — created during Bootstrap, not in this review
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
export const prisma = new PrismaClient({ adapter }); // singleton (ADR §11)
```

- **Driver adapter:** `@prisma/adapter-pg` (PostgreSQL). The adapter owns the connection/pool; the URL is **not** read from the schema at runtime. *(Verify the exact `PrismaPg` constructor signature against the installed v7 minor at bootstrap — the snippet above reflects the documented API, not CLI-verified output.)*
- **Singleton:** one `PrismaClient` per process (ADR §11) — guard against hot-reload duplication in Next.js dev.

---

## 6. Dependencies & commands (for the Bootstrap sprint)

| Need | Package / command |
|---|---|
| CLI + Migrate | `prisma` (v7) — dev dependency |
| Generated client runtime | `@prisma/client` (v7) |
| PostgreSQL driver adapter | `@prisma/adapter-pg` (+ `pg`) |
| Generate client | `prisma generate` |
| Author/apply migration | `prisma migrate dev` (dev) / `prisma migrate deploy` (prod) |
| Validate schema | `prisma validate` |

- **Migrations remain Prisma Migrate, forward-only, reviewed** (DDS §16, database-standards). The raw-SQL constructs that Prisma can't express (partial uniques, GiST exclusion, CHECKs, extensions, trigram GIN) are added to the **same** initial migration as hand-authored SQL — see `initial-migration-specification.md`.

---

## 7. Risks / watch-items
- The `prisma-client` generator's emitted import path (`output`) must be wired into the app's TS path aliases at bootstrap.
- Driver-adapter pooling differs from the legacy engine; size the `pg` pool for serverless vs. long-lived server deployment.
- Keep `prisma`, `@prisma/client`, and `@prisma/adapter-pg` on the **same** v7 minor to avoid client/engine drift.

*Configuration truth lives here; the DDS §16 cites this document rather than restating it.*
