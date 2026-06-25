# Product Requirements Document (PRD)
## Gym Membership Management SaaS — MVP

| | |
|---|---|
| **Document status** | Draft v1.0 |
| **Date** | 2026-06-24 |
| **Product type** | B2B SaaS (vertical: fitness / gym operations) |
| **Release** | MVP (Minimum Viable Product) |

---

## 1. Product Vision

### 1.1 Vision Statement
To give gym owners and staff a single, reliable system of record for their members, plans, and active memberships — replacing spreadsheets, paper logs, and disconnected tools with a clean, fast, web-based platform that surfaces the right information at the right time.

### 1.2 Problem Statement
Independent gyms typically manage membership data in spreadsheets or notebooks. This leads to:
- **Lost revenue** from memberships that silently expire without renewal follow-up.
- **No visibility** into who is active, expiring, or lapsed.
- **Manual, error-prone** record-keeping for member details and plan pricing.
- **No timely reminders** for staff to act on renewals and onboarding.

### 1.3 Target Users (MVP)
A **single gym** with a small staff team. Primary personas:
- **Gym Owner / Admin** — full control over plans, members, memberships, and settings; wants business visibility.
- **Front-desk Staff / Receptionist** — day-to-day operator who registers members, sells memberships, and handles renewals.

### 1.4 Why SaaS-Ready Architecture
Although the MVP serves one gym, the system is architected from day one to support **multi-tenancy** (many gyms on one platform). This avoids a costly rewrite later. Concretely:
- Every core entity carries a tenant identifier (`organization_id` / `gym_id`) from the first migration, even though only one tenant exists in the MVP.
- Authentication, authorization, and data access are scoped by tenant.
- Configuration (currency, timezone, branding) is per-tenant, not hardcoded.
- Schema and APIs avoid assumptions that only one gym will ever exist.

> **Design principle:** *Build for one, design for many.* The MVP ships with a single seeded tenant; nothing in the data model prevents adding more.

### 1.5 Success Metrics (North Star + supporting)
| Metric | Target (post-MVP, 3 months) |
|---|---|
| **North Star:** Active memberships tracked in-system | 100% of the gym's real active members |
| Renewal rate on memberships expiring within 30 days | ≥ 70% actioned by staff |
| Time to register a new member + sell a membership | < 2 minutes |
| Staff daily active usage | ≥ 1 login/day on operating days |
| Expiring memberships actioned before lapse | ≥ 80% |

---

## 2. Scope Overview

### 2.1 In Scope (MVP)
1. **Members Management** — CRUD for member profiles.
2. **Plans Management** — CRUD for membership plan definitions (price, duration, etc.).
3. **Memberships Management** — assign a plan to a member, creating a time-bound membership; renew, freeze, cancel.
4. **Dashboard** — at-a-glance operational and business metrics.
5. **In-app Notifications** — system-generated alerts (e.g., expiring memberships) surfaced inside the app.
6. **Authentication & Roles** — login, with Admin and Staff roles.
7. **SaaS-ready foundation** — multi-tenant data model, single seeded tenant.

### 2.2 Explicitly Out of Scope (MVP)
The following are **intentionally excluded** from the MVP:
- ❌ **Attendance / check-in tracking**
- ❌ **QR codes** (check-in, member cards, etc.)
- ❌ **WhatsApp integration** (and any external messaging/SMS)
- ❌ **Mobile app** (native iOS/Android) — MVP is responsive web only
- ❌ **Payment gateway / online payments** — payments are recorded as offline/manual status only; no card processing

> Membership "payment status" may be tracked as a simple manual flag (e.g., Paid / Unpaid) without any gateway integration. This is a recording field, not a transaction.

---

## 3. User Stories

Stories are grouped by epic. Format: *As a [role], I want [capability], so that [benefit].*

### Epic A — Authentication & Access
- **A1.** As an Admin, I want to log in securely, so that only authorized staff access member data.
- **A2.** As an Admin, I want to invite/create staff accounts with a role, so that my team can use the system with appropriate permissions.
- **A3.** As a user, I want to log out and have my session expire, so that data stays protected on shared front-desk computers.

