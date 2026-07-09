# Design Review — Mobile Navigation Drawer (visual clarity & usability pass)

**Date:** 2026-07-02 · **Reviewer:** Claude (Senior Product Designer pass) · **Branch:** `feat/platform-foundation`
**Scope:** the off-canvas drawer (<lg): `AppShell` → `ui/sheet.tsx` (`side="left"`, Radix Dialog) → `Sidebar` → `NavGroups`/`NavItem`. Nav definitions: `app/(app)/layout.tsx#buildNavGroups`.
**Out of scope (by instruction):** information architecture, routes, labels, grouping, permission gating, new tokens, bespoke components.

Evidence: measured WCAG ratios (script, WCAG 2.x relative-luminance formula), before/after screenshots at 375×800 (light + dark) in `assets/mobile-nav-drawer/`, and px measurements from the shipped classes.

---

## 1. Measured contrast — as-designed token pairs

Rail roles: `--rail-bg` = ink-900 `#111418` (light) / ink-850 `#14181D` (dark); `--rail-fg` = ink-300 `#9AA3B2`; `--rail-fg-active` = brand-400 `#D6FB4D`; `--rail-surface` = ink-800 `#181C22` (light) / ink-700 `#222831` (dark).

| Theme | Pair | Use | Ratio | Requirement | Verdict |
|---|---|---|---|---|---|
| light | rail-fg on rail-bg | inactive item text + icons, eyebrows | **7.26:1** | 4.5:1 | PASS |
| light | rail-fg on rail-surface | hover item text | **6.72:1** | 4.5:1 | PASS |
| light | rail-fg-active on rail-surface | active item text + icon | **14.47:1** | 4.5:1 | PASS |
| light | rail-fg-active on rail-bg | 3px accent bar (non-text) | **15.62:1** | 3:1 | PASS |
| light | brand-500 on rail-bg | brand mark (decorative) | **14.38:1** | 3:1 | PASS |
| light | rail-surface on rail-bg | hover/active surface delta (non-text) | **1.08:1** | 3:1* | **FAIL*** |
| dark | rail-fg on rail-bg | inactive item text + icons, eyebrows | **7.01:1** | 4.5:1 | PASS |
| dark | rail-fg on rail-surface | hover item text | **5.83:1** | 4.5:1 | PASS |
| dark | rail-fg-active on rail-surface | active item text + icon | **12.55:1** | 4.5:1 | PASS |
| dark | rail-fg-active on rail-bg | 3px accent bar (non-text) | **15.08:1** | 3:1 | PASS |
| dark | rail-surface on rail-bg | hover/active surface delta (non-text) | **1.20:1** | 3:1* | **FAIL*** |

\* WCAG 1.4.11 does not strictly require hover feedback to hit 3:1, and the **active** state is not conveyed by the surface alone (accent bar 15.6:1 + brand text 14.5:1 + `aria-current`). Kept as a graded finding (F4), not a compliance failure.

## 2. Measured contrast — the scrim defect's effective values (before fix)

`ui/sheet.tsx` rendered the shared overlay at `--z-scrim` (1300) while the **left panel sat at `--z-drawer` (1200)** — the 0.6-opacity rail-colored scrim composited **on top of the drawer's own surface**. Effective (composited) ratios of what users actually saw with the drawer open:

| Theme | Pair | As-designed | Under scrim | Requirement | Verdict |
|---|---|---|---|---|---|
| light | inactive item text | 7.26:1 | **2.17:1** | 4.5:1 | **FAIL** |
| light | active item text | 14.47:1 | **3.30:1** | 4.5:1 | **FAIL** |
| light | accent bar | 15.62:1 | 3.39:1 | 3:1 | pass (barely) |
| dark | inactive item text | 7.01:1 | **2.19:1** | 4.5:1 | **FAIL** |
| dark | active item text | 12.55:1 | **3.20:1** | 4.5:1 | **FAIL** |
| dark | accent bar | 15.08:1 | 3.41:1 | 3:1 | pass (barely) |

The before-screenshots show it plainly: the volt brand mark and active item render as murky olive (effective `#60702d`), and the drawer is as dim as the page it covers — figure-ground separation is destroyed exactly when the user is trying to read the nav.

---

## 3. Per-criterion review

### C1 — Visual hierarchy
Brand block (64px `--topbar-h` row: volt mark + neutral "PULSE" wordmark at `text-h3` semibold) → active item (bar + volt) → items → eyebrows. The eye lands on the brand, then snaps to the active item — correct order. **One defect:** the brand row uses `px-5` (20px) while every other rail element sits on a 24px left line (`px-3` container + `px-3` item ⇒ icons and eyebrows at 24px). The 4px off-grid brand mark breaks the single optical left edge (**F3**, minor). Otherwise sound; masked entirely by the scrim defect (**F1**) until fixed.

