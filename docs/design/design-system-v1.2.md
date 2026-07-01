# PULSE Design System — v1.2 (Adaptive)

### Additive extension of PULSE v1.1 · Gym Membership Management SaaS

| | |
|---|---|
| **Version** | **v1.2** (Minor — additive, backward-compatible per v1.1 §9) |
| **Status** | ✅ Specified — **design authority approved; implementation pending** (docs-first slice) |
| **Extends** | [`design-system-v1.1.md`](./design-system-v1.1.md) — **not** a replacement. v1.1 remains in full force; v1.2 layers the adaptive dimension on top. |
| **Companion files** | [`design-tokens.md`](./design-tokens.md) (registry — v1.2 proposes additive tokens in §8 here) · [`pulse-component-catalog.md`](./pulse-component-catalog.md) (§12 = v1.2 additions) · `globals.css` (implementation — updated in the approved implementation slice) |
| **Date** | 2026-07-02 |
| **Author** | Senior Product Designer / UX Architect / Design System Architect (Claude Terminal) |

> **What v1.2 is.** An **additive** minor version that makes PULSE **Adaptive-first**. It introduces
> Adaptive Presentation Rules, Mobile Interaction Guidelines, an Information-Hierarchy doctrine, and
> three new catalog patterns. It **preserves everything** in v1.1 — colors, tokens, typography, icons,
> visual identity, the accessibility gate, and every existing catalog component. Nothing is removed
> or renamed; every v1.1 usage remains valid.
>
> **What v1.2 is not.** It is **not** a rebrand, not a redesign, not a breaking change, and — in this
> docs-first slice — **not yet implemented in code.** No `globals.css`, React, or business logic is
> touched here. The React/token implementation follows in a separate, human-approved slice
> (Scope decision, 2026-07-02). This document + the catalog §12 + the six design reports are the
> approvable design authority for that slice.
>
> **Reference, never duplicate.** Token *values* live only in `design-tokens.md`; component *specs*
> live only in the Component Catalog; v1.1 principles live only in v1.1. This file adds the adaptive
> layer and points at those, it does not restate them.

---

## 1. The Adaptive-First Principle (the one idea)

PULSE is **no longer Desktop-first, and not Mobile-first either — it is Adaptive-first.**

> **Desktop and Mobile are both first-class experiences. The business logic is identical on every
> device; only the *presentation* adapts. Never sacrifice Desktop to improve Mobile; never sacrifice
> Mobile to preserve Desktop.**

Concretely, this principle binds every screen and component:

1. **Identical domain, identical data, identical permissions.** Adaptation is presentational only —
   the same server actions, the same `gymId` scoping, the same permission gates, the same derived
   values. A device never sees more or fewer capabilities; it sees them arranged for its ergonomics.
2. **Presentation adapts at a defined boundary.** The primary adaptive boundary is **`md` (48rem /
   768px)** — the same boundary the catalog already uses for the nav drawer and table reflow
   (design-tokens §20). Below `md` = the **compact/touch** presentation; `md`–`lg` = a **hybrid**
   (touch-friendly but multi-column); ≥`lg` = the **pointer/dense** presentation. Components may
   additionally refine at `sm`/`lg`/`xl`, but `md` is the contract.
3. **Neither experience is a degraded copy of the other.** Desktop keeps its density, multi-column
   detail, inline filters, and hover affordances. Mobile gets card lists, an operational feed,
   bottom-sheet overlays, thumb-reachable actions, and an operational-first information order — not a
   shrunken table.
4. **Adaptation is a catalog responsibility, never a screen hack.** A screen never hand-writes a
   mobile layout; it composes catalog components that carry their own adaptive behavior (§4, catalog
   §12). This keeps adaptation consistent and testable, exactly like tokens keep color consistent.

---

## 2. Preservation guarantee (what v1.2 must not change)

Per v1.1 §9 (Minor = additive, backward-compatible), v1.2 **preserves without exception**:

- **Colors & brand** — the Volt/Ink identity, the `--brand-*` white-label seam, all semantic/viz
  scales (design-tokens §1–3). No new brand color, no identity change.
- **Tokens** — every existing token keeps its name and value. v1.2 only **adds** tokens (§8), never
  edits or removes one.
