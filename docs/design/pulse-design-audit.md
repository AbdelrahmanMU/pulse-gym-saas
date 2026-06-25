# PULSE Design System — Critical Audit Report
### Principal Product Designer / Design System Auditor · v1 review

> Mandate: find what's broken, not justify what exists. Severity is assigned from a production-SaaS bar, not an MVP-mockup bar. Contrast figures below are **computed from the actual token hex values**, not taken from the spec's self-assessment — several of the spec's "passes contrast" claims are false.

---

## Methodology note
I verified color claims numerically (WCAG 2.x relative luminance). The system's own statement that "volt-on-ink and ink-on-volt both pass" is true, but the spec is silent on or wrong about the combinations that actually ship in components (status text on tints, volt-as-text, the required-dot). Those are where the failures concentrate.

---

## 1. Visual Identity

**1.1 — Single-accent system has no room for data. — Severity: High**
The entire identity rests on one signal color (volt) plus four status hues. There is no secondary brand color and no categorical palette. The moment a chart needs 5+ series, a multi-branch comparison, or a report with grouped data, there is nothing to draw with. *Why it's a problem:* a gym SaaS is a reporting/analytics product; an identity that can't express multivariate data is incomplete, not minimal. *Fix:* define a 6–8 color **categorical data-viz palette** (colorblind-safe, e.g. an Okabe-Ito-derived set tuned to the ink base), plus sequential and diverging ramps, as first-class tokens — separate from brand/status.

**1.2 — "Volt-lime" is a crowded, dated signifier. — Severity: Low**
Nike Volt, countless fitness/energy-drink brands, and 2018-era "tech startup lime" all occupy this space. The claim of being "the opposite of generic" is overstated; volt-on-charcoal is itself a recognizable trend. *Fix:* accept it as a competent choice, but stop marketing it as uniquely distinctive; differentiation should come from the interaction signatures (left-bar, mono numerals), which are genuinely stronger than the hue.

**1.3 — Volt-as-text is unusable. — Severity: High**
`--accent-text: volt-600 (#9CC400)` is defined "for links/accents on light surfaces." Measured contrast of #9CC400 on white is **~2.0:1** — it fails WCAG AA (4.5:1) by a wide margin. Any link or accent text using this token is effectively unreadable for a large share of users. *Fix:* do not use volt as text on light. For links, use `foreground` with a volt underline/indicator, or a darkened volt (around #6E8A00, ~4.5:1) reserved strictly for text — but verify, don't assume.

---

## 2. Accessibility

**2.1 — Everything is sized in `px`; user zoom / large-text is ignored. — Severity: High**
Type, spacing, radii, component heights — all hardcoded px. Users who set a larger browser/OS font size or rely on text zoom get no scaling. This violates the spirit of WCAG 1.4.4 (Resize Text) and harms low-vision and older users (a core gym demographic — front-desk staff and owners are not all 25). *Why it's a problem:* it's a system-wide accessibility regression baked into the foundation. *Fix:* convert type and key spacing to `rem`; keep hairlines/borders in px. This also fixes the Tailwind-mismatch in §12.

**2.2 — Status badge text fails contrast across the board. — Severity: Critical**
Badges render the **solid status color as text on its own tint**, at 11px uppercase. Measured on the light tints:
- Success `#1FB880` on `#E7F8F1` → **~2.4:1** (fail)
- Warning `#F5A524` on `#FEF3E2` → **~1.9:1** (fail)
- Info `#2BA8E0` on `#E6F4FC` → **~2.4:1** (fail)
- Danger `#F04438` on `#FEEAE8` → **~3.4:1** (fail for normal text)

Every membership/payment status label — the most-scanned data in the product — is below AA, and it's tiny uppercase, compounding it. *Fix:* darken the badge text role to a dedicated `*-text` token per status (≥4.5:1 on its tint), or invert to solid-fill badges with white/ink text where contrast allows. Re-measure all four.

**2.3 — Required fields signaled only by a low-contrast volt dot. — Severity: High**
"Volt dot, not a red asterisk" looks nice but (a) volt on white is ~2:1, so the indicator is nearly invisible, and (b) it conveys "required" by color alone with no text/`aria-required`. Fails WCAG 1.4.1 (Use of Color) and 1.3.1. *Fix:* pair a visible glyph (`*` or "Required") with `aria-required="true"`; if keeping the dot, give it a shape/label and an accessible-contrast color.

