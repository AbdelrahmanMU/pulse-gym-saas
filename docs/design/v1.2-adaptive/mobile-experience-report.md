# Mobile Experience Report — PULSE v1.2

**Deliverable 2 of 6** · 2026-07-02 · companion to [`../design-system-v1.2.md`](../design-system-v1.2.md)

Assessment of the mobile experience across the interaction dimensions in the prompt, stating for each
the **current state** (what ships today) and the **v1.2 target** (what the adaptive spec mandates).

> **Method:** the *shell* mobile behavior (drawer, landmarks, focus-return, reflow at 375/768/1280) is
> **e2e-verified** (Playwright, RC-review). The *module-page* mobile behavior is assessed by **code +
> catalog inspection** — the standing TD-7 gap — and is the primary thing the implementation slice
> must build and axe-verify at mobile viewport.

## 1. Navigation (thumb reach & one-hand)
- **Current:** off-canvas drawer <lg, toggled from the TopBar (top-left). Never disappears; focus
  trapped; returns focus on Esc (e2e-verified). Nav is reachable but the **toggle is top-anchored**.
- **Target:** keep the drawer (§5.7). Primary *operations* move to the thumb zone via FAB / Sticky
  Action Bar (§5.2–5.3), so one-handed use no longer depends on reaching the top. Bottom-tab
  **deferred** (§7).
- **Verdict:** navigation is sound; the gap is *action* reach, not *nav* reach.

## 2. Touch targets
- **Current:** buttons/inputs use `--control-h` (2.75rem / 44px) — **already meets** WCAG 2.5.8.
- **Target:** unchanged; extend the same target to new controls (FAB, sheet items, action-bar buttons)
  and enforce ≥`gap-2` between adjacent targets (§5.4).
- **Verdict:** ✅ already compliant; carry it into the new patterns.

## 3. Primary actions in the thumb zone
- **Current:** the single primary lives in the PageHeader (**top of page**) — on a long mobile form or
  the dense membership-detail page it scrolls out of reach.
- **Target:** **Creation FAB** on the four create-list screens; **Sticky Mobile Action Bar** on every
  form and the two detail pages (§5.2–5.3, AP-6). Exactly one primary; safe-area aware.
- **Verdict:** the single biggest mobile ergonomics win in v1.2. **Design Debt DD-3.**

## 4. Overlays (filters, pickers, confirmations)
- **Current:** filters are inline/popover; Select/Date pickers are inline; confirmations are inline
  controls. On a phone these are cramped and not thumb-anchored.
- **Target:** all become **Adaptive Bottom Sheets** (§5.6, AP-3/4/7) built on the existing
  `ui/sheet.tsx` — bottom-anchored, drag/scrim dismiss, focus-trapped, safe-area aware.
- **Verdict:** unify overlays onto one primitive. **Design Debt DD-5.**

## 5. Forms & keyboard (micro-UX)
- **Current:** forms are accessible-by-construction (FormField/SubmitButton/Zod), but two mobile
  frictions exist: (a) **iOS focus-zoom** — 14px input font < 16px triggers auto-zoom on focus; (b)
  the submit button (PageHeader/inline) is not pinned, so on a long form the user scrolls to submit.
- **Target:** inputs render **≥16px on mobile** via `--control-font-mobile` (§5.10); submit pinned in
  the **Sticky Action Bar** above the keyboard; numeric/tel/email `inputmode` (CurrencyInput already
  specifies numeric keypad). Autofocus of the first field remains deliberately off (RC TD-16).
- **Verdict:** two concrete fixes. **Design Debt DD-2 (zoom), DD-3 (pinned submit).**

## 6. Safe areas & one-handed usage
- **Current:** no safe-area handling (no bottom-anchored elements exist yet, so no collision today).
- **Target:** once FAB/Action Bar/Sheet/Toast are bottom-anchored, they **must** honor `--safe-*`
  insets + `viewport-fit=cover` (§5.8). One-handed completion of every core flow is gated by the
  Manual Testing Checklist.
- **Verdict:** must ship **with** the bottom-anchored patterns. **Design Debt DD-4.**

## 7. Data density on mobile (tables)
- **Current:** DataTable uses **column-priority drop + horizontal scroll** (`data-table.tsx`) — no
  card mode. The primary entity lists (members/memberships/payments/staff) are cramped / require
  sideways scroll on a phone.
- **Target:** **adaptive card mode** (AP-1, catalog §12.4) — one operational-first card per row,
  backward-compatible and opt-in. Row actions → ActionMenu-in-sheet.
- **Verdict:** the core mobile *readability* win. **Design Debt DD-1.**

## 8. Perceived performance & feedback
- **Current:** route-group `loading.tsx` skeleton gives navigation feedback (Sprint 1.5). Transient
  success uses inline FormFeedback; there is **no Toast** and **no unified ConfirmationDialog**
  (destructive actions use bespoke inline confirm controls).
- **Target:** keep skeletons; consider **Toast** for transient confirmations (mobile = full-width
  bottom, safe-area aware) and reconcile the **ConfirmationDialog vs inline-confirm** inconsistency
  (§Consistency in design-debt). Motion reuses existing tokens; reduced-motion honored.
- **Verdict:** feedback works but is inconsistent. **Design Debt DD-6 (confirm), DD-7 (toast).**

## Mobile scorecard (current → after before-Beta subset)

| Dimension | Current | After before-Beta impl |
|---|---:|---:|
| Navigation (reach) | 8 | 9 |
| Touch targets | 9 | 9 |
| Primary-action reach | 5 | 9 |
| Overlays (sheets) | 5 | 9 |
| Forms & keyboard | 6 | 9 |
| Safe areas | 6* | 9 |
| Table readability | 5 | 9 |
| Feedback consistency | 6 | 8 |

\*No collision *today* only because no bottom-anchored element exists yet; drops the moment they do
without the tokens.

**Bottom line:** the mobile *foundation* (nav, targets, a11y primitives, skeletons) is solid; the
mobile *ergonomics* (thumb-zone actions, card lists, sheets, input-zoom, safe areas) are the gap
v1.2 closes. None requires business-logic or architecture change — all are presentational, additive,
catalog-driven.