### Epic B — Members Management
- **B1.** As Staff, I want to register a new member with their personal details, so that I have a record of who trains here.
- **B2.** As Staff, I want to search and filter members by name, phone, or status, so that I can quickly find someone at the desk.
- **B3.** As Staff, I want to view a member's full profile including their membership history, so that I understand their relationship with the gym.
- **B4.** As Staff, I want to edit a member's details, so that records stay accurate.
- **B5.** As an Admin, I want to deactivate/archive a member (soft delete), so that I keep history without cluttering active lists.

### Epic C — Plans Management
- **C1.** As an Admin, I want to create a plan with a name, price, duration, and description, so that staff can sell standardized memberships.
- **C2.** As an Admin, I want to edit a plan's details, so that I can update pricing or terms.
- **C3.** As an Admin, I want to activate/deactivate a plan, so that retired plans can't be sold to new members but historical memberships remain intact.
- **C4.** As Staff, I want to view available active plans, so that I can advise and sell to members.

### Epic D — Memberships Management
- **D1.** As Staff, I want to assign a plan to a member to create a membership with start and end dates, so that the member becomes active.
- **D2.** As Staff, I want to renew an expiring or expired membership, so that the member continues without losing their place.
- **D3.** As Staff, I want to freeze/pause a membership for a defined period, so that members on travel or injury aren't charged unused time.
- **D4.** As Staff, I want to cancel a membership, so that I can stop an active subscription when requested.
- **D5.** As Staff, I want to mark a membership's payment status (Paid/Unpaid), so that I know who still owes.
- **D6.** As an Admin, I want each membership to record which plan, price, and dates applied at the time of sale, so that later plan price changes don't rewrite history.

### Epic E — Dashboard
- **E1.** As an Admin, I want to see total active members and memberships, so that I know the size of my active base.
- **E2.** As an Admin, I want to see memberships expiring in the next 7/30 days, so that I can drive renewals.
- **E3.** As an Admin, I want to see new members joined this month, so that I track growth.
- **E4.** As an Admin, I want to see revenue recorded this month (from membership sales/renewals), so that I track income.
- **E5.** As Staff, I want quick links from dashboard cards to filtered lists, so that I can act immediately.

### Epic F — In-App Notifications
- **F1.** As Staff, I want an in-app notification when memberships are about to expire, so that I follow up on renewals.
- **F2.** As Staff, I want a notification when a membership has expired, so that I can reach out.
- **F3.** As Staff, I want a notification badge/count for unread alerts, so that I don't miss anything.
- **F4.** As Staff, I want to mark notifications as read/dismiss them, so that I manage my queue.

---

## 4. Business Rules

### 4.1 Tenancy & Access
- **BR-1.** Every record (member, plan, membership, notification) belongs to exactly one tenant (`organization_id`). All queries are tenant-scoped.
- **BR-2.** A user can only access data within their own tenant.
- **BR-3.** Roles: **Admin** (full access incl. plans, staff, settings) and **Staff** (members + memberships + dashboard + notifications; cannot manage plans or staff accounts). *(Role boundaries configurable; this is the MVP default.)*

### 4.2 Members
- **BR-4.** A member must have at minimum a full name and one contact field (phone or email). Phone/email uniqueness is enforced **within a tenant** (not globally).
- **BR-5.** Members are **soft-deleted** (archived), never hard-deleted, to preserve membership history.
- **BR-6.** A member can have at most **one active membership at a time** (MVP simplification). Historical/expired memberships are retained.

### 4.3 Plans
- **BR-7.** A plan has: name, price, currency (tenant default), duration (value + unit: days/months), optional description, and active flag.
- **BR-8.** A plan's duration defines how the membership end date is computed: `end_date = start_date + duration`.
- **BR-9.** Editing a plan's price or duration affects **only future memberships**. Existing memberships keep the values captured at sale time (see BR-13).
- **BR-10.** A deactivated plan cannot be assigned to new memberships but remains valid for existing ones.
- **BR-11.** A plan cannot be hard-deleted if any membership references it; it must be deactivated instead.

