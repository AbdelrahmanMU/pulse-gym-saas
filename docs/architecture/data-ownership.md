# Data Ownership
### PULSE Gym SaaS · Architecture Governance

| | |
|---|---|
| **Status** | ✅ Authoritative — the single owner of every business entity's data |
| **Principle** | **No business data has more than one owning context.** One writer, many readers. |
| **References** | `bounded-contexts.md`, `domain-boundary-rules.md`, `module-communication.md`, `immutable-history.md`, `authorization-architecture.md` |

> For each entity: the **Business Owner** (human role-bundle accountable), the **Owning Context** (the only context that may **write** it), who may **read** it, what is **immutable** vs **mutable** vs **derived**, and who is **forbidden** to write it. A reader never writes another context's data; it asks the owner (`module-communication.md`).

---

## Ownership table

### Gym
- **Business Owner** — Owner bundle (`gym.manage`, `settings.manage`). **Owning Context** — IAM.
- **Read** — all contexts (for scoping/settings). **Write** — IAM only.
- **Immutable** — identity/creation. **Mutable** — settings (currency, time zone, warning window, branding). **Derived** — none.
- **Forbidden Writers** — every context except IAM.

### Branch
- **Business Owner** — Owner (future Branch Manager). **Owning Context** — IAM.
- **Read** — all. **Write** — IAM only.
- **Immutable** — owning gym. **Mutable** — name/details/active. **Derived** — none.
- **Forbidden Writers** — all except IAM.

### User / GymUser / Role / Permission
- **Business Owner** — Owner (`staff.manage`, `roles.manage`). **Owning Context** — IAM.
- **Read** — IAM resolves permissions for all; other contexts read only the **resolved permission set**, never the mappings. **Write** — IAM only.
- **Immutable** — permission **keys** (never renamed). **Mutable** — role→permission mappings (data), GymUser grant/revoke, assignable/dormant flag. **Derived** — an actor's effective permission set.
- **Forbidden Writers** — all except IAM. **No context may invent or alter permissions.**

### Member
- **Business Owner** — Owner/Trainer per permission. **Owning Context** — Member Management.
- **Read** — Member Mgmt, Membership, Billing, Notifications, Reporting (as needed). **Write** — Member Management only.
- **Immutable** — identity/creation, owning gym. **Mutable** — contact details, home branch, status (Active/Archived). **Derived** — "Active Member" (from Membership), Outstanding presence (from Billing).
- **Forbidden Writers** — Membership/Billing/Notifications/Reporting (they read; they never write member data). Archive requires asking Membership/Billing for the no-active/no-balance check (ARC-3) — Member Mgmt performs the write, but the *facts* belong to those contexts.

### MemberNote
- **Business Owner** — Owner/Trainer (`notes.*`). **Owning Context** — Member Management.
- **Read** — Member Management. **Write** — Member Management only.
- **Immutable** — author, creation, association. **Mutable** — content (per `notes.update`). **Derived** — none.
- **Forbidden Writers** — all other contexts.

### Trainer Assignment
- **Business Owner** — Owner (`assignments.manage`). **Owning Context** — Member Management.
- **Read** — Member Management, Reporting. **Write** — Member Management only.
- **Immutable** — gym scope. **Mutable** — current trainer (assign/reassign/clear). **Derived** — none.
- **Forbidden Writers** — all other contexts. (Informational only — never a permission boundary, ASN-2.)

### Plan
- **Business Owner** — Owner (`plans.*`). **Owning Context** — Plan Catalog.
- **Read** — Plan Catalog, Membership (to snapshot), Reporting. **Write** — Plan Catalog only.
- **Immutable** — historical references via membership snapshots. **Mutable** — *future* price/duration/active flag. **Derived** — none.
- **Forbidden Writers** — Membership/Billing/Reporting. **A plan edit never reaches into existing memberships** (PLN-3).

### Membership
- **Business Owner** — Owner (`memberships.*`). **Owning Context** — Membership Lifecycle.
- **Read** — Membership, Billing (attribution), Notifications (expiry), Reporting, Member Mgmt (archive check). **Write** — Membership Lifecycle only.
- **Immutable** — captured plan terms (snapshot), each period record, amount due (`immutable-history.md`). **Mutable** — current status via sanctioned transitions (freeze/resume/cancel; schedule→active). **Derived** — Active/Expiring-Soon/Expired (from dates + time zone), payment standing (from Billing).
- **Forbidden Writers** — **Billing must never change membership state** (`domain-boundary-rules.md`); Notifications/Reporting never write it.

### Payment
- **Business Owner** — Owner (`payments.*`). **Owning Context** — Billing & Payments.
- **Read** — Billing, Reporting; Membership reads **derived standing/balance** via Billing's interface (not the records). **Write** — Billing only.
- **Immutable** — amount, currency, attribution, the record itself (PAY-2/4/6). **Mutable** — nothing (correction is an appended **Void**). **Derived** — payment standing, Outstanding Balance, revenue.
- **Forbidden Writers** — every context except Billing. **No payment without exactly one membership** (PAY-6).

### Notification
- **Business Owner** — Owner/Trainer (`notifications.*`). **Owning Context** — Notifications.
- **Read** — Notifications (staff queue). **Write** — Notifications only.
- **Immutable** — generation fact, dedupe identity. **Mutable** — state (Unread→Read→Dismissed). **Derived** — unread count.
- **Forbidden Writers** — Membership emits the *fact* "expiring/expired" but never writes a notification; all others forbidden.

### Dashboard / Report figures
- **Business Owner** — Owner (`dashboard.view`, `reports.view`). **Owning Context** — Reporting.
- **Read** — Reporting composes from other contexts' read interfaces. **Write** — **owns no business data; writes nothing** (`domain-boundary-rules.md`).
- **Immutable / Mutable** — none (no stored business records). **Derived** — all figures, recomputed from owners.
- **Forbidden Writers** — Reporting may not write any business data anywhere.

---

## Rules for ownership transfer
1. **Ownership does not move casually.** An entity has exactly one owning context for the life of the system unless a deliberate, documented decision (a new ADR) transfers it.
2. **A transfer is a versioned architectural decision** (`decision-log.md`), updating this file, `bounded-contexts.md`, and `module-communication.md` in the same change.
3. **No entity may end up with two owners.** During any transfer, ownership is single-valued at every moment.
4. **Readers never become writers by convenience.** Needing to change another context's data is a signal to call its interface or to reconsider the boundary — never to write across it.

## Invariants (ownership)
- **O-1** — Every business entity has exactly one owning (writing) context.
- **O-2** — Permissions/roles are written only by IAM; permission keys are immutable.
- **O-3** — Billing never writes Membership; Membership never writes Payment; Reporting writes nothing.
- **O-4** — Immutable fields (snapshots, payment records, audit) are never written twice.

*(These feed `business-invariants.md`.)*
