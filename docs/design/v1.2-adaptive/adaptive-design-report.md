# Adaptive Design Report — PULSE v1.2

**Deliverable 3 of 6** · 2026-07-02 · companion to [`../design-system-v1.2.md`](../design-system-v1.2.md)

The per-screen adaptive matrix for every implemented screen. For each: the **Desktop (≥md)**
presentation, the **Mobile (<md)** presentation (by AP-rule), and the **operational-first order**
(§6 doctrine: P0 operational/money → P1 identity/relationships → P2 secondary metadata). Adaptation
is **re-prioritization, not resizing** — the mobile order below is the design contract, not the DOM
source order.

> **Method:** design specification grounded in the built module UIs (`apps/web/src/modules/*/ui`),
> the component catalog, and the domain model — **not** a running-app pass (docs-first slice). The
> implementation slice realizes and axe-verifies these at mobile viewport.

---

## Global (every screen)
- **Nav:** persistent rail ≥lg → off-canvas drawer <lg (unchanged, e2e-verified). §5.7.
- **Overlays:** dialogs/filters/pickers/row-menus → **Adaptive Bottom Sheet** <md. AP-3/4/7.
- **Primary action:** inline PageHeader primary ≥md → **Creation FAB** (create-list screens) or
  **Sticky Mobile Action Bar** (forms/details) <md. AP-6.
- **Inputs:** render ≥16px on mobile (no iOS zoom). §5.10.

---

## 1. Dashboard (`/dashboard`)
- **Desktop:** KPIGrid (status counts + Revenue today/MTD) → 4 operational lists (expiring / expired /
  outstanding / recent) → quick actions.
- **Mobile (AP-2 → operational feed):** a single prioritized column — **urgent first**, vanity later.
- **Operational-first order:**
  - **P0:** Expiring-soon count · Expired count · Outstanding total → then the Expiring / Outstanding
    **lists** (each row a card, AP-1).
  - **P1:** Revenue Today · Revenue MTD · Active/Frozen/Scheduled counts.
  - **P2:** Recent members list.
- **Actions:** quick actions become a thumb-reachable action row (permission-gated); dashboard is not
  a create-screen, so **no FAB**.

## 2. Members list (`/members`)
- **Desktop:** DataTable (name, status, trainer, contact, join) + toolbar (search · status · trainer
  filters) + inline "Add member".
- **Mobile:** **card list** (AP-1); filters → **bottom sheet** (AP-3) with active-count badge + chips
  above results; **Creation FAB** = "Add member".
- **Card operational-first order:** **P0** MembershipStatusBadge · outstanding flag → **P1** Name ·
  AssignedTrainer · Plan → **P2** phone/email · join date. Row actions → ActionMenu-in-sheet (AP-7).

## 3. Member Details (`/members/[memberId]`)
- **Desktop:** multi-section (identity header + info panel + memberships + payments/billing + archive).
- **Mobile (AP-5 stacked):** sections stacked in operational order; primary → **Sticky Action Bar**.
- **Operational-first order:**
  - **P0:** current **Membership status + remaining days** · **Outstanding balance** · payment standing.
  - **P1:** Name · current Plan · Assigned trainer · membership period dates · membership history.
  - **P2:** email · phone · address · IDs · join/audit metadata.
- **Actions:** primary (New membership / Renew) in Sticky Action Bar; **Archive** (destructive) behind
  a confirm step (never the default thumb control). §5.1.

## 4. Plans list (`/plans`)
- **Desktop:** DataTable (name, price, duration, status) + toolbar; inline "New plan".
- **Mobile:** card list (AP-1); filters → sheet; **Creation FAB** = "New plan".
- **Card order:** **P0** price (MetricValue) · Active/Archived status → **P1** name · duration →
  **P2** created date. *(For selling, price + active status are the operational facts.)*

## 5. Memberships list (`/memberships`)
- **Desktop:** DataTable (member, plan, status, period, price) + toolbar; inline "Sell membership".
- **Mobile:** card list (AP-1); filters → sheet; **Creation FAB** = "Sell membership".
- **Card order:** **P0** MembershipStatusBadge · **remaining days** · outstanding → **P1** member
  name · plan · period → **P2** price snapshot · created.

