# Architecture Decision Record (ADR v1)
## Gym Membership Management SaaS — The Project Constitution

| | |
|---|---|
| **Status** | ✅ Accepted — Authoritative |
| **Version** | v1.0 |
| **Date** | 2026-06-25 |
| **Authors** | Principal Software Architect / Tech Lead |
| **Audience** | Human maintainers **and** Claude Terminal (primary developer) |
| **Supersedes** | None |

> **This document is the constitution of the project.** Every architectural and structural decision must conform to it. When code and this ADR disagree, this ADR wins. When a request would violate this ADR, the correct response is to refuse and cite the relevant section — not to silently comply. Changes to this document require a new ADR version, not an ad-hoc edit.

---

## 1. Executive Summary

We are building a **Gym Membership Management SaaS** as a **Modular Monolith** using **Next.js 15 (App Router), TypeScript, PostgreSQL, Prisma, Zod, and Auth.js**, deployed via **Docker Compose**.

The defining constraint of this project is that **Claude Code / Claude Terminal is the primary developer**, with minimal human coding. Therefore the architecture is optimized first for **AI accuracy, predictability, and low token cost**, and second for conventional engineering concerns. We deliberately reject patterns that are "theoretically correct" but increase indirection, file-hopping, and context size — because every layer of abstraction is a tax paid in AI errors and tokens.

The product ships as a **single-gym MVP** but is **multi-tenant from the first migration**. Multi-gym and multi-branch are data-model realities now and UI/feature realities later, with **zero schema rewrite** required to activate them.

**The three rules that govern everything else:**
1. **Simplicity beats purity.** If a simpler design is 90% as good, it wins.
2. **One obvious way to do each thing.** Consistency lets the AI pattern-match instead of inventing.
3. **Tenant isolation is non-negotiable.** Every query is scoped by `gymId`. No exceptions.

---

## 2. Architectural Goals

In priority order. When goals conflict, the higher one wins.

| # | Goal | What it means in practice |
|---|---|---|
| **G1** | **AI accuracy** | Predictable, repetitive structure. The 9th feature looks exactly like the 1st. Minimal "cleverness" the AI must reverse-engineer. |
| **G2** | **Tenant safety** | Impossible-by-default to leak data across gyms. Scoping is structural, not a thing you remember to do. |
| **G3** | **Maintainability** | A human can read any module in isolation and understand it. Low coupling between modules. |
| **G4** | **Low token consumption** | Features live in few, co-located files. Understanding a feature shouldn't require loading 15 files across 6 layers. |
| **G5** | **Fast feature delivery** | A new module is a copy-paste-adapt of an existing one. No ceremony. |
| **G6** | **SaaS scalability** | Multi-tenant data model now; multi-gym and multi-branch activate without migration pain. |

**Explicit non-goals (MVP):** native mobile app, microservices, horizontal sharding, real-time/websocket infrastructure, internationalization beyond per-tenant currency/timezone, offline support.

---

## 3. Technology Decisions

| Layer | Choice | Rationale |
|---|---|---|
| **Framework** | Next.js 15 (App Router) | One framework for UI + API. Server Components reduce client complexity. The AI knows this stack deeply → fewer hallucinations. |
| **Language** | TypeScript (strict) | Types are guardrails the AI reads and obeys. `strict: true` is mandatory. |
| **Styling** | Tailwind CSS | Utility classes are local, predictable, and need no separate file context. |
| **Components** | shadcn/ui | Copy-in components the AI can read and modify directly. No opaque library magic. |
| **Backend** | Route Handlers + Server Actions | Co-located with features. **Server Actions** for mutations from our own UI; **Route Handlers** for anything needing a stable HTTP contract (webhooks, future mobile/public API). |
| **Database** | PostgreSQL | Relational data (members, plans, memberships, payments) is inherently relational. Mature, boring, reliable. |
| **ORM** | Prisma | Single source of truth for schema. Generated types flow into the whole app. The AI is highly fluent in Prisma. |
| **Validation** | Zod | One schema validates input **and** infers the TypeScript type. Used at every trust boundary. |
| **Auth** | Auth.js / NextAuth | Standard, well-documented, session + JWT support. Don't roll our own auth — ever. |
| **Deployment** | Docker Compose | App + Postgres in one reproducible definition. Trivial local and single-host prod. |

