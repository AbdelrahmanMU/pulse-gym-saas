# Architectural Decision Log
### PULSE Gym SaaS · Architecture Governance

| | |
|---|---|
| **Status** | ✅ Authoritative — the running record of every major decision |
| **Relationship to ADR** | The ADR is the narrative constitution; this log is the **indexed, reviewable ledger**. Each entry references the ADR/doc where the decision lives in full. |
| **Format** | ID · Status · Context · Decision · Alternatives · Reason · Consequences · Review Trigger |

> Statuses: **Accepted** (in force) · **Superseded** (replaced — points to successor) · **Proposed** (awaiting confirmation). New decisions append; existing IDs are never reused or rewritten (amend by adding a successor).

---

### ADR-001 · Modular Monolith · **Accepted**
- **Context** — Single team + AI, MVP speed, future SaaS scale.
- **Decision** — One deployable, feature-sliced modular monolith.
- **Alternatives** — Microservices; layered monolith.
- **Reason** — Module boundaries without distributed-systems cost; AI-friendly.
- **Consequences** — Strong in-process boundaries required (`bounded-contexts.md`); no network seams to lean on.
- **Review Trigger** — A module demonstrably needs independent scaling/ownership.

### ADR-002 · Feature-Based (Vertical Slice) Architecture · **Accepted**
- **Context** — Predictable structure for AI; low token cost per feature.
- **Decision** — Code organized by feature module, not technical layer.
- **Alternatives** — Layered (controllers/services/repos).
- **Reason** — Co-location → the AI reads one folder per feature.
- **Consequences** — Discipline needed to keep slices cohesive.
- **Review Trigger** — Cross-cutting concerns outgrow the slice model.

### ADR-003 · Next.js Fullstack (App Router) · **Accepted**
- **Context** — One stack for UI + server; AI fluency.
- **Decision** — Next.js 15, Server Components default, Server Actions + Route Handlers.
- **Alternatives** — Separate SPA + API backend.
- **Reason** — Co-located, type-shared, fewer moving parts.
- **Consequences** — Tied to Next.js conventions.
- **Review Trigger** — A non-web client needs a backend the app can't serve cleanly.

### ADR-004 · PostgreSQL + Prisma, no Repository Pattern · **Accepted**
- **Context** — Relational domain; AI fluency; avoid needless layers.
- **Decision** — Postgres via Prisma; Prisma *is* the data layer.
- **Alternatives** — Hand-written repositories; another ORM; NoSQL.
- **Reason** — Typed, single source of schema; fewer files to get wrong.
- **Consequences** — Persistence not abstracted (acceptable; ADR §4).
- **Review Trigger** — A proven need for swappable persistence in one module.

### ADR-005 · Zod Validation at Boundaries · **Accepted**
- **Decision** — One Zod schema per input boundary; types inferred from it.
- **Reason** — Validation and types share one source.
- **Consequences** — All external input parsed before use.
- **Review Trigger** — Validation needs outgrow Zod.

### ADR-006 · Auth.js for Authentication · **Accepted**
- **Decision** — Use Auth.js/NextAuth; never roll our own auth.
- **Reason** — Auth is high-risk; use a vetted library.
- **Consequences** — Conform to Auth.js session model.
- **Review Trigger** — Enterprise SSO/MFA requirements exceed it.

### ADR-007 · Multi-Tenancy by `gymId` (shared DB, row isolation) · **Accepted**
- **Decision** — Every business record carries `gymId`; every query scoped by it from the session.
- **Alternatives** — DB-per-tenant; schema-per-tenant.
- **Reason** — Simplest model that scales to many gyms; AI applies it mechanically.
- **Consequences** — Tenancy is a universal, non-negotiable rule; RLS is a future hardening.
- **Review Trigger** — A tenant needs physical isolation (compliance).

### ADR-008 · Snapshot Immutability for Financial/Contractual Data · **Accepted**
- **Decision** — Memberships/payments snapshot plan terms/amounts; never rewritten by later edits.
- **Reason** — Historical revenue and member contracts must not change.
- **Consequences** — Plan edits affect only future memberships.
- **Review Trigger** — A regulatory change in record-keeping.