## 6. Payments (billing on `/memberships/[membershipId]`)
- **Note:** there is **no standalone Payments list route** — payments are recorded/voided from the
  membership detail's Billing + Payment-history sections. The sidebar "Payments" placeholder
  **misrepresents** this (RC-review **TD-15** / design-debt **DD-11**) — flagged, IA decision.
- **Desktop:** Billing summary (price / paid / balance / standing) + payment-history table +
  record-payment form + void control.
- **Mobile (AP-5/AP-4):** billing summary card first; payment history → **card list**; **Record
  payment** opens a **bottom sheet** form (amount field = numeric keypad, ≥16px); void → confirm sheet.
- **Operational-first order:** **P0** Outstanding balance · payment standing · amount(s) → **P1**
  method · received date · membership link → **P2** recorded-by · notes · void metadata.

## 7. Notifications (`/notifications`)
- **Desktop:** list (unread grouped first) + mark-all-read.
- **Mobile:** full-width list (already); from the TopBar bell → **NotificationCenter as sheet**.
- **Operational-first order:** **P0** the alert type (Expiring/Expired) + which member/membership →
  **P1** effective end date (`<time>`) → **P2** read/dismiss controls.

## 8. Reports (`/reports` + revenue/memberships/outstanding/expiring)
- **Desktop:** StatCards + report tables; revenue has a custom-range form.
- **Mobile:** StatCards **stack** (operational feed, AP-2); report tables → **card lists** (AP-1);
  revenue custom-range → **bottom sheet** form (AP-3/4).
- **Operational-first order (per report):** **P0** the headline metric (revenue total / outstanding
  total / #expiring) → **P1** the breakdown rows → **P2** range/label metadata. Owner-only in MVP
  (RC TD-3), unchanged.

## 9. Staff list (`/staff`)
- **Desktop:** DataTable (name, role, status, last login) + toolbar; inline "Add staff".
- **Mobile:** card list (AP-1); **Creation FAB** = "Add staff"; suspend/reactivate & role-change →
  ActionMenu-in-sheet, destructive suspend behind confirm.
- **Card order:** **P0** Active/Revoked status · role → **P1** name → **P2** last login · email.

## 10. Gym Settings (`/settings/gym`, `/settings/branch`)
- **Desktop:** settings form(s), multi-field.
- **Mobile (AP-5/AP-6):** stacked FormSections; **Sticky Action Bar** (Save/Cancel) in thumb zone;
  inputs ≥16px.
- **Order:** **P0/P1** the editable operational config (name, currency, timezone, branch) → **P2**
  read-only ids/metadata.

## 11. Profile (`/settings/profile`, `/onboarding/profile`)
- **Desktop:** profile form.
- **Mobile:** stacked form + **Sticky Action Bar** (Save); inputs ≥16px.
- **Order:** **P1** name / display fields → **P2** account metadata / last login.

### Onboarding wizard (cross-cutting)
- The focused-shell wizard (gym → branch → profile → complete) is already e2e-verified responsive at
  375/768/1280. Mobile: each step full-width, **Sticky Action Bar** for the step's Continue/Back,
  inputs ≥16px. No FAB (not a list-create screen).

---

## Summary
Every screen has a defined desktop **and** mobile presentation with an operational-first order — no
screen is a shrunken table. The mobile centerpieces are: **card lists** for the five entity lists
(Members/Memberships/Plans/Staff + report/history tables), the **operational feed** for
Dashboard/Reports, **bottom sheets** for filters/pickers/record-payment, **thumb-zone actions** (FAB
on the four create-list screens; Sticky Action Bar on every form + the two detail pages), and
**operational-first ordering** led by Member and Membership detail. The before-Beta implementation
subset is prioritized in the [Design Debt](./design-debt-report.md) and
[Beta UX Readiness](./beta-ux-readiness-report.md) reports.