### 4.4 Memberships
- **BR-12.** Creating a membership requires: a member, an active plan, and a start date. End date is auto-calculated from plan duration but may be overridden by an Admin.
- **BR-13.** At creation, the membership **snapshots** the plan name, price, and duration. Later plan edits do not alter existing memberships.
- **BR-14.** Membership status is derived/managed across: **Active**, **Expiring Soon** (within configurable window, default 7 days), **Expired**, **Frozen**, **Cancelled**.
- **BR-15.** **Active** = today is within [start_date, end_date] and status is not Frozen/Cancelled.
- **BR-16.** **Renewal** creates continuity: the new period starts at the later of (today) or (current end_date + 1 day), so a member renewing early doesn't lose remaining days. Renewal produces a new membership period record linked to the member (history preserved).
- **BR-17.** **Freeze** pauses the membership: frozen days are added to the end date when unfrozen (or by the freeze duration specified). A frozen membership is not counted as Active in metrics but is not Expired.
- **BR-18.** **Cancellation** ends a membership immediately; it cannot be reactivated (a new membership must be created). Cancelled memberships are excluded from active counts.
- **BR-19.** Payment is recorded manually with no gateway. *(Refined by domain governance — authoritative: `docs/domain/money-rules.md`, `business-rules.md` PAY-*.* The simple Paid/Unpaid flag is superseded by a derived **payment standing — Pending / Partially Paid / Paid** with partial payments and an **Outstanding Balance**; **membership status, not payment standing, controls access**; revenue counts **non-voided money received**.)*
- **BR-20.** Membership dates use the tenant's configured **timezone**; "today" and expiry calculations are evaluated in that timezone.

### 4.5 Dashboard & Metrics
- **BR-21.** "Active members" counts distinct members with at least one Active membership.
- **BR-22.** "Revenue this month" sums the captured price of memberships marked Paid whose payment/sale was recorded in the current calendar month (tenant timezone).
- **BR-23.** Metrics are tenant-scoped and reflect real-time data (no stale caching beyond a short refresh window).

### 4.6 Notifications
- **BR-24.** The system generates notifications for: membership **Expiring Soon** (default 7 days before end), membership **Expired** (on/after end date), and **optionally** new-member onboarding.
- **BR-25.** Notification generation runs on a scheduled job (e.g., daily) and is **idempotent** — the same expiry event does not create duplicate unread notifications.
- **BR-26.** Notifications are **in-app only** (no email/SMS/WhatsApp in MVP). They are tenant-scoped and visible to all staff of that tenant.
- **BR-27.** A notification has states: **Unread → Read → Dismissed**. Unread count drives the badge.

---

## 5. Acceptance Criteria

Written in Given/When/Then form. These are the testable conditions for "done."

### 5.1 Members
**AC-Members-1 (Create):**
- *Given* I am authenticated Staff, *when* I submit a new member with a valid name and phone, *then* the member is saved, scoped to my tenant, with status Active and a creation timestamp.
- *Given* a member with the same phone already exists in my tenant, *when* I try to create a duplicate, *then* I receive a validation error and no record is created.

**AC-Members-2 (Search):**
- *Given* members exist, *when* I search by partial name or phone, *then* matching members in my tenant are returned within the list, and members from other tenants are never shown.

**AC-Members-3 (Edit):**
- *Given* an existing member, *when* I update editable fields and save, *then* changes persist and an updated timestamp is recorded.

**AC-Members-4 (Archive):**
- *Given* a member with history, *when* an Admin archives them, *then* they no longer appear in the default active list but remain accessible via an "archived" filter, and their membership history is intact.

### 5.2 Plans
**AC-Plans-1 (Create):**
- *Given* I am an Admin, *when* I create a plan with name, price ≥ 0, and a positive duration, *then* it is saved as Active and available for selling.
- *Given* a price below 0 or a non-positive duration, *when* I submit, *then* I get a validation error.

