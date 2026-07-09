# Design Debt Report — PULSE v1.2

**Deliverable 4 of 6** · 2026-07-02 · companion to [`../design-system-v1.2.md`](../design-system-v1.2.md)

Design debt identified in the adaptive/UX review, classified **Critical / High / Medium / Low** with a
**before-Beta / after-Beta** recommendation. These are **design/UX** items — distinct from, but
cross-referenced to, the engineering debt in
[`../../releases/v1.0-rc-review/technical-debt-report.md`](../../releases/v1.0-rc-review/technical-debt-report.md)
(RC TD-N). **None requires business-logic, schema, or architecture change** — all are presentational
and additive.

> No **Critical** design debt exists: the product is accessible, tokenized, catalog-consistent, and
> desktop-usable today. The debt is that it is **responsive, not yet adaptive** — a mobile-ergonomics
> gap, not a broken experience.

## Register

| # | Item | Severity | Fix (spec ref) | Recommendation |
|---|---|---|---|---|
| **DD-1** | **DataTable has no mobile card mode** — primary entity lists (members/memberships/plans/staff + report/history tables) rely on horizontal scroll on phones. | **High** | Adaptive card mode, catalog §12.4 / AP-1 | **Before Beta** — core mobile readability. |
| **DD-2** | **iOS input focus-zoom** — 14px input font (<16px) auto-zooms on focus; jarring on every mobile form. | **High** | `--control-font-mobile` 16px, §5.10/§8 | **Before Beta** — affects all mobile data entry. |
| **DD-3** | **Primary action not in thumb zone** — PageHeader primary scrolls out of reach on long mobile forms/details. | **High** | Sticky Mobile Action Bar + Creation FAB, catalog §12.2–12.3 / AP-6 | **Before Beta** — biggest one-handed win. |
| **DD-4** | **No safe-area handling** — bottom-anchored patterns would collide with the home indicator/notch. | **Medium** | `--safe-*` tokens + `viewport-fit=cover`, §5.8/§8 | **Before Beta** — ships *with* the bottom patterns (DD-3). |
| **DD-5** | **Overlays not unified as adaptive sheets** — filters/pickers/menus are cramped inline popovers on mobile. | **Medium** | AdaptiveBottomSheet, catalog §12.1 / AP-3/4/7 | **Before Beta** for **filters** (highest-traffic); after-Beta for the rest. |
| **DD-6** | **ConfirmationDialog cataloged but not built** — destructive actions (archive member, void payment, cancel membership) use **bespoke inline confirm controls**; a catalog-vs-implementation inconsistency (each control is one-off). | **Medium** | Decide: build the catalog `ConfirmationDialog` **or** formally bless the inline-confirm pattern and reconcile the catalog (§Consistency below). | **After Beta** — works today; a consistency/normalization decision (constitution §11). |
| **DD-7** | **Toast cataloged but not built** — transient confirmations use inline FormFeedback only; no unified "Saved / Payment recorded", and no mobile bottom-toast pattern. | **Medium** | Build Toast (mobile = full-width bottom, safe-area aware). | **After Beta** — inline feedback is adequate for pilot. |
| **DD-8** | **Analytics grid not re-ordered to operational-first on mobile** — dashboard shows vanity counts before urgent lists. | **Medium** | Operational feed order, §6 / AP-2 | **Before Beta** for the *urgent* items (expiring/outstanding lead); after-Beta for full re-order. |
| **DD-9** | **Information hierarchy is source-ordered on some mobile stacks** — member/membership detail can surface contact before operational state. | **Medium** | Operational-first doctrine, §6 + adaptive-design-report | **Before Beta** for **member + membership detail** (the operational core); after-Beta elsewhere. |
| **DD-10** | **Module pages not independently a11y/mobile-scanned** (= RC **TD-7**). The adaptive behaviors must be axe-verified at mobile viewport. | **High** | Extend e2e + axe to module pages **and** the new adaptive behaviors, per design-system-v1.2 §9. | **Before Beta** — this is where the adaptive work gets verified; closes TD-7. |
| **DD-11** | **"Payments" nav placeholder misrepresents shipped payments** (= RC **TD-15**) — an IA/UX inconsistency. | **Low (cheap)** | Remove/repoint the nav item. | **Before Beta** — trivial, high trust value. |
| **DD-12** | **No first-field autofocus on create forms** (= RC **TD-16**). | **Low** | Deliberate a11y trade-off; optional. | **After Beta** — nice-to-have. |
| **DD-13** | **Density/rhythm not tuned per device** — desktop `--gutter` (2rem) vs mobile `--gutter-mobile` (1rem) exist, but card/list vertical rhythm and compact-density defaults for touch lists aren't specified. | **Low** | Apply catalog `compact` density + token spacing to mobile card lists (micro-UX). | **After Beta** — polish. |

## Product-consistency review (normalization)

Reviewed for the prompt's consistency dimensions; findings feed the register above:

- **Confirmation dialogs — INCONSISTENT (DD-6).** Destructive actions are confirmed by *different*
  bespoke inline controls (`member-archive-controls`, `void-payment-control`,
  `membership-lifecycle-controls`) rather than one `ConfirmationDialog`. **Normalize** to a single
  confirm pattern (build the dialog, or bless + catalog the inline pattern) — pick one, apply
  everywhere. *Decision required (§11).*
- **Transient feedback — INCONSISTENT (DD-7).** Some flows show inline success, none show a Toast;
  "what confirms success" varies. Normalize on one transient-feedback pattern.
- **Button ordering — CONSISTENT.** Cancel (secondary link) + Submit (primary) ordering holds across
  forms (verified in Sprint 1.5). Carry the same order into the Sticky Action Bar.
- **Action placement — will become CONSISTENT via AP-6.** Today the single primary is consistently in
  PageHeader; v1.2 relocates it consistently to FAB/Action Bar on mobile.
- **Icon usage / terminology / spacing — CONSISTENT** (tokens-only + catalog enforced; Sprint 1.5
  found no drift). No new normalization needed beyond the above.

## Summary

- **Before Beta (mobile-usability blockers):** DD-1, DD-2, DD-3, DD-4, DD-10, DD-11, plus the *urgent*
  slice of DD-5 (filters), DD-8 (urgent KPIs lead), DD-9 (member/membership detail order).
- **After Beta (polish/normalization):** DD-6, DD-7, DD-12, DD-13, and the remainder of DD-5/DD-8/DD-9.
- **No Critical items.** All debt is additive, presentational, and catalog-driven.