- **Typography** — the three families, the `text-*` scale, weights 400/500/600 (design-tokens §4–9).
- **Icons** — Lucide, existing size tokens (design-tokens §23).
- **Accessibility gate** — v1.1 §7 holds in full, and v1.2 **strengthens** it with adaptive-parity
  requirements (§5.11): every capability reachable on desktop must be reachable on mobile, and every
  new pattern re-passes the §7 gate (touch target, focus, reduced-motion, forced-colors, keyboard).
- **Component Catalog** — every existing component and its contract is unchanged. v1.2 adds three
  components and one **backward-compatible** enhancement to DataTable (an opt-in mobile card mode;
  existing tables keep working untouched).

**If any proposed v1.2 detail would violate a preservation guarantee, it is dropped, not shipped.**

---

## 3. Terminology

| Term | Meaning |
|---|---|
| **Adaptive** | The presentation *changes form* across the boundary (table → card list), not just resizes. Supersedes "responsive" as the PULSE default posture. |
| **Compact presentation** | The `< md` touch/one-handed form of a component or screen. |
| **Dense presentation** | The `≥ lg` pointer/multi-column form. |
| **Operational-first order** | The mobile information ordering that puts the highest-value operational facts first (§6). |
| **Thumb zone** | The bottom ~⅓ of a phone screen, comfortably reachable one-handed; where primary mobile actions live (§5.1). |

---

## 4. Adaptive Presentation Rules (per major component)

Each rule states the **Desktop (≥md)** form, the **Mobile (<md)** form, and the binding constraint.
Full component specs are in Catalog §12; this is the system-level contract.

| # | Component / region | Desktop (≥ md) | Mobile (< md) | Binding rule |
|---|---|---|---|---|
| **AP-1** | Entity list (`DataTable`) | Dense table (priority columns + horizontal-scroll backstop, unchanged) | **Card list** — one card per row, showing the operational-first fields (§6) | Same `columns[]` source drives both; the card projection is derived from column priority + an optional `renderCard`. No second data path. Catalog §12.4. |
| **AP-2** | Analytics band (`KPIGrid` + StatCards) | Multi-column analytics grid (4→2 auto-fit) | **Operational feed** — a single prioritized column: the *most operationally urgent* KPIs and lists first (Expiring/Expired/Outstanding before vanity totals) | KPIGrid already reflows 4→2→1 (catalog §KPIGrid); v1.2 fixes the *order* to operational-first, not source order. §6. |
| **AP-3** | List filters (`FilterBar`) | Inline filter controls + active-filter chips | **Bottom-sheet filters** — a "Filters" trigger (with active-count badge) opens an Adaptive Bottom Sheet holding the controls; chips remain visible above results | Catalog already specifies FilterBar "collapses into a popover with a count badge under md" — v1.2 makes that overlay the **Adaptive Bottom Sheet** (§5.6, catalog §12.1). |
| **AP-4** | Overlay (`Dialog` / confirmations / pickers / `SelectInput`/`DateInput` menus) | Centered modal dialog / popover | **Adaptive Bottom Sheet** — bottom-anchored, thumb-reachable, drag-or-scrim to dismiss | The catalog already says ActionMenu/SelectInput/DateInput/NotificationCenter "become a sheet on mobile"; v1.2 unifies these under one **AdaptiveBottomSheet** primitive built on the existing `ui/sheet.tsx`. Catalog §12.1. |
| **AP-5** | Detail page (multi-panel: e.g. membership detail) | Multi-column layout (main + aside; billing beside history) | **Stacked sections** in operational-priority order, each section full-width | `ContentGrid sidebar-split` already "stacks aside below main" (catalog §ContentGrid). v1.2 mandates the *stack order* follow §6, and long detail pages carry a Sticky Mobile Action Bar (§5.3). |
| **AP-6** | Primary page action (`PageHeader` primary) | Inline primary Button in the header cluster | **Sticky Mobile Action Bar** (form/detail primary) **or** **Creation FAB** (list-screen "create") — in the thumb zone | Exactly one primary per screen (catalog §PageHeader). On mobile it relocates to the thumb zone: a FAB for "create new X" on list screens, a Sticky Action Bar for form submit / detail primary. §5.2–5.3, catalog §12.2–12.3. |
| **AP-7** | Section actions / row overflow (`ActionMenu`) | Kebab popover | **Bottom sheet** of actions (Adaptive Bottom Sheet, list variant) | Catalog §ActionMenu §9 already allows this; v1.2 formalizes it to the same sheet primitive. |
| **AP-8** | Global navigation (`Sidebar`) | Persistent left rail (≥lg) | Off-canvas drawer (existing `ui/sheet.tsx`), toggled from TopBar | **Unchanged from v1.1** (catalog §AppShell/§Sidebar). A mobile **bottom-tab** alternative was **considered and deferred** (§7). |

