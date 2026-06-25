# PULSE Design System — v1.1
### The consolidated visual authority for the Gym Membership Management SaaS

| | |
|---|---|
| **Version** | **v1.1** |
| **Status** | ✅ Accepted — Official design authority |
| **Date** | 2026-06-25 |
| **Supersedes** | **PULSE Design System v1**, **Component Catalog v1**, **PULSE Design Audit** — all folded in here |
| **Companion files** | `/docs/design/design-tokens.md` (token registry) · `globals.css` (implementation) · Component Catalog (now reissued under v1.1 governance) |
| **Audience** | Human maintainers **and** Claude Terminal (primary developer) |

> **This document is the single source of truth for visual decisions.** Where any earlier artifact disagrees, v1.1 wins. The audit's findings and the Component Catalog's improvements are now canonical here — the older `design-system.md` and the original `globals.css` are **obsolete and must not be referenced.** When a request would violate this system, refuse and cite the section.

---

## 1. What v1.1 Is and Why It Exists

v1 shipped a strong identity but, per the **Design Audit**, carried concrete WCAG failures and missing patterns. The **Component Catalog** then silently adopted fixes, leaving the token files out of sync. v1.1 **reconciles all four artifacts into one coherent system** so there is exactly one truth across Design System ↔ Component Catalog ↔ CSS Tokens ↔ future React components.

This document is intentionally **non-duplicative**: token values live only in `design-tokens.md`/`globals.css`; component specs live only in the Component Catalog. Here we define **principles, the resolved decisions, accessibility, integration strategy, and governance**.

---

## 2. Identity (unchanged from v1)

**Concept: "Athletic Operations."** A precision control panel for running a gym — cool charcoal **Ink** + an electric **Volt** brand signal. Three signature moves persist and are now enforced by tokens/components:
1. **Tabular mono numerals** (JetBrains Mono) for every user-read number.
2. **The 3px brand left accent-bar** (`--border-accent`) marking active / selected / featured.
3. **UPPERCASE tracked eyebrows** for section labels and table headers.

What changed is **not** the identity — it's correctness, accessibility, completeness, and AI-friendliness.

---

## 3. Reconciliation Ledger — every inconsistency and its resolution

