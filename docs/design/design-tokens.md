# PULSE Design Tokens — Reference
### PULSE Design System v1.1 · Gym Membership Management SaaS

| | |
|---|---|
| **Version** | v1.1 |
| **Status** | ✅ Authoritative token reference |
| **Implementation** | `globals.css` (Tailwind v4 `@theme`) |
| **Supersedes** | PULSE v1 tokens |

> This is the **exhaustive registry** of every design token. Values live in `globals.css`; this document explains each. **No value here may be hardcoded in a component** — consume the Tailwind utility or CSS variable. If a value you need is not here, it does not exist: STOP and request it be added (see design-system-v1.1 §8).
>
> **Two-layer model:** *Primitives* (raw scales) are never used directly. *Semantic roles* (e.g., `--primary`, `--surface`) are what components consume, and they remap automatically in dark mode. Utilities follow the role/scale name (`bg-surface`, `text-foreground`, `text-success-text`, `rounded-md`).

---

## 1. Brand Colors
The signal/identity ramp. Default theme is "Volt"; the `--brand-*` namespace is the **white-label seam** — a tenant overrides these four values and the whole UI rebrands. **Brand is an action/active color, never a status color, and never readable body text** (use `accent-text`).

| Token | Utility | Value | Role |
|---|---|---|---|
| `--brand-300` | `*-brand-300` | `#E8FE99` | Subtle tint backgrounds |
| `--brand-400` | `*-brand-400` | `#D6FB4D` | Hover on brand; brand-text on dark |
| `--brand-500` | `*-brand-500` | `#C2F500` | **Core** — primary fills, active bar, focus |
| `--brand-600` | `*-brand-600` | `#9CC400` | Focus ring on light |
| `--brand-700` | `*-brand-700` | `#5E7000` | Accessible brand-as-text on light (≥4.5:1) |

- **Purpose** — Brand identity and primary action/active emphasis.
- **Usage** — Primary buttons, active nav/selected state, focus accents, one primary chart series.
- **Do** — Pair brand fills with `--primary-foreground` (ink) text; keep brand rare and intentional.
- **Don't** — Never put white text on brand; never use raw `brand-500` as readable text; never use brand to signal status.

## 2. Semantic Colors
Status meaning. Each has **solid** (icons/borders), **tint** (badge/alert backgrounds), and an **accessible text** token verified ≥4.5:1 on its tint. In dark mode, tints become translucent and the solid color is the readable text.

| Status | Solid | Tint | Text (light) | Utilities |
|---|---|---|---|---|
| Success | `#1FB880` | `#E7F8F1` | `#0E7A52` | `*-success`, `*-success-tint`, `text-success-text` |
| Warning | `#F5A524` | `#FEF3E2` | `#92400E` | `*-warning`, `*-warning-tint`, `text-warning-text` |
| Danger | `#F04438` | `#FEEAE8` | `#B42318` | `*-danger`, `*-danger-tint`, `text-danger-text` |
| Info | `#2BA8E0` | `#E6F4FC` | `#155E8B` | `*-info`, `*-info-tint`, `text-info-text` |

- **Purpose** — Communicate state (membership/payment lifecycle, alerts).
- **Usage** — Badges = tint bg + `*-text`; icons/borders = solid; never solid-on-tint as text.
- **Do** — Always pair color with an icon/label (never color alone); use the `*-text` token for any text on a tint.
- **Don't** — Don't render `success-500` text on `success-tint` (fails contrast); don't invent new statuses beyond the data model.

### 2a. Data-Visualization Palette
Colorblind-safe categorical series (Okabe–Ito-derived) for charts/reports. Separate from brand and status so meaning never collides.

| Token | Value | | Token | Value |
|---|---|---|---|---|
| `--viz-1` | `#0072B2` | | `--viz-5` | `#56B4E9` |
| `--viz-2` | `#E69F00` | | `--viz-6` | `#D55E00` |
| `--viz-3` | `#009E73` | | `--viz-7` | `#7B5BD6` |
| `--viz-4` | `#CC79A7` | | `--viz-8` | `#6B7585` |

- **Purpose** — Distinguish multiple data series in reporting.
- **Usage** — Assign sequentially; brand may be the single primary series, viz-* for the rest.
- **Do** — Pair series with labels/markers; verify against colorblindness.
- **Don't** — Don't use status colors for categories; don't exceed 8 categories without grouping.

## 3. Neutral Palette
The "Ink" cool-charcoal ramp — structural backbone. Used via semantic roles, not directly.

