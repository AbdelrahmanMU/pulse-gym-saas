# Manual Testing Checklist — PULSE (Beta)

**Deliverable 5 of 6** · 2026-07-02 · companion to [`../design-system-v1.2.md`](../design-system-v1.2.md)

A workflow-by-workflow manual test pass for Beta readiness. Run **each workflow on both a desktop
viewport (≥1280) and a real phone (<md, e.g. 375–414)**, unless marked desktop-only. Adaptive rows
(🔀) are **pending the v1.2 implementation slice** — until then, verify the current responsive
behavior and mark the adaptive expectation as *not-yet-built*.

**Legend:** ☐ pass/fail · 🖥 desktop · 📱 mobile · 🔀 adaptive behavior (v1.2, pending impl) ·
♿ accessibility.

---

## A. Authentication & session
- ☐ 🖥📱 Sign in with valid owner credentials → lands on dashboard (or onboarding if setup incomplete).
- ☐ 🖥📱 Sign in with invalid credentials → clear inline error, no leak of which field failed.
- ☐ 🖥📱 Sign out from the user menu → returns to sign-in; protected routes no longer reachable.
- ☐ ♿ Sign-in form: labels, error association, keyboard-only completion, visible focus ring.
- ☐ 📱 Sign-in inputs do **not** trigger iOS zoom on focus *(DD-2 — verify after impl)*.

## B. Onboarding wizard (setup-needed owner)
- ☐ 🖥📱 Gym → Branch → Profile → Complete → Dashboard; progress persists across steps.
- ☐ 🖥📱 Server-side blank-name rejection on each step (whitespace-only) shows a field error.
- ☐ ♿ Each step: single `<h1>`, focus lands sensibly, skip link works, no axe violations.
- ☐ 🔀📱 Step Continue/Back reachable in the **Sticky Action Bar** (thumb zone); not covered by keyboard.

## C. Members
- ☐ 🖥 Members list: table renders, priority columns, search + status + trainer filters, pagination.
- ☐ 🔀📱 Members list renders as a **card list**; card shows status → trainer → name → contact order.
- ☐ 🔀📱 Filters open in a **bottom sheet**; active-filter chips visible; clear-all works.
- ☐ 🔀📱 **Add member** via the **Creation FAB** (thumb zone); flow identical to desktop.
- ☐ 🖥📱 Create member: required validation, contact-uniqueness error, success → appears in list.
- ☐ 🖥📱 Edit member; archive member → **blocked** with reason when Active/Scheduled/Frozen membership
  or Outstanding balance (ARC-3); allowed when clean.
- ☐ ♿ Archive confirm step is reachable by keyboard; destructive action not default-focused.
- ☐ 🔀📱 Member detail stacks **operational-first**: status + remaining days + outstanding **before**
  name/plan/trainer **before** contact/address.

## D. Plans
- ☐ 🖥 Plans list + filters; 🔀📱 card list; 🔀📱 **New plan** via FAB.
- ☐ 🖥📱 Create/edit plan; price entry uses currency input (numeric keypad on mobile); over-precision
  rejected.
- ☐ 🖥📱 Archive / restore plan; retired plan not offered for new sales but renewable per rules.

## E. Memberships
- ☐ 🖥 Memberships list + filters; 🔀📱 card list (status → remaining days → outstanding → member → plan).
- ☐ 🔀📱 **Sell membership** via FAB; date inputs usable on mobile (native picker acceptable).
- ☐ 🖥📱 Sell / renew / upgrade (deferred → Scheduled) / freeze / resume / cancel — each gated by
  status + permission; timeline updates.
- ☐ 🔀📱 Membership detail: multi-column → stacked; primary action in **Sticky Action Bar**.
- ☐ ♿ Status conveyed by badge (icon + label), never color alone; dates in `<time>`.

