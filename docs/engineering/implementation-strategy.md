# Implementation Strategy
### PULSE Gym SaaS · Engineering Governance · Phased roadmap

| | |
|---|---|
| **Status** | ✅ Authoritative — the order in which the MVP is built |
| **Gate** | No phase begins until its dependencies are met **and** its scope passes `definition-of-ready.md`. No phase is "done" until its Definition of Success holds. |
| **References** | ADR §16 (build order), `development-workflow.md`, `bounded-contexts.md`, `authorization-architecture.md`, `testing-standards.md` |

> **Why phased, dependency-ordered:** each phase stands on finished foundations, ships as complete vertical slices, and is independently acceptable by the human. This prevents the AI from building breadth without depth and keeps every step reviewable. Phases map to bounded contexts.

---

### Phase 0 — Sprint 0 (Foundations & Decisions)
- **Objective** — Eliminate ambiguity and stand up the skeleton before feature work.
- **Deliverables** — Confirm the **Proposed decisions** (`decision-log.md` ADR-P1…P7); produce the **DDS** (next task) from this foundation; monorepo skeleton (`apps/web` + tooling); CI pipeline; environment-variable validation; base design tokens wired (`globals.css`).
- **Dependencies** — This governance set complete; DDS approved.
- **Risks** — Skipping decision confirmation → rework; over-scaffolding future apps.
- **Acceptance** — All ADR-P items decided; DDS accepted; repo builds green; tokens load.
- **Definition of Success** — A reviewer can start any feature with zero open foundational questions.
- **Recommended Review** — Architecture + product sign-off.

### Phase 1 — Project Bootstrap
- **Objective** — A running, empty, deployable app shell.
- **Deliverables** — App shell (AppShell/Sidebar/TopBar per Catalog), Docker Compose (app + Postgres), Prisma client singleton, seed scaffold, health check.
- **Dependencies** — Phase 0.
- **Risks** — Hidden config drift; secrets handling.
- **Acceptance** — App boots locally via Compose; empty authenticated shell renders; seed runs.
- **Definition of Success** — The container starts clean and the shell is navigable.
- **Recommended Review** — Engineering.

### Phase 2 — Authentication (IAM, part 1)
- **Objective** — Secure sign-in and session, scoped to a gym.
- **Deliverables** — Auth.js integration; login/logout; session → active gym/branch context; route protection; seed of the single gym + owner.
- **Dependencies** — Phase 1.
- **Risks** — Auth misconfiguration (critical); tenant context not established early.
- **Acceptance** — Owner can sign in/out; unauthenticated access is rejected; session carries gym context.
- **Definition of Success** — No route serves business data without an authenticated, gym-scoped session.
- **Recommended Review** — Security + engineering.