| Token | Value | | Token | Value |
|---|---|---|---|---|
| `--paper` | `#FBFCFD` | | `--ink-500` | `#475160` |
| `--ink-50` | `#F4F6F8` | | `--ink-600` | `#2E3741` |
| `--ink-100` | `#E6E9EE` | | `--ink-700` | `#222831` |
| `--ink-200` | `#C7CDD6` | | `--ink-800` | `#181C22` |
| `--ink-300` | `#9AA3B2` | | `--ink-850` | `#14181D` |
| `--ink-400` | `#6B7585` | | `--ink-900` | `#111418` |
| | | | `--ink-950` | `#0B0D10` |

**Semantic roles (consume these):** `--background`, `--surface`, `--surface-raised`, `--foreground`, `--muted-foreground`, `--border`, `--border-strong`, `--primary(+hover/foreground)`, `--accent-text`, `--ring`, and rail roles `--rail-bg/-fg/-fg-active/-surface/-border`.

- **Purpose** — Backgrounds, surfaces, text, borders, elevation steps.
- **Usage** — Always reference a role (`bg-surface`, `text-muted-foreground`), never `ink-*` directly.
- **Do** — Use `surface-raised` (and lighter ink in dark) to express elevation.
- **Don't** — Don't hardcode ink values in components; don't use raw ink for the rail (use rail roles).

## 4. Typography Tokens
Composite text styles (size + line-height baked into the scale). See §5–§9 for sub-parts.

| Token (utility `text-*`) | Family | Weight | Size / LH | Use |
|---|---|---|---|---|
| `display-xl` | display | 600 | 2.5 / 2.75rem | Hero / featured metric |
| `display-lg` | display | 600 | 2 / 2.375rem | Page title (`<h1>`) |
| `h1` | display | 600 | 1.5 / 1.875rem | Section title |
| `h2` | display | 500 | 1.25 / 1.625rem | Sub-section |
| `h3` | display | 500 | 1 / 1.375rem | Card title |
| `body-lg` | sans | 400 | 1 / 1.5rem | Lead text |
| `body` | sans | 400 | 0.875 / 1.25rem | **Default UI text** |
| `body-sm` | sans | 400 | 0.8125 / 1.125rem | Table cells, secondary |
| `caption` | sans | 400 | 0.75 / 1rem | Helper, timestamps |
| `eyebrow` | sans | 600 | 0.75 / 1rem · UPPER · .08em | Eyebrows, table headers |
| `metric` | mono | 600 | 1.75 / 2rem · tabular | Dashboard stat value |
| `num` | mono | 500 | 0.8125 / 1.125rem · tabular | Money/counts/IDs in tables |

- **Do** — Headings use display family only; every user-read number uses `tabular` mono.
- **Don't** — Don't render data numbers in sans; don't use raw px font sizes.

## 5. Font Families
| Token | Family | Where used |
|---|---|---|
| `--font-display` | Space Grotesk | Headings, page/section titles, stat numbers, eyebrows |
| `--font-sans` | Inter | All UI/body, tables, forms, paragraphs |
| `--font-mono` | JetBrains Mono | Money, counts, IDs, data dates (tabular) |

- **Purpose** — Three families, three jobs; provided via `next/font` (see design-system §6).
- **Do** — Reference the CSS var only. **Don't** — hardcode font names.

## 6. Font Sizes
The rem ladder (see §4 for the named scale). Base body = `0.875rem` (14px). All sizes rem so OS/browser zoom scales them.
- **Do** — Use named `text-*` tokens. **Don't** — use `px` or off-scale sizes.

## 7. Font Weights
| Token | Value | Use |
|---|---|---|
| regular | 400 | Body, captions |
| medium | 500 | Labels, h2/h3, mono nums |
| semibold | 600 | Headings, eyebrows, metrics, primary buttons |

- **Do** — Stay within these three. **Don't** — introduce 300/700/800 weights (not loaded; breaks rhythm).

## 8. Letter Spacing
| Token | Value | Use |
|---|---|---|
| tight | -0.02em | `metric` (large mono) |
| snug | -0.01em | Display headings |
| normal | 0 | Body |
| wide | 0.08em | `eyebrow` / table headers (uppercase) |

- **Do** — Use `wide` only with uppercase. **Don't** — track body text.

## 9. Line Heights
Bundled into each `text-*` token (size/LH pairs in §4). No standalone line-height utilities are needed.
- **Do** — Trust the scale's paired LH. **Don't** — override LH per instance.