### C2 — Contrast
All as-designed text/icon pairs pass AA with room to spare in both themes (tables above) — the rail roles are well chosen. The failures in practice came from **F1** (every pair degraded below AA while the drawer was open) and the near-invisible `rail-surface` delta (**F4**). The eyebrow's `text-rail-fg` override of `.eyebrow`'s muted color is **necessary and correct**: `--muted-foreground` (ink-500) on the rail would be **2.30:1** — the override is the only AA-passing option among existing tokens.

### C3 — Readability
Item labels are `text-body` (14px/20px) — adequate at drawer distance for 1-word labels; the 16px mobile-input rule (§5.10) applies to inputs, not nav. Eyebrows are 12px uppercase +.08em tracking — legible at 7.26:1/7.01:1. Truncation: labels get `truncate` with ~180px available (260px − paddings − icon − gaps); the longest label "Notifications" measures well under it — no truncation occurs, and the guard is correct for future labels. PASS (once F1 is fixed).

### C4 — Icon visibility
Lucide at `size-5` (20px = `--icon-md`) in rail-fg: 7.26:1 (light) / 7.01:1 (dark), far above the 3:1 non-text minimum; 20px at ~1.5px stroke is comfortably resolvable at arm's length; active icons inherit 14.5:1 volt. PASS. (Under F1 they measured 2.17:1 — another reason the fix is mandatory.)

### C5 — Active vs inactive states
Active = 3px accent bar (15.6:1) + volt text (14.5:1) + raised surface + `aria-current="page"` — unmistakable, redundant across three visual channels plus semantics; never two active at once (`isActive` prefix match). Hover is structurally distinct from active (no bar, no volt) — good — but hover feedback itself is nearly invisible: the surface delta measures **1.08:1 light / 1.20:1 dark** (**F4**). Irrelevant on the touch drawer (no hover), real on the shared desktop rail — see the proposal; not silently changed here because the remedy is a token-value change.

### C6 — Section separation
`gap-6` (24px) between groups vs 4px within groups (mobile: 8px after F2), plus eyebrow labels — a 3–6× spacing ratio; the three clusters read clearly as groups in the screenshots. PASS. **Doc nit:** Catalog §2 NavGroup says "Group spacing `1rem`" while shipped code uses 24px; the shipped value is the better separator — flagged for a catalog wording fix (proposal P2), not silently changed in either direction.

### C7 — Thumb ergonomics
**Finding F2:** items were `py-2` + 20px line-height = **36px targets with 4px gaps** — below the v1.2 §5.4 rule ("≥ `--control-h` 44px effective target; spacing between adjacent targets ≥ 8px"). Fixed to 44px targets / 8px gaps **below lg only**. The taller list still fits 375×800 without scrolling (measured total ≈ 680px < 736px available). Drawer width `--sidebar-w` 260px on a 375px viewport leaves a 115px scrim strip — an easy dismiss target and enough page context to preserve place. Top items (Dashboard) sit high — inherent to a top-anchored drawer and out of scope (IA); the drawer's own trigger is thumb-reachable and §5.7 keeps the drawer model deliberately.

### C8 — Perceived navigation confidence
Where am I: active item is triple-coded + `aria-current`; drawer auto-closes on route change (`app-shell.tsx` pathname effect) so the destination is revealed immediately after a tap; focus returns to the toggle (e2e-verified). What will tapping do: icon + 1–2-word noun labels, no placeholders left (Payments removed in `c5ed3d6`). Dismissal: Esc + scrim tap (115px strip) — standard, though there is no visible close affordance (observation O1; adding one is a catalog change, not taken). Before the fix, confidence was undermined by the drawer reading as *behind* the dimming layer (F1); after, the panel pops above the scrim as intended. PASS after F1.

---

## 4. Findings & rulings

| # | Severity | Finding (evidence) | Ruling |
|---|---|---|---|
| **F1** | **Critical** | Left drawer panel at `--z-drawer` (1200) below the shared overlay at `--z-scrim` (1300): the 0.6 scrim dims the drawer itself; all drawer text drops below AA (2.17–3.30:1 measured); figure-ground destroyed (screenshots). The v1.2 adaptive side already solved this deliberately with `--z-modal` above the scrim. | **Fix (in scope):** left panel `z-(--z-drawer)` → `z-(--z-modal)`, mirroring the adaptive side's documented decision. Existing token, one line, only consumer is AppShell. Follow-up **P1** on the token-scale ordering. |
| **F2** | High | Drawer nav items 36px tall with 4px gaps vs v1.2 §5.4 (≥44px targets, ≥8px spacing). | **Fix (in scope):** `py-3 lg:py-2` on NavItem, `gap-2 lg:gap-1` on NavGroup — 44px/8px in the drawer, desktop rail byte-identical. |
| **F3** | Minor | Brand row `px-5` (20px) breaks the rail's 24px optical left line (icons/eyebrows at 24px). | **Fix (in scope):** `px-5` → `px-6` in `sidebar.tsx`. Also aligns the rail (improvement, same direction). |
| **F4** | Medium | `--rail-surface` vs `--rail-bg` measures 1.08:1 (light) / 1.20:1 (dark) — hover feedback essentially invisible; active unaffected (bar + volt carry it). | **Proposal only (token value = design-tokens authority):** see P3. Not applied. |