**AC-Plans-2 (Edit isolation):**
- *Given* a plan used by existing memberships, *when* I change its price, *then* existing memberships retain their original captured price and only new memberships use the new price.

**AC-Plans-3 (Deactivate):**
- *Given* an active plan, *when* an Admin deactivates it, *then* it no longer appears in the "assign membership" plan picker, but existing memberships are unaffected.

### 5.3 Memberships
**AC-Memb-1 (Create):**
- *Given* an active member and an active plan, *when* Staff creates a membership with a start date, *then* the end date is auto-calculated from the plan duration, the plan price/name/duration are snapshotted, and the membership status is Active.

**AC-Memb-2 (One active rule):**
- *Given* a member already has an Active membership, *when* Staff tries to create a second active membership, *then* the system blocks it and prompts to renew/replace instead.

**AC-Memb-3 (Renew):**
- *Given* a membership expiring in 5 days, *when* Staff renews it, *then* a new period is created starting the day after the current end date, preserving remaining days, and history shows both periods.

**AC-Memb-4 (Freeze):**
- *Given* an Active membership, *when* Staff freezes it for N days, *then* status becomes Frozen, it is excluded from Active counts, and on unfreeze the end date is extended by the frozen duration.

**AC-Memb-5 (Cancel):**
- *Given* an Active membership, *when* Staff cancels it, *then* status becomes Cancelled, it leaves the active counts immediately, and it cannot be reactivated.

**AC-Memb-6 (Payment flag):**
- *Given* a membership, *when* Staff toggles payment status to Paid, *then* the membership is counted in revenue metrics for the relevant month; *when* Unpaid, it is excluded.

### 5.4 Dashboard
**AC-Dash-1:**
- *Given* I open the dashboard, *then* I see, scoped to my tenant: total active members, total active memberships, memberships expiring in 7 and 30 days, new members this month, and revenue this month — each reflecting current data.

**AC-Dash-2:**
- *Given* a dashboard metric card (e.g., "Expiring in 7 days"), *when* I click it, *then* I'm taken to the corresponding filtered list.

**AC-Dash-3:**
- *Given* no data exists yet, *then* metrics render zero-states gracefully (no errors).

### 5.5 Notifications
**AC-Notif-1 (Generation):**
- *Given* a membership whose end date is within the expiring window, *when* the scheduled job runs, *then* exactly one unread "Expiring Soon" notification is created for that membership (no duplicates on subsequent runs).

**AC-Notif-2 (Expired):**
- *Given* a membership that passed its end date and was not renewed, *when* the job runs, *then* an "Expired" notification is generated once.

**AC-Notif-3 (Badge & read state):**
- *Given* unread notifications exist, *then* the nav shows an unread count; *when* I open a notification, *then* it becomes Read and the count decreases; *when* I dismiss it, *then* it leaves the active list.

**AC-Notif-4 (Tenant scope):**
- *Given* notifications from another tenant exist, *then* they are never visible to my tenant's users.

### 5.6 Cross-cutting / Non-functional
**AC-NFR-1 (Auth):** Unauthenticated requests to any data route are rejected and redirected to login.
**AC-NFR-2 (Tenant isolation):** No API response ever returns data outside the requesting user's tenant (verified by automated tests).
**AC-NFR-3 (Responsive):** Core flows are usable on a tablet/desktop browser at common resolutions.
**AC-NFR-4 (Performance):** List and dashboard views load within ~2s for up to 5,000 members on the seeded tenant.

---

## 6. MVP Scope (Definition of Done for v1.0)

The MVP is considered **shippable** when all of the following are delivered and pass their acceptance criteria:

### 6.1 Must-Have (MVP core)
| # | Feature | Notes |
|---|---|---|
| 1 | **Auth + Roles** | Login/logout, Admin & Staff roles, session expiry |
| 2 | **Multi-tenant foundation** | `organization_id` on all entities; single seeded tenant; tenant-scoped queries |
| 3 | **Members CRUD** | Create, search/filter, view profile + history, edit, archive |
| 4 | **Plans CRUD** | Create, edit, activate/deactivate; price + duration + currency |
| 5 | **Memberships** | Create (with snapshot), renew, freeze/unfreeze, cancel, payment flag |
| 6 | **Dashboard** | Active members/memberships, expiring (7/30d), new this month, revenue this month, clickable cards |
| 7 | **In-app notifications** | Expiring & expired alerts, scheduled idempotent generation, badge, read/dismiss |
| 8 | **Settings (minimal)** | Tenant timezone, currency, expiry-window config |

