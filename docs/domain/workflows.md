# Business Workflows
### PULSE Gym SaaS · Domain Documentation

| | |
|---|---|
| **Status** | ✅ Authoritative — how business processes run |
| **Layer** | Business steps only. No screens, requests, or storage. |
| **References** | `business-rules.md`, `state-machines.md`, `domain-model.md` |

> Each workflow states its **Goal, Actors, Preconditions, Business Flow, Alternative Flows, Failure Scenarios, Expected Result, and Business Notes**. Actors are business roles. Where an actor depends on an unresolved policy, it is marked and linked to the relevant Open Question.

---

## 1. Create Member
- **Goal** — Register a new person as a member of the gym.
- **Actors** — An actor holding **`members.create`** (Owner bundle in MVP; grantable to dormant Front Desk later).
- **Preconditions** — Actor is signed in and operating within their gym.
- **Business Flow** — 1) Capture the person's name and at least one contact method. 2) Confirm they aren't an existing member of this gym (by contact). 3) Record them as an active member of the gym's (home) branch.
- **Alternative Flows** — Optionally assign a trainer and capture additional details at registration.
- **Failure Scenarios** — Missing name/contact (MBR-2) → registration refused. Duplicate contact within the gym (MBR-3) → flagged; reactivate the existing member instead of creating a duplicate.
- **Expected Result** — A new active member exists; event **MemberCreated**.
- **Business Notes** — A member is *not* a user; registering a member never grants sign-in access.

## 2. Assign Trainer
- **Goal** — Establish or change which trainer coaches a member.
- **Actors** — An actor holding **`assignments.manage`** (Owner bundle in MVP).
- **Preconditions** — Member exists; trainer is a current staff member of the gym.
- **Business Flow** — 1) Select the member. 2) Choose a trainer (or "none"). 3) Record the assignment.
- **Alternative Flows** — Reassign to a different trainer; unassign (set to none).
- **Failure Scenarios** — Chosen trainer no longer belongs to the gym → assignment refused.
- **Expected Result** — The member's current trainer is recorded; event **TrainerAssigned** (or unassigned).
- **Business Notes** — Assignment is informational; it does **not** limit which members the trainer can view (ASN-2). MVP allows one trainer (OQ-6).

## 3. Create Membership (sell)
- **Goal** — Grant a member access by selling them a plan.
- **Actors** — An actor holding **`memberships.create`** (Owner bundle in MVP).
- **Preconditions** — Member exists and has **no Active membership** (MBR-4); an active plan is available.
- **Business Flow** — 1) Select the member and an active plan. 2) Set the start date. 3) The end date is derived from the plan duration (authorized actor may override). 4) The plan's name, price, and duration are **captured** onto the membership (MSH-2); this sets the **amount due**. 5) The membership becomes **Active**. 6) Its **payment standing begins Pending**; record any payment via workflow 9 (`payments.record`).
- **Alternative Flows** — Override the end date; record full payment immediately (standing → Paid).
- **Failure Scenarios** — Member already has an Active membership (MBR-4) → blocked; offer renew/upgrade. Chosen plan inactive (PLN-2) → not sellable. Actor lacks `memberships.create` → denied.
- **Expected Result** — An Active membership with captured terms, standing Pending; event **MembershipCreated**.
- **Business Notes** — **Access is granted by Active status regardless of payment standing** (MSH-6).

## 4. Renew Membership
- **Goal** — Continue a member's access into a new period without losing remaining time.
- **Actors** — An actor holding **`memberships.renew`** (Owner bundle in MVP).
- **Preconditions** — Membership exists and is **not cancelled** (REN-4).
- **Business Flow** — 1) Select the membership. 2) The new period starts the later of today or the day after the current end date (REN-1); if renewed early it is created as a **Scheduled** next period (MSH-7). 3) Capture the plan's **current** terms as a **new membership record** (REN-2/REN-3; append-only). 4) Record payment (workflow 9).
- **Alternative Flows** — Renew onto a different plan (this is an upgrade/downgrade — workflow 5). Renew after expiry → new period from today, immediately Active.
- **Failure Scenarios** — Membership is cancelled → renewal refused (create new instead). Plan retired → renew onto a current plan.
- **Expected Result** — Continuous membership with a later end date; event **MembershipRenewed**.
- **Business Notes** — Early renewal never forfeits paid days (REN-1).

