# Bounded Contexts
### PULSE Gym SaaS · Architecture Governance

| | |
|---|---|
| **Status** | ✅ Authoritative — the business boundaries of the system |
| **Layer** | Strategic boundaries that map to the ADR's feature modules; business language. |
| **References** | ADR §6 (module boundaries), `domain-model.md`, `domain-boundary-rules.md`, `authorization-architecture.md` |

> A **bounded context** is a part of the business with a clear responsibility, its own concepts, and explicit edges. Contexts collaborate only through **public interfaces** (named business operations), never by reaching into each other. These contexts correspond to the ADR's modules — this document defines their *boundaries and ownership*; the ADR defines their code placement.

---

## Context map (who depends on whom)
```
                 ┌─────────────────────────┐
                 │ Tenant & Identity (IAM)  │  ← foundation; everyone depends on it
                 └─────────────────────────┘
                      ▲      ▲      ▲
        ┌─────────────┘      │      └──────────────┐
┌───────────────┐   ┌────────────────┐    ┌─────────────────┐
│ Plan Catalog  │   │ Member Mgmt    │    │ Notifications   │
└───────────────┘   └────────────────┘    └─────────────────┘
        ▲                   ▲                      ▲
        └─────────┬─────────┘                      │
            ┌───────────────────┐                  │
            │ Membership        │ ─────────────────┘ (expiry → notifications)
            │ Lifecycle         │
            └───────────────────┘
                     ▲
            ┌───────────────────┐
            │ Billing & Payments│
            └───────────────────┘
                     ▲
            ┌───────────────────┐
            │ Reporting &       │  ← reads everyone; writes nothing
            │ Dashboard         │
            └───────────────────┘
```
Dependencies point **toward foundations**. Reporting depends on all but is depended on by none. No cycles.

---

## 1. Tenant & Identity (IAM)
- **Purpose** — Establish *who is acting, in which gym/branch, with which permissions* — the foundation of isolation and authorization.
- **Owned Concepts** — Gym, Branch, User, GymUser, Role, Permission, Capability, session/sign-in.
- **Responsibilities** — Authenticate users; resolve the active gym/branch context; resolve and evaluate **permissions** (`authorization-architecture.md`); enforce tenant isolation as the universal rule.
- **Dependencies** — None (it is the foundation).
- **Forbidden Responsibilities** — Must not contain member/membership/payment business rules; must not branch on role names; must not own domain workflows.
- **Public Interfaces** — "Resolve current actor + gym/branch"; "Does actor hold permission X (in this scope)?"; "Grant/revoke a role to a staff user."
- **Future Expansion** — Multi-gym switching, branch-scoped permissions, gym-custom roles, MFA, SSO.
- **Recommended Ownership** — A dedicated security-minded owner; the most stable, most reviewed context.

## 2. Plan Catalog
- **Purpose** — Define the offerings (plans) from which memberships are sold.
- **Owned Concepts** — Plan (price, currency, duration, active/inactive).
- **Responsibilities** — Create/update/retire plans; expose current sellable plans; preserve historical plan integrity.
- **Dependencies** — IAM (permissions, tenancy).
- **Forbidden Responsibilities** — Must not create or mutate memberships; must not record revenue; must not know about a member.
- **Public Interfaces** — "List active plans"; "Provide a plan's current terms for sale" (the value the Membership context snapshots).
- **Future Expansion** — Tiers, add-ons, promotions, scheduled pricing, class packs.
- **Recommended Ownership** — Catalog/pricing owner.

## 3. Member Management
- **Purpose** — Maintain the people the gym serves and their coaching context.
- **Owned Concepts** — Member, MemberNote, Trainer Assignment.
- **Responsibilities** — Register/update/archive/reactivate members; manage notes; assign/clear trainers; enforce member identity rules (unique contact per gym).
- **Dependencies** — IAM.
- **Forbidden Responsibilities** — Must not own membership lifecycle, payments, or notifications; must not decide access rights.
- **Public Interfaces** — "Register member"; "Get member summary"; "Assign trainer"; "Archive/reactivate member" (subject to active-membership policy, which it *asks* the Membership context about — it does not decide membership state).
- **Future Expansion** — Self-service portal, household links, consent management.
- **Recommended Ownership** — CRM/members owner.