**Decision rule for "Server Action vs Route Handler":**
- Mutation triggered by our own form/button → **Server Action**.
- Needs to be called by an external system, a webhook, or a future non-web client, or needs a versioned/public contract → **Route Handler** under `app/api/`.
- Read for rendering → fetch directly in a **Server Component** (no API hop needed).

---

## 4. Rejected Alternatives and Why

| Rejected | Why rejected |
|---|---|
| **Microservices** | Catastrophic complexity for a single team + AI. Network boundaries, distributed transactions, deployment orchestration — all pure cost, zero MVP benefit. A modular monolith gives module boundaries without the distribution tax. |
| **CQRS** | Separate read/write models double the surface area and confuse the AI about "where does logic go." Our reads and writes are not asymmetric enough to justify it. |
| **Event Sourcing** | We need current state, not an event log. Rebuilding state from events is a massive accidental-complexity sink. A normal mutable schema is correct here. |
| **Full DDD (aggregates, value objects, domain events)** | The tactical patterns create many small files and ubiquitous-language ceremony that balloons token cost and indirection. We keep DDD's *one good idea* — module boundaries around business capabilities — and drop the rest. |
| **Repository Pattern** | Prisma **is** the repository. Wrapping it in hand-written repositories adds a layer that hides Prisma's types, increases files-per-feature, and gives the AI more to get wrong. **Rejected unless** a specific module proves it needs swappable persistence (none do). |
| **Service/Manager layer everywhere** | A blanket "every entity gets a service class" is ceremony. Logic lives in a feature's `actions`/`service` functions only when it's non-trivial; trivial CRUD calls Prisma directly. |
| **GraphQL** | Adds a schema/resolver layer and client tooling for no MVP gain. Server Components + Server Actions already give typed end-to-end data flow. |
| **Separate backend (NestJS/Express)** | Splitting frontend and backend doubles deploys, types, and auth wiring. Next.js fullstack keeps everything co-located and type-shared. |
| **Microservice-style "shared-nothing" modules** | Over-isolation. Modules may share the DB and a thin shared layer; forced isolation would force event buses we explicitly reject. |

---

## 5. Folder Structure

The structure is **feature-based**: each business module is a self-contained vertical slice. This is the single most important structural decision for AI development — everything about "Members" lives under `members/`.

```
/
├── docker-compose.yml
├── Dockerfile
├── prisma/
│   ├── schema.prisma          # SINGLE source of truth for all models
│   ├── migrations/
│   └── seed.ts                # seeds the single MVP gym + owner
├── src/
│   ├── app/                   # Next.js App Router (routing + pages only)
│   │   ├── (auth)/            # login, etc.
│   │   ├── (dashboard)/       # authenticated app shell
│   │   │   ├── members/       # route → renders members feature UI
│   │   │   ├── plans/
│   │   │   ├── memberships/
│   │   │   ├── payments/
│   │   │   └── dashboard/
│   │   └── api/               # Route Handlers ONLY where a stable HTTP contract is needed
│   │
│   ├── modules/               # THE HEART OF THE APP — feature slices
│   │   ├── auth/
│   │   ├── members/
│   │   │   ├── components/     # React components for this feature
│   │   │   ├── actions.ts      # Server Actions (mutations)
│   │   │   ├── queries.ts      # read functions (used by Server Components)
│   │   │   ├── schema.ts       # Zod schemas + inferred types
│   │   │   ├── service.ts      # business logic IF non-trivial (optional)
│   │   │   └── constants.ts    # statuses, enums-as-consts (optional)
│   │   ├── member-notes/
│   │   ├── plans/
│   │   ├── memberships/
│   │   ├── payments/
│   │   ├── notifications/
│   │   └── dashboard/
│   │
│   ├── lib/                   # shared, cross-cutting, NON-business
│   │   ├── prisma.ts          # Prisma client singleton
│   │   ├── auth.ts            # Auth.js config
│   │   ├── tenant.ts          # getCurrentGymId(), tenant context helpers
│   │   ├── authz.ts           # role/permission checks
│   │   └── utils.ts
│   │
│   └── components/ui/         # shadcn/ui primitives (shared, dumb)
│
└── ...
```