## 5. Upgrade Membership
- **Goal** — Change a member's plan, effective next period (**deferred upgrade**).
- **Actors** — An actor holding **`memberships.upgrade`** (Owner bundle in MVP).
- **Preconditions** — Membership is Active; the member has **no existing Scheduled** membership (MSH-7); target plan is active.
- **Business Flow** — 1) Select the membership and the new plan. 2) **The current membership keeps running unchanged until it expires** (UPG-1). 3) Create the **next membership as Scheduled** on the new plan, effective the day after the current end; capture the new plan's terms now (UPG-2). 4) Record the change (from-plan → to-plan, effective date) in history. 5) **No proration, refund, or adjustment** (UPG-3). 6) The Scheduled membership becomes Active automatically when the current one expires (MSH-7).
- **Alternative Flows** — Downgrade (same mechanism toward a lower plan); cancel the Scheduled period before it activates.
- **Failure Scenarios** — Membership not Active, or a Scheduled membership already exists → refused. Target plan inactive → not selectable. Actor lacks `memberships.upgrade` → denied.
- **Expected Result** — Current membership unchanged; a Scheduled membership on the new plan; event **MembershipUpgraded** (creating a Scheduled membership).
- **Business Notes** — Deliberately free of financial complexity (UPG-1…3). Immediate/prorated upgrades are an explicit future policy.

## 6. Freeze Membership
- **Goal** — Pause a member's membership for a defined period.
- **Actors** — An actor holding **`memberships.freeze`** (Owner bundle in MVP).
- **Preconditions** — Membership is Active (FRZ-4).
- **Business Flow** — 1) Select the membership. 2) Specify the freeze duration/period. 3) The membership becomes Frozen and is excluded from active counts and expiry notifications (FRZ-3). 4) On resume, the end date is extended by the frozen duration (FRZ-2).
- **Alternative Flows** — Resume early; cancel while frozen (FRZ-4).
- **Failure Scenarios** — Membership not active → freeze refused.
- **Expected Result** — Membership Frozen; event **MembershipFrozen** (and **MembershipResumed** on unfreeze).
- **Business Notes** — No hard freeze cap in MVP (duration recorded); freezing requires `memberships.freeze` (ADR-022).

## 7. Cancel Membership
- **Goal** — End a membership deliberately.
- **Actors** — An actor holding **`memberships.cancel`** (Owner bundle in MVP).
- **Preconditions** — Membership is Active, Frozen, or Scheduled.
- **Business Flow** — 1) Select the membership. 2) Confirm the consequence (ends access immediately, cannot be reactivated). 3) The membership becomes Cancelled (terminal).
- **Alternative Flows** — None.
- **Failure Scenarios** — Membership already Expired/Cancelled → no-op or refused.
- **Expected Result** — Membership Cancelled; event **MembershipCancelled**. Member may now be sold a **new** membership.
- **Business Notes** — Cancellation is irreversible for that membership (REN-4); refund handling is via Payment void (PAY-4) per policy.

## 8. Archive Member
- **Goal** — Remove a member from active lists while keeping their history.
- **Actors** — An actor holding **`members.archive`** (Owner bundle in MVP).
- **Preconditions** — Member exists, has **no Active or Scheduled membership**, and has **no Outstanding Balance** (ARC-3).
- **Business Flow** — 1) Select the member. 2) The system verifies no Active/Scheduled membership and zero Outstanding Balance. 3) Confirm. 4) The member becomes Archived (history retained, hidden from active lists).
- **Alternative Flows** — Reactivate later (ARC-2).
- **Failure Scenarios** — **Active/Scheduled membership exists or balance is owed → archive rejected** (cancel/settle first — ARC-3). Actor lacks `members.archive` → denied.
- **Expected Result** — Member Archived; event **MemberArchived**.
- **Business Notes** — Reversible; never an erasure (MBR-5).

## 9. Record Payment
- **Goal** — Record money received against a membership.
- **Actors** — An actor holding **`payments.record`** (Owner bundle in MVP).
- **Preconditions** — A membership exists to attribute the payment to (**every payment references exactly one membership** — PAY-6).
- **Business Flow** — 1) Select the membership. 2) Enter amount and currency (captured immutably — PAY-2). 3) Record the payment against that membership. 4) The membership's **payment standing recomputes** (Pending → Partially Paid → Paid) and **Outstanding Balance** updates (PAY-3). 5) The received amount counts as revenue in its period (PAY-5).
- **Alternative Flows** — Record additional payments toward the balance (partial payments). **Void** a payment to correct an error (PAY-4) — the standing/balance recompute.
- **Failure Scenarios** — No membership to attribute to → refused (PAY-6). Attempt to **edit/delete** a recorded amount → refused; **void and re-record** instead. Actor lacks `payments.record` → denied.
- **Expected Result** — An immutable payment record exists; standing/balance updated; event **PaymentRecorded** (or **PaymentVoided**).
- **Business Notes** — No card processing in MVP (PAY-1); money is exact and currency-bearing (PAY-5).