## 4. Membership Lifecycle
- **Purpose** — Govern a member's right of access over time (the heart of the domain).
- **Owned Concepts** — Membership, its captured (snapshot) terms, and the lifecycle transitions: create, renew, upgrade, freeze, resume, cancel, expire.
- **Responsibilities** — Own **all** membership state and date logic (one-active rule, renewal continuity, freeze extension, expiry evaluation, snapshotting plan terms at sale).
- **Dependencies** — IAM; Plan Catalog (reads current plan terms to snapshot).
- **Forbidden Responsibilities** — Must not record money/revenue (asks Billing); must not generate or deliver notifications (emits the fact that a membership is expiring/expired; Notifications decides what to do); must not compute reports.
- **Public Interfaces** — "Create/renew/upgrade/freeze/resume/cancel membership"; "Is this member's membership active?"; "Which memberships are expiring/expired as of today?".
- **Future Expansion** — Auto-renewal, scheduled start, multiple concurrent memberships, contracts.
- **Recommended Ownership** — Core-domain owner; highest test rigor (P0 invariants).

## 5. Billing & Payments
- **Purpose** — Record money against memberships and define revenue truth.
- **Owned Concepts** — Payment (amount, currency, record/void), derived payment standing (Pending/Partially Paid/Paid), Outstanding Balance, revenue recognition rules.
- **Responsibilities** — Record/void payments; capture immutable amounts; define what counts as revenue and when (`PAY-3`).
- **Dependencies** — IAM; Membership Lifecycle (a payment references a membership).
- **Forbidden Responsibilities** — Must not change membership state (recording a payment never activates/extends a membership — that is Membership's job); must not own plan pricing; must not gate access.
- **Public Interfaces** — "Record payment for membership"; "Void payment"; "Revenue for period (gym scope)".
- **Future Expansion** — Online processing, receipts, refunds, installments, non-membership income.
- **Recommended Ownership** — Finance/billing owner; second-highest test rigor.

## 6. Notifications
- **Purpose** — Turn business moments into staff alerts.
- **Owned Concepts** — Notification (type, state Unread/Read/Dismissed), generation/dedup rules, channels.
- **Responsibilities** — Decide *what to notify and how* given facts emitted by other contexts (e.g., "membership expiring"); ensure non-duplication; manage read/dismiss; in-app delivery in MVP.
- **Dependencies** — IAM; consumes facts from Membership Lifecycle (and later others).
- **Forbidden Responsibilities** — Must not own *why* a membership is expiring (that's Membership's evaluation); must not compute revenue or membership state.
- **Public Interfaces** — "Generate due notifications (for facts X)"; "List/Read/Dismiss notifications".
- **Future Expansion** — Email/SMS channels, per-user assignment, more event types, re-notify cadence.
- **Recommended Ownership** — Engagement/comms owner.

## 7. Reporting & Dashboard
- **Purpose** — Present the business's health; answer "how are we doing?".
- **Owned Concepts** — Dashboard figures, report definitions (no business records of its own).
- **Responsibilities** — Aggregate and present current, gym-scoped figures (active members, expiring buckets, new members, revenue) by **reading** other contexts' public interfaces.
- **Dependencies** — IAM; reads Member, Membership, Billing.
- **Forbidden Responsibilities** — **Owns no business rules and performs no domain calculations.** It must not compute revenue or "active" itself — it asks Billing/Membership and presents the answer (`domain-boundary-rules.md`).
- **Public Interfaces** — "Get dashboard figures (gym scope)"; "Get report (definition, range)".
- **Future Expansion** — Custom KPIs, trends, exports, scheduled reports, multi-branch roll-ups.
- **Recommended Ownership** — Analytics/reporting owner; strictly read-only.

---

## Cross-context rules
1. **Contexts collaborate only through public interfaces** — named business operations. No context reaches into another's internals (mirrors ADR §6).
2. **Dependencies flow toward foundations; no cycles.** Membership may read Plan; Plan never reads Membership.
3. **A fact is emitted by its owner; reactions belong to consumers.** Membership emits "expiring"; Notifications decides to alert; Reporting decides to count. The owner never does the consumer's job.
4. **Reporting is read-only**; it can depend on everyone and be depended on by no one.
5. **Every business rule has exactly one owning context** (`domain-boundary-rules.md`).

## Open Assumptions
- **A1** — "Membership Lifecycle" and "Member Management" are separate contexts though they share the member; this keeps the heavy lifecycle/date logic isolated from CRM concerns. Confirm this split is desired (recommended — it matches where the risk lives).
