# State Machines
### PULSE Gym SaaS · Domain Documentation

| | |
|---|---|
| **Status** | ✅ Authoritative — business lifecycles |
| **Layer** | Business states and transitions only. No storage or implementation. |
| **References** | `business-rules.md`, `domain-model.md` |

> Each lifecycle lists **States**, allowed **Transitions** (with entry/exit conditions and the business rule behind them), **Forbidden Transitions**, **Edge Cases**, and **Recovery Rules**. "Today" is always judged in the **gym's time zone**.

---

## 1. Membership

A membership has **core lifecycle states**, plus **"Expiring Soon"** which is a *derived indicator over the Active state* (MSH-4) — it changes attention, not rights. *(See Open Question OQ-S1 on whether to also model "Scheduled".)*

**States**
- **Scheduled** — created but **not yet effective**; becomes Active when the current membership expires (the queued upgrade/renewal — MSH-7).
- **Active** — within its paid period; member may use the gym. *(Access depends on this status, never on payment standing — MSH-6.)*
- **Active · Expiring Soon** *(indicator)* — Active **and** end date within the gym's warning window.
- **Frozen** — paused; not active, not expired; clock stopped.
- **Expired** — paid period ended without renewal; access lost.
- **Cancelled** — deliberately ended; access lost; terminal for that membership.

> **Append-only history:** each period (sale, renewal, upgrade) is its own membership record. Renewal/upgrade **create a new record**; they never overwrite the prior one (`immutable-history.md`).

**Transitions**

| From → To | Trigger | Entry condition | Exit condition | Rule |
|---|---|---|---|---|
| (none) → Active | Membership created (sale) | Member has no Active membership; valid plan + start date | — | MSH-1, MBR-4 |
| (none) → Scheduled | **Upgrade/Downgrade** (deferred) — creates next membership | Current membership Active; no existing Scheduled | New plan terms captured; effective date = day after current end | UPG-1, UPG-2, MSH-7 |
| (none) → Scheduled | **Early Renewal** — creates next period | Current Active; no existing Scheduled | Starts day after current end | REN-1, REN-2 |
| Scheduled → Active | **Current membership expires** | Predecessor reached its end | Becomes the live period | MSH-7 |
| (none) → Active | **Renewal after expiry** | Member has no Active membership | New period from today | REN-1 |
| Active → Frozen | **Freeze** | Membership is Active; actor holds `memberships.freeze` | Freeze duration recorded | FRZ-1, FRZ-4 |
| Frozen → Active | **Resume (unfreeze)** | Membership is Frozen | End date extended by frozen duration | FRZ-2 |
| Active → Expired | **Time passes** | End date reached, not renewed/frozen | Day after end date | MSH-5 |
| Active → Cancelled | **Cancel** | Membership is Active; actor holds `memberships.cancel` | Ends immediately | REN-4 |
| Frozen → Cancelled | **Cancel** | Membership is Frozen | Ends immediately | FRZ-4 |
| Scheduled → Cancelled | **Cancel queued period** | Membership is Scheduled | Removed before it activates | MSH-7 |

**Entry/Exit conditions (key)**
- *Entry to Active (new sale):* the member must not already hold an Active membership (MBR-4).
- *Entry to Scheduled:* the member has an Active membership and **no** existing Scheduled one (at most one queued — MSH-7).
- *Scheduled → Active:* automatic when the predecessor expires (no overlap of Active periods).
- *Exit from Active to Expired:* occurs automatically with the passage of time, not by an action.

**Forbidden Transitions**
- Cancelled → anything (terminal; create a new membership instead — REN-4).
- Two **Active** memberships for one member at once, or two Scheduled at once (MBR-4, MSH-7).
- **Scheduled → Active before the predecessor expires** (deferred-upgrade rule — UPG-1).
- Expired → Frozen; Frozen → Expired directly (must resume first — FRZ-3).
- Any access change driven by **payment standing** (access is status-only — MSH-6).

**Edge Cases**
- **Deferred upgrade:** the current period is untouched (no proration/refund — UPG-3); the Scheduled membership simply activates on expiry.
- **Early renewal:** remaining days preserved; next period is Scheduled to start day-after-current-end (REN-1).
- **Renew after expiry:** no Active exists, so the new period starts today as Active.
- **Cancelling a predecessor that has a Scheduled successor:** the Scheduled period's effective date is recomputed (or it activates) per the cancellation's timing — confirm in DDS edge handling.
- **Freeze near end date:** end date shifts later by the frozen duration on resume (FRZ-2).
- **"Expiring Soon" while frozen:** does not apply (FRZ-3).
- **End-date override:** permitted by an authorized actor (MSH-1); status judged against the overridden end date.

**Recovery Rules**
- A membership cancelled in error is **not "un-cancelled"**; the correct recovery is to **create a new membership** (REN-4) — keeping history honest.
- A membership frozen in error is recovered by **resuming** it; the erroneous frozen days should be corrected so the end date isn't wrongly extended.
- A wrongly recorded expiry (e.g., the member actually renewed) is corrected by recording the renewal, which restores Active.

## 2. Payment

**Two levels — keep them distinct:**
- A **Payment record** (an individual received amount) is **Recorded** or **Voided**. Records are append-only and immutable (PAY-2/PAY-4).
- A **Membership's payment standing** is **derived** from its non-voided payment records against its amount due: **Pending → Partially Paid → Paid** (PAY-3).

**Membership payment-standing states**
- **Pending** — no non-voided money received (Outstanding Balance = full amount due).
- **Partially Paid** — `0 < received < due` (balance remains).
- **Paid** — `received ≥ due` (Outstanding Balance ≤ 0).