## 10. Generate Notification
- **Goal** — Alert staff to memberships needing attention (expiring/expired).
- **Actors** — The **system** (automatic), on a regular (at least daily) basis.
- **Preconditions** — Memberships exist with end dates; the gym's warning window is known.
- **Business Flow** — 1) Evaluate memberships against today (gym time zone). 2) For those Expiring Soon or newly Expired (and not frozen — FRZ-3), generate an Unread notification **only if one for that event doesn't already exist** (NTF-3). 3) Staff later read/dismiss them.
- **Alternative Flows** — None (automatic).
- **Failure Scenarios** — Generation runs twice → no duplicates created (NTF-3). A membership was renewed → it no longer qualifies; no new alert.
- **Expected Result** — Relevant unread notifications exist; event **NotificationGenerated**.
- **Business Notes** — In-app only in MVP (NTF-1).

## 11. Daily Dashboard Refresh
- **Goal** — Present the owner with the current health of the business.
- **Actors** — Owner (viewer); the system computes figures.
- **Preconditions** — Actor signed in within their gym.
- **Business Flow** — 1) Compute, for the gym and its time zone: active members, memberships expiring within 7 and 30 days, new members this month, revenue this month (RPT-1). 2) Exclude **Scheduled/Frozen/Cancelled** from active counts and **Pending/voided** amounts from revenue (RPT-4). 3) Present current figures.
- **Alternative Flows** — Drill from a figure into the corresponding list.
- **Failure Scenarios** — No data yet → figures show zero, not error.
- **Expected Result** — Accurate, gym-scoped, current figures; event **DashboardCalculated**.
- **Business Notes** — Dashboard "7/30-day" buckets differ from the per-membership "Expiring Soon" indicator (RPT-2).

## 12. Trainer Login
- **Goal** — A trainer gains access to their gym's coaching information.
- **Actors** — A staff user whose role bundle is **Trainer**.
- **Preconditions** — The user is a current staff member of the gym (a valid GymUser carrying the Trainer permission bundle).
- **Business Flow** — 1) The user identifies themselves. 2) Access is granted scoped to their gym with the **resolved permission set** of the Trainer bundle. 3) Each action they attempt is checked against the **permission** it requires (e.g., `members.read`, `notes.create`); finance/config permissions are absent (TRN-2).
- **Alternative Flows** — A user who belongs to multiple gyms selects the gym context (future).
- **Failure Scenarios** — Not a staff member of the gym → denied. Action requires a permission not held → refused (by permission, never by role-name check).
- **Expected Result** — An authorized session scoped to one gym with a resolved permission set; event **UserSignedIn**.
- **Business Notes** — Visibility of all members is a held permission (`members.read`), not a role-name special case (TRN-1).

## 13. Owner Login
- **Goal** — A staff user with the Owner bundle gains full authority within their gym.
- **Actors** — A staff user whose role bundle is **Owner**.
- **Preconditions** — The user is a current staff member of the gym (a valid GymUser carrying the Owner permission bundle).
- **Business Flow** — 1) The user identifies themselves. 2) Access is granted scoped to their gym with the Owner bundle's **full permission set**. 3) Each action is still gated by the **permission** it requires (the Owner simply holds them all).
- **Alternative Flows** — A multi-gym user selects the gym context (future).
- **Failure Scenarios** — Not a staff member of the gym → denied.
- **Expected Result** — An authorized session scoped to one gym; event **UserSignedIn**.
- **Business Notes** — Authority is confined to the user's own gym (OWN-3) and expressed entirely as permissions.

---

## Resolved Decisions (workflow-level — now final)
- **OQ-W1 → RESOLVED.** Authority is **permission-based**: sales/payment/freeze require `memberships.create` / `payments.record` / `memberships.freeze` (held by the Owner bundle in MVP; grantable to dormant Front Desk later). No workflow branches on a role name.
- **OQ-W2 → RESOLVED.** Record Payment is allowed **both** inline (during sale/renewal) and standalone — but **always attributed to exactly one membership** (PAY-6).
- **OQ-W3 → RESOLVED.** Cancellation only ends access; **money is handled separately via Payment void** (PAY-4). No automatic refund/credit in MVP.