**Non-negotiable:** an adaptive transform may never drop a capability. If a desktop table exposes an
action, the mobile card must expose the same action (in its ActionMenu/sheet). Adaptive-parity is an
accessibility requirement (§5.11).

---

## 5. Mobile Interaction Guidelines (official)

These are binding rules for the `< md` presentation. They inherit — never override — the v1.1 §7
accessibility gate.

### 5.1 Thumb reach
Primary and frequent actions live in the **thumb zone** (bottom ~⅓ of the viewport): the Sticky
Mobile Action Bar (§5.3), the Creation FAB (§5.2), and bottom sheets (§5.6) are all bottom-anchored
for this reason. Destructive actions are never the default-focused control in the thumb zone (they
sit behind a confirm step). Top-anchored controls are reserved for navigation/context (TopBar), not
primary operations.

### 5.2 Creation FAB (scoped)
A single **Floating Action Button** offers the screen's *create* action **only on list/index screens
whose primary job is to create a new entity** (Members → Add Member, Memberships → Sell Membership,
Plans → New Plan, Staff → Add Staff). Scope rules:
- **One FAB per screen, mobile-only** (`< md`); on desktop the action stays the inline PageHeader
  primary. The FAB is a *relocation* of that single primary, never an additional action.
- **Never** on detail pages, forms, dashboards, reports, settings, or read-only screens (those use a
  Sticky Action Bar or inline actions).
- Bottom-trailing, above the safe-area inset (§5.8), sized `--fab-size` (§8), and it must not overlap
  the last list row (list gets bottom padding) or a Sticky Action Bar (the two never coexist on one
  screen). Catalog §12.2.

### 5.3 Sticky bottom actions (Sticky Mobile Action Bar) — *new v1.2 pattern*
The primary pattern for **form submit/cancel** and **detail-page primary actions** on mobile: a
bottom-pinned bar, within thumb reach, respecting the safe-area inset. It **replaces** relying on a
scrolled-away header button on long forms/details.
- Holds one primary + at most one secondary (overflow → ActionMenu/sheet).
- Chosen over a **bottom tab bar** for this gym-ops product: operators complete *task flows*
  (record a payment, sell a membership, archive a member) far more than they hop between top-level
  sections, so a per-screen action bar earns the thumb zone better than persistent tabs (§7).
- Catalog §12.3.

### 5.4 Touch targets
All interactive controls keep a **≥ `--control-h` (2.75rem / 44px) effective target** (v1.1 §7 /
2.5.8 — already satisfied by the input/button tokens). Adaptive card rows, sheet items, FAB, and
action-bar buttons all meet this. Spacing between adjacent targets ≥ `gap-2` (8px) to prevent mis-taps.

### 5.5 Floating actions — justification bar
A floating element (FAB) is allowed **only** where §5.2 permits. No floating "scroll to top", floating
chat, or decorative floats. If a floating control isn't the screen's single create action, it doesn't float.

### 5.6 Bottom sheets (Adaptive Bottom Sheet) — *new v1.2 pattern*
The mobile form of every centered overlay (AP-3/4/7). Built on the existing `ui/sheet.tsx` Radix
Dialog (already powering the nav drawer), bottom-anchored, with a drag handle, scrim, focus trap, and
focus-return — inheriting the v1.1 overlay a11y. Max height `--sheet-max-h` (§8); content scrolls
within; the sheet respects the safe-area inset. On desktop the *same* logical component renders as a
centered dialog/popover. Catalog §12.1.

### 5.7 Mobile navigation
**Unchanged:** the off-canvas drawer (v1.1). It never disappears, traps focus while open, returns
focus to the toggle on close (e2e-verified). A bottom-tab model is **deferred** (§7).