**2.4 — Focus indicator is fragile and sometimes invisible. — Severity: High**
The focus state is a volt box-shadow at **35% opacity** and `:focus-visible` *replaces* `outline` with that shadow. Problems: (a) ~35% volt may not meet the 3:1 non-text-contrast bar (WCAG 2.4.11/2.4.13) on light surfaces; (b) **a volt button focused with a volt glow has no visible focus**; (c) cards already carry box-shadow, so the focus shadow blends in. *Fix:* use a solid 2px focus ring with offset (`outline` + `outline-offset`) at full-strength volt, plus an ink contrast halo on volt-colored controls so focus is visible regardless of background.

**2.5 — No `prefers-reduced-motion`, no `prefers-contrast` handling. — Severity: Medium**
Row-slide bars, hover transitions, button translate-on-press — none respect reduced-motion. *Fix:* gate transitions behind `@media (prefers-reduced-motion: no-preference)`.

**2.6 — Small uppercase as a structural type style. — Severity: Medium**
11px UPPERCASE + `.08em` tracking is used for eyebrows *and* table headers — i.e., load-bearing labels, not just decoration. Uppercase reduces word-shape legibility and 11px is below comfortable for older users. *Fix:* raise to 12px, reserve uppercase for true eyebrows; let table headers be sentence-case 12–13px medium.

---

## 3. Dashboard Usability

**3.1 — Delta colors hardcode "down = bad." — Severity: Medium**
`.delta--up` is green, `.delta--down` is red. For churn, refunds, overdue, or cancellations, *down is good and up is bad.* The system will routinely color good news red. *Fix:* separate **direction** (arrow) from **sentiment** (color); pass sentiment explicitly per metric.

**3.2 — KPI grid is hardcoded to 4. — Severity: Medium**
`repeat(4,1fr)`. Five or seven KPIs break the rhythm; owners will want configurable dashboards in a SaaS. *Fix:* auto-fit grid with a min track width so any count flows.

**3.3 — Empty / loading / error states are promised but absent. — Severity: Medium**
The spec mandates "loading and empty states are required," but no tokens, skeleton, or error patterns exist in the system. AI will improvise them inconsistently. *Fix:* define skeleton, empty-state, and inline-error patterns as named components.

**3.4 — "Volt scarcity" is a vibe, not a control. — Severity: Low (but compounding)**
The rule "use volt rarely" is unenforceable and will erode as features are added by an AI that pattern-matches "accent = volt." *Fix:* encode intent in token names (`--accent-action`, `--accent-active`) so volt's role is explicit at call sites, making overuse visible in review.

---

## 4. Forms UX

**4.1 — One input class for input/select/textarea is a latent bug. — Severity: High**
`.pulse-input` fixes `height:44px`. Applied to a `<textarea>` this fights multi-line growth; applied to a `<select>` there's no chevron affordance. *Fix:* split into `.pulse-input`, `.pulse-textarea` (min-height, auto-grow), `.pulse-select` (chevron, padding for it).

**4.2 — Whole categories of controls are undefined. — Severity: High**
No checkbox, radio, switch, date/time picker, combobox, file upload, or multi-select styling. A membership/payments app is *built* from these (plan pickers, date ranges, paid/unpaid toggles). *Fix:* extend the system to the full control inventory before build, or the AI will hand-roll each one differently.

**4.3 — No disabled/loading button state. — Severity: Medium**
Only inputs have a disabled style. Buttons (the things that submit money operations) have no disabled or in-flight/spinner state, inviting double-submits. *Fix:* add `disabled` and `is-loading` states to `.pulse-btn`.

**4.4 — Single-column-only at 560px hurts dense entry. — Severity: Medium**
A full member profile in one 560px column becomes a long scroll. *Fix:* allow a responsive two-column form region for short related fields.

---

## 5. Tables UX

**5.1 — No responsive strategy; tables die on small screens. — Severity: High**
There is no horizontal-scroll container, no priority-column hiding, and no card-fallback. A wide members/payments table on a phone or narrow tablet is unusable. *Fix:* define a responsive table pattern (scroll container + sticky first column, or a stacked card layout under a breakpoint).