### ADR-009 · Money as Integer/Decimal; UTC + Gym Timezone · **Accepted**
- **Decision** — Exact money with currency; timestamps UTC, judged in gym timezone.
- **Reason** — Financial and date correctness.
- **Review Trigger** — Multi-currency settlement requirements.

### ADR-010 · In-App Notifications Only (MVP) · **Accepted**
- **Decision** — MVP notifications are in-app; no email/SMS/messaging.
- **Reason** — Deliver value without external-channel complexity.
- **Consequences** — Channels are a future, additive context capability.
- **Review Trigger** — Retention needs external reminders.

### ADR-011 · PULSE Design System v1.1 as UI Authority · **Accepted**
- **Decision** — Tokens-first, accessible, Tailwind v4; supersedes PULSE v1.
- **Reason** — Consistency + accessibility + AI-friendliness.
- **Consequences** — No hardcoded styles; one styling path.
- **Review Trigger** — A rebrand or design-language change (→ v2).

### ADR-012 · Component Catalog as UI Composition Authority · **Accepted**
- **Decision** — Screens compose catalogued components only; new components require approval.
- **Reason** — Prevent inconsistent AI-generated UI.
- **Review Trigger** — A recurring pattern not yet catalogued.

### ADR-013 · **Permission-Based Authorization** (supersedes role-based) · **Accepted**
- **Context** — Roles will multiply (Front Desk, Manager, Accountant…); role-coupled logic causes drift and rework.
- **Decision** — Authorization is **permission-based**; roles are only permission bundles; **no logic branches on role names** (`authorization-architecture.md`).
- **Alternatives** — Role-based checks (ADR §8, now superseded as a *mechanism*); attribute-based access control (ABAC).
- **Reason** — New roles activate with zero code change; stable permission keys; least-privilege by default.
- **Consequences** — **ADR §8, CLAUDE.md (§3/§9 permission lines), `business-rules.md` PRM-*, and `domain-model.md` Role must be amended** to reference permissions, not role checks (see `project-readiness-report.md`).
- **Review Trigger** — Need for ABAC (context/attribute conditions) or gym-custom roles at scale.

### ADR-014 · **Dormant Future Roles (Front Desk et al.)** · **Accepted**
- **Context** — Front-desk operations are real, but the MVP role set is Owner+Trainer.
- **Decision** — Define Front Desk (and Manager/Receptionist/Accountant/Branch Manager) in documentation, permission strategy, and migrations as **dormant**; not assigned, shown, or used in MVP. Resolves domain **OQ-1**.
- **Alternatives** — Omit future roles (forces later redesign); ship Front Desk now (scope creep).
- **Reason** — Enable later activation with **no redesign** (`authorization-architecture.md` §8–9).
- **Consequences** — Seed/migration carries dormant roles; MVP workflows name Owner as actor for sales/payments.
- **Review Trigger** — Business decides to staff a front desk.

### ADR-015 · **Monorepo (Turborepo + pnpm workspaces)** · **Accepted**
- **Context** — Future apps (Member Portal, Mobile, Super Admin, Marketing, Public API) will share domain/design/auth code.
- **Decision** — Single monorepo; shared packages; MVP ships only the Web app (`monorepo-strategy.md`).
- **Alternatives** — Polyrepo; single-app repo.
- **Reason** — Share code without duplication; add apps without restructuring; one place for the AI.
- **Consequences** — Workspace/dependency discipline required; build orchestration via Turborepo.
- **Review Trigger** — Repo scale/build times demand splitting.

### ADR-016 · Docker Compose Deployment (MVP) · **Accepted**
- **Decision** — App + Postgres via Docker Compose.
- **Reason** — Reproducible single-host deploy; simple for MVP.
- **Review Trigger** — Scale/HA needs (orchestration, managed DB).

