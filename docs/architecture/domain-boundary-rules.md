# Domain Boundary Rules
### PULSE Gym SaaS · Architecture Governance

| | |
|---|---|
| **Status** | ✅ Authoritative — prevents business-logic leakage between contexts |
| **References** | `bounded-contexts.md`, `domain-model.md`, `business-rules.md`, ADR §6 |

> **The one principle:** *Every business rule has exactly one owning context. No other context may re-implement, duplicate, or override it.* When a context needs a decision that another owns, it **asks** (calls the owner's public interface) — it never recomputes. This is what keeps the modular monolith from quietly becoming a tangle as the AI adds features over months.

---

## 1. Single-Owner Rule
A business rule lives in **one** context. Other contexts may *trigger* it or *read its result*, never *re-derive* it.

| Rule area | Sole owner | Why it must not leak |
|---|---|---|
| Who is acting / permission to act | **Tenant & Identity (IAM)** | Authorization in two places drifts into security holes |
| Tenant (gym/branch) isolation | **IAM** | A second implementation will eventually forget the scope |
| Plan terms (price, duration, active) | **Plan Catalog** | Pricing truth must be singular |
| Member identity & archive rules | **Member Management** | Duplicate identity rules create inconsistent members |
| Membership state & date logic (active, one-active, renewal continuity, freeze extension, expiry, snapshotting) | **Membership Lifecycle** | The domain's core invariants; duplication = corruption |
| Money capture & revenue recognition (paid/void, what counts, when) | **Billing & Payments** | Financial truth must be singular and auditable |
| Notification generation & dedup | **Notifications** | Two generators = duplicate/contradictory alerts |
| Figures/aggregations presentation | **Reporting & Dashboard** | But it *reads* the rules above; it owns none |

## 2. Explicit "never owns" rules (anti-leakage)
These are absolute. Violations are architecture defects.

- **Payments never own Membership logic.** Recording or voiding a payment must **not** activate, extend, renew, or expire a membership. Billing references a membership; Membership owns its own state. *(A common, dangerous shortcut: "mark paid → extend membership." Forbidden — renewal is a Membership operation.)*
- **Memberships never own Notification logic.** Membership *emits the fact* "expiring/expired"; it must not decide, format, dedup, or deliver alerts. Notifications owns that.
- **Memberships never own Payment/revenue logic.** Selling a membership may *trigger* recording a payment, but the membership never computes revenue or stores money truth.
- **Plans never own Membership logic.** A plan provides terms to snapshot; it never creates or mutates memberships, and changing a plan never reaches into existing memberships (PLN-3 is enforced by Membership holding a snapshot).
- **Dashboard never owns business rules.** It must not define "active member," "expiring," or "revenue." It asks the owning context and presents the answer.
- **Reports never own calculations.** Revenue, counts, and expiry windows are computed by their owners (Billing/Membership/IAM-window); Reporting composes results, it does not calculate domain truth.
- **Member Management never owns access rights.** Whether a member "has access" is a Membership question; Member Management asks, it doesn't decide.
- **IAM never owns domain workflows.** It answers "who/where/permitted?"; it never contains membership/payment rules.
- **No context owns role-based logic.** Authorization is permission-based and owned solely by IAM (`authorization-architecture.md`); no context may branch on a role name.

## 3. Collaboration patterns (how to ask instead of duplicate)
- **Need a decision another context owns?** Call its public interface. *Example:* Reporting needs revenue → calls Billing's "revenue for period"; it does **not** sum payments itself.
- **Reacting to something that happened elsewhere?** Consume the emitted fact/event (business sense, per `event-catalog.md`). *Example:* Notifications reacts to "membership expiring"; it doesn't scan memberships with its own expiry rule.
- **Need data for display only?** Read via the owner's read interface; never copy its rules. *Example:* a membership badge shows status the Membership context computed.

## 4. Snapshot & immutability boundary
- The **Membership** context owns the act of **snapshotting** plan terms at sale; the **Billing** context owns snapshotting the **amount** at payment. Once captured, **no context may alter** these (PLN-3, MSH-2, PAY-2). Editing history is forbidden everywhere.

## 5. Shared-kernel limits
- Truly cross-cutting, **non-business** helpers (money formatting, date/timezone utilities, ids) live in a shared layer (`monorepo-strategy.md` packages), usable by all. **Business rules never go in the shared layer** — if it encodes a domain decision, it belongs to a context.

## 6. Enforcement
- **Boundaries are reviewed at the Definition of Ready and in self-review** (`definition-of-ready.md`, AI rules). A feature that places a rule in the wrong context is **not ready/not done**, regardless of whether it "works."
- **Tests assert ownership indirectly:** e.g., a payment test asserts recording a payment does **not** change membership state.

## Open Assumptions
- **A1** — "Emitting a fact" is a *business* notion here (per `event-catalog.md`), not a commitment to an event bus. In the modular monolith, a consumer context may be invoked directly by the owner after a transition. Confirm this stays in-process for MVP (recommended — ADR rejects an event bus).