**Hard rules:**
- `app/` contains **routing and layout only**. Business logic never lives in `app/`; it imports from `modules/`.
- A feature's files live **together** under `modules/<feature>/`. To understand Members, the AI opens one folder.
- `lib/` is for **cross-cutting, non-business** concerns only (db client, auth, tenant, utils). Business rules never go here.
- `components/ui/` holds only **generic, business-agnostic** primitives (Button, Input, Dialog). Feature components live in their feature.

---

## 6. Module Boundaries

Each module owns a business capability. Modules are **vertical slices**, not technical layers.

| Module | Owns | Core entities |
|---|---|---|
| **auth** | Login, session, current user/role resolution | User, GymUser |
| **members** | Member profiles, search, archive | Member |
| **member-notes** | Notes attached to a member | MemberNote |
| **plans** | Plan catalog (price, duration, active flag) | Plan |
| **memberships** | Assigning plans to members; renew, upgrade, freeze, cancel | Membership |
| **payments** | Recording payments against memberships | Payment |
| **notifications** | Generating + serving in-app notifications | Notification |
| **dashboard** | Read-only aggregation across modules | (reads others) |

**Inter-module rules:**
1. **Communicate through exported functions, not internals.** A module imports another module's `queries.ts`/`actions.ts`/`service.ts` public functions — never reaches into another module's components or private helpers.
2. **No circular dependencies.** Dependency direction flows toward lower-level modules. `dashboard` and `memberships` may read from `members`/`plans`; `members` does **not** depend on `memberships`.
3. **`dashboard` is read-only.** It aggregates via other modules' query functions; it never writes.
4. **Shared kernel is `lib/` only.** If two modules need the same helper, it goes in `lib/`, not copied or cross-imported.
5. **One module = one bounded responsibility.** If a file is doing two modules' jobs, split it. If you're tempted to create a 9th "misc" module, you're modeling something wrong.

---

## 7. Multi-Tenancy Strategy

**Model: Shared database, shared schema, row-level tenant isolation by `gymId`.** This is the simplest model that scales to thousands of gyms and is the easiest for the AI to apply consistently.

**Tenant hierarchy:** `Gym` (the tenant) → `Branch` (a location within a gym). MVP runs **one gym, one branch**, but both exist in the schema from migration #1.

**The Iron Laws of Tenancy:**
1. **Every business table has a `gymId` column.** No business entity is global. (Plans, members, memberships, payments, notes, notifications — all carry `gymId`.)
2. **Every query is filtered by `gymId`.** There is no such thing as an unscoped read or write of business data. The current gym comes from the authenticated session via `getCurrentGymId()` — **never** from a client-supplied parameter.
3. **`gymId` is derived from the session, never trusted from input.** A request can ask for "member 123"; the system fetches "member 123 **AND** gymId = session.gymId." A mismatch returns not-found, never the record.
4. **`branchId` is an optional finer scope** within a gym. MVP can default it; the column exists now so branch features need no migration later.
5. **Cross-tenant access is a security incident, not a bug.** Any code path that could return another gym's data must be treated as critical.

**Enforcement approach:** Tenant scoping is applied **explicitly and uniformly** in every `queries.ts`/`actions.ts` via a shared helper that injects `gymId`. We do **not** rely on developers (human or AI) remembering — the pattern is mechanical and identical everywhere, so it can be pattern-matched and reviewed at a glance. (Postgres Row-Level Security is a Phase-2 hardening option; MVP enforces in the data-access layer.)

> **Never** write a Prisma query against a business model without a `gymId` filter. If you see one, it is a bug. Period.

---

## 8. Authorization Strategy

> **Superseded mechanism (now canonical in `authorization-architecture.md`, decision-log ADR-013):** authorization is **permission-based, not role-based.** This section is reconciled accordingly. The *intent* below (Owner has full access; Trainer views members + notes) is unchanged — only the *mechanism* is now permissions.

**Two layers: Authentication (who are you) via Auth.js; Authorization (what may you do) via a permission check.**

**Permissions, capabilities, roles:** Every protected action requires a named **permission** (e.g., `payments.record`). Permissions are grouped into **capabilities**. A **role is only a named bundle of permissions** — it carries no behavioral meaning in code. The MVP roles **Owner** and **Trainer** are simply the permission sets defined in `authorization-architecture.md` (the canonical permission matrix). Future roles (Front Desk, Manager, …) exist as dormant bundles and activate by data, not code.

