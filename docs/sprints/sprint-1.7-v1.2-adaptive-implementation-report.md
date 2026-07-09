# Sprint 1.7 — PULSE v1.2 Adaptive Mobile · Implementation & Verification Report

**Date:** 2026-07-02 · **Branch:** `feat/platform-foundation` · **Author:** Claude Terminal
**Companion documents:**
[Operational UX Review](./operational-ux-review-v1.2-adaptive-mobile.md) (the review that gates every change here) ·
[design-system-v1.2](../design/design-system-v1.2.md) (design authority) ·
[catalog §12](../design/pulse-component-catalog.md) ·
[adaptive-design-report](../design/v1.2-adaptive/adaptive-design-report.md) (**the per-screen mobile
hierarchy documentation** — its P0/P1/P2 matrix is what this slice implemented) ·
[design-debt-report](../design/v1.2-adaptive/design-debt-report.md) (DD register).

> **What shipped.** The human-approved v1.2 Adaptive implementation slice — the before-Beta DD
> subset, exactly as pre-scoped: **DD-1** (DataTable card mode), **DD-2** (≥16px mobile inputs),
> **DD-3** (Creation FAB + Sticky Mobile Action Bar), **DD-4** (safe-area tokens +
> `viewport-fit=cover`), **DD-5 filter slice** (FilterSheet on the four list toolbars), **DD-8
> urgent slice** (dashboard KPIs lead with Expiring/Expired), **DD-9** (operational-first member +
> membership detail), **DD-10** (module-page + adaptive e2e-axe — closes RC **TD-7**), **DD-11**
> (Payments nav placeholder removed — closes RC **TD-15**).
> **No business rule, schema, domain, permission, service, engine, or architecture change.**
> Presentation only; adaptive boundary = `md`; deferred patterns (bottom tabs, swipe) not built.

---

## 1. What was built (traceability: every change → a review finding)

### New catalog components (§12, now implemented)
| Component | File | Spec |
|---|---|---|
| AdaptiveBottomSheet | `components/pulse/adaptive-bottom-sheet.tsx` (+ `ui/sheet.tsx` gains an `adaptive` side: bottom sheet `<md`, centered dialog `≥md`) | §12.1 — built on the existing Radix sheet; Esc/scrim/close-button/drag-down dismiss; focus trap + return inherited |
| FilterSheet | `components/pulse/filter-sheet.tsx` | §12.5 / AP-3 — FilterBar's mobile form: "Filters (n)" trigger → sheet holding the *same* catalogued selects |
| CreationFAB | `components/pulse/creation-fab.tsx` | §12.2 — thumb-zone create, `<md` only, on the four create-list screens; `.fab-anchor` safe-area base style |
| StickyMobileActionBar | `components/pulse/sticky-mobile-action-bar.tsx` | §12.3 — in-flow sticky (never covers content); auto-applied to **every form** via FormLayout's action row; detail variant on member profile |
| DataTable card mode | `components/pulse/data-table.tsx` | §12.4 / AP-1 — opt-in `renderCard`/`cardMode`; same `columns[]`/`rows[]`, labeled `<ul>`; desktop table byte-identical for non-adopters |

### Tokens (design-tokens.md §25 + `packages/design-tokens/globals.css`, same change set)
`--safe-top/right/bottom/left`, `--fab-size`, `--fab-offset`, `--action-bar-h`, `--sheet-max-h`,
`--sheet-radius`, `--control-font-mobile`, `--z-fab` — all additive; no existing token changed.
`viewport-fit=cover` added via the root layout `viewport` export. Safe-area values are consumed
inside component base styles (`.fab-anchor`, `.actionbar-mobile`) per §5.8 — never as arbitrary
utilities.

### Screen changes
- **Lists (Members / Memberships / Plans / Staff):** operational-first cards `<md`
  (P0 status/remaining-days/price leading), FilterSheet, CreationFAB, inline primary + filters
  unchanged `≥md`. Report tables (`outstanding`/`memberships`/`expiring`) use the derived
  `cardMode` card.
- **Membership detail:** section order → Billing → Actions → Period → Plan → Payment history →
  Timeline (one DOM order, both presentations; desktop 2-col grid now leads with money —
  doctrine-compliant, no data/density change).