| # | Conflict (v1 vs audit/catalog) | Resolution in v1.1 (canonical) |
|---|---|---|
| 1 | Status text = solid-on-tint (failed ~1.9–3.4:1) | **Dedicated `*-text` tokens**, verified ≥4.5:1 on tint; dark mode uses translucent tint + solid text. |
| 2 | `accent-text` = volt-600 on white (~2:1) | **`--accent-text` = `brand-700` (#5E7000)** on light, `brand-400` on dark; **volt is never readable text.** |
| 3 | Required field = volt dot, color-only | **Visible glyph + text + `aria-required`**; never color alone. |
| 4 | Focus = 35% volt glow (weak/invisible on volt) | **Solid 2px ring + 2px offset**, visible in both themes and on brand fills. Focus is no longer a shadow. |
| 5 | All sizing in `px` (breaks zoom, fights Tailwind) | **rem everywhere**; type/radii/sizes rem-based; spacing = Tailwind's native 4px scale. |
| 6 | Tokens not exposed as utilities → invited hardcoding | **All tokens mapped via `@theme`** → `bg-surface`, `text-success-text`, `rounded-md`, etc. |
| 7 | Parallel `.pulse-*` classes competing with shadcn | **Retired.** Tokens drive shadcn variants; one styling path. Signature behaviors live in components, not a parallel sheet. |
| 8 | KPI grid hardcoded to 4 | **`KPIGrid auto`** (auto-fit, count-agnostic). |
| 9 | Delta hardcoded down=red | **Sentiment decoupled from direction** (StatCard `sentiment` prop). |
| 10 | Mobile sidebar vanished | **AppShell mobile drawer**; nav never disappears. |
| 11 | DataTable no mobile/sort/select | **Responsive (scroll/stacked), sort, selection, pagination** are part of the one canonical DataTable. |
| 12 | Row accent via first-cell shadow (brittle) | **Row-level indicator**, driven by hover **and** focus/selected. |
| 13 | One `.pulse-input` for input/select/textarea | **Distinct TextInput / SelectInput (chevron) / TextArea (min-height)**. |
| 14 | No data-viz palette | **Colorblind-safe `--viz-1…8`** added, separate from brand/status. |
| 15 | No tenant theming seam | **`--brand-*` seam**; tenants override 4 values to rebrand. |
| 16 | Dark sidebar = ink-900 on ink-950 (no separation) | **Rail roles**; dark rail **lifted** (`ink-850`) + stronger divider. |
| 17 | Dark elevation via invisible shadows | **Surface-lightness elevation** in dark mode. |
| 18 | 11px uppercase structural labels | **Eyebrow raised to 12px**. |
| 19 | Type defined twice (utility + inline) | **Single source** — `text-*` scale only; no inline restatement. |
| 20 | Magic `3px` bar scattered | **`--border-accent` token**. |
| 21 | Components reached into raw `ink-*` | **Semantic + rail roles only.** |
| 22 | No reduced-motion / forced-colors handling | **Both implemented** in base layer. |

This ledger is the definition of "what changed." Nothing from v1 survives that contradicts a row above.

---

## 4. Token Architecture (summary; full registry in design-tokens.md)

**Two layers:** *Primitives* (raw `--brand-*`, `--ink-*`, status scales, viz, radius, motion, etc.) → never used directly. *Semantic roles* (`--background`, `--surface`, `--foreground`, `--primary`, `--border`, `--ring`, `--*-text`, rail roles) → consumed by components and remapped per theme. Tailwind `@theme inline` exposes everything as utilities.

**Hard rules:** consume roles/utilities, never primitives or literals; all sizing rem; status text via `*-text`; brand never readable text; spacing via native Tailwind scale; z-index/motion/opacity via tokens.

---

## 5. Tailwind v4 Integration Strategy

PULSE uses **Tailwind v4's CSS-first configuration** — there is **no `tailwind.config.js` for theme**. Everything is in `globals.css`:

1. **`@import "tailwindcss";`** loads the framework.
2. **`@custom-variant dark`** enables class-based dark mode (`.dark` on `<html>`).
3. **Primitives + semantic roles** are declared as CSS variables in `:root` (light) and `.dark` (overrides).
4. **`@theme inline { … }`** maps roles/scales into Tailwind's theme namespaces, which is what generates utilities:
   - `--color-*` → `bg-*`, `text-*`, `border-*`, `ring-*`, `fill-*` (e.g., `bg-surface`, `text-success-text`, `border-strong`).
   - `--text-*` (+ `--text-*--line-height`) → `text-h1`, `text-metric`, `text-eyebrow` (size **and** line-height).
   - `--radius-*` → `rounded-xs…lg`. `--font-*` → `font-display/sans/mono`.
   - `--ease-*` → `ease-standard/emphasized`. `--breakpoint-*` → responsive prefixes. `--container-*` → container sizing.
   - Because mappings use **`inline` + `var()`**, utilities automatically reflect light/dark without variant duplication.
5. **Spacing is NOT redefined** — Tailwind v4's native 4px (`0.25rem`) base already matches PULSE; use `p-*`, `gap-*`, `m-*` directly.

**Do not** add a config file to re-declare colors/spacing, **do not** use arbitrary values (`bg-[#…]`, `p-[15px]`, `z-[9999]`), and **do not** introduce plugins for things tokens already cover. That is the entire required configuration — nothing more.

---

## 6. Font Strategy (`next/font`)

Three families, loaded once in the root layout via `next/font/google`, exposed as the CSS variables `globals.css` expects. Self-hosted, no layout shift, `display: swap`, latin subset, only the weights in use (400/500/600).

| Variable | Font | Loaded weights | Used for |
|---|---|---|---|
| `--font-display` | **Space Grotesk** | 500, 600 | Headings, page/section titles, stat numbers, eyebrows |
| `--font-sans` | **Inter** | 400, 500, 600 | All UI/body, tables, forms, paragraphs (default `<body>`) |
| `--font-mono` | **JetBrains Mono** | 500, 600 | Money, counts, IDs, data dates — always `tabular-nums` |

**Integration contract (no code here, but the binding rules):**
- Each font is instantiated with a `variable` (`--font-display`, `--font-sans`, `--font-mono`) and the three `variable` classes are applied to `<html>` so the variables cascade.
- `globals.css` already references these variables in `@theme` and `body`/`h*` — the layout only needs to **provide** them.
- **Where each is applied:** body inherits `--font-sans`; `h1–h4` use `--font-display`; the `.tabular` helper and `text-metric`/`text-num` tokens use `--font-mono`. Components never name a font directly — they use `font-display/sans/mono` utilities or inherit.

**Do** keep weights minimal and subset to latin. **Don't** add new families, weights, or `@import` web fonts in CSS.

---

## 7. Accessibility — verified compliance (WCAG 2.2 AA)

This section is a **gate**, not a guideline. v1.1 ships only because each item below holds.

- **Contrast (1.4.3 / 1.4.11).** Body/`muted-foreground` text ≥4.5:1 on its surface (light & dark). All status badge text uses `*-text` tokens **verified ≥4.5:1** on their tints (success #0E7A52, warning #92400E, danger #B42318, info #155E8B on their light tints; solid colors on dark translucent tints ≥4.5:1). Brand is **never** used as readable text. Borders/icons that carry meaning meet ≥3:1.
- **Use of color (1.4.1).** Color is never the sole signal: statuses carry icon + label; deltas carry arrows + text; required fields carry a glyph + text; the viz palette pairs with markers/labels.
- **Resize / reflow (1.4.4 / 1.4.10).** All type and sizing are rem; content reflows to a single column by `sm`; no fixed-px layouts; honors 200% zoom and OS large-text.
- **Keyboard (2.1.1 / 2.1.2).** Everything operable by pointer is operable by keyboard; logical order; Esc closes overlays; arrow-key patterns for menus/tabs/radio/table rows; no traps except intentional focus-trapped modals/drawers that return focus to their trigger.
- **Focus visibility (2.4.7 / 2.4.11).** Solid **2px ring + 2px offset** in `--ring`, visible in both themes and on brand-colored controls (the offset gap guarantees visibility on volt). Focus is never removed or reduced to a faint shadow.
- **Reduced motion (2.3.3).** A global `prefers-reduced-motion: reduce` block collapses animations/transitions; skeleton shimmer has a static fallback.
- **High / forced contrast.** A `forced-colors: active` block preserves focus and meaningful borders using system colors; no information depends on a custom color that forced-colors would strip.
- **Landmarks & semantics (1.3.1 / 4.1.2).** AppShell provides `header`/`nav`/`main` + skip-link; one `<h1>` per page; status changes announced via `aria-live` where relevant (notifications, results count).
- **Touch targets (2.5.8).** Interactive controls ≥`--control-h` (2.75rem) effective target.

Any change that weakens a bullet above is a **breaking, human-approved** decision (see §9), not a routine edit.

---

## 8. AI Design Governance (binding on Claude Terminal)

These rules make consistent AI development structural, not optional. They complement the **Component Usage Governance** in the Component Catalog (component-level rules live there; **token/visual-level rules live here** — no duplication).

**The absolute rules:**
1. **Never invent a color.** Use only brand/semantic/neutral/viz tokens. No new hex, no arbitrary `bg-[#…]`.
2. **Never invent spacing.** Use the native 4px scale and named layout tokens only. No `p-[15px]`, no off-scale values.
3. **Never invent typography.** Use the `text-*` tokens, the three families, and weights 400/500/600 only.
4. **Never invent radii, shadows, motion, z-index, or opacity.** Use the registered tokens; focus is a ring, not a shadow.
5. **Never bypass tokens.** No hardcoded colors/sizes/fonts in any component, ever. Utilities or CSS variables only.
6. **Never create a component outside the Component Catalog.** Compose existing catalog components.
7. **Never use brand as readable text; never status-solid-on-tint as text.** Use `accent-text` / `*-text`.
8. **Always reuse existing patterns** and match the nearest existing screen for structure and naming. Consistency outranks novelty.
9. **Always inherit the base-layer guarantees** (focus, reduced-motion, forced-colors, skip-link) — never override them per screen.
10. **Always make numbers mono-tabular, statuses badge-based, dates `<time>`, money via the currency component** (per token rules + catalog).

**When a required component or token does not exist:**
> **STOP. Do not invent. Request approval.** Propose the addition to the Component Catalog (component) or to `design-tokens.md` + `globals.css` (token) — both updated in the same change — and wait for human sign-off. A one-off need is composed from existing primitives inline, never catalogued silently.

**Conflict rule:** If an instruction requires violating this system, **refuse and cite the section.** A deliberate change to the system is the only exception, and that is a versioned update (§9), not an ad-hoc deviation.

**Definition of done for any UI work:** uses only registered tokens (no literals); uses only catalog components; passes the §7 accessibility gate; is responsive per §5/breakpoints; adds no undocumented pattern.

---

## 9. Versioning & Change Control

- **This is PULSE Design System v1.1.** It **supersedes PULSE v1, Component Catalog v1, and the Design Audit**, which are now historical. The Component Catalog remains in force but operates **under v1.1 tokens/governance** (its specs already reflect these fixes).
- **Source-of-truth boundaries (no duplication):** principles/decisions/accessibility/governance → *this file*; token values → *design-tokens.md* + *globals.css*; component specs → *Component Catalog*. A fact lives in exactly one place.
- **Change types:**
  - *Patch (v1.1.x)* — clarifications, non-visual fixes, added docs.
  - *Minor (v1.2)* — additive tokens/components/variants, backward-compatible.
  - *Major (v2.0)* — any breaking change: removing/renaming a token, changing a role value, weakening accessibility, or altering the identity.
- **Every change updates all affected files in one change set** (token + CSS + doc), keeps this ledger honest, and — if breaking — bumps the major version with a migration note.
- **Obsolete artifacts must not be cited.** The original `design-system.md` and the pre-v1.1 `globals.css` are retired; `globals.css` now contains the v1.1 implementation.

---

## 10. Quick-Reference Doctrine (pin this)

> **PULSE v1.1 — Athletic Operations. Cool Ink + Volt brand (themeable via `--brand-*`). Two-layer tokens: primitives → semantic roles → Tailwind utilities; rem everywhere; 4px spacing native. Status meaning via `*-text` tokens (AA-verified) + icon + label, never color alone; brand never readable text. Focus = solid 2px ring + offset. Mobile nav drawer; responsive DataTable; mono-tabular numbers; 3px accent-bar for active/selected. Colorblind-safe viz palette for charts. One styling path (tokens → shadcn), no parallel classes. Never invent a color, space, type, shadow, radius, motion value, or component — if it's missing, STOP and request it.**

---

*End of PULSE Design System v1.1. This document is authoritative. Amendments follow §9.*
