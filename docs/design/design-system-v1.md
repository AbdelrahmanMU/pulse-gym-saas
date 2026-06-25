> # ⚠️ SUPERSEDED — DO NOT USE
> **This is PULSE Design System v1.** It is retained for historical record only and contains token values the Design Audit flagged as failing WCAG (e.g., status-on-tint contrast, volt-as-text, px sizing, glow focus).
> **Use instead:** [`design-system-v1.1.md`](./design-system-v1.1.md) · [`design-tokens.md`](./design-tokens.md) · [`globals.css`](../../globals.css).
> Claude Terminal and humans must not follow any rule in this file.

---

# PULSE — Design System v1  *(SUPERSEDED — see v1.1)*
### Visual identity for the Gym Membership Management SaaS

> **Concept:** *Athletic Operations.* A precision instrument for running a gym. Deep charcoal **ink**, an electric **volt-lime** signal color, crisp edges, and tabular mono numerals so money and metrics read like a control panel. Confident, kinetic, high-contrast — the opposite of generic.

This document is the **single source of truth** for visual decisions. Tokens live in `globals.css`. Components must be built from these tokens — never hardcode hex, px, or font names.

---

## 0. What makes PULSE *not* default shadcn

| Default shadcn | PULSE |
|---|---|
| Neutral slate/zinc, low personality | Cool **ink** charcoal + **volt-lime** signal accent |
| Soft, uniform `0.5rem` radii everywhere | Deliberate radius rhythm: sharp `4px` chips → `10px` cards |
| Flat, borderless, gentle | Crisp 1px hairlines + **signature left accent-bar** on active items |
| One sans (Inter) for everything | **Space Grotesk** display + **Inter** UI + **JetBrains Mono** for numerals |
| Generic muted grays | Tinted, layered surfaces with a cool undertone |
| Subtle focus ring | **Volt glow** focus state |

The three signature moves to apply everywhere: **(1)** mono tabular numbers for any quantity, money, or ID; **(2)** the 3px volt left-bar to mark "active / selected / featured"; **(3)** UPPERCASE tracked micro-labels for section eyebrows and table headers.

---

## 1. Color System

### 1.1 Brand — Volt
The signal color. Used for primary CTAs, active state, brand marks, focus, and key data highlights. **Volt is a brand/action color, never a status color** — membership statuses use the semantic palette so volt never competes with "active/expired" meaning. Volt is always paired with **ink text on top** (never white text on volt — it fails contrast).

| Token | Hex | Use |
|---|---|---|
| `volt-300` | `#E8FE99` | Tint backgrounds, subtle highlights |
| `volt-400` | `#D6FB4D` | Hover on volt surfaces |
| `volt-500` | `#C2F500` | **Core** — primary buttons, active bar, focus |
| `volt-600` | `#9CC400` | Volt-as-text on light surfaces (links/accents) |

### 1.2 Neutrals — Ink (cool charcoal)
The structural backbone. A slightly cool, near-black ramp that gives the product its serious, instrument-like base.

| Token | Hex | | Token | Hex |
|---|---|---|---|---|
| `paper` | `#FBFCFD` | | `ink-500` | `#475160` |
| `ink-50` | `#F4F6F8` | | `ink-600` | `#2E3741` |
| `ink-100` | `#E6E9EE` | | `ink-700` | `#222831` |
| `ink-200` | `#C7CDD6` | | `ink-800` | `#181C22` |
| `ink-300` | `#9AA3B2` | | `ink-900` | `#111418` |
| `ink-400` | `#6B7585` | | `ink-950` | `#0B0D10` |

### 1.3 Semantic — Status
Distinct hues, each with a quiet tint for badges/banners and a solid for icons/text. These map directly to membership/payment states.

| Role | Solid | Tint (bg) | Meaning in product |
|---|---|---|---|
| **Success** | `#1FB880` | `#E7F8F1` | Active membership, paid |
| **Warning** | `#F5A524` | `#FEF3E2` | Expiring soon, unpaid |
| **Danger** | `#F04438` | `#FEEAE8` | Expired, cancelled, failed |
| **Info** | `#2BA8E0` | `#E6F4FC` | Frozen, informational |

### 1.4 Semantic role mapping (light → dark)
The shadcn-style role names that components consume. Full values in `globals.css`.

| Role | Light | Dark |
|---|---|---|
| `background` | `paper` | `ink-950` |
| `surface` / `card` | `#FFFFFF` | `ink-900` |
| `surface-raised` | `ink-50` | `ink-800` |
| `foreground` | `ink-900` | `ink-50` |
| `muted-foreground` | `ink-500` | `ink-300` |
| `border` | `ink-100` | `ink-700` |
| `border-strong` | `ink-200` | `ink-600` |
| `primary` | `volt-500` | `volt-500` |
| `primary-foreground` | `ink-950` | `ink-950` |
| `ring` (focus) | `volt-500` | `volt-500` |

**Rules:** Never put white text on volt. Never use a status hue for branding. Maintain ≥ 4.5:1 contrast for body text, ≥ 3:1 for large/UI text. Volt-on-ink and ink-on-volt both pass.