> **Payment standing never affects membership status or access** (MSH-6). A membership can be Active + Pending.

**Transitions (derived standing)**

| From → To | Trigger | Condition | Rule |
|---|---|---|---|
| (new membership) → Pending | Membership created with an amount due | Nothing received yet | PAY-3 |
| Pending → Partially Paid | A payment recorded, `received < due` | Non-voided record added | PAY-3 |
| Pending/Partially Paid → Paid | A payment recorded, `received ≥ due` | Non-voided records cover due | PAY-3 |
| Paid/Partially Paid → (lower) | A payment **voided**, lowering received | Void recomputes balance | PAY-4 |

**Payment-record transitions**

| From → To | Trigger | Condition | Rule |
|---|---|---|---|
| (none) → Recorded | Money received and logged against a membership | References exactly one membership | PAY-1, PAY-6 |
| Recorded → Voided | Authorized correction | Append a void; record never edited/deleted | PAY-4 |

**Forbidden Transitions**
- A payment that references **no membership** or **more than one** (PAY-6 — absolute).
- **Editing or deleting** a payment record (immutable — PAY-2/PAY-4); correct only by voiding and re-recording.
- Voided → Recorded (a void is terminal for that record; record a new payment if needed).
- Any payment standing **gating access** (MSH-6).

**Edge Cases**
- **Paid then refunded/reversed:** modeled as Voided (MVP); true refunds-to-source are future (PAY-4 future).
- **Partial payment:** not supported in MVP (each payment is whole); installment handling is future.
- **Revenue timing:** a payment's revenue belongs to the period it was **recorded as Paid** (PAY-3), even if the membership spans months.

**Recovery Rules**
- Wrong amount → **void and re-record** (never edit in place).
- Wrong membership attribution → void and re-record against the correct membership.

## 3. Notification

**States**
- **Generated → Unread** — created by the system, awaiting attention.
- **Read** — opened by a staff member.
- **Dismissed** — cleared from the active queue.

**Transitions**

| From → To | Trigger | Entry condition | Exit condition | Rule |
|---|---|---|---|---|
| (none) → Unread | System generates alert | A qualifying event (expiring/expired) and no existing unread for it | — | NTF-2, NTF-3 |
| Unread → Read | Staff opens it | — | Unread count decreases | NTF-4 |
| Read → Dismissed | Staff clears it | — | Leaves active queue | NTF-4 |
| Unread → Dismissed | Staff dismisses without opening | — | Leaves active queue | NTF-4 |

**Forbidden Transitions**
- Generating a **duplicate** unread notification for the same membership+event while one is still active (NTF-3).
- Generating expiry notifications for **frozen** memberships (FRZ-3).
- Dismissed → Unread (a dismissed alert is not resurrected; a new qualifying event creates a new one).

**Edge Cases**
- **Membership renewed after an "expiring" alert:** the alert remains as history; no new expiry alert is generated for the now-extended period until it again qualifies.
- **Member archived/cancelled:** related pending expiry alerts should not continue to prompt action (they are moot).
- **Re-qualification:** if a membership expires, is renewed, and later approaches expiry again, a fresh alert is generated (the prior one was a distinct event).

**Recovery Rules**
- A wrongly dismissed notification is not un-dismissed; if action is still needed, it is driven by the underlying membership state (which is the source of truth), and a future cadence may re-alert (NTF-3 future).

## 4. Member

**States**
- **Active** — a current member appearing in working lists.
- **Archived** — retained with full history, removed from active lists; reversible.

**Transitions**

| From → To | Trigger | Entry condition | Exit condition | Rule |
|---|---|---|---|---|
| (none) → Active | Member registered | Name + a contact method | — | MBR-1, MBR-2 |
| Active → Archived | Archive | **No Active/Scheduled membership AND no Outstanding Balance** (ARC-3) | Removed from active lists, history kept | ARC-1, ARC-3 |
| Archived → Active | Reactivate | — | Reappears in active lists | ARC-2 |

**Forbidden Transitions**
- Active/Archived → **Erased** while history exists (MBR-5).
- **Archiving while the member has an Active/Scheduled membership or any Outstanding Balance** (ARC-3 — rejected; settle/cancel first).

**Edge Cases**
- **Archive attempted with an active/scheduled membership or owed balance** — rejected; the member must be settled and closed out first (ARC-3).
- **Reactivating** a long-archived member — allowed; their historical memberships/payments remain intact and visible.
- **Duplicate person re-registered** instead of reactivated — a data-hygiene concern; reactivation is preferred over a new record.

**Recovery Rules**
- An accidental archive is recovered by **reactivation** (no data lost — ARC-2).
- An accidental erasure must be impossible by rule (MBR-5) — there is nothing to recover from, which is the point.

---

## Resolved Decisions (lifecycle-level — now final)
- **OQ-S1 → RESOLVED.** A **Scheduled** state **is** modeled — but only as the queued next period from a deferred Upgrade (or early Renewal): at most one Active + one Scheduled per member (MSH-7, UPG-1). Arbitrary future-dating remains out of scope.
- **OQ-S2 → RESOLVED.** **Expired** is a **derived state**, recomputed against the gym clock by the regular (≥daily) sweep, which raises `MembershipExpired` (`time-rules.md` T-6, `event-catalog.md`). The sweep is idempotent (T-7).
- **OQ-S3 → RESOLVED.** A frozen membership **does not expire while paused**; on resume its end date is extended by the frozen duration (FRZ-2/3, T-4) — the intended member benefit.