**5.2 — Missing core data-grid affordances. — Severity: High**
No sort indicators, pagination, row-selection checkbox, bulk-action bar, or column resize. These are table stakes for member/payment lists. *Fix:* specify them as part of the table component, not per-feature.

**5.3 — Hover bar via `td:first-child` inset shadow is brittle. — Severity: Medium**
The signature row left-bar is painted on the first cell's inset shadow. Add a sticky first column, a checkbox column, or RTL, and it lands in the wrong place or disappears. *Fix:* render the accent bar via a row-level pseudo-element or a dedicated leading indicator cell.

**5.4 — Hover-only "you are here" excludes keyboard/touch. — Severity: Medium**
The left-bar shows on `:hover` only; there's no `:focus-within`/selected-by-keyboard equivalent, and touch has no hover. *Fix:* drive the bar from focus and selection state, not hover alone.

**5.5 — 52px default rows trade away density. — Severity: Low**
Gym member lists run to thousands of rows; tall rows mean more scrolling and fewer rows per screen. *Fix:* make compact (44px) the default for data tables; reserve 52px for low-volume lists.

---

## 6. Mobile Experience

**6.1 — The sidebar simply vanishes on mobile with no replacement nav. — Severity: Critical**
At ≤640px, `.pulse-shell` collapses to a single column and the 260px `.pulse-sidebar` has no off-canvas/drawer/bottom-nav fallback defined. Primary navigation disappears. For a "mobile-responsive web app (no native app)" MVP, this breaks the core promise. *Fix:* specify a mobile nav pattern (hamburger drawer or bottom tab bar) as part of the shell, with the brand rail as its expanded state.

**6.2 — Topbar overflow at small widths. — Severity: Medium**
Page title (`display-lg`, 32px) + search + bell + user menu in a 64px bar will overflow narrow screens. *Fix:* define collapse rules (icon-only search, truncated title) per breakpoint.

**6.3 — px sizing blocks mobile zoom comfort. — Severity: High (see 2.1)**
Cross-listed: fixed px type means pinch/zoom and OS large-text don't reflow gracefully on phones.

---

## 7. Dark Mode

**7.1 — Sidebar barely separates from content in dark mode. — Severity: High**
Sidebar is `ink-900 (#111418)` "in both themes," but dark background is `ink-950 (#0B0D10)` with `ink-800` borders. The rail, the canvas, and the divider are three near-identical near-blacks; the primary navigation loses its edge and reads as one flat void. *Fix:* in dark mode, lift the sidebar (e.g., to ink-850/ink-800) or give the canvas more separation, and strengthen the divider.

**7.2 — Elevation collapses in dark mode. — Severity: Medium**
Cards rely on shadow for hierarchy, but shadows are nearly invisible on near-black. The system leans on 1px borders alone, flattening the UI. *Fix:* use surface-lightness steps (raised surfaces get lighter) as the dark-mode elevation language, not shadows.

**7.3 — Full-saturation volt on near-black halates. — Severity: Low**
`#C2F500` at full chroma on `#0B0D10` vibrates, especially in large fills, causing eye strain. *Fix:* a slightly desaturated/dimmed volt for large dark-mode surfaces; keep full volt for small accents.

**7.4 — `color-mix` selected-row with no fallback. — Severity: Low**
Older engines ignore it, dropping the selection tint silently. *Fix:* provide a precomputed fallback token.

---

## 8. Future SaaS Scalability

**8.1 — No white-label / per-tenant theming layer. — Severity: High**
The product vision (and ADR) promise per-tenant branding for multi-gym. But volt is hardcoded as *the* identity with no tenant-overridable brand-token seam. When gym B wants its own color, the system can't express it without a refactor. *Why it's a problem:* it directly contradicts the stated SaaS direction. *Fix:* introduce a thin `--brand-*` indirection that defaults to volt but can be overridden per tenant at the theme root, keeping status/neutral tokens fixed.

**8.2 — Global `.pulse-*` utility classes don't scale cleanly. — Severity: Medium**
A growing surface of hand-authored global classes invites collisions, dead styles, and divergence from the component library. *Fix:* bind tokens to the component layer (shadcn variants / CVA) so styling scales with components, not a flat global sheet.