- **Member profile:** new P0 **membership-standing strip** (Active/Frozen/Scheduled/No-live chips +
  "View memberships" link) composed from the *already-public* `getMemberMembershipStanding`
  (new thin wrapper in `memberships/queries.ts`; **no service change**, `memberships.read`-gated);
  sections reordered (Trainer · Lifecycle → Contact → Details); Sell/Edit relocate to a sticky
  bar `<md`.
- **Dashboard:** KPI order leads with Expiring Soon · Expired (AP-2 urgent slice).
- **Inputs:** TextInput/SelectInput/TextArea/CurrencyInput render `--control-font-mobile` (16px)
  `<md` — no iOS focus-zoom; `text-body` `≥md` unchanged.
- **Nav:** "Payments" placeholder removed (DD-11/TD-15).

## 2. Verification (all green, 2026-07-02)

| Gate | Result |
|---|---|
| Type-check (`tsc --noEmit`) | ✅ clean |
| Lint + **all fitness rules** (incl. token-compliance, no-cross-context, graph clean) | ✅ 9/9 tasks |
| Build (`next build`, production) | ✅ |
| Unit tests | ✅ **178/178** |
| Integration (live-DB) | ✅ **94/94** |
| e2e existing suite (auth/shell/onboarding/gym-settings/smoke) | ✅ 21/21 |
| **e2e adaptive (new `e2e/adaptive.spec.ts`, DD-10)** | ✅ **16/16** |

**The adaptive e2e proves (at 375×800 and 1280×900):** axe-clean on `/members`, `/memberships`,
`/plans`, `/staff`, `/notifications`, `/reports`, `/reports/outstanding`, `/settings/gym` at
**both** viewports + dark-mode mobile (closes **TD-7**); the J-2 register-member journey
one-handed (FAB in the thumb zone → 16px inputs → pinned submit → profile with standing strip →
pinned Sell action); card-list↔table flip at `md` with **no horizontal scroll**; filter sheet
open/apply/Esc/focus-return + desktop inline parity; FAB desktop-hidden with exactly one create
primary; dashboard urgent-first KPI order; membership-detail Billing/Actions-first stack;
Payments absent from the drawer.

**A11y note:** the previously-flagged "dark StatCard eyebrow 4.47:1" lead **did not reproduce** —
recomputation of the pair (`ink-300` on `ink-800`) gives ≈6.7:1 and the dark-mode axe pass (which
includes color-contrast) is clean, so no token was changed (v1.2 preservation guarantee upheld).

**Mobile journey verification:** J-2 (register) runs end-to-end in e2e; J-1/J-4..J-8 path changes
are asserted structurally (card fields, section order, sticky placement). Tap/scroll accounting:
Operational UX Review Part II — headline: membership-detail money/lifecycle actions moved from
~4–4.5 viewport-heights deep to ≤1; zero taps added to any primary journey.

## 3. Before / after evidence
`docs/sprints/assets/v1.2-adaptive/` — mobile (375px): dashboard, members list, memberships list,
member form, member detail, membership detail; desktop (1280px): dashboard, members (proving the
desktop workflow is preserved). Before = pre-slice commit (`387ad97` state), after = this slice.
Highlights: members list table-sliver → operational card + FAB + Filters; membership detail
Billing 4 viewports deep → first section; member profile gains the standing strip + thumb-zone
actions.

## 4. Deliberately not in this slice (per authority / pending rulings)
After-Beta DD remainder: DD-6/DD-7 (confirm/toast normalization — human decision), DD-5 remainder
(picker/menu/record-payment/notification sheets), DD-8 full feed reorder, DD-12, DD-13. Deferred
patterns: bottom tabs, swipe actions (v1.2 §7 — not re-litigated). Awaiting human rulings
(surfaced in the review §14, untouched here): Member-Centric Workspace Phase-0; TD-18 resume-due
cue; outstanding-flag on list cards (needs a service change).

## 5. Definition of Done
Catalog components + tokens only (fitness-verified) · mutation pipeline untouched (no new
mutations; one read-wrapper over an existing public, permission-gated service read) · Zod
boundaries unchanged · P0 tests green · a11y gate re-passed **including the new adaptive
behaviors at mobile viewport** · responsive verified 375/768/1280 (e2e) · docs updated in the
same change set (design-system v1.2 status, catalog §12 status, design-tokens §22/§25, RC debt
register TD-7/TD-15, this report + the review) · **awaiting human acceptance at merge.**