---

## 2. Spacing System

**4px base unit.** Every margin, padding, and gap is a multiple. No arbitrary values.

| Token | px | rem | Typical use |
|---|---|---|---|
| `space-0` | 0 | 0 | reset |
| `space-1` | 4 | 0.25 | icon ↔ label, chip padding |
| `space-2` | 8 | 0.5 | tight inner padding |
| `space-3` | 12 | 0.75 | input padding-y, compact gaps |
| `space-4` | 16 | 1 | **default** element gap, card padding-y |
| `space-5` | 20 | 1.25 | card padding-x |
| `space-6` | 24 | 1.5 | card-to-card gap, section inner |
| `space-8` | 32 | 2 | block gap, card padding (roomy) |
| `space-10` | 40 | 2.5 | section gap |
| `space-12` | 48 | 3 | major section gap |
| `space-16` | 64 | 4 | page top/bottom rhythm |

**Layout constants:** page gutter `space-8` (desktop) / `space-4` (mobile); content max-width `1280px`; dashboard grid gap `space-6`; sidebar width `260px`.

**Radius rhythm (intentional, not uniform):**
| Token | px | Use |
|---|---|---|
| `radius-xs` | 4 | chips, badges, tags — *sharp* |
| `radius-sm` | 6 | buttons, inputs |
| `radius-md` | 10 | cards, panels, popovers |
| `radius-lg` | 14 | modals, large surfaces |
| `radius-full` | 999 | avatars, toggle dots only |

**Elevation (crisp, cool, low):**
- `shadow-sm`: `0 1px 2px rgba(11,13,16,.06)` — inputs, hover.
- `shadow-md`: `0 4px 12px -2px rgba(11,13,16,.10)` — cards, dropdowns.
- `shadow-lg`: `0 12px 32px -8px rgba(11,13,16,.18)` — modals.
- `glow-volt`: `0 0 0 3px rgba(194,245,0,.35)` — **focus state signature**.

---

## 3. Typography Scale

**Three families, three jobs.** Load via `next/font`.

- **Display — `Space Grotesk`** → headings, page titles, stat numbers, section eyebrows. Geometric, slightly mechanical, athletic.
- **UI/Body — `Inter`** → all interface text, tables, forms, paragraphs. Maximum legibility at small sizes.
- **Numeric — `JetBrains Mono`** → money, counts, IDs, dates in tables, dashboard metrics. **Always `font-variant-numeric: tabular-nums`** so columns align.

### 3.1 Scale (1.250 major-third for display, fixed UI sizes)

| Token | Size / Line | Family | Weight | Use |
|---|---|---|---|---|
| `display-xl` | 40 / 44 | Space Grotesk | 600 | Page hero / big stat number |
| `display-lg` | 32 / 38 | Space Grotesk | 600 | Page title |
| `heading-1` | 24 / 30 | Space Grotesk | 600 | Section title, card header |
| `heading-2` | 20 / 26 | Space Grotesk | 500 | Sub-section |
| `heading-3` | 16 / 22 | Space Grotesk | 500 | Card title, list group |
| `body-lg` | 16 / 24 | Inter | 400 | Lead text |
| `body` | 14 / 20 | Inter | 400 | **Default UI text** |
| `body-sm` | 13 / 18 | Inter | 400 | Secondary, table cells |
| `caption` | 12 / 16 | Inter | 400 | Helper text, timestamps |
| `eyebrow` | 11 / 14 | Inter | 600 | **UPPERCASE, `letter-spacing: .08em`** — section eyebrows, table headers, badge labels |
| `metric` | 28 / 32 | JetBrains Mono | 600 | Dashboard stat value (tabular) |
| `mono-sm` | 13 / 18 | JetBrains Mono | 500 | Money/counts/IDs in tables (tabular) |

**Rules:** Headings use Space Grotesk only. Any number a user reads as data (money, member counts, IDs, dates-as-data) uses JetBrains Mono + tabular-nums. The `eyebrow` style (uppercase + tracking) is the recurring identity cue — use it for every section label and table header.

---

## 4. Card Styles

The card is the primary container. Signature: crisp 1px border, `radius-md`, low cool shadow on hover, and an optional **volt left accent-bar** for active/featured cards.

**Base card**
- Surface `card`, `border` 1px, `radius-md` (10px), padding `space-6`.
- Header: `heading-3` title + optional `eyebrow` above it; actions right-aligned.
- Hover (interactive cards only): `shadow-md`, border → `border-strong`.

**Stat card (dashboard KPI)** — the hero of the dashboard:
- `eyebrow` label (uppercase, muted) on top.
- `metric` value (JetBrains Mono, large, tabular) — the focal point.
- Delta row: success/danger colored, small, with ▲/▼.
- **Left accent-bar 3px volt** runs the card's full height as the signature mark.

**Featured / selected card:** add the 3px `volt-500` left bar + `surface-raised` background.

Recipe → `.pulse-card`, `.pulse-stat-card` in `globals.css`.

---

## 5. Table Styles

Tables are where staff live — dense, scannable, precise. PULSE tables reject the borderless shadcn look in favor of a **control-panel** feel.