## 10. Radius Tokens
| Token | Utility | Value | Use |
|---|---|---|---|
| `--radius-xs` | `rounded-xs` | 0.25rem | Badges, chips (sharp) |
| `--radius-sm` | `rounded-sm` | 0.375rem | Buttons, inputs |
| `--radius-md` | `rounded-md` | 0.625rem | Cards, panels, popovers |
| `--radius-lg` | `rounded-lg` | 0.875rem | Modals |
| `--radius-full` | `rounded-full` | 9999px | Avatars, toggle dots only |

- **Purpose** — Intentional radius rhythm (sharper small → softer large) is an identity cue.
- **Do** — Match radius to element class. **Don't** — apply uniform radius everywhere or invent new values.

## 11. Border Tokens
| Token | Value | Use |
|---|---|---|
| `--border-width` | 1px | Hairlines (color via `--border` / `--border-strong`) |
| `--border-accent` | 0.1875rem (3px) | Signature accent bar (active/selected) |

- **Purpose** — Crisp structure + the signature left accent-bar.
- **Do** — Use `border` (subtle) vs `border-strong` (emphasis) roles for color. **Don't** — exceed 1px for structural borders.

## 12. Elevation Tokens
Conceptual layers, expressed via shadow (light) **and** surface-lightness (dark). Order: base → raised surface → dropdown → drawer → modal → popover → toast.
- **Do** — In dark mode prefer lighter surfaces over shadows for hierarchy. **Don't** — rely on shadow alone in dark mode.

## 13. Shadow Tokens
| Token | Use |
|---|---|
| `--shadow-sm` | Subtle hover, inputs |
| `--shadow-md` | Cards, dropdowns, popovers |
| `--shadow-lg` | Modals, drawers |

- **Purpose** — Cool, low elevation; softened in dark mode.
- **Do** — Use the three steps only. **Don't** — author custom shadow values; **focus is NOT a shadow** in v1.1 (it's a solid ring — §22 of design-system).

## 14. Motion Tokens
| Token | Value | Use |
|---|---|---|
| `--duration-fast` | 120ms | State changes (hover, toggle) |
| `--duration-base` | 200ms | Overlays (popover, drawer) |
| `--duration-slow` | 320ms | Larger transitions, sheets |

- **Do** — Gate all motion behind `prefers-reduced-motion`. **Don't** — exceed `--duration-slow` for UI feedback.

## 15. Animation Tokens
| Token | Use |
|---|---|
| `pulse-shimmer` (keyframe) | Skeleton loading only, motion-safe |

- **Do** — Provide a static fallback under reduced-motion. **Don't** — add decorative looping animations.

## 16. Transition Tokens
| Token | Value | Use |
|---|---|---|
| `--ease-standard` | cubic-bezier(.2,0,0,1) | Default entrances/state |
| `--ease-emphasized` | cubic-bezier(.3,0,0,1) | Larger/emphasized motion |

Utilities: `ease-standard`, `ease-emphasized`. Compose with duration tokens.
- **Do** — Pair an easing + duration token. **Don't** — use linear or ad-hoc beziers.

## 17. Opacity Tokens
| Token | Value | Use |
|---|---|---|
| `--opacity-disabled` | 0.5 | Disabled controls |
| `--opacity-muted` | 0.64 | De-emphasized content |
| `--opacity-scrim` | 0.6 | Modal/drawer scrim |
| `--opacity-hover` | 0.08 | Hover/selected surface overlay |

- **Do** — Use tokens for states. **Don't** — hardcode opacity literals.

## 18. Spacing Scale
**4px base — native to Tailwind v4** (`--spacing` = 0.25rem). Use `p-1`…`p-16`, `gap-*`, `m-*` directly (1=4px, 2=8px, 4=16px, 6=24px, 8=32px, 12=48px, 16=64px).
Named layout constants: `--gutter` (2rem), `--gutter-mobile` (1rem), `--sidebar-w` (16.25rem), `--content-max` (80rem), `--topbar-h` (4rem), `--control-h` (2.75rem / sm 2.25 / lg 3.25).
- **Do** — Use the scale for all spacing. **Don't** — introduce off-scale values (e.g., 5px, 15px) or new spacing steps.

## 19. Grid System
12-column conceptual grid; gutters from the spacing scale (default `gap-6` = 1.5rem). `ContentGrid` uses auto-fit with a ~17rem min track (count-agnostic). Forms: single column, ~640px; optional two-column region for short related fields.
- **Do** — Use `ContentGrid`/`KPIGrid` variants. **Don't** — hardcode column counts that can't reflow.