**8.3 — No enterprise density mode. — Severity: Medium**
Larger gyms/chains will want denser layouts; the system has only one spacing density. *Fix:* a density token set (comfortable/compact) at the layout level.

---

## 9. Multi-Branch Management Screens

**9.1 — No branch-context or scope-indicator pattern. — Severity: High**
There is no visual language for "which branch am I acting on," no persistent scope indicator, and no cross-branch differentiation. Given the tenancy model, a user editing the wrong branch's data is both a UX failure and a data-safety risk that the design should actively prevent. *Fix:* design a persistent, high-visibility branch-context chip in the topbar, plus a clear "all branches vs this branch" scope toggle, with confirmation when acting cross-branch.

**9.2 — Navigation has no hierarchy for gym → branch. — Severity: Medium**
The sidebar pattern is flat; multi-branch implies nested scope and switching. *Fix:* define a switcher + scoped-section nav pattern now so it isn't bolted on later.

---

## 10. Reporting Screens

**10.1 — No data-visualization system at all. — Severity: Critical**
"Ink grid + volt series line" is the entire charting guidance. Real reports need multi-series categorical colors, positive/negative financial encoding, sequential/diverging scales, axis/label/tooltip type tokens, and legends. None exist. A reporting feature cannot be built coherently from this. *Fix:* deliver a full data-viz token spec (categorical, sequential, diverging, semantic finance) with type and grid rules, colorblind-verified.

**10.2 — No report-table semantics (totals, subtotals, fixed columns, export). — Severity: Medium**
Reporting tables differ from list tables. *Fix:* extend the table system with summary rows, frozen columns, and an export affordance.

**10.3 — No print/PDF styles. — Severity: Low**
Owners will print/export financial reports; the dark rail and screen colors print poorly. *Fix:* a print stylesheet (light, ink-on-white, no rail).

---

## 11. Long-Term Maintainability

**11.1 — Typography is defined twice. — Severity: Medium**
The metric style exists both as `.t-metric` and inline in `.pulse-stat-card .value`; badge/eyebrow rules are also re-stated per component. Two sources of truth drift apart. *Fix:* single set of type utilities composed into components; never re-declare.

**11.2 — The "3px accent bar" is a magic number scattered everywhere. — Severity: Medium**
The signature bar width is hardcoded as `3px` in cards, rows, nav, and a `calc(... + 3px)`. Changing it means hunting literals. *Fix:* `--accent-bar-width` token used everywhere.

**11.3 — Components reach past roles to raw tokens. — Severity: Medium**
The sidebar hardcodes `--ink-900/800/300` instead of semantic roles, so it won't follow theme/white-label changes and breaks the "consume roles, not raw tokens" rule the system itself sets. *Fix:* add sidebar-specific role tokens (`--rail-bg`, `--rail-fg`, `--rail-active`).

**11.4 — No documented state matrix per component. — Severity: Medium**
States (default/hover/focus/active/disabled/loading/error/selected) are partial and uneven across components. *Fix:* a states matrix every component must satisfy.

**11.5 — Two class prefixes and a px/rem split increase cognitive load. — Severity: Low**
`.t-*` plus `.pulse-*`, px type beside any Tailwind rem utilities. *Fix:* unify naming and units.

---

## 12. AI-Assisted Development Compatibility

**12.1 — Tokens aren't exposed as Tailwind utilities — actively inviting the forbidden hardcoding. — Severity: High**
There's no `@theme`/config mapping, so `bg-volt-500`, `text-foreground`, `gap-6` (as design tokens) don't exist as utilities. An AI reaching for them will fail, then fall back to hardcoded hex/px — exactly what the ADR forbids. The system makes the wrong thing the path of least resistance. *Fix:* expose every token through Tailwind (v4 `@theme` or v3 config) so utilities are the natural call.

**12.2 — A parallel `.pulse-*` system competes with shadcn conventions the model knows. — Severity: High**
The ADR says "restyle shadcn by composition," but the deliverable is a parallel set of hand-authored classes. An AI will mix `<Button variant="default">` with `.pulse-btn--primary` inconsistently across features. *Fix:* commit to one — drive shadcn variants from tokens — rather than maintaining two button systems.

**12.3 — No machine-readable token source. — Severity: Medium**
Tokens live only in CSS. An AI can't import a typed `tokens.ts`/JSON to reason about or reuse values; it re-derives them from CSS text, raising error and token cost. *Fix:* a single typed token module generated/shared with the CSS.