### 5.8 Safe areas
Bottom-anchored elements (FAB, Sticky Action Bar, Bottom Sheet, Toast) **must** honor the device
safe-area insets (notches, home indicators). v1.2 adds `--safe-*` tokens (§8) applied inside those
components' base styles in `globals.css`, plus `viewport-fit=cover` in the viewport meta. Safe-area
insets are applied within components — **never** as arbitrary Tailwind values (token-compliance
fitness forbids `[...]`).

### 5.9 One-handed usage
Every core operational flow must be completable one-handed on a phone: reachable primary action
(thumb zone), no essential control in a top corner, no hover-only affordance, no precision drag
required (drag-to-dismiss always has a tap/scrim fallback). The Manual Testing Checklist gates this
per flow.

### 5.10 Keyboard behavior (on-screen)
- **Input mode matters:** money → numeric keypad (CurrencyInput already specifies `inputmode`);
  phone → tel; email → email; search → search. Confirmed present in the catalog inputs.
- **No focus-zoom (iOS):** input font-size must be **≥ 16px on mobile** or iOS Safari auto-zooms on
  focus. The base body token is 14px, so v1.2 requires the input controls to render at ≥ 1rem (16px)
  on `< md` via a `--control-font-mobile` token (§8) — a targeted enhancement, not a global type
  change. (Flagged in the Design Debt Report as a real current issue.)
- The Sticky Action Bar must remain reachable when the on-screen keyboard is open (it sits above the
  keyboard or yields to it; never covers the focused field).

### 5.11 Adaptive-parity (accessibility)
A capability available in one presentation must be available in the other. No desktop-only or
mobile-only action. Every new pattern (sheet, FAB, action bar) re-passes the v1.1 §7 gate: solid 2px
focus ring, keyboard operability, Esc-to-dismiss, reduced-motion fallback, forced-colors survivable,
labeled controls. Adaptive transforms preserve DOM/reading order.

---

## 6. Information-Hierarchy Doctrine (operational-first)

Adaptation is **not** resizing — it is **re-prioritization**. On mobile, the most operationally
valuable facts appear **first**; identity/contact/secondary metadata follow. This doctrine assigns
every screen's data to priority tiers, and the mobile presentation renders **P0 before P1 before P2**.

**Priority tiers:**
- **P0 — Operational state & money** (what a gym operator acts on): membership status, outstanding
  balance, membership remaining days, payment standing, expiry alerts.
- **P1 — Identity & primary relationships:** member name, plan, assigned trainer, join/period dates.
- **P2 — Secondary metadata:** email, phone, address, IDs, timestamps, audit fields.

**The canonical example (member):**

> Membership Status · Outstanding Balance · Remaining Days *(P0)* →
> Name · Plan · Trainer *(P1)* →
> Email · Address · secondary metadata *(P2)*

Every screen's operational-first order is specified in the **Adaptive Design Report** (per-screen
matrix). Desktop may show all tiers at once (space permits); mobile renders them top-to-bottom in
this order. This ordering also governs AP-1 (which fields a card surfaces) and AP-2 (which KPIs/lists
lead the operational feed).

---

## 7. New patterns adopted, and patterns deferred

**Adopted in v1.2** (full specs → Catalog §12):
1. **Adaptive Bottom Sheet** (§5.6, AP-3/4/7) — built on existing `ui/sheet.tsx`.
2. **Creation FAB**, scoped to creation entry points only (§5.2, AP-6).
3. **Sticky Mobile Action Bar** (§5.3, AP-6) — the primary mobile action pattern for forms/details.

**Considered and deferred** (documented, *not* adopted — require a future approved slice):
- **Mobile bottom-tab bar.** Deferred in favor of the drawer + Sticky Action Bar. Rationale: this is
  a task-flow ops tool (record/sell/renew/archive), not a browse-heavy consumer app; persistent tabs
  would spend the thumb zone on navigation the drawer already covers, and would compete with the
  Sticky Action Bar for the same real estate. Revisit if usage shows heavy top-level section-hopping.