## 20. Breakpoints
| Token | Value (px) |
|---|---|
| `sm` | 40rem (640) |
| `md` | 48rem (768) |
| `lg` | 64rem (1024) |
| `xl` | 80rem (1280) |
| `2xl` | 96rem (1536) |

Sidebar is persistent ≥`lg`, drawer below. Tables switch to scroll/stacked below `md`.
- **Do** — Design mobile-first; honor the nav/table breakpoints. **Don't** — invent new breakpoints.

## 21. Container Widths
| Token | Value | Use |
|---|---|---|
| `--content-max` / `container-content` | 80rem (1280px) | Default/page content max |
| narrow | ~40rem (640px) | Forms |
| wide | full-bleed | Dashboards, wide tables |

- **Do** — Pick width by content type via `PageContainer`. **Don't** — center content at arbitrary widths.

## 22. Z-Index Scale
| Token | Value | Layer |
|---|---|---|
| `--z-base` | 0 | Content |
| `--z-dropdown` | 1000 | Menus |
| `--z-sticky` | 1100 | Sticky headers, Sticky Mobile Action Bar |
| `--z-fab` | 1150 | Creation FAB (v1.2 — above sticky, below drawer) |
| `--z-drawer` | 1200 | Mobile nav drawer |
| `--z-scrim` | 1300 | Overlay scrim |
| `--z-modal` | 1400 | Dialogs |
| `--z-popover` | 1500 | Popovers |
| `--z-toast` | 1600 | Toasts |
| `--z-tooltip` | 1700 | Tooltips, skip link |

- **Do** — Use named layers. **Don't** — use arbitrary z-index numbers (`z-[9999]`).

## 23. Icon Sizes
| Token | Value (px) | Use |
|---|---|---|
| `--icon-xs` | 0.875rem (14) | Inline with small text |
| `--icon-sm` | 1rem (16) | Default in buttons/inputs |
| `--icon-md` | 1.25rem (20) | Nav, card headers |
| `--icon-lg` | 1.5rem (24) | Section/feature icons |
| `--icon-xl` | 2rem (32) | Empty states, large feature |

- **Purpose** — Consistent Lucide icon sizing.
- **Do** — Use a token size; `aria-hidden` decorative icons. **Don't** — set arbitrary icon px; don't mix stroke widths.

## 24. Avatar Sizes
| Token | Value (px) | Use |
|---|---|---|
| `--avatar-xs` | 1.5rem (24) | Dense lists, activity feed |
| `--avatar-sm` | 2rem (32) | Table rows, menus |
| `--avatar-md` | 2.5rem (40) | Cards, default |
| `--avatar-lg` | 4rem (64) | Profile header |
| `--avatar-xl` | 5rem (80) | Large profile/hero |

- **Do** — Use a token size; always provide initials fallback. **Don't** — use off-scale avatar sizes.

## 25. v1.2 Adaptive Tokens
Additive tokens for the mobile thumb-zone patterns (design-system-v1.2 §8; implemented with the
v1.2 implementation slice). Safe-area values are applied **inside component base styles** in
`globals.css` (`.fab-anchor`, `.actionbar-mobile`) — never as arbitrary utility values (§5.8).

| Token | Value | Use |
|---|---|---|
| `--safe-top/right/bottom/left` | `env(safe-area-inset-*, 0px)` | Device safe-area insets (notch/home indicator) |
| `--fab-size` | 3.5rem (56) | Creation FAB diameter |
| `--fab-offset` | 1rem | FAB inset from screen edges (above `--safe-bottom`) |
| `--action-bar-h` | 4rem (64) | Sticky Mobile Action Bar height |
| `--sheet-max-h` | 90dvh | Adaptive Bottom Sheet max height |
| `--sheet-radius` | = `--radius-lg` | Bottom-sheet top-corner rounding |
| `--control-font-mobile` | 1rem (16) | Input font on `<md` — prevents iOS focus-zoom (§5.10) |
| `--z-fab` | 1150 | See §22 |

Requires `viewport-fit=cover` in the app viewport meta (set in the root layout).
- **Do** — Anchor bottom patterns with these tokens/base styles. **Don't** — hand-position floating elements or read `env()` in components.

---

*End of token reference. Every token above is implemented in `globals.css`. Adding/removing a token requires updating both this file and `globals.css` in the same change, and bumping the design-system version if it's a breaking change.*