### ADR-017 · No Event Bus / CQRS / Event Sourcing / DDD-Aggregates (MVP) · **Accepted**
- **Decision** — "Events" are a business vocabulary (`event-catalog.md`); collaboration is in-process via public interfaces.
- **Reason** — Avoid accidental complexity; ADR-rejected patterns.
- **Review Trigger** — Genuine async/integration needs across services.

---

## Previously-Proposed Decisions — now **RESOLVED** (final governance reconciliation)
All formerly-open decisions are decided and binding. No open architectural decisions remain.

| ID | Topic | **Final decision** | Status |
|---|---|---|---|
| ADR-018 (was P1) | Upgrade policy | **Deferred upgrade:** current membership runs to expiry; upgrade creates a **Scheduled** next membership effective after expiry; **no proration/refund/adjustment** (UPG-1…3). | ✅ Accepted |
| ADR-019 (was P2) | Payment vs access; standing | **Membership status controls access; payment standing never does.** Payment standing is derived **Pending → Partially Paid → Paid**; new memberships start Pending (MSH-6, PAY-3). | ✅ Accepted |
| ADR-020 (was P3) | Archive policy | **Archive only when no Active/Scheduled/Frozen membership AND no Outstanding Balance**; else rejected (ARC-3; Frozen clarified 2026-07-01 — a frozen membership is resumable so it must be closed first). | ✅ Accepted |
| ADR-021 (was P4) | Scheduled memberships | **Scheduled** memberships exist, but **only** as the queued upgrade/early-renewal next period (one Active + one Scheduled max — MSH-7). Arbitrary future-dating remains out of scope. | ✅ Accepted |
| ADR-022 (was P5) | Freeze caps & authority | **No hard cap** (duration recorded); freezing requires permission **`memberships.freeze`** (never a role). | ✅ Accepted |
| ADR-023 (was P6) | Payment attribution | **Every payment belongs to exactly one membership; no orphan payments** (PAY-6; permanent invariant). | ✅ Accepted |
| ADR-024 (was P7) | Gym-custom roles | **Platform-defined roles in MVP**; gym-custom bundles are a supported-but-future capability (no redesign needed). | ✅ Accepted |
| **ADR-025** | Scheduled-membership obligation timing | A Scheduled membership's amount due enters **current** Outstanding Balance / dashboards **only on activation**; it may be **pre-paid** voluntarily before then (revenue counts when received). Keeps current financials reflecting the live period; no archive loophole (ARC-3 already blocks on a Scheduled membership). | ✅ Accepted |

### ADR-026 · **Identifier strategy: UUID v7** · **Accepted** (2026-06-25)
- **Context** — Pre-bootstrap Database Architecture Review finalized the PK/FK identifier (DDS §16 had left "UUID v7 or CUID2" open).
- **Decision** — All primary keys and foreign keys are **UUID v7**, stored as native Postgres `uuid` (`@id @default(uuid(7)) @db.Uuid`). PG18 `uuidv7()` is an optional column-level default for non-ORM inserts.
- **Alternatives** — CUID/CUID2; auto-increment ints; random UUID v4.
- **Reason** — Non-sequential & non-guessable (tenant safety) **and** time-ordered (B-tree insert locality on the heaviest append-only tables — payments/audit_logs/memberships); RFC-standard, native `uuid` type, cross-language. CUID isn't DB-native; v4 wrecks index locality; serial is enumerable.
- **Consequences** — Every FK column is `uuid` (`@db.Uuid`); greenfield, no integer→uuid backfill. Canonical rationale: `/docs/database/identifier-strategy.md`.
- **Review Trigger** — A column with an unavoidable need for a different id type (none today).