- **Swipe actions on cards.** Deferred. Rationale: gesture affordances are discoverability- and
  a11y-risky (need a visible non-gesture fallback anyway), and the ActionMenu-in-sheet (AP-7) already
  gives every row action a thumb-reachable, accessible home. Revisit post-Beta if row-action friction
  is measured.

These deferrals are design decisions, recorded so a future session does not re-litigate them.

---

## 8. Proposed additive tokens (for the implementation slice)

v1.2 requires the following **new** tokens. They are **additive** (no existing token changes). They
are specified here and will be added to `design-tokens.md` **and** `globals.css` **in the same
change** during the approved implementation slice (per v1.1 §9 / catalog Rule E) — not in this
docs-only pass, so the registry and CSS never drift.

| Proposed token | Value | Purpose |
|---|---|---|
| `--safe-top` / `--safe-right` / `--safe-bottom` / `--safe-left` | `env(safe-area-inset-*, 0px)` | Device safe-area insets for bottom-anchored elements (§5.8). Applied inside component base styles, not as utilities. |
| `--fab-size` | `3.5rem` (56px) | Creation FAB diameter (≥ touch target). |
| `--fab-offset` | `1rem` | FAB inset from screen edges (above `--safe-bottom`). |
| `--action-bar-h` | `4rem` (64px) | Sticky Mobile Action Bar height (+ `--safe-bottom` padding). |
| `--sheet-max-h` | `90dvh` | Adaptive Bottom Sheet max height (dynamic viewport unit for mobile browser chrome). |
| `--sheet-radius` | `= --radius-lg` (top corners only) | Bottom-sheet top-corner rounding (reuses existing radius scale). |
| `--control-font-mobile` | `1rem` (16px) | Input control font-size on `< md` to prevent iOS focus-zoom (§5.10). |
| `--z-fab` | `1150` | FAB stacking (between `--z-sticky` 1100 and `--z-drawer` 1200); FAB and Sticky Action Bar are mutually exclusive per screen. |

Motion reuses the **existing** `--duration-slow` (320ms, already named for "sheets") + `--ease-emphasized`
for sheet entrance; the Sticky Action Bar and FAB use `--duration-fast`. No new motion tokens needed.

---

## 9. Versioning & change control

- **This is a Minor bump: PULSE v1.1 → v1.2.** Additive and backward-compatible; both documents are
  **in force** (v1.1 for everything it covers; v1.2 for the adaptive layer). v1.2 supersedes nothing.
- **Source-of-truth boundaries hold:** adaptive principles/rules → *this file*; new/added token
  values → *design-tokens.md* (in the impl slice); component specs → *Component Catalog §12*. A fact
  lives in one place.
- **The accessibility gate is unchanged and extended** — v1.1 §7 in full, plus §5.11 adaptive-parity.
  Any weakening remains a **Major**, human-approved change.
- **Implementation is a separate approved slice.** When it lands, it updates `design-tokens.md` +
  `globals.css` + the catalog code + the module UIs **in one change set**, re-runs the full gate
  (type-check · lint + all fitness · format · build · unit · integration · **e2e + axe extended to
  the adaptive behaviors and the module pages** — closing RC-review TD-7), and only then are the new
  patterns "built."

---

## 10. Quick-reference doctrine (pin this, alongside v1.1 §10)

> **PULSE v1.2 — Adaptive-first. Desktop & Mobile are both first-class; identical business logic,
> adaptive presentation; never sacrifice one for the other. Boundary = `md`. Tables → card lists;
> analytics grid → operational feed; inline filters & dialogs → bottom sheets; multi-column details →
> stacked operational-first sections; primary action → thumb-zone (Creation FAB on create-list
> screens, Sticky Mobile Action Bar on forms/details). Operational-first order: status · outstanding
> · remaining-days before name/plan/trainer before email/address/metadata. Honor safe areas & thumb
> reach; ≥44px targets; ≥16px input font on mobile; adaptive-parity (no device-only capability).
> Everything v1.1 (colors, tokens, type, icons, identity, a11y, catalog) is preserved. Bottom-tab &
> swipe were considered and deferred. If a pattern isn't in the catalog, STOP and request it.**

---

*End of PULSE Design System v1.2. Additive extension of v1.1; amendments follow v1.1 §9. Implementation
is the next, human-approved slice.*