### Phase 3 — Authorization (IAM, part 2)
- **Objective** — Permission-based access enforced everywhere.
- **Deliverables** — Permission keys + capability/role mappings seeded (incl. **dormant** Front Desk + future roles); `@pulse/auth` permission-check; server-side permission gates; UI permission-aware visibility. **No role-name branching.**
- **Dependencies** — Phase 2.
- **Risks** — Accidental role-coupling (the #1 drift risk); missing a gate.
- **Acceptance** — Every protected action checks a permission; Owner/Trainer behave per the matrix; dormant roles exist but are unassignable; **tests assert on permissions, not roles**.
- **Definition of Success** — A new role could be enabled by data alone; a grep finds **zero** role-name conditionals.
- **Recommended Review** — Security (mandatory) + architecture.

### Phase 4 — Members (Member Management context)
- **Objective** — Manage members, notes, and trainer assignment.
- **Deliverables** — Register/search/update/archive/reactivate members; member profile; notes; assign/clear trainer. Permissions: `members.*`, `notes.*`, `assignments.*`.
- **Dependencies** — Phase 3.
- **Risks** — Duplicate-identity handling; archive-with-active policy (ADR-P3).
- **Acceptance** — Member CRUD + notes + assignment work, permission-gated, tenant-scoped; P0 isolation tests pass.
- **Definition of Success** — Members are fully managed within one gym with no cross-gym leakage.
- **Recommended Review** — Engineering + product.

### Phase 5 — Plans (Plan Catalog context)
- **Objective** — Define sellable plans.
- **Deliverables** — Create/update/deactivate plans; list active plans. Permissions: `plans.*`.
- **Dependencies** — Phase 3 (independent of Members).
- **Risks** — Plan-edit-vs-history confusion (must not touch existing memberships).
- **Acceptance** — Plans managed; inactive plans not sellable; edits don't affect existing memberships (verified once memberships exist).
- **Definition of Success** — A correct, permission-gated plan catalog exists.
- **Recommended Review** — Product (pricing) + engineering.

### Phase 6 — Memberships (Membership Lifecycle context) — **core**
- **Objective** — The heart of the domain: sell, renew, upgrade, freeze, cancel; snapshot terms; expiry logic.
- **Deliverables** — Create/renew/upgrade/freeze/resume/cancel; one-active enforcement; snapshotting; status + expiring-soon evaluation. Permissions: `memberships.*`.
- **Dependencies** — Members (Phase 4) + Plans (Phase 5).
- **Risks** — Date math (renewal continuity, freeze extension); invariant correctness; per ADR-P1/P3/P4/P5 decisions.
- **Acceptance** — All transitions per `state-machines.md`; **P0 invariant tests pass** (renewal preserves days, freeze extends end, snapshot immutable, one-active enforced).
- **Definition of Success** — Membership lifecycle is provably correct and isolated.
- **Recommended Review** — Architecture + product (mandatory; highest rigor).

### Phase 7 — Payments (Billing & Payments context)
- **Objective** — Record money against memberships; define revenue.
- **Deliverables** — Record/void payments; paid/unpaid status; revenue recognition. Permissions: `payments.*`.
- **Dependencies** — Memberships (Phase 6).
- **Risks** — Money exactness; revenue attribution; **Billing must not mutate membership state** (`domain-boundary-rules.md`).
- **Acceptance** — Payments recorded/voided; revenue counts only paid; amounts immutable; boundary test proves recording a payment doesn't change membership state; P0 tests pass.
- **Definition of Success** — Financial records are exact, auditable, and correctly bounded.
- **Recommended Review** — Finance/security + architecture.

### Phase 8 — Dashboard (Reporting context, part 1)
- **Objective** — At-a-glance business health.
- **Deliverables** — Active members, expiring 7/30, new this month, revenue this month — **by reading** owning contexts (no recalculation). Permission: `dashboard.view`.
- **Dependencies** — Members, Memberships, Payments.
- **Risks** — Dashboard re-implementing business rules (forbidden); performance on aggregation.
- **Acceptance** — Figures correct and gym-scoped; computed via owners' interfaces; active counts exclude Scheduled/Frozen/Cancelled and revenue excludes Pending/voided (RPT-4).
- **Definition of Success** — Numbers match underlying records; Reporting owns no business rule.
- **Recommended Review** — Product + architecture.

### Phase 9 — Notifications (Notifications context)
- **Objective** — In-app alerts for expiring/expired memberships.
- **Deliverables** — Scheduled generation (idempotent), unread/read/dismiss, badge. Permissions: `notifications.read/manage`.
- **Dependencies** — Memberships (Phase 6).
- **Risks** — Duplicate alerts; frozen exclusion; scheduling reliability.
- **Acceptance** — Non-duplicating generation; frozen excluded; read/dismiss work; tenant-scoped.
- **Definition of Success** — Staff get exactly the right alerts, once.
- **Recommended Review** — Engineering + product.

### Phase 10 — Reporting (Reporting context, part 2)
- **Objective** — Beyond the dashboard: the reporting surface MVP needs.
- **Deliverables** — Defined MVP reports (e.g., expiring lists, revenue summary) via owning-context reads; `reports.view`.
- **Dependencies** — Phases 6–8.
- **Risks** — Calculation leakage; scope creep.
- **Acceptance** — Reports accurate, gym-scoped, read-only; no domain calculations owned here.
- **Definition of Success** — Reporting composes truth it does not compute.
- **Recommended Review** — Product + architecture.

### Phase 11 — Release Candidate
- **Objective** — A coherent, accessible, secure, releasable MVP.
- **Deliverables** — End-to-end journeys verified; accessibility gate across the app (Design System v1.1 §7); security review (`security-guidelines.md`); performance pass; docs current; changelog/tag.
- **Dependencies** — All prior phases.
- **Risks** — Cross-feature regressions; a11y/security gaps surfacing late.
- **Acceptance** — All phase Definitions of Success hold; E2E happy paths green; a11y + security reviews pass; DoD met repo-wide.
- **Definition of Success** — The MVP is acceptable to the human and safe to release.
- **Recommended Review** — Full sign-off (product + architecture + security).

---

## Sequencing rules
1. **IAM (authn → authz) precedes all features** — nothing is built without permission gating in place. *Why:* retrofitting authorization invites role-coupling and leaks.
2. **Plans and Members can proceed in parallel after Phase 3**; Memberships requires both.
3. **Payments after Memberships; Dashboard/Reporting/Notifications after their sources.**
4. **No phase starts until `definition-of-ready.md` is satisfied for its scope.**
5. **Each phase ships complete vertical slices**, not horizontal layers (ADR §16).

## Open Assumptions
- **A1** — Confirming ADR-P1…P7 in Sprint 0 is a hard prerequisite for Phase 6 (Memberships) and Phase 7 (Payments). If deferred, those phases inherit unresolved policy and must STOP.