The link between a `User` and a `Gym` (with its assigned role/permissions) is the **`GymUser`** entity — also the multi-gym enabler (one user, many `GymUser` rows). The active `gymId` and the actor's **resolved permission set** live in the session context.

**Authorization rules:**
1. **Authenticate first, always.** Every authenticated route requires a valid session. Unauthenticated → redirect to login.
2. **Check the required permission at the action boundary.** Every Server Action / Route Handler that mutates verifies the caller **holds the required permission** (e.g., "requires `payments.record`") via the central authorization helper **before** doing work. **Never** branch on a role name — `requireRole(...)`, `if (role === 'OWNER')`, and `switch(role)` are forbidden (`authorization-architecture.md` §10).
3. **Authorize in the server, never in the UI alone.** Hiding a control is UX; the server re-checks the permission every time.
4. **Compose, don't special-case.** Access differences (e.g., Trainers read members but cannot manage plans/payments) are expressed by which **permissions** the role bundle holds — never by role-name conditionals.
5. **Tenancy and authorization are separate checks, in order.** First "are you in this gym/branch?" (tenancy), then "do you hold the required permission?" (authz). Both must pass; deny by default.
6. **Tests assert on permissions, not roles**, so role re-mappings never break tests.

**Keep it simple:** permission keys are stable strings; capabilities group them; roles map to them as data. No policy DSL, no ABAC engine in MVP. The full matrix, naming rules, and migration/activation strategy live in **`authorization-architecture.md`** (canonical).

---

## 9. Database Design Principles

1. **Normalized, relational, boring.** Third-normal-form by default. Denormalize only with a measured reason.
2. **Every business table carries `gymId`** (and `branchId` where a branch scope is meaningful). Index `gymId` on every such table.
3. **Snapshot financial/contractual data.** A `Membership` and a `Payment` **capture** the plan name, price, and duration at the time of the transaction. Editing a `Plan` later must **never** retroactively change historical memberships or payments. History is immutable.
4. **Soft-delete people and historical records** (members, memberships, payments) with a status/archived flag — never hard-delete data with history or financial meaning. Hard-delete is acceptable only for truly transient rows.
5. **Money is stored safely.** Use integer minor units or `Decimal` — **never** floats for currency. Store the currency code (per-gym default).
6. **Time is explicit and UTC-stored.** Persist timestamps in UTC; interpret "today"/expiry in the gym's configured timezone at read time.
7. **Use database-level constraints** (foreign keys, unique constraints, not-null) as the last line of defense — uniqueness (e.g., member phone) is enforced **per `gymId`**, not globally.
8. **IDs are non-sequential** (**UUID v7** — project standard; see DDS §16 and `/docs/database/identifier-strategy.md`) so identifiers aren't guessable across tenants.
9. **Enumerations as explicit string enums** (e.g., membership status) — readable in the DB and in the AI's context.
10. **Migrations are forward-only and reviewed.** Every schema change is a Prisma migration committed to the repo. No manual DB edits.

---

## 10. Coding Standards

These exist so that **every file looks like every other file** — the AI's single greatest accuracy multiplier.

1. **TypeScript `strict: true`.** No `any` (use `unknown` + narrowing). No non-null `!` to silence the compiler — fix the type.
2. **Validate at every trust boundary with Zod.** All external input (forms, route handlers, params) is parsed by a Zod schema before use. Inferred types flow from the schema.
3. **One obvious way.** Mutations = Server Actions in `actions.ts`. Reads = functions in `queries.ts`. Validation = `schema.ts`. Don't invent alternate patterns per feature.
4. **Functions over classes** for logic. No class hierarchies, no inheritance. Pure functions where possible.
5. **Small, named, single-purpose functions.** A function does one thing the name describes. No 200-line god-functions.
6. **Errors are explicit.** Return typed results or throw typed errors that the boundary handles; never swallow errors silently. User-facing failures return clear messages.
7. **No premature abstraction.** Don't build a helper until the second real use. Don't add config for things that don't vary.
8. **Naming is consistent and boring.** `getMembers`, `createMember`, `MemberForm`, `memberSchema`. The AI should be able to *guess* the name correctly.
9. **Co-locate, don't centralize.** Feature constants, types, and components live in the feature, not a global dumping ground.
10. **Comments explain *why*, not *what*.** The code says what; comments justify non-obvious decisions only.