## F. Payments (on membership detail)
- ☐ 🖥📱 Billing shows price / paid / balance / standing (all mono); history in chronological order.
- ☐ 🔀📱 **Record payment** opens a **bottom sheet** form; amount = numeric keypad, ≥16px, `>0` guard.
- ☐ 🖥📱 Void a payment → appends a VOID entry (never edits); balance/standing re-derive; double-void
  blocked.
- ☐ ♿ Void confirm reachable by keyboard; amounts announced with currency.

## G. Notifications
- ☐ 🖥📱 Open Notifications → expiry alerts generate (on-open); unread grouped first.
- ☐ 🔀📱 From the TopBar bell → NotificationCenter opens as a **sheet**; unread badge count correct.
- ☐ 🖥📱 Mark read → Dismissed; dismissed not resurrected on re-generate.
- ☐ ♿ Unread state in text/aria (not color-only); `<time>` for dates; `aria-live` on new items.

## H. Reports (Owner)
- ☐ 🖥 Revenue (today/week/month/custom), Memberships, Outstanding, Expiring reports render.
- ☐ 🔀📱 StatCards stack (operational feed); report tables → **card lists**; revenue custom-range →
  **bottom sheet** form.
- ☐ 🖥📱 Non-owner (deny path) → Forbidden state, no data leak.
- ☐ ♿ Any chart/summary has a text/table alternative; numbers mono-tabular.

## I. Staff (Owner)
- ☐ 🖥 Staff list (name/role/status/last login); 🔀📱 card list; 🔀📱 **Add staff** via FAB.
- ☐ 🖥📱 Create staff (temp password), suspend (REVOKED) / reactivate, change role; self-lockout guard
  blocks suspending/role-changing own account.
- ☐ 🖥📱 Suspending a trainer clears their open member assignments (INV-36).
- ☐ ♿ Suspend confirm reachable by keyboard; status by badge.

## J. Settings & Profile
- ☐ 🖥📱 Gym settings (name/currency/timezone) + branch edit; save persists; validation errors inline.
- ☐ 🖥📱 Profile edit; 🔀📱 **Sticky Action Bar** Save; inputs ≥16px.

## K. Global shell, navigation, adaptive & a11y (cross-cutting)
- ☐ 🖥 Persistent rail ≥lg; active item shows 3px brand accent-bar + `aria-current`.
- ☐ 📱 Drawer <lg: opens from TopBar, traps focus, closes on Esc/scrim, returns focus to toggle.
- ☐ ♿ Skip link is the first focusable element; banner/nav/main landmarks present.
- ☐ ♿ Every page: exactly one `<h1>`; visible focus ring on all interactives; keyboard-only operable.
- ☐ ♿ Reduced-motion: sheets/skeletons have static fallback; forced-colors preserves focus/borders.
- ☐ 🔀📱 FAB and Sticky Action Bar **never coexist**; neither overlaps content/last row; safe-area
  respected (no collision with home indicator).
- ☐ 🔀📱 Every desktop row/section action is reachable on mobile (adaptive-parity — no lost capability).
- ☐ 🖥📱 404 / not-found (in-shell EmptyState) and error boundary render correctly with recovery.
- ☐ 🖥📱 Loading skeleton shows on navigation; no layout shift into content.
- ☐ 🖥📱 Reflow verified at 375 / 768 / 1280 (no horizontal overflow except intended table scroll).
- ☐ ♿ Contrast AA on light **and** dark for text/badges/borders on each screen.
- ☐ 🖥📱 Tenant isolation spot-check: a cross-gym/unknown id → 404 (not another gym's data).

## L. Cross-browser / device matrix (Beta minimum)
- ☐ Desktop: Chromium + one of Firefox/Safari (≥1280).
- ☐ Mobile: iOS Safari **and** Android Chrome (real devices or emulators) at 375–414 width.
- ☐ Dark mode on at least one desktop + one mobile pass.

---

**Exit:** all non-🔀 rows must pass for Beta on **desktop**; the 🔀 rows are verified after the v1.2
implementation slice for Beta on **mobile** (see [Beta UX Readiness](./beta-ux-readiness-report.md)).
