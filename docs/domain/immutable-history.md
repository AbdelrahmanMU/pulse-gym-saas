# Immutable History
### PULSE Gym SaaS · Domain Documentation

| | |
|---|---|
| **Status** | ✅ Authoritative — the append-only history doctrine |
| **References** | `business-rules.md` (MSH-2, PAY-2/4/6), `business-invariants.md`, `data-ownership.md`, `money-rules.md` |

> **The doctrine:** business history is **append-only**. The system **records what happened**; it never rewrites it. Corrections are **new recorded facts** (a void, a closure, a new period), never edits or deletions of past ones. This is what makes financial reporting trustworthy, audits possible, and AI-driven changes safe over years.

---

## 1. Why immutability (business rationale)
- **Financial trust** — revenue, balances, and payments must be reproducible for any past date. If history can change, no report can be trusted.
- **Dispute resolution** — "what did we agree, and what was paid?" must have one unchangeable answer.
- **Auditability** — who did what, when, is a permanent record.
- **AI safety** — an append-only model removes a whole class of destructive mistakes; the worst an erroneous action can do is add a correcting record, not destroy a fact.

## 2. Immutable Membership History
- Each membership **period** (initial sale, each renewal, each upgrade) is its own **record**; renewal/upgrade **create new records** and never overwrite prior ones (`state-machines.md`).
- A membership's **captured plan terms** (name, price, duration) are **immutable** once created (MSH-2).
- Lifecycle changes (freeze, resume, cancel, expire, schedule→active) are **recorded transitions**, not rewrites of the original.
- **Close, don't replace:** a period ends (expires/cancels) and a new one begins; the old period remains visible forever.

## 3. Immutable Payment History
- A **payment record** is **never edited or deleted** (PAY-2, PAY-4). Amount and currency are fixed at recording.
- The only correction is a **Void** — itself a recorded action that reverses the effect while preserving the original record.
- **Void, don't edit:** wrong amount → void + record a new payment. Wrong attribution → void + re-record against the correct membership (PAY-6).
- Payment **standing** and **outstanding balance** are **derived** by recomputation over the immutable records — never stored as a mutable truth that can drift.

## 4. Immutable Audit History
- Sensitive/business-critical actions emit **append-only audit records** (`domain.action`, actor, target, gym/branch, timestamp) per `logging-observability.md`.
- Audit records are **write-once**; they are never modified or removed.
- The audit trail is the canonical answer to "who did what, when," independent of the current state of the affected entity.

## 5. Immutable Notification History
- A notification's **state progression** (Generated → Read → Dismissed) is recorded forward; a dismissed notification is **not resurrected** — a new qualifying event creates a **new** notification (`state-machines.md`).
- Generation is **non-duplicating** (NTF-3): history reflects exactly the alerts that were raised, once each.

## 6. Append-Only Philosophy (rules of practice)
1. **Record, don't overwrite.** New facts are appended; past facts are never mutated.
2. **Void instead of edit.** Financial/recorded mistakes are corrected by a reversing record.
3. **Close instead of replace.** Periods/relationships end and new ones begin; the old remains.
4. **Derive, don't store, mutable truth.** Standing, balances, and "active/expired" are computed from immutable facts, so they can't silently drift.
5. **Soft-delete, never hard-delete** records with history (members/memberships/payments/notes) — per `database-standards.md`.

## 7. Historical Reporting Guarantees
- **Reproducibility:** any past figure (revenue, active count, balance) can be recomputed for its date from immutable records.
- **No retroactive change:** editing a plan, role, or setting **never** alters historical memberships, payments, or revenue (PLN-3, MSH-2, PAY-2).
- **Consistency:** because reports derive from append-only facts, two computations of the same past period always agree.

## 8. What is allowed to change (and how)
- **Mutable present-state fields** that are not history (e.g., a member's phone number, a plan's *future* price, a trainer assignment) may change — these are current attributes, not historical facts. See `data-ownership.md` for the mutable/immutable split per entity.
- **Corrections** to historical facts happen only through the sanctioned mechanisms above (void, close, new record) — never by editing the past.

## Business Invariants (history)
- **H-1** — No membership period record is ever edited or deleted; corrections create new records.
- **H-2** — No payment is ever edited or deleted; the only reversal is a recorded Void.
- **H-3** — Captured terms/amounts (snapshots) are immutable for the life of the system.
- **H-4** — Audit records are write-once and permanent.
- **H-5** — Derived values (standing, balance, status, revenue) are recomputed from immutable facts, never stored as the source of truth.

*(These feed `business-invariants.md`.)*
