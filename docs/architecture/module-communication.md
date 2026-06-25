# Module Communication
### PULSE Gym SaaS · Architecture Governance

| | |
|---|---|
| **Status** | ✅ Authoritative — how bounded contexts (modules) interact |
| **Principle** | **No module writes another module's business data directly.** Collaboration is through public contracts; the owner performs its own writes. |
| **References** | `bounded-contexts.md`, `data-ownership.md`, `domain-boundary-rules.md`, ADR §6 |

> In the modular monolith, "communication" is **in-process calls to a module's public functions** — not an event bus (ADR-017). This document fixes, per module, what it may depend on, what it may read/write, its public contract, and what is forbidden — so the AI never reaches across a boundary.

---

## Universal rules
1. **One-directional dependencies, no cycles.** Dependencies flow toward foundations (IAM at the base; Reporting at the top). *(ADR §6, `monorepo-strategy.md`)*
2. **Write only your own data.** A module writes only the entities it owns (`data-ownership.md`). To change another module's data, **call that module's public contract**; it does the write.
3. **Read via public contracts, not internals.** No module imports another's internal helpers/state; it uses the published read functions.
4. **Own your rules.** A module never re-implements a rule another owns (`domain-boundary-rules.md`); it asks.
5. **Emit facts, let consumers react.** An owner may surface a business fact (e.g., "membership expiring"); consumers decide what to do. The owner never performs the consumer's job.
6. **Deny by default across boundaries.** If a needed contract doesn't exist, **STOP and add it deliberately** — never reach across.

---

## Per-module communication

### IAM (Tenant & Identity) — foundation
- **Allowed Dependencies** — none (base).
- **Forbidden Dependencies** — any feature module (would create a cycle).
- **Read Access (by others)** — all modules read the resolved actor/gym/branch and **permission checks**.
- **Write Access** — IAM writes Gym, Branch, User, GymUser, Role/Permission mappings; **no other module writes these**.
- **Public Contracts** — "current actor + gym/branch context"; "actor holds permission X (in scope)?"; "grant/revoke role".
- **Forbidden Calls** — calling feature modules; embedding domain rules.
- **Ownership** — sole owner of identity/authorization data.

### Plan Catalog
- **Allowed Dependencies** — IAM.
- **Forbidden Dependencies** — Membership, Billing, Reporting, Notifications.
- **Read Access (by others)** — Membership reads current plan terms (to snapshot); Reporting reads plan info.
- **Write Access** — Plan Catalog writes Plans only.
- **Public Contracts** — "list active plans"; "get a plan's current terms".
- **Forbidden Calls** — creating/mutating memberships or payments; reaching into a membership.
- **Ownership** — sole owner of Plan data; never touches existing memberships (PLN-3).

### Member Management
- **Allowed Dependencies** — IAM; **reads** Membership and Billing for the archive check (no Active/Scheduled + zero balance — ARC-3).
- **Forbidden Dependencies** — Notifications, Reporting.
- **Read Access (by others)** — Membership/Billing/Notifications/Reporting read member summaries.
- **Write Access** — writes Member, MemberNote, Trainer Assignment only.
- **Public Contracts** — "register/update/archive/reactivate member"; "assign/clear trainer"; "get member summary".
- **Forbidden Calls** — writing membership/payment/notification data; deciding access rights.
- **Ownership** — sole owner of Member, MemberNote, Assignment. Archive **performs its own write** but **asks** Membership/Billing for the gating facts.

### Membership Lifecycle — core
- **Allowed Dependencies** — IAM; **reads** Plan Catalog (to snapshot terms).
- **Forbidden Dependencies** — Billing, Notifications, Reporting (must not depend upward).
- **Read Access (by others)** — Billing (attribution + amount due), Notifications (expiry facts), Reporting (counts), Member Mgmt (archive check) read membership state via contracts.
- **Write Access** — writes Membership state only (create/renew/upgrade/freeze/resume/cancel/schedule→active).
- **Public Contracts** — "create/renew/upgrade/freeze/resume/cancel membership"; "is membership active?"; "amount due / membership for a payment"; "memberships expiring/expired as of today".
- **Forbidden Calls** — recording money/revenue; generating notifications; computing reports.
- **Ownership** — sole owner of Membership state and all date/lifecycle logic.

### Billing & Payments
- **Allowed Dependencies** — IAM; **reads** Membership (to attribute a payment and read amount due).
- **Forbidden Dependencies** — Notifications, Reporting; **must not write Membership**.
- **Read Access (by others)** — Reporting reads revenue/balances; Membership reads **derived standing/balance** via Billing's contract.
- **Write Access** — writes Payment records only (record/void).
- **Public Contracts** — "record payment for membership"; "void payment"; "payment standing / outstanding balance for a membership"; "revenue for period".
- **Forbidden Calls** — **changing membership state** (recording a payment never activates/extends a membership — INV-38); owning plan pricing; gating access.
- **Ownership** — sole owner of Payment + revenue truth.

### Notifications
- **Allowed Dependencies** — IAM; **consumes** expiry/expired **facts** from Membership.
- **Forbidden Dependencies** — Billing, Reporting; must not own membership/financial rules.
- **Read Access (by others)** — staff read the notification queue.
- **Write Access** — writes Notification state only (generate/read/dismiss).
- **Public Contracts** — "generate due notifications (for facts X)"; "list/read/dismiss notifications".
- **Forbidden Calls** — deciding *why* a membership is expiring (Membership owns that); computing revenue.
- **Ownership** — sole owner of Notification data.

### Reporting & Dashboard
- **Allowed Dependencies** — IAM; **reads** Member, Membership, Billing.
- **Forbidden Dependencies** — none may depend **on** Reporting.
- **Read Access (by others)** — none (it is a leaf consumer).
- **Write Access** — **none. Reporting writes no business data.**
- **Public Contracts** — "dashboard figures (gym scope)"; "report (definition, range)".
- **Forbidden Calls** — performing domain calculations (revenue/active/expiry) itself; writing anywhere.
- **Ownership** — owns presentation/derived figures only; composes truth it does not compute.

---

## Circular Dependency Prevention
- **Dependency direction is fixed:** IAM → (Plan, Member) → Membership → Billing → Reporting; Notifications consumes Membership facts. **Nothing depends upward.**
- **No module imports a module that (directly or transitively) imports it.** Lint/build enforce acyclicity (`monorepo-strategy.md`).
- If a needed dependency would create a cycle, the design is wrong: **STOP**, and either move the rule to its correct owner or introduce a downward-facing contract — never a back-edge.

## Enforcement
- **No cross-module write** is permitted; reviews and tests assert that, e.g., recording a payment does not mutate membership state (INV-38).
- A feature that communicates by reaching into another module's internals, or by writing another module's data, is **not done** (Definition of Ready/Done), regardless of behavior.