**12.4 — px type collides with Tailwind's rem scale. — Severity: Medium (see 2.1/11.5)**
Mixing `.t-body` (14px) with `text-sm` (0.875rem) yields subtly inconsistent sizing the AI won't reconcile. *Fix:* rem + one scale.

---

# Summary

## Strengths
- **Genuinely distinctive interaction signatures** — the volt left-bar for active/selected, mono tabular numerals for all data, and tracked eyebrows are memorable and on-theme, and they differentiate more than the hue does.
- **Strong token discipline as an intention** — clear separation of raw tokens vs semantic roles, a coherent 4px spacing system, and a deliberate (non-uniform) radius rhythm.
- **Cohesive, confident identity** with a clear point of view; the "athletic operations / control panel" concept is legible and appropriate to the domain.
- **First-class dark mode intent** and sensible neutral ramp construction.
- **Good touch-target defaults** (44px) and a documented type scale.

## Weaknesses
- **Multiple, concrete WCAG failures in the most-used elements**: status badges (all four), volt-as-text, the required-dot, and a fragile/invisible focus state. The system's own contrast claims don't hold.
- **px-everywhere foundation** breaks user zoom/large-text and fights Tailwind — a system-wide accessibility and AI-compat regression.
- **Whole categories missing**: data-visualization, responsive tables, mobile navigation, the full form-control inventory, and empty/loading/error states.
- **Mobile primary navigation disappears** — breaks the core "responsive web, no native app" promise.
- **No tenant theming seam and no categorical palette** — directly at odds with the multi-gym/reporting SaaS roadmap.
- **AI-compatibility is undermined by its own structure**: tokens aren't utilities, and a parallel `.pulse-*` system competes with shadcn — encouraging the hardcoding the ADR bans.
- **Maintainability erosion**: duplicated type rules, magic `3px`, raw-token reach-throughs, incomplete state coverage.

## Recommended Improvements (priority order)
1. **Fix contrast now** — dedicated accessible text tokens for status badges, links, and required indicators; re-measure every pair. *(Critical)*
2. **Re-architect the focus state** — solid offset ring at full strength, visible on volt controls and in both themes. *(High)*
3. **Add a mobile navigation pattern** and a responsive table strategy. *(Critical/High)*
4. **Convert type/spacing to rem and expose all tokens as Tailwind utilities**; retire or token-bind `.pulse-*` so there's one styling path. *(High — fixes accessibility + AI-compat together)*
5. **Add a data-visualization token system** (categorical/sequential/diverging + finance semantics, colorblind-verified). *(Critical for reporting)*
6. **Introduce a `--brand-*` theming seam** for per-tenant white-label, defaulting to volt. *(High)*
7. **Complete the component inventory** — full form controls, button disabled/loading, empty/skeleton/error, branch-context indicator. *(High)*
8. **Decouple delta sentiment from direction**; make the KPI grid count-agnostic. *(Medium)*
9. **Clean maintainability debt** — single type source, `--accent-bar-width`, rail role tokens, a documented state matrix. *(Medium)*

## Final Design Readiness Score: **61 / 100**

**Rationale.** This is a strong *identity* and a promising *token foundation* — easily top-quartile on personality and concept. But "design system readiness" is measured by whether teams (and an AI) can build an accessible, scalable SaaS on it without inventing the missing 40%. Against that bar it has **two Critical issues** (status-badge contrast, absent data-viz; plus a Critical-level mobile-nav gap), **a cluster of High issues** that hit accessibility, mobile, theming, and AI-compatibility, and **entire screen categories undefined** (reporting, multi-branch context, full forms, responsive tables). The accessibility failures alone would block a compliance sign-off today.

- Identity & concept: ~85/100
- Token architecture: ~70/100
- Accessibility: ~45/100
- Coverage/completeness for this product: ~50/100
- SaaS scalability & theming: ~50/100
- AI-development fit: ~55/100

**Verdict:** Not production-ready as-is, but not far off. It's a **v1 identity, not yet a v1 system.** Closing the Critical/High items — contrast, focus, mobile nav, rem+utilities, data-viz, and a theming seam — would credibly move it into the low-80s and make it safe to build the gym SaaS on.