### ADR-027 · **ORM target: Prisma 7** · **Accepted** (2026-06-25)
- **Context** — Same review; Prisma 7 changed the configuration model (refines ADR-004).
- **Decision** — Target **Prisma 7**: `datasource` carries `provider` only (connection URL in `prisma.config.ts`); the new **`prisma-client`** generator (TS/ESM, required `output`); runtime via the **`@prisma/adapter-pg`** driver adapter. No Prisma 6 backward compatibility.
- **Alternatives** — Stay on Prisma 6 (legacy `url`-in-schema + `prisma-client-js`).
- **Reason** — Current major; driver-adapter model; schema validated empirically under Prisma 7.
- **Consequences** — Adds `prisma.config.ts` + `@prisma/adapter-pg`; generated client emitted to an explicit path. Config truth: `/docs/database/prisma-7-strategy.md`.
- **Review Trigger** — Prisma 8, or a deployment target the adapter doesn't serve.

### ADR-028 · **Seeded role set: Receptionist & Branch Manager are strategic definitions, not seed data** · **Accepted** (2026-06-26)
- **Context** — Session 2 (T-11) implements the foundational seed. Two docs conflicted: DDS §16 (seed list) says seed the dormant roles "with their permission mappings" and names five (Front Desk, Manager, Receptionist, Accountant, Branch Manager); the **canonical** authorization reference (`authorization-architecture.md` §6) defines a concrete permission matrix only for **Owner, Trainer, Front Desk, Manager, Accountant**, and explicitly calls **Receptionist** and **Branch Manager** "placeholders in strategy, **not MVP**" (§113) with no permission set — only prose ("Receptionist ⊆ Front Desk; Branch Manager = Manager scoped").
- **Decision** — The seed creates exactly **five** platform roles: **Owner, Trainer** (`is_assignable=true`) and **Front Desk, Manager, Accountant** (`is_assignable=false`, dormant), each mapped to its `●` cells in the §6 matrix. **Receptionist and Branch Manager are NOT seeded.** No permission mapping is invented for them — doing so would be guessing on authorization (the constitution's #1 drift risk; §8/§13 mandate STOP-on-conflict).
- **Alternatives** — (a) Seed all five dormant roles, inventing permission sets for the two undefined ones (rejected: guesses on authz). (b) Seed the two with **zero** mappings (rejected: a zero-permission role is meaningless and misleading as seed data).
- **Reason** — `authorization-architecture.md` is the canonical authority and outranks the DDS on authorization (constitution §12/§13). Receptionist/Branch Manager remain **strategic definitions** until their permission matrices are authored and approved; reintroducing them is then a one-line additive seed change (zero code change — authz §8).
- **Consequences** — `roles` seeds 5 rows; `role_permissions` seeds 102 mappings. DDS §16's "five dormant roles" line is **flagged for reconciliation** (lower-authority doc; to be amended to reference this ADR). Activating either future role requires authoring its §6 matrix column first.
- **Review Trigger** — A product decision to activate Receptionist or Branch Manager (author its permission matrix, then seed).

### ADR-029 · **Next.js 16 + full-document navigation after same-page mutations** · **Accepted** (2026-07-08, human-approved upgrade)
- **Context** — Performance Recovery sprint. In production builds (never dev), a server action whose success response re-rendered the **current** route in place (`revalidatePath` of the page's own path, or `redirect()` back to the same URL) intermittently suspended React's pending form transition **forever** — the submit button stuck on its pending label and the UI never updated. Measured across Next 15.5.19/15.5.20/16.2.10: the race is data/timing-sensitive (fiber root left with `suspendedLanes` set and `pingedLanes=0`); no version or `staleTimes` combination made in-place success responses reliable. Two primitives measured 100% reliable across every build: **plain action results** (no revalidation → no in-place re-render) and **full-document navigations**.
- **Decision** — (a) Upgrade to **Next.js 16.2.10** (human-approved after 15.5.20 was proven not to contain the fix), with `experimental.staleTimes.dynamic = 30` for instant repeat navigation. (b) Same-page mutations (membership renew/upgrade/freeze/resume/cancel, payment record/void) return **plain results** and their forms leave via `useFullNavigationOnSuccess` (a `lib/forms` hook doing `window.location.assign`), which re-renders server-fresh and resets the client router cache — the freshness `revalidatePath` provided, without the deadlock. Cross-page mutations (create/edit → a different route) keep server `redirect()`, which never exhibited the race.
- **Alternatives** — Stay on 15.5.x (lifecycle actions permanently hung — pilot-blocking); code workarounds relying on in-place revalidation shapes (each was empirically racy); `router.refresh()` from the form (unreachable — the success state itself is trapped in the suspended transition).
- **Reason** — Deterministic mutations outrank navigation elegance; a ~400–500 ms honest reload beats an intermittent infinite spinner on money-adjacent flows.
- **Consequences** — The ADR §mutation-pipeline "revalidate" step is fulfilled client-side (full reload) for same-page mutations. Other in-place forms (notifications mark-read/dismiss, staff suspend, settings saves) currently pass but share the theoretical exposure — migrate them to the same hook opportunistically. Guarded by `e2e/lifecycle.spec.ts`, which must be run against a **production** build (`next build && next start`) after any Next/React version or `staleTimes` change.
- **Review Trigger** — An upstream Next/React release proves in-place action responses reliable under this app's e2e battery.

### ADR-030 · **Engineering Observability Authority ratified; `logging-observability.md` demoted to implementation spec** · **Accepted** (2026-07-09, Governance Ratification Sprint)
- **Context** — A permanent **Engineering Observability Authority** was designed (commit `8e366f0`) and proposed. It collided with `logging-observability.md`, which was already "✅ Authoritative" and staked doctrine on audit / monitoring / tracing / future-observability — the dual-authority conflict the constitution (§12/§13) forbids. The human accepted the authority's technical content.
- **Decision** — Ratify the authority as an **accepted, first-class architecture-tier authority** (v1.0), subordinate to the ADR on structural conflict, using its own `OBS-n` law IDs. **Demote `logging-observability.md` to an Implementation Specification** under it: it retains the concrete **log field schema / level table / redaction paths / performance-threshold**; its `Audit Logging`, `Monitoring`, and `Future Observability Strategy` **doctrine** is superseded by the authority (§3 / §9 / §11 / §12 / §15) via **supersession pointers — no information deleted**. Insert the authority into `CLAUDE.md §12` (architecture tier); add an **observability gate** to the DoD (`CLAUDE.md §10`, `ai-development-rules.md §H`, `development-workflow.md §9`) and the pre-merge / feature checklists (`feature-template.md §10a`, `§12`, `§13`).
- **Alternatives** — (a) Leave both docs "Authoritative" (rejected: a live dual-authority conflict). (b) Fold `logging-observability.md` into the authority and delete it (rejected: destroys the field-level spec's single home and its history). (c) Keep the authority "Proposed" and defer integration (rejected: it was accepted; governance limbo helps no one).
- **Reason** — One authoritative home per fact: **doctrine → authority; concrete fields → implementation spec**; architecture-tier governs *philosophy/why*, engineering-tier governs *values/how*.
- **Consequences** — Updated in this change set: `engineering-observability-authority.md` (status→Accepted, §16 record), `logging-observability.md` (demoted + 3 pointers), `CLAUDE.md` (§10, §12), `feature-template.md` (§10a, §12, §13), `development-workflow.md` (§9), `ai-development-rules.md` (§H), `error-handling.md` + `database-standards.md` (cross-ref rows), and this log. **Observability is now a Definition-of-Done gate** — a *design* gate today, promoted to a *code* gate (+ a future architecture-fitness test) once Phase-1 wiring lands. **No code, libraries, tables, or CI changed.** Future observability dependencies (log drain, metrics, tracing, alerting, error-tracking, `/api/version`) remain **deferred until after the pilot**, each a separate future decision. Full report + supersession map: `/docs/architecture/observability-authority-ratification.md`.
- **Review Trigger** — Phase-1 wiring begins (promotes the design gate to a code gate), or any future observability dependency approval is sought.

---

*Architectural foundation is fully decided. The database layer is finalized and verdicted **READY FOR BOOTSTRAP** (`/docs/database/database-readiness-report.md`, 2026-06-25).*
