# Business Event Catalog
### PULSE Gym SaaS · Domain Documentation

| | |
|---|---|
| **Status** | ✅ Authoritative — the shared language of "things that happen" |
| **Important** | This is a **business-language** document. It does **not** design an event bus, messaging, or any technical mechanism. An "event" here is a meaningful business occurrence the organization cares about. |
| **References** | `state-machines.md`, `workflows.md`, `business-rules.md` |

> Each event lists its **Purpose, Trigger, Business Meaning, Business Impact, Consumers** (who in the business cares), and **Future Considerations**. "Consumers" are business audiences/processes, not subscribers in code. Events are named in the past tense because they describe something that *has happened*.

---

## Gym & Staff

### GymCreated
- **Purpose** — Mark the establishment of a new gym (tenant).
- **Trigger** — A gym is onboarded/set up.
- **Business Meaning** — A new business now exists on the platform, with its settings and a default branch.
- **Business Impact** — Everything else for that gym becomes possible; isolation boundaries begin.
- **Consumers** — Platform operations; the new owner; (future) SaaS billing.
- **Future** — Onboarding analytics, trial/subscription start.

### BranchCreated
- **Purpose** — Record a new location within a gym.
- **Trigger** — A branch is added (a default one at gym setup).
- **Business Meaning** — The gym can now attribute members/memberships/payments to this location.
- **Business Impact** — Enables location-based operations and (future) reporting.
- **Consumers** — Owner; (future) per-branch reporting.
- **Future** — Multi-branch dashboards, transfers.

### UserSignedIn
- **Purpose** — Note that a staff member began an authorized session.
- **Trigger** — An owner or trainer successfully signs in.
- **Business Meaning** — A person is now acting within a gym under a role.
- **Business Impact** — Establishes who is responsible for subsequent actions; supports audit.
- **Consumers** — Security/audit; the acting user.
- **Future** — Session analytics, suspicious-login alerts, multi-gym context selection.

### TrainerAssigned
- **Purpose** — Record that a member's coaching relationship was set or changed.
- **Trigger** — A trainer is assigned, reassigned, or cleared for a member.
- **Business Meaning** — The member now has (or no longer has) a designated coach.
- **Business Impact** — Coaching ownership is clear; (future) the trainer can be notified.
- **Consumers** — The member's trainer; the owner.
- **Future** — Assignment history, multiple trainers, trainer notifications.

## Member

### MemberCreated
- **Purpose** — Mark a new member joining the gym.
- **Trigger** — A person is registered as a member.
- **Business Meaning** — A new customer relationship has begun.
- **Business Impact** — Feeds "new members this month"; the person can now hold memberships.
- **Consumers** — Owner (growth reporting); dashboard.
- **Future** — Onboarding sequences, welcome notifications.

### MemberArchived
- **Purpose** — Record that a member was moved out of active lists.
- **Trigger** — A member is archived.
- **Business Meaning** — The relationship is dormant but the history is preserved; reversible.
- **Business Impact** — Removed from active counts/lists; retained for history and possible return.
- **Consumers** — Owner; dashboard (active-member counts).
- **Future** — Win-back campaigns, lapsed-member analytics.

### MemberReactivated
- **Purpose** — Record that an archived member returned to active.
- **Trigger** — An archived member is reactivated.
- **Business Meaning** — A returning customer relationship.
- **Business Impact** — Reappears in active lists; can hold memberships again.
- **Consumers** — Owner; dashboard.
- **Future** — Returning-member recognition.

## Membership

### MembershipCreated
- **Purpose** — Mark a member being granted access via a plan (a sale).
- **Trigger** — A membership is created for a member.
- **Business Meaning** — The member now has active access on captured terms; revenue is expected.
- **Business Impact** — Counts toward active memberships; usually paired with a payment.
- **Consumers** — Owner; dashboard; revenue tracking.
- **Future** — Sales analytics, plan-mix reporting.

### MembershipRenewed
- **Purpose** — Record continuation of access into a new period.
- **Trigger** — A membership is renewed.
- **Business Meaning** — The customer relationship continues; remaining days were preserved.
- **Business Impact** — Extends the end date; sustains revenue; key retention signal.
- **Consumers** — Owner; retention/revenue reporting.
- **Future** — Renewal-rate metrics, loyalty rewards.

### MembershipUpgraded
- **Purpose** — Record a **deferred** plan change: the current period continues; a new **Scheduled** membership is created on the new plan.
- **Trigger** — An upgrade/downgrade is performed on an Active membership.
- **Business Meaning** — The member's next period will be on a different plan; current terms are untouched (no proration/refund).
- **Business Impact** — Records the from→to change and the effective date; expected future revenue changes when the Scheduled membership activates.
- **Consumers** — Owner; revenue/plan reporting.
- **Future** — Optional immediate/prorated upgrades.

### MembershipScheduled
- **Purpose** — Record that a **next-period membership has been queued** (from a deferred upgrade or early renewal).
- **Trigger** — A Scheduled membership is created (effective when the current one expires).
- **Business Meaning** — The member's continuation is secured ahead of time without disturbing the current period.
- **Business Impact** — Reserves the next period; will become Active automatically on the predecessor's expiry; counts toward future revenue, not current active counts.
- **Consumers** — Owner; reporting (forward bookings).
- **Future** — Multiple queued periods, arbitrary future-dating.

### MembershipActivated *(scheduled → active)*
- **Purpose** — Record a Scheduled membership becoming the live period.
- **Trigger** — The predecessor membership expires; its queued successor activates.
- **Business Meaning** — The previously queued period is now the member's active access.
- **Business Impact** — Enters active counts; begins its own expiry timeline.
- **Consumers** — Owner; dashboard; notifications.
- **Future** — Activation confirmations.