**Forbidden:** dead code, commented-out code left "just in case," speculative generality, utility files named `helpers.ts`/`misc.ts` that become junk drawers.

---

## 11. Prisma Standards

1. **Single schema file** (`prisma/schema.prisma`) is the one source of truth for the data model.
2. **One Prisma client singleton** in `lib/prisma.ts`. Never instantiate `new PrismaClient()` anywhere else (kills connections in dev).
3. **No Repository Pattern.** Call Prisma directly from `queries.ts`/`actions.ts`/`service.ts`. Prisma's typed client *is* the data layer.
4. **Every business query includes `gymId` in the `where`.** This is mandatory and mechanical. A read or write of a business model without `gymId` is a defect.
5. **Use `select`/`include` deliberately.** Fetch the fields you need; don't over-fetch. This also reduces token cost when results enter AI context.
6. **Transactions for multi-write invariants.** Operations that must succeed together (e.g., create membership + record payment) use `prisma.$transaction`.
7. **Migrations via Prisma Migrate only.** `prisma migrate dev` in development, `prisma migrate deploy` in prod. Never edit the DB by hand; never edit a generated migration after it ships.
8. **Let Prisma own types.** Don't hand-write types that duplicate models; derive from Prisma + Zod.
9. **Seed script is canonical.** `prisma/seed.ts` creates the MVP gym, branch, and owner deterministically.

---

## 12. Next.js Standards

