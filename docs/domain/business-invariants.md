# Business Invariants
### PULSE Gym SaaS · Domain Documentation · The rules that must never be violated

| | |
|---|---|
| **Status** | ✅ Authoritative — the consolidated list of inviolable truths |
| **Use** | Every invariant is a **mandatory test** (P0 where money/tenancy/history). If code can violate one, it is a defect. |
| **References** | aggregates `business-rules.md`, `money-rules.md`, `time-rules.md`, `immutable-history.md`, `data-ownership.md`, `authorization-architecture.md` |

> An **invariant** holds at all times, regardless of feature, actor, or sequence of actions. These are the project's hard constraints — the things an AI must never break and a reviewer must always check. Each cites its source rule.

---

## Tenancy & Identity
- **INV-1** — Every business record belongs to exactly one **gym**; no record is global. *(ADR-007)*
- **INV-2** — Every business read/write is **scoped by the acting gym** from the session; cross-gym access is impossible (returns not-found). *(ADR-007)*
- **INV-3** — Identifying member contact is **unique within a gym**, not across gyms. *(MBR-3)*
- **INV-4** — A staff user acts only within gyms they belong to (a valid GymUser). *(OWN-3)*

## Authorization (permission-based)
- **INV-5** — Every protected action is allowed **only if the actor holds the required permission**; **no logic ever branches on a role name**. *(authorization-architecture §10)*
- **INV-6** — A **role is exactly its permission set**; changing access is changing data (mappings), never code. *(authz §2)*
- **INV-7** — **Permission keys are immutable** (never renamed/repurposed); access is denied by default. *(authz §5)*
- **INV-8** — Tenancy is checked **before** permission; both must pass. *(PRM-1)*

## Member
- **INV-9** — A member has a name and at least one contact method. *(MBR-2)*
- **INV-10** — A member is **archived, never erased** while history exists. *(MBR-5)*
- **INV-11** — A member may be **archived only when they have no Active, Scheduled, or Frozen membership AND no Outstanding Balance**. *(ARC-3; a Frozen membership is resumable (FRZ-4), so it must be closed first — clarified 2026-07-01)*

## Membership
- **INV-12** — A member holds **at most one Active and at most one Scheduled** membership at a time. *(MBR-4, MSH-7)*
- **INV-13** — **Active membership periods never overlap** for the same member. *(MBR-4, T-5)*
- **INV-14** — A membership **captures its plan's terms** (name, price, duration) at creation; these are **immutable** for that period. *(MSH-2, H-3)*
- **INV-15** — **Membership status alone controls access**; payment standing never does. *(MSH-6)*
- **INV-16** — An **Upgrade is deferred**: the current period is unchanged; a **Scheduled** membership becomes effective only after the current expires; **no proration/refund/adjustment**. *(UPG-1…3)*
- **INV-17** — A **Cancelled** membership is terminal and cannot be reactivated (a new membership must be created). *(REN-4)*
- **INV-18** — **Frozen days extend the end date exactly**; a frozen membership does not expire while paused. *(FRZ-2/3, T-4)*
- **INV-19** — Each membership period is an **append-only record**; renewal/upgrade create new records and never overwrite prior ones. *(H-1)*

## Payment & Money
- **INV-20** — **Every payment belongs to exactly one membership**; no orphan payments. *(PAY-6, M-2)*
- **INV-21** — Payments are **immutable**; the only correction is a recorded **Void** (never edit/delete). *(PAY-2/4, H-2)*
- **INV-22** — Money is **exact** (integer minor units / decimal) and **carries its currency**; never floats. *(PAY-7, M-1)*
- **INV-23** — A membership's **amount due** is its captured price and is immutable for that period. *(M-4)*
- **INV-24** — **Outstanding Balance and payment standing are derived** from immutable records, never stored as mutable truth. *(M-5, H-5)*
- **INV-25** — **Revenue excludes Voided payments** and excludes Pending/outstanding amounts; it is reproducible for any past period. *(M-6, PAY-5)*
- **INV-26** — A **plan price change affects only future memberships**; past amounts due never change. *(PLN-3, M-8)*

## Time
- **INV-27** — Timestamps are **stored in UTC**; all business-day decisions are made in the **gym time zone**. *(T-1)*
- **INV-28** — The end day is **inclusive**; **Expired** begins the day after the end date. *(T-3, MSH-5)*
- **INV-29** — Time-derived states (Active/Expiring-Soon/Expired/Scheduled→Active) are **recomputed from immutable dates**, never stored as mutable flags. *(T-6, H-5)*
- **INV-30** — The expiry/notification sweep is **idempotent and non-duplicating**. *(T-7, NTF-3)*

## Plan
- **INV-31** — A plan that has ever been sold is **retired, never destroyed**. *(PLN-4)*
- **INV-32** — Inactive plans **cannot be sold** to new memberships; existing memberships are unaffected. *(PLN-2)*

## Notification
- **INV-33** — Notifications are **gym-scoped**, **in-app only** (MVP), and **non-duplicating**. *(NTF-1/3/4)*
- **INV-34** — A **dismissed** notification is never resurrected; a new qualifying event creates a new one. *(state-machines)*

## Assignment
- **INV-35** — A **Trainer Assignment belongs to exactly one gym** and is **informational only** (never a permission boundary). *(ASN-2)*
- **INV-36** — No member points at a non-existent trainer; a removed trainer's assignments are reassigned/cleared. *(ASN-3)*

## Ownership & History
- **INV-37** — Every business entity has **exactly one owning (writing) context**; readers never write across boundaries. *(O-1, data-ownership)*
- **INV-38** — **Billing never writes Membership state; Membership never writes Payment; Reporting writes nothing.** *(O-3)*
- **INV-39** — Immutable facts (snapshots, payment records, audit records) are **written once** and never altered. *(O-4, H-1…H-4)*
- **INV-40** — Records with history (members, memberships, payments, notes) are **soft-deleted, never hard-deleted**. *(database-standards)*

---

## Enforcement
- **P0 (mandatory, blocking) tests** cover: tenancy isolation (INV-1/2), permission gating without role names (INV-5), one-active/one-scheduled + no overlap (INV-12/13), snapshot immutability (INV-14/21/23), payment attribution (INV-20), access-independent-of-payment (INV-15), revenue excludes voids (INV-25), and history immutability (INV-19/21/39).
- A change that can violate **any** invariant is **not done** (Definition of Ready/Done), regardless of whether it "works."
- This file is the consolidated index; each source doc remains the authority for its rule's detail.
