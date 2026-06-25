# Business Glossary
### PULSE Gym SaaS · Domain Documentation

| | |
|---|---|
| **Status** | ✅ Authoritative — the official business vocabulary |
| **Rule** | These are the **only** approved terms. Never coin synonyms (no "Client/Customer" for Member, no "Subscription" for Membership). One word, one meaning, everywhere — code, tests, UI, and conversation. |
| **References** | `business-rules.md`, `domain-model.md`, ADR (domain language) |

> Definitions are concise and unambiguous on purpose. Where a term is easily confused with another, the distinction is stated explicitly.

---

**Gym** — The business that operates the service and owns all of its members, plans, memberships, payments, and staff. The top-level unit of ownership and isolation (the "tenant"). One gym never sees another's data.

**Branch** — A physical location belonging to one gym. A finer scope *within* a gym, never a replacement for it. The MVP has a single default branch.

**User** — A person who can sign in and operate the system (an Owner or a Trainer). Distinct from a Member: Users are staff; Members are customers. A User may belong to more than one gym.

**GymUser** — The link that makes a User part of a specific Gym with a specific Role. It is what grants and scopes staff access; it is also what lets one person work across multiple gyms.

**Role** — **A named bundle of permissions** — nothing more. A role carries no behavioral meaning; business logic depends on **permissions/capabilities, never on a role name**. MVP assignable roles: **Owner** and **Trainer**; dormant future bundles: Front Desk, Receptionist, Manager, Accountant, Branch Manager.

**Permission** — A stable, named right to perform one kind of action (e.g., `payments.record`). The unit authorization checks. Keys never change.

**Capability** — A named business grouping of related permissions (e.g., *Payment Management*). Capabilities own permissions; roles receive permissions through capabilities.

**Owner** — The MVP role bundle holding **all** permissions in a gym (manage plans, members, memberships, payments, settings; view all reports). Defined by its permission set, not by identity.

**Trainer** — The MVP role bundle focused on coaching: holds permissions to view **all** members and read/write member notes; does **not** hold plan/payment/settings permissions.

**Member** — A customer of the gym; the person who holds memberships, makes payments, has notes, and is the subject of notifications. Not a User.

**MemberNote** — A note recorded about a member (coaching context, observations).

**Assignment (Trainer Assignment)** — The recorded relationship designating which trainer coaches a member. Optional, changeable, and **informational only** — it does not restrict which members a trainer can view.

**Plan** — A sellable offering defining a price, currency, and duration of access. Memberships are sold from plans. Plans can be **active** (sellable) or **inactive** (retired).

**Membership** — A member's right of access for a defined period, sold from a plan. It captures the plan's terms at the moment of sale and moves through a lifecycle (**Scheduled, Active, Frozen, Expired, Cancelled**). A member may hold **at most one Active and at most one Scheduled** membership at a time. **Membership status alone controls access.**

**Scheduled (membership)** — A membership created now but **effective only when the current one expires** — the queued next period produced by a deferred Upgrade (or early Renewal). At most one per member.

**Snapshot (captured terms)** — The plan's name, price, and duration as copied onto a membership (or the amount onto a payment) at transaction time, so later plan changes never rewrite history.

**Renewal** — Continuing a membership into a new period without losing remaining time. An early renewal preserves unused days; history is kept.

**Upgrade** — **Deferred plan change.** The current membership stays Active until it expires; the upgrade creates the next membership immediately as **Scheduled**, effective after the current period ends. **No proration, refunds, or financial adjustments.** A **downgrade** is the same mechanism toward a lower plan.

**Freeze** — Pausing an active membership for a defined period. While frozen, the member is neither active nor expired; the paid time is preserved and the end date is extended on resume.

**Resume (Unfreeze)** — Ending a freeze and returning the membership to active, with its end date extended by the frozen duration.

**Expired** — A membership whose paid period has ended without renewal; the member has lost access.

**Expiring Soon** — An indicator on an **active** membership whose end date falls within the gym's warning window (default 7 days). It signals attention, not a loss of access. Distinct from the dashboard's "expiring within 7/30 days" counts.

**Cancelled** — A membership deliberately ended; access stops immediately and it cannot be reactivated (a new membership must be created).

**Archive** — Removing a member from active lists while retaining all their history. **Allowed only when the member has no Active/Scheduled membership and no Outstanding Balance.** Reversible (the member can be reactivated). Never a deletion.

**Payment** — A record of money received against a membership. In the MVP it is a record only — there is no card processing. **Every payment belongs to exactly one membership** (never orphaned). Append-only; correctable only via **void**.

**Payment Standing** — A membership's **derived** money state: **Pending** (nothing received), **Partially Paid** (some received, balance remains), **Paid** (received ≥ amount due). It **never controls access**.

**Outstanding Balance** — A membership's amount due minus the sum of its non-voided payments. Zero or negative means nothing is owed.

**Void** — A recorded correction that reverses a payment. Voided payments are excluded from balances and revenue; payments are never edited or deleted.

**Revenue** — Money actually received: the sum of **non-voided payments** attributed to the period in which they were received (gym time zone). Excludes outstanding (Pending) and voided amounts (see `money-rules.md`).

**Notification** — An in-app alert generated by the system to prompt staff action (a membership expiring soon or expired). In-app only in the MVP. Moves through Unread → Read → Dismissed.

**Dashboard** — The owner's at-a-glance view of business health for the gym: active members, memberships expiring within 7 and 30 days, new members this month, and revenue this month.

**Status** — The current lifecycle state of a thing: a membership's status (**Scheduled/Active/Frozen/Expired/Cancelled**, with the Expiring-Soon indicator), a membership's **payment standing** (Pending/Partially Paid/Paid) plus per-payment **Voided**, a member's status (Active/Archived), or a notification's state (Unread/Read/Dismissed). **Membership status controls access; payment standing does not.**

**Warning Window (Expiring-Soon Window)** — The gym-configurable number of days before a membership's end date at which it is flagged Expiring Soon (default 7).

**Gym Time Zone** — The time zone in which "today," expiry, and period reporting are judged for a gym. Ensures correct dates regardless of where servers or staff are.

**Active Member** — A member with at least one **Active** membership. The basis for the "active members" count (excludes members whose only memberships are Scheduled, Frozen, Cancelled, or Expired).

---

## Term-confusion guard (do not mix these up)
- **User vs Member** — staff vs customer. Never interchange.
- **Plan vs Membership** — the offering vs an individual's instance of it.
- **Expiring Soon (membership indicator) vs Expiring within 7/30 days (dashboard counts)** — one membership's flag vs a range count.
- **Cancel vs Archive** — ending a *membership* vs hiding a *member*.
- **Freeze vs Cancel** — a reversible pause vs a terminal end.
- **Paid (payment status) vs Active (membership status)** — money received vs access granted; independent in the MVP.
- **Void vs Delete** — an auditable reversal vs destruction (which never happens for records with history).