### 6.2 Out of MVP (deferred — see roadmap)
Attendance, QR, WhatsApp/SMS/email messaging, native mobile app, payment gateway, multi-gym onboarding UI, advanced reporting, member self-service portal.

### 6.3 MVP Assumptions & Constraints
- Single gym (one seeded tenant); no self-serve tenant signup UI yet.
- Payments recorded manually (no processing).
- One active membership per member.
- Web only, responsive.
- Notifications are in-app only.

### 6.4 Key Risks
| Risk | Mitigation |
|---|---|
| Multi-tenant added "later" → costly rewrite | Enforce `organization_id` + scoping from first migration |
| Plan edits corrupt historical revenue | Snapshot plan data on membership creation (BR-13) |
| Duplicate/spammy notifications | Idempotent generation keyed on membership+event (BR-25) |
| Timezone/expiry off-by-one bugs | Centralize date logic in tenant timezone (BR-20) |
| Scope creep into excluded items | This PRD's exclusion list is the contract |

---

## 7. Future Roadmap

Sequenced by likely value and dependency. Not commitments — directional.

### Phase 2 — Multi-Gym Activation (true SaaS)
- Self-serve **tenant signup & onboarding** UI.
- **Subscription billing for the SaaS itself** (the gym pays you).
- Per-tenant branding, plan limits, and admin console / super-admin.
- Tenant-level usage analytics.

### Phase 3 — Revenue & Payments
- **Payment gateway integration** (Stripe/local processors) for membership sales and renewals.
- Automated invoices and receipts.
- Recurring/auto-renew memberships.
- Refunds, partial payments, and proration.

### Phase 4 — Engagement & Communications
- **Email notifications** (renewal reminders, receipts).
- **WhatsApp / SMS** reminders and broadcasts.
- Automated renewal campaigns and win-back for lapsed members.

### Phase 5 — Operations & Access
- **Attendance / check-in** tracking.
- **QR code** member cards and check-in.
- Class scheduling and bookings.
- Trainer/PT assignment and session tracking.

### Phase 6 — Member Experience
- **Native mobile app** (member + staff).
- **Member self-service portal** (view membership, renew, freeze requests).
- Loyalty, referrals, and promotions.

### Phase 7 — Intelligence
- Advanced reporting & exportable financial reports.
- Churn prediction and retention insights.
- Capacity and revenue forecasting.
- Multi-location/franchise rollups.

---

## Appendix A — Core Data Model (conceptual)

> Indicative only; not final schema. Every table carries `organization_id`.

- **organizations** (tenant): id, name, timezone, currency, expiry_window_days, branding…
- **users**: id, organization_id, name, email, password_hash, role (admin/staff), status.
- **members**: id, organization_id, full_name, phone, email, dob, gender, notes, status (active/archived), created_at.
- **plans**: id, organization_id, name, description, price, currency, duration_value, duration_unit, is_active.
- **memberships**: id, organization_id, member_id, plan_id, snapshot_name, snapshot_price, snapshot_duration, start_date, end_date, status (active/expiring/expired/frozen/cancelled), payment_status (paid/unpaid), frozen_days, created_at.
- **notifications**: id, organization_id, type (expiring/expired/…), member_id, membership_id, message, state (unread/read/dismissed), created_at, dedupe_key.

## Appendix B — Glossary
- **Tenant / Organization:** A single gym account. MVP has one; architecture supports many.
- **Membership:** A time-bound instance of a member holding a plan.
- **Snapshot:** Plan values copied onto a membership at sale time so later plan edits don't rewrite history.
- **Expiring Soon:** A membership within the configured window before its end date.