### Observations (no change)
- **O1** — No visible close button; Esc + scrim-tap + auto-close-on-navigate cover dismissal (Radix contract, e2e-verified). Adding an X is a catalog change; not warranted.
- **O2** — Eyebrow color override (`text-rail-fg`) is load-bearing for AA (muted-fg would be 2.30:1). Do not "clean it up".
- **O3** — Drawer has no slide-in motion; motion polish is outside a visual-clarity pass.

### Proposals (human decision required — not applied)
- **P1 (token docs):** the z-scale orders `--z-drawer` (1200) *below* `--z-scrim` (1300), which makes `--z-drawer` unusable for any scrimmed panel — both Sheet sides now sit at `--z-modal`. Recommend design-tokens.md either re-orders drawer above scrim or documents that scrimmed surfaces use `--z-modal`.
- **P2 (catalog wording):** NavGroup §6 "Group spacing `1rem`" vs shipped 24px (`gap-6`) — recommend the catalog adopt the shipped 24px, which is doing the section-separation work well (C6).
- **P3 (token value):** if hover feedback on the desktop rail should be perceptible, raise light `--rail-surface` ink-800 → ink-600 (surface delta 1.08→**1.53:1**; hover text 4.75:1 AA-pass; active text still 10.22:1) and dark ink-700 → ink-600 (1.20→**1.48:1**). Values measured; trade-off (flatter "stealth" rail aesthetic vs feedback) is a design call.

---

## 5. Traceability — finding → change

| Finding | File | Change | Desktop-rail impact |
|---|---|---|---|
| F1 | `apps/web/src/components/ui/sheet.tsx` | left side: `z-(--z-drawer)` → `z-(--z-modal)`; comment updated | None — rail never renders inside Sheet; drawer is `lg:hidden` |
| F2 | `apps/web/src/components/pulse/nav.tsx` | NavItem `py-2` → `py-3 lg:py-2`; NavGroups group `gap-1` → `gap-2 lg:gap-1` | None — `lg:` restores exact current values ≥lg |
| F3 | `apps/web/src/components/pulse/sidebar.tsx` | brand row `px-5` → `px-6` | Rail brand block aligns to the same 24px line (intended improvement) |
| F1 guard | `apps/web/e2e/shell.spec.ts` | new test: open drawer at 375px, axe scan scoped to the dialog, light + dark | n/a |

Verification: full gate (type-check · lint+fitness · build · unit · e2e incl. shell.spec drawer focus/Esc/focus-return and adaptive.spec) — results in §6 below.

## 6. Gate results (2026-07-02, after fixes)

| Gate | Result |
|---|---|
| type-check | PASS (9/9 tasks) |
| lint + fitness | PASS (fitness token-compliance clean — R-3 scan includes the changed files) |
| build | PASS |
| unit | **178/178 PASS** |
| e2e | **38/38 PASS** — shell.spec drawer focus/Esc/focus-return green; adaptive.spec green; **+1 new test**: open-drawer axe scan at 375px, light + dark, scoped to the dialog (guards F1) |

After-screenshots (`assets/mobile-nav-drawer/after-*.png`) show the drawer above the scrim at design-intent contrast in both themes, 44px rows, and the brand mark on the shared left line.

### Out-of-scope discoveries surfaced during the gate (member module — human decision)
- **G1 (fixed, test-infra):** `adaptive.spec.ts` "register a member" used a **fixed phone** (`01000000000`); phone is partial-unique per gym (INV-3), so the suite was one-shot per database — the second-ever full run failed. Fixed in the spec: contact + name are now unique per run. Not a design finding; recorded here because the drawer gate exposed it.
- **G2 (NOT fixed — product bug, outside this review's scope):** creating a member with a duplicate phone **crashes to the route error boundary** (P2002 propagated from `members/service.ts#createMember`, observed digest 549902199) instead of returning the documented INV-3 inline field error ("Another member already uses this phone number."). `contactConflict()` exists but did not intercept the error in the running app, and **no test covers this mapping** (the message string appears nowhere in any suite). Needs its own slice: reproduce, fix the mapping, add the missing regression test (testing-standards: every input boundary has validation tests).
