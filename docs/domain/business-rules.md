# Business Rules
### PULSE Gym SaaS · Domain Documentation · Canonical business reference

| | |
|---|---|
| **Status** | ✅ Authoritative — the single source of truth for *business logic* |
| **Layer** | Bridges the **PRD** (what we build) and a future **DDS** (how it's stored). Business language only. |
| **References** | PRD (`/docs/product`), ADR (`/docs/architecture`) — referenced, never duplicated |

> **How to read this:** Every rule has a stable **ID** (cite it in specs and tests), a **Description**, the **Business Reason** (why the business needs it), **Exceptions**, and **Future Considerations**. Rules describe *how the business behaves*, never how software implements it. Where the business is genuinely undecided, the rule is **not invented** — it is raised in **§ Open Questions** with a recommendation.

---

## 1. Gym (the business tenant)

| ID | Description | Business Reason | Exceptions | Future |
|---|---|---|---|---|
| GYM-1 | A **Gym** is the top-level business: it owns all of its members, plans, memberships, payments, and staff. Nothing business-related exists outside a gym. | It is the unit a customer pays for and operates; everything belongs to someone. | None. | Multiple gyms on one platform (multi-tenant SaaS). |
| GYM-2 | Each gym has its own settings: **currency, time zone, and the "expiring soon" warning window**. | A gym in one country/currency must not inherit another's. "Today" and expiry are judged in the gym's local time. | None. | Per-gym branding, business hours, locale. |
| GYM-3 | A gym's data is **completely isolated** from every other gym. No person or report may see across gyms. | Privacy, trust, and legal separation of independent businesses. | None — this is absolute. | Cross-gym roll-ups only for a future franchise/owner-of-many model, explicitly opted in. |
| GYM-4 | The MVP operates **one gym with one branch**, created at setup. | Deliver value to the first customer without multi-tenant onboarding. | None. | Self-serve gym signup. |

## 2. Branch (a location within a gym)

| ID | Description | Business Reason | Exceptions | Future |
|---|---|---|---|---|
| BRN-1 | A **Branch** is a physical location belonging to exactly one gym. Members, memberships, and payments are associated with a branch. | Multi-location gyms need to know where a member trains and where revenue arises. | MVP: a single default branch; association may be implicit. | Multi-branch management, transfers, per-branch reporting. |
| BRN-2 | A branch is **always a sub-scope of a gym**, never a substitute for it. Removing/standing-up a branch never crosses the gym boundary. | The tenant boundary is the gym; branch is finer detail. | None. | Branch-level staff permissions. |
| BRN-3 | A member belongs to a **home branch**; a member may visit, but business records attribute to the relevant branch. | Clarity of ownership and accurate location reporting. | MVP single branch makes this moot. | Member transfer between branches (see Open Questions). |

## 3. Owner

| ID | Description | Business Reason | Exceptions | Future |
|---|---|---|---|---|
| OWN-1 | The **Owner** has full authority within their gym: manage plans, members, memberships, payments, staff, and settings, and view all reports. | Someone must hold complete responsibility for the business. | None within their own gym. | Multiple owners / co-owners; delegated admin. |
| OWN-2 | **Creating/changing plans, recording/voiding payments, and changing settings require their respective management permissions** (held by the Owner bundle in MVP). The Owner role is defined as the bundle holding these permissions — not as a hard-coded identity. | These are financially and contractually sensitive; gating is by permission, not role name. | None in MVP. | The same permissions can be granted to future bundles (Front Desk/Manager/Accountant). |
| OWN-3 | An Owner acts **only within gyms they belong to**. | Tenant isolation applies to staff too. | A future multi-gym owner switches gym context explicitly. | Owner-of-many dashboards. |

## 4. Trainer

| ID | Description | Business Reason | Exceptions | Future |
|---|---|---|---|---|
| TRN-1 | A **Trainer** may **view all members** of their gym. | Trainers need full visibility to coach anyone, not only their assignees. | None. | Privacy tiers if gyms request limited visibility. |
| TRN-2 | A Trainer may **read and write member notes** and **view memberships**, but **may not manage plans, payments, or settings**. | Coaching needs notes and context; finance/config are the Owner's domain. | None in MVP. | Expanded trainer permissions per gym policy. |
| TRN-3 | A member may be **optionally assigned to one Trainer**; assignment does not restrict which members a Trainer can view (per TRN-1). | Personal-training relationships matter, but coverage must not break. | A member may have **no** trainer. | Multiple trainers / specialities per member (see Open Questions). |

## 5. Member

| ID | Description | Business Reason | Exceptions | Future |
|---|---|---|---|---|
| MBR-1 | A **Member** is a person who belongs to a gym and is the subject of memberships, payments, notes, and notifications. | The member is the core customer record. | None. | Member self-service portal. |
| MBR-2 | A member must have a **name and at least one contact method** (phone or email). | You cannot serve or contact an unidentifiable member. | None. | Required-field policy per gym. |
| MBR-3 | A member's identifying contact (e.g., phone) is **unique within their gym**, not across gyms. | Two different gyms may legitimately have a member with the same phone. | None. | De-duplication assistance. |
| MBR-4 | A member may hold **at most one Active membership and at most one Scheduled membership** at a time (the Scheduled one being a queued upgrade/renewal — MSH-7); historical memberships are retained. Active periods **never overlap**. | Avoids double-charging and ambiguous status while allowing the next period to be queued. | None. | Multiple concurrent memberships (e.g., add-on services). |
| MBR-5 | A member is **archived, never erased** while they have any history. | History and revenue must be preserved; people return. | Truly empty records with no history may be removed. | Right-to-erasure handling for data-protection compliance. |

## 6. Plan

| ID | Description | Business Reason | Exceptions | Future |
|---|---|---|---|---|
| PLN-1 | A **Plan** is a sellable offering with a name, price, currency, and duration. | The catalog from which memberships are sold. | None. | Tiers, add-ons, class packs, family plans. |
| PLN-2 | A plan may be **active** (sellable) or **inactive** (retired). Inactive plans cannot be sold to new memberships but remain valid for existing ones. | Pricing/offerings change; history must not break. | None. | Scheduled price changes, promotions. |
| PLN-3 | Changing a plan's price or duration affects **only future memberships**. Existing memberships keep the terms captured when they were sold. | A member's agreed price is a contract; it cannot change retroactively. | None — this is absolute. | Versioned plans, grandfathering policies. |
| PLN-4 | A plan that has ever been sold **cannot be destroyed**; it is retired instead. | Protects the integrity of historical records that reference it. | A never-sold draft plan may be removed. | Plan archival with audit. |

## 7. Membership

| ID | Description | Business Reason | Exceptions | Future |
|---|---|---|---|---|
| MSH-1 | A **Membership** grants a member access for a defined period, created by assigning a plan with a start date; the end date is derived from the plan's duration. | This is how access and revenue are tracked over time. | An actor with the appropriate permission may override the end date. | Auto-renewing memberships. |
| MSH-2 | At creation, a membership **captures (snapshots) the plan's name, price, and duration**; later plan edits never alter it. | The member's terms are fixed at the moment of sale (see PLN-3). | None — absolute. | Snapshot of full terms/contract text. |
| MSH-3 | A membership is **Active** when today (in the gym's time zone) falls within its period and it is not frozen or cancelled. | Defines who may use the gym and who counts as a paying customer. | Frozen memberships are paused, not active (see FRZ rules). | Grace periods. |
| MSH-4 | A membership is flagged **"Expiring Soon"** when it is Active and its end date is within the gym's warning window (default 7 days). This is an indicator, **not** a change of rights. | Drives timely renewal follow-up without removing access. | Window is configurable per gym. | Multi-stage reminders (e.g., 14/7/1 day). |
| MSH-5 | A membership becomes **Expired** the day after its end date if not renewed; an expired member loses access. | Access must end when the paid period ends. | A renewal before/after expiry restores continuity (see REN rules). | Configurable post-expiry grace. |
| MSH-6 | **Membership status alone controls access.** A membership's **payment standing** (Pending / Partially Paid / Paid) is *derived* from the payments recorded against it and **never controls access**. An Active membership grants access regardless of payment standing; a Pending membership is still Active. | Access and money are independent business concerns: the desk grants access by membership state; collections are tracked separately. Coupling them creates lock-out bugs and disputes. | None — absolute (see `money-rules.md`, payment policy). | Optional, opt-in "suspend on overdue" policy per gym. |
| MSH-7 | A membership may be **Scheduled**: created now but **effective only when the current membership expires** (produced by a deferred Upgrade — see UPG rules, and optionally early Renewal). A member may hold **at most one Active and at most one Scheduled** membership. | Lets the gym sell the next period now without disturbing the paid-for current one. | None. | Multiple queued periods, arbitrary future-dating. |

## 8. Payment

| ID | Description | Business Reason | Exceptions | Future |
|---|---|---|---|---|
| PAY-1 | A **Payment** records money received against a membership, with an amount, currency, and date. It is a **record only** — no card processing occurs. | Gyms need to track who paid what, even when paid in cash at the desk. | None in MVP. | Online payment processing, receipts, invoices. |
| PAY-2 | A payment captures the **amount and currency at the time it is recorded**; later plan/price changes never alter it. | Financial history is immutable (see `immutable-history.md`). | None — absolute. | Multi-currency settlement. |
| PAY-3 | A membership has an **amount due** (its snapshot price). Its **payment standing** is derived: **Pending** (nothing received), **Partially Paid** (0 < received < due), **Paid** (received ≥ due). **Outstanding Balance = amount due − sum of non-voided payments.** | Partial payments and balances are real gym operations; the standing must be computed, not stored as a flag. | None (see `money-rules.md`). | Installment schedules. |
| PAY-4 | A recorded payment may be **Voided** (corrected) but **never edited or deleted**; a void is itself a recorded action and removes that amount from balances and revenue. | Mistakes happen; corrections must be auditable, history immutable. | None — absolute. | Refund-to-source, partial reversals. |
| PAY-5 | **Revenue counts only non-voided received money**, attributed to the period in which it was received (gym time zone). Pending/outstanding and voided amounts are excluded. | Reported income must reflect money actually received. | None. | Accrual vs cash options. |
| PAY-6 | **Every Payment belongs to exactly one Membership. Payments never exist independently.** *(Permanent business invariant — see `business-invariants.md`.)* | Revenue and balances must always attribute to a specific membership; orphan money is untraceable. | None — absolute. | Non-membership income via a separate concept, never an orphan payment. |
| PAY-7 | Money is always handled exactly, **never approximated**, and always carries its currency (see `money-rules.md`). | Financial correctness is non-negotiable. | None. | Per-currency rounding rules. |

## 9. Notification

| ID | Description | Business Reason | Exceptions | Future |
|---|---|---|---|---|
| NTF-1 | A **Notification** is an in-app alert generated by the system for staff to act on. **MVP uses in-app only** — no email, SMS, or messaging apps. | Keep staff informed inside the tool without external channels. | None in MVP. | Email/SMS/other channels. |
| NTF-2 | The system generates notifications for memberships **Expiring Soon** and **Expired**, evaluated regularly (at least daily). | These are the moments that drive renewals and retention. | A gym's window affects "expiring." | New-member onboarding, payment-due, birthday reminders. |
| NTF-3 | Notification generation is **non-duplicating**: the same expiry event for the same membership does not create repeated unread alerts. | Staff must trust the alert list; spam destroys trust. | None. | Re-notify cadence if unactioned. |
| NTF-4 | Notifications are **gym-scoped and visible to that gym's staff**; they progress **Unread → Read → Dismissed**. | Shared awareness within the team; a manageable queue. | None. | Per-user assignment of notifications. |
| NTF-5 | **Expired**-membership notification generation is bounded to a **recent window** (system default **7 days** after the effective end date). Once a membership has been expired **longer than the window**, it is a **historical record**, not an operational alert, and generates **no new expiry notification**. **Scope: notification generation only** — this rule does **not** affect reports, dashboards, membership status/access, or history (those still see every expired membership). | Expiry alerts exist to drive *timely* renewal outreach; stale lapses are noise that erodes trust in the queue (NTF-3). Reporting/history need the full record, so the bound is confined to generation. | None. | Per-gym configurable window; re-notify cadence. |

## 10. Renewal

| ID | Description | Business Reason | Exceptions | Future |
|---|---|---|---|---|
| REN-1 | **Renewal** continues a member's membership into a new period without losing remaining time: the new period starts the later of **today** or **the day after the current end date**. | A member who renews early must not forfeit days already paid for. | None. | Auto-renewal. |
| REN-2 | Renewal **preserves history**: the prior period remains on record; renewal does not overwrite it. | Accurate lifetime history and revenue. | None. | Renewal streak/loyalty tracking. |
| REN-3 | Renewal uses the **plan's current terms at the time of renewal** (a fresh snapshot), which may differ from the original. | A renewal is a new agreement for a new period. | An authorized actor may renew onto a different plan (effectively an upgrade/downgrade). | Loyalty pricing on renewal. |
| REN-4 | A **Cancelled** membership cannot be renewed; a new membership must be created instead. | Cancellation is a deliberate end of the relationship for that membership. | None. | Reactivation flow distinct from renewal. |

## 11. Upgrade (and downgrade)

| ID | Description | Business Reason | Exceptions | Future |
|---|---|---|---|---|
| UPG-1 | **Upgrade (deferred model — official MVP rule).** The **current membership remains Active until its scheduled expiration.** An upgrade **creates the next membership immediately** (on the chosen plan) as **Scheduled**; it becomes **effective only after the current membership expires** (MSH-7). A **downgrade** is the same mechanism toward a lower plan. | Simplicity, fairness, and zero financial complexity: the member keeps what they paid for; the new plan begins cleanly at the next period. | None. | Immediate (mid-term) upgrades as an opt-in, if a gym needs it. |
| UPG-2 | The Scheduled upgrade **captures the new plan's terms** at creation and records the change in history (from-plan → to-plan, effective date). | Terms and the reason for change must be traceable and immutable. | None. | Full contract snapshot. |
| UPG-3 | **No proration, no refunds, no remaining-value calculations, no financial adjustments** on upgrade. The current period is neither shortened nor credited. | Eliminates an entire class of money-math, dispute, and rounding complexity for the MVP; the model is trivially correct. | None — absolute for MVP. | Proration/credit as a deliberate future policy, never implicit. |

## 12. Freeze

| ID | Description | Business Reason | Exceptions | Future |
|---|---|---|---|---|
| FRZ-1 | A **Freeze** pauses an active membership for a defined period (travel, injury); the member is not "active" while frozen but is not "expired." | Members shouldn't pay for time they cannot use; the gym retains the relationship. | None. | Paid vs free freezes. |
| FRZ-2 | Frozen time **extends the end date** by the frozen duration when the membership resumes. | The member receives the full paid duration of access. | None. | Partial-use adjustments. |
| FRZ-3 | A frozen membership is **excluded from "active" counts** and is not eligible for "expiring/expired" notifications while frozen. | Reporting and reminders must reflect the paused reality. | None. | Freeze caps/limits (see Open Questions). |
| FRZ-4 | Only an Active membership may be frozen; a Frozen membership may be **resumed** (unfrozen) or **cancelled**. | Defines the legitimate transitions; prevents nonsensical states. | None. | Auto-resume on a scheduled date. |

## 13. Archive

| ID | Description | Business Reason | Exceptions | Future |
|---|---|---|---|---|
| ARC-1 | **Archiving** a member removes them from active lists while **retaining all history**. | Keep working lists clean without destroying records. | None. | Bulk archive of long-lapsed members. |
| ARC-2 | Archiving is **reversible** (a member may be reactivated); destruction of records is not. | People return; the business shouldn't lose them. | None. | Re-onboarding flow. |
| ARC-3 | **Archiving is allowed only when the member has NO Active, Scheduled, or Frozen membership AND NO Outstanding Balance.** Otherwise archiving is **rejected**. *(Frozen clarification, human-ruled 2026-07-01: a Frozen membership is paused but **resumable** (FRZ-4) — a live, unsettled commitment — so it must be cancelled/closed before archive, exactly like Active/Scheduled.)* | An archived person must never silently retain access, a queued period, a paused-but-resumable membership, or unpaid debt; the gym must settle and close first. | None — absolute (see `business-invariants.md`). | Guided "close-out" flow that cancels/settles, then archives. |

## 14. Assignment (member ↔ trainer)

| ID | Description | Business Reason | Exceptions | Future |
|---|---|---|---|---|
| ASN-1 | A member may be **assigned to a trainer**, changed to another, or **unassigned**. | Reflects real coaching relationships and lets them evolve. | A member may have none. | Multiple trainers per member (see Open Questions). |
| ASN-2 | Assignment is **informational**, not a permission boundary: it does not limit which members a trainer can view (TRN-1) nor who may serve the member. | Coverage and flexibility for the gym. | None. | Assignment-based notifications to the trainer. |
| ASN-3 | A trainer who leaves (is removed) must have their **assignments reassigned or cleared**; no member is left pointing at a non-existent trainer. | Data integrity and continuity of care. | None. | Hand-off workflow with history. |

## 15. Reports & Dashboard

| ID | Description | Business Reason | Exceptions | Future |
|---|---|---|---|---|
| RPT-1 | The dashboard reports, for the gym (and time zone): **active members, memberships expiring within 7 and 30 days, new members this month, and revenue this month**. | The owner's at-a-glance health of the business. | None. | Configurable KPIs, custom ranges. |
| RPT-2 | **"Expiring within 7/30 days" (dashboard buckets)** are distinct from the **"Expiring Soon" status window** (MSH-4): the dashboard counts ranges; the status is a per-membership indicator. | Prevents confusing two related-but-different concepts. | None. | More buckets, cohort views. |
| RPT-3 | All reports are **gym-scoped and reflect current data**; figures match the underlying records at view time. | Trust in numbers; no stale or cross-gym leakage. | None. | Scheduled/exported reports, trends. |
| RPT-4 | **Scheduled, Frozen, and Cancelled memberships are excluded from active counts** (only Active counts); **revenue counts only non-voided money received** — Pending/outstanding and voided amounts are excluded (PAY-5, `money-rules.md`). | Reports must reflect business reality: only live access counts as active, only received money as revenue. | None. | Outstanding-balance and forward-bookings reporting. |

## 16. Permissions (summary; **canonical model in `authorization-architecture.md`**)

> Authorization is **permission-based, not role-based**. A role is only a named bundle of permissions; business rules never reference a role name.

| ID | Description | Business Reason | Exceptions | Future |
|---|---|---|---|---|
| PRM-1 | Every action is checked **gym/branch scope first, then the required permission**: a person acts only within their gym, and only if they **hold the permission** the action requires. | Two independent protections: tenant isolation and least privilege. Neither depends on a role name. | None. | Branch-scoped permissions. |
| PRM-2 | Each action requires a specific **permission key** (e.g., `plans.create`, `payments.record`, `settings.manage`). Which roles hold which permissions is **data** (the permission matrix), changeable without code. | Stable, composable authorization that survives new roles. | None. | Gym-custom role bundles. |
| PRM-3 | **No business rule, workflow, query, or screen may branch on a role name.** Differences in who-can-do-what are expressed purely by the permissions a role bundle holds. | Prevents the role-coupling that causes drift and rework. | None — absolute (`authorization-architecture.md` §10). | Attribute-based conditions if ever needed. |

---

## Resolved Decisions (formerly Open Questions — now final)

All open questions are **resolved and binding** as of the final governance reconciliation. Recorded here for traceability.

- **OQ-1 — Front desk / roles → RESOLVED (decision-log ADR-014).** MVP roles are **Owner + Trainer**; front-desk operations are Owner permissions in MVP. **Front Desk, Receptionist, Manager, Accountant, Branch Manager** exist as **dormant** future bundles (documented, in the permission strategy, migration-ready) — no UI, no creation, no activation in MVP.
- **OQ-2 — Upgrade money handling → RESOLVED.** **Deferred upgrade, no proration/refunds/adjustments** (UPG-1…3).
- **OQ-3 — Payment vs access → RESOLVED.** **Membership status controls access; payment standing never does** (MSH-6). New memberships begin **Pending** and progress Pending → Partially Paid → Paid (PAY-3).
- **OQ-4 — Archive policy → RESOLVED.** Archive allowed **only when no Active, Scheduled, or Frozen membership AND no Outstanding Balance** (ARC-3; Frozen clarified 2026-07-01).
- **OQ-5 — Scheduled memberships → RESOLVED.** **Scheduled** memberships now exist, but **only** as the queued next period from a deferred Upgrade (and optionally early Renewal): at most one Active + one Scheduled (MSH-7). Arbitrary future-dating remains out of scope.
- **OQ-6 — Multiple trainers → RESOLVED.** **One trainer per member** in MVP; multiple is future.
- **OQ-7 — Freeze limits / who may freeze → RESOLVED.** **No hard cap** in MVP (duration recorded); freezing requires the **`memberships.freeze`** permission (not a role).
- **OQ-8 — Payment attribution → RESOLVED.** **Every payment references exactly one membership** (PAY-6; permanent invariant). No ad-hoc/orphan payments.

*No open questions remain in the domain. Everything above is settled and binding.*