- **Header row:** `eyebrow` style (UPPERCASE, tracked, `muted-foreground`), `surface-raised` background, bottom border `border-strong`. Sticky on scroll.
- **Body rows:** `body-sm`, row height 52px (comfortable) / 44px (compact). Hairline `border` between rows only — no vertical gridlines (cleaner).
- **Zebra:** none by default; use hover `surface-raised` instead.
- **Row hover:** `surface-raised` + **volt left accent-bar** slides in (3px) — the signature "you are here" cue.
- **Selected row:** persistent volt left-bar + faint volt-tint background.
- **Numeric columns** (money, counts, dates): right-aligned, JetBrains Mono tabular.
- **Status cells:** use the badge component (see §6), never raw colored text.
- **Density toggle:** comfortable/compact supported via a row-height class.

Recipe → `.pulse-table` in `globals.css`.

---

## 6. Form Styles

Forms feel mechanical and exact. Larger touch targets for front-desk speed.

**Inputs / selects / textareas**
- Height 44px, `radius-sm` (6px), 1px `border`, `surface` background, padding-x `space-3`.
- Text `body` (14). Placeholder `muted-foreground`.
- **Focus:** border → `volt-500` **+ `glow-volt`** (the 3px volt glow) — signature.
- **Error:** border → `danger` + danger glow; message in `caption` danger below.
- Disabled: `surface-raised`, `muted-foreground`, no shadow.

**Labels & help**
- Label: `body-sm` weight 500, `space-2` below.
- Required: volt dot (•) after label, not a red asterisk — on-brand.
- Helper/error: `caption`, `space-1` above.

**Buttons**
| Variant | Look |
|---|---|
| **Primary** | `volt-500` fill, `ink-950` text, weight 600; hover `volt-400`; focus `glow-volt`. |
| **Secondary** | `surface`, 1px `border-strong`, `foreground` text; hover `surface-raised`. |
| **Ghost** | transparent, `foreground`; hover `surface-raised`. |
| **Danger** | `danger` fill, white text; for destructive only. |

Heights: 44px default, 36px small, 52px large. Radius `radius-sm`. Icon + label gap `space-1`.

**Layout:** single-column forms, max-width 560px; field gap `space-5`; grouped sections separated by `space-8` with an `eyebrow` group label. Sticky action bar at bottom on long forms.

Recipe → `.pulse-input`, `.pulse-label`, `.pulse-btn-*` in `globals.css`.

---

## 7. Dashboard Styles

The dashboard is the product's showcase — make it read like an athletic control panel.

**Structure**
- **App shell:** fixed left sidebar (260px, `ink-900` in light *and* dark for a strong anchored brand rail) + top bar + scrollable content on `background`.
- **Sidebar:** dark rail always. Active nav item = **volt left-bar + volt label**; inactive = `ink-300`. Logo top, gym/branch switcher below, user at bottom.
- **Top bar:** page title (`display-lg`), global search, notifications bell (volt dot when unread), user menu.

**KPI grid (top of dashboard)**
- 4-up responsive grid (`space-6` gap), each a **stat card** (§4): eyebrow label, big mono `metric`, colored delta, volt left-bar.
- Core MVP KPIs: Active Members, Memberships Expiring (7d), New This Month, Revenue This Month.

**Panels below**
- 2-column: a primary list/table panel (e.g., Expiring Soon) + a side column (recent activity, quick actions).
- Section eyebrows label each panel. Charts (if any) use ink grid + volt series line; tints for secondary series.

**Color discipline on the dashboard:** volt is rare and intentional — accents, active states, the primary metric, one chart series. Everything else is ink + semantic status. Scarcity is what makes volt read as energy.

Recipe → `.pulse-shell`, `.pulse-sidebar`, `.pulse-kpi-grid` in `globals.css`.

---

## 8. Badges & Status (shared)

The membership/payment status vocabulary, used in tables, cards, and detail pages.

| Status | Color role | Style |
|---|---|---|
| Active / Paid | success | tint bg, solid text, `eyebrow` label, `radius-xs`, leading dot |
| Expiring Soon / Unpaid | warning | same pattern |
| Expired / Cancelled | danger | same pattern |
| Frozen / Info | info | same pattern |

All badges: `radius-xs` (4px sharp), `eyebrow` type, `space-1` padding-y / `space-2` padding-x, a 6px leading status dot in the solid color. Recipe → `.pulse-badge`.

---

## 9. Implementation Notes

- Tokens are defined once in `globals.css` (`:root` + `.dark`) and consumed via CSS variables / Tailwind theme. **Do not hardcode** hex, px, or font names in components.
- Fonts via `next/font/google`: Space Grotesk, Inter, JetBrains Mono → exposed as `--font-display`, `--font-sans`, `--font-mono`.
- Signature component classes live in `@layer components` (`.pulse-*`) so shadcn primitives are restyled by composition, not forked.
- Dark mode is first-class: every token has a `.dark` value; the sidebar is dark in both themes by design.
- **Accessibility is a constraint, not a nicety:** keep the contrast and "never white-on-volt" rules; the volt focus glow must remain visible in both themes.