1. **Server Components by default.** Add `"use client"` only when a component genuinely needs interactivity/state/browser APIs. Keep client components small and at the leaves.
2. **`app/` is routing only.** Pages import feature UI and query functions from `modules/`. No business logic, no Prisma calls directly in page files beyond invoking a module query.
3. **Mutations = Server Actions** (in the feature's `actions.ts`), called from forms. Each action: authenticate → authorize → validate (Zod) → enforce tenancy → execute → revalidate.
4. **Route Handlers only when justified** (webhooks, external/public/versioned contracts). They follow the same action pipeline.
5. **Data fetching for render happens server-side** in Server Components via `queries.ts`. Avoid client-side fetching of our own data unless interactivity demands it.
6. **`revalidatePath`/`revalidateTag`** after mutations to keep server-rendered data fresh. No manual cache hacks.
7. **Layouts enforce the shell**: the `(dashboard)` layout guarantees authentication and provides tenant/role context to children.
8. **No leaking secrets to the client.** Server-only modules (`prisma`, `auth`, env secrets) are never imported into client components.

**The canonical mutation pipeline (memorize this — every action follows it):**
```
authenticate → authorize (role) → validate (Zod) → scope (gymId) → execute (Prisma) → revalidate
```

---

## 13. UI Standards

1. **shadcn/ui + Tailwind only.** No second component library, no CSS-in-JS, no global stylesheets beyond Tailwind base. One styling system.
2. **Mobile-responsive web is the MVP target.** Design for tablet/desktop front-desk use; ensure it degrades gracefully to mobile browsers. **No native app.**
3. **Composition over configuration.** Build screens from shadcn primitives; don't build a mega-configurable component framework.
4. **Forms:** server-validated with Zod; show clear, field-level errors; disable on submit; confirm destructive actions.
5. **Feature components live in the feature** (`modules/<feature>/components/`). Only generic primitives live in `components/ui/`.
6. **Consistent layout language:** the same table/list/detail/form patterns across every module so screens are predictable to build and to use.
7. **Accessible by default:** semantic HTML, labels, keyboard focus — shadcn gives most of this; don't undo it.
8. **Loading and empty states are required**, not optional. Every list handles zero-data and in-flight states.

---

## 14. Testing Strategy

Pragmatic, not dogmatic. Test what protects money and tenants; don't chase coverage numbers.

| Priority | What to test | How |
|---|---|---|
| **P0 — Critical** | **Tenant isolation** | Automated tests proving a user of Gym A can never read/write Gym B's data, for every module. |
| **P0 — Critical** | **Business invariants** | Membership renewal/upgrade date math, payment recording, plan-snapshot immutability, status transitions. Unit-test the `service.ts`/`actions.ts` logic. |
| **P1 — Important** | **Authorization** | An actor lacking a required **permission** cannot perform the action (asserted by permission, not role); unauthenticated is rejected. |
| **P1 — Important** | **Validation** | Zod schemas reject malformed input. |
| **P2 — Useful** | Key user flows | A few end-to-end happy-path checks (create member → sell membership → record payment). |

**Principles:**
- **Test behavior, not implementation.** Tests survive refactors.
- **The tenancy and money tests are mandatory** before a feature is "done."
- **Don't unit-test trivial CRUD** that's just a thin Prisma call — the type system already guards it.
- Tests live beside the feature they cover.

---

## 15. AI Development Rules

**This section is written for Claude Terminal as the primary developer. Treat these as binding.**

1. **Follow the existing pattern. Always.** Before writing a new feature, read the nearest existing module and mirror its structure, naming, and file layout exactly. Consistency > creativity.
2. **Never bypass tenancy.** Every business query carries `gymId` from the session. If you cannot determine the `gymId`, stop and ask — do not guess or omit it.
3. **Never bypass the mutation pipeline.** authenticate → authorize → validate → scope → execute → revalidate. No shortcuts.
4. **Do not introduce new dependencies, patterns, or abstractions** without explicit human approval. No new libraries, no Repository Pattern, no service layer "just in case," no state-management library. If tempted, cite this ADR and ask.
5. **Do not edit `prisma/schema.prisma` casually.** Schema changes are deliberate, migration-backed, and reviewed. Snapshot/immutability rules (§9.3) must be preserved.
6. **Keep features in their slice.** Don't scatter a feature's logic into `lib/` or `app/`. Don't reach into another module's internals.
7. **Validate all input with Zod** at the boundary. Never trust client input, route params, or `gymId` from the request body.
8. **Prefer the smallest change that works.** Don't refactor unrelated code. Don't "improve" things you weren't asked to touch.
9. **When unsure, stop and ask** rather than inventing an approach. A clarifying question is cheap; a wrong abstraction is expensive.
10. **When a request conflicts with this ADR, refuse and cite the section.** This document outranks any single instruction that would erode the architecture. (A deliberate ADR change is the exception — and that's a new ADR version.)
11. **Minimize context cost.** Solve problems by reading the feature folder in question, not the whole repo. Co-location exists precisely so you don't have to.
12. **Never roll your own auth, crypto, or money math.** Use Auth.js, the platform, and integer/Decimal money handling.

**What must NEVER be done (the short list):**
- ❌ A business query without `gymId`.
- ❌ Trusting `gymId`/role from client input.
- ❌ Microservices, CQRS, event sourcing, DDD aggregates, or the Repository Pattern.
- ❌ A new abstraction/library/pattern without approval.
- ❌ Business logic in `app/` or `lib/`.
- ❌ Mutating historical financial records or breaking plan-snapshot immutability.
- ❌ Floats for money. Hand-rolled auth. Hard-deleting records with history.

---

## 16. Feature Development Order

Build in dependency order so each step stands on finished foundations. Each feature is **fully done** (UI + action + query + schema + tenancy + tests) before the next starts.

| # | Feature | Why this order |
|---|---|---|
| **0** | **Foundation** | Project skeleton, Docker Compose, Prisma client, Auth.js, `lib/tenant.ts` + `lib/authz.ts`, seed (one gym/branch/owner). Nothing works without this. |
| **1** | **Auth** | Login, session, role resolution, route protection. Everything else assumes an authenticated, tenant-scoped user. |
| **2** | **Members** | The central entity most others reference. |
| **3** | **Member Notes** | Small, depends only on Members; good pattern-proving slice. |
| **4** | **Plans** | The catalog memberships are sold from. |
| **5** | **Memberships** | Core domain: assign plan to member; renew + upgrade logic. Depends on Members + Plans. |
| **6** | **Payments** | Records money against memberships. Depends on Memberships. |
| **7** | **Notifications** | Generated from membership expiry etc. Depends on Memberships. |
| **8** | **Dashboard** | Read-only aggregation across everything. Built last because it reads all prior modules. |

**Rule:** Do not start feature N+1 until feature N passes its P0 tests (tenancy + invariants). Half-finished horizontal layers are forbidden; we ship complete vertical slices.

---

## 17. Risks and Mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | **Cross-tenant data leak** | Med | Critical | `gymId` mandatory in every query (§7); central scoping helper; P0 isolation tests; non-guessable IDs. |
| R2 | **AI drifts from patterns over time** | High | High | This ADR as constitution; "mirror the nearest module" rule (§15.1); identical structure per feature; refuse-and-cite on conflict. |
| R3 | **Scope creep into rejected complexity** (someone adds CQRS/repos/microservice) | Med | High | §4 + §15.4 forbid it without a new ADR; review gate on new patterns/deps. |
| R4 | **Plan edits corrupt historical revenue** | Med | High | Snapshot immutability (§9.3); P0 invariant tests; payments/memberships capture values at transaction time. |
| R5 | **Money/timezone correctness bugs** | Med | High | Integer/Decimal money, currency stored; UTC storage + gym-timezone interpretation; invariant tests on date math. |
| R6 | **Auth misconfiguration** | Med | Critical | Use Auth.js (no custom auth); authorize server-side at every action; layout-enforced protection. |
| R7 | **Multi-gym/branch retrofit pain** | Low | High | `gymId`/`branchId` + `GymUser` exist from migration #1; only UI/feature work remains, no schema rewrite. |
| R8 | **Context/token bloat slows AI** | Med | Med | Feature co-location (§5); read one folder per task; no deep layering; small files. |
| R9 | **Over-fetching / N+1 queries** | Med | Med | Deliberate `select`/`include`; index `gymId`; review hot paths (dashboard) for query shape. |
| R10 | **Inconsistent validation** | Low | Med | Zod at every boundary mandated (§10.2, §15.7); schema-inferred types. |

---

## 18. Future Evolution Strategy

This architecture is designed so the future arrives **without rewrites**, only additive change.

**Phase 2 — Activate Multi-Gym (true SaaS):**
- Add gym signup/onboarding UI. The data model (`Gym`, `GymUser`, `gymId` everywhere) already supports it.
- One `User` → many `GymUser` rows enables gym switching with zero schema change.
- Optionally harden tenancy with Postgres Row-Level Security as defense-in-depth.

**Phase 3 — Activate Multi-Branch:**
- `Branch` and `branchId` already exist. Add branch management UI and branch-scoped filtering/permissions. No migration of historical data required.

**Phase 4 — Payments & Communications:**
- Introduce a **payment gateway** behind the existing `payments` module's function boundary (the module's public functions stay stable; implementation swaps). This is exactly where a thin abstraction *is* justified — and only then.
- Add email/SMS channels behind the `notifications` module's existing interface.

**Phase 5 — Scale & Extract (only if proven necessary):**
- The modular monolith can scale vertically and via read replicas for a long time. **Do not** pre-emptively extract services.
- If, and only if, a specific module demonstrates independent scaling or team-ownership needs, its clean boundary (public functions, no internal reach-in) makes extraction into a separate service tractable. The boundaries we enforce now are what make this possible later — without paying the distribution tax today.

**Governing principle for all evolution:** *Add capability by extending the existing structure, not by replacing it. Introduce an abstraction only at the moment a second real implementation exists — never before.*

---

## Appendix A — Core Domain Entities (reference)

> Conceptual reference only — not schema. Every business entity carries `gymId`.

- **Gym** — the tenant. Holds config (currency, timezone, branding).
- **Branch** — a location within a gym (`gymId`).
- **User** — an authenticatable identity (may belong to multiple gyms via GymUser).
- **GymUser** — links a User to a Gym with a role (OWNER/TRAINER). The multi-gym enabler.
- **Member** — a gym member profile (`gymId`, optional `branchId`, optional assigned trainer).
- **MemberNote** — a note attached to a member (`gymId`).
- **Plan** — a sellable membership plan: price, duration, active flag (`gymId`).
- **Membership** — a member holding a plan for a period; supports renewal + upgrade; snapshots plan values (`gymId`).
- **Payment** — money recorded against a membership; snapshots amount (`gymId`).
- **Notification** — an in-app alert (e.g., expiry) (`gymId`).

## Appendix B — One-Line Doctrine (pin this)

> **Modular monolith, feature-sliced. One gym MVP, multi-tenant from day one. Every business query is scoped by `gymId` from the session. Mutations follow authenticate → authorize → validate → scope → execute → revalidate. Simplicity over purity. No microservices, CQRS, event sourcing, DDD aggregates, or repositories. When in doubt, mirror the nearest module and ask before abstracting.**

---

*End of ADR v1. This document is authoritative. Amendments require ADR v2.*