### MembershipFrozen
- **Purpose** — Record an active membership being paused.
- **Trigger** — A membership is frozen.
- **Business Meaning** — The member temporarily cannot/should not use the gym; the clock stops.
- **Business Impact** — Excluded from active counts and expiry notifications; end date will extend on resume.
- **Consumers** — Owner; dashboard (active counts); reporting.
- **Future** — Freeze-reason analytics, freeze caps (OQ-7).

### MembershipResumed
- **Purpose** — Record a frozen membership returning to active.
- **Trigger** — A membership is unfrozen/resumes.
- **Business Meaning** — The member can use the gym again; their paid time was preserved.
- **Business Impact** — Re-enters active counts; end date extended by the frozen duration.
- **Consumers** — Owner; dashboard.
- **Future** — Auto-resume on scheduled date.

### MembershipCancelled
- **Purpose** — Record a deliberate, terminal end of a membership.
- **Trigger** — A membership is cancelled.
- **Business Meaning** — The relationship for that membership has ended and won't be reactivated.
- **Business Impact** — Leaves active counts immediately; the member may be sold a new membership.
- **Consumers** — Owner; churn/retention reporting.
- **Future** — Cancellation-reason capture, churn analysis, refund linkage (OQ-W3).

### MembershipExpired
- **Purpose** — Record that a membership's paid period ended without renewal.
- **Trigger** — The passage of time past the end date (evaluated against the gym clock).
- **Business Meaning** — The member lost access; a renewal opportunity exists.
- **Business Impact** — Drives expiry notifications and win-back; leaves active counts.
- **Consumers** — Owner; notifications; retention reporting.
- **Future** — Grace periods, automated win-back.

## Payment

### PaymentRecorded
- **Purpose** — Record money **received** against a membership (every payment references exactly one membership — PAY-6).
- **Trigger** — A payment is recorded.
- **Business Meaning** — An immutable financial fact; the membership's payment standing and Outstanding Balance recompute (Pending → Partially Paid → Paid).
- **Business Impact** — Contributes to revenue in the period received; reduces Outstanding Balance. **Does not change membership status/access** (MSH-6).
- **Consumers** — Owner; revenue/outstanding reporting; dashboard.
- **Future** — Receipts, online processing, installments.

### PaymentVoided
- **Purpose** — Record an auditable reversal/correction of a payment.
- **Trigger** — A recorded payment is voided.
- **Business Meaning** — A previously recorded amount no longer counts; the correction is itself recorded.
- **Business Impact** — Removes the amount from revenue; preserves an honest financial trail.
- **Consumers** — Owner; financial audit.
- **Future** — Refund-to-source, partial reversals.

## Notification

### NotificationGenerated
- **Purpose** — Record that the system raised an alert for staff attention.
- **Trigger** — A qualifying business moment (membership expiring soon or expired) with no existing unread alert for it.
- **Business Meaning** — Something needs staff attention now.
- **Business Impact** — Drives renewal/retention action; populates the staff alert queue.
- **Consumers** — The gym's staff (owner/trainers).
- **Future** — Email/SMS channels, more event types, re-notify cadence.

### NotificationRead
- **Purpose** — Record that staff opened an alert.
- **Trigger** — A staff member opens a notification.
- **Business Meaning** — The alert has been seen.
- **Business Impact** — Reduces the unread count; signals attention given.
- **Consumers** — Staff; (future) follow-up tracking.
- **Future** — "Acknowledged vs acted" distinction.

### NotificationDismissed
- **Purpose** — Record that staff cleared an alert from the active queue.
- **Trigger** — A staff member dismisses a notification.
- **Business Meaning** — The alert no longer needs to appear.
- **Business Impact** — Cleans the queue; the underlying membership state remains the source of truth.
- **Consumers** — Staff.
- **Future** — Snooze/re-surface options.

## Reporting

### DashboardCalculated
- **Purpose** — Record that the business-health figures were computed for a gym.
- **Trigger** — The dashboard figures are produced (on view / scheduled refresh).
- **Business Meaning** — A current snapshot of the gym's health exists.
- **Business Impact** — Informs the owner's decisions (renewals to chase, growth, revenue).
- **Consumers** — Owner.
- **Future** — Scheduled report delivery, trend history, custom KPIs.

---

## Event coverage check (against the state machines)
Every lifecycle transition that matters to the business has a corresponding event:
- **Membership:** Created · Scheduled · Activated · Renewed · Upgraded · Frozen · Resumed · Cancelled · Expired — ✅ complete.
- **Payment:** Recorded · Voided. Payment **standing** (Pending/Partially Paid/Paid) is a *derived* condition recomputed from records, not a separate event — ✅.
- **Notification:** Generated · Read · Dismissed — ✅.
- **Member:** Created · Archived · Reactivated — ✅.
- **Staff/Gym:** GymCreated · BranchCreated · UserSignedIn · TrainerAssigned — ✅.

## Resolved Decisions (event-level — now final)
- **OQ-E1 → RESOLVED.** Payment standing is **derived** from immutable payment records (PAY-3); the moment money is received **is** the `PaymentRecorded` event (no separate "settled" event — payments are recorded when received, partial payments are additional records). Revenue keys off the received date on each record.
- **OQ-E2 → RESOLVED.** "Expiring Soon" stays a **derived condition** consumed by `NotificationGenerated`; no separate event.
