# PULSE Component Catalog — v1.1
### Gym Membership Management SaaS · Single Source of Truth for UI

| | |
|---|---|
| **Status** | ✅ Authoritative — governs all UI development |
| **Design system** | Operates under **PULSE Design System v1.1** (its specs already encode the v1.1 accessibility/token fixes) + **v1.2 Adaptive** additions in **§12** (see [`design-system-v1.2.md`](./design-system-v1.2.md)) |
| **Stack** | Next.js 15 · React · TypeScript · Tailwind · shadcn/ui (customized via PULSE) · Lucide |
| **Audience** | Human maintainers **and** Claude Terminal |

> **This catalog outranks improvisation.** Before building any screen, find the components here and compose them. If a needed component is not listed, follow **Component Usage Governance → Rules for Introducing New Components** — do not invent one inline. When a request conflicts with this catalog, refuse and cite the section.

---

## 0. Global Conventions (every component inherits these)

These apply to **all** components below. Per-component sections state only deltas/specifics.

**0.1 Tokens, never literals.** Components consume PULSE tokens exposed as Tailwind utilities (`bg-surface`, `text-foreground`, `gap-4`, `rounded-md`, `text-h3`, etc.). No hardcoded hex, px, or font names — ever. Type and spacing are **rem-based** so user zoom/large-text works.

**0.2 Brand seam.** Action/active accents use `--brand-*` (defaults to volt) so tenants can white-label later. Status/neutral tokens are fixed.

**0.3 Accessible color (corrected from audit).** Status text uses dedicated accessible `*-text` tokens (≥4.5:1 on their tint), not the raw solid on tint. Volt is never used as readable text. Color is never the sole carrier of meaning — pair with icon, label, or shape.

**0.4 Focus.** All interactive elements show a **solid 2px brand focus ring with offset** (`outline` + `outline-offset`), visible in both themes and on brand-colored controls (ink halo when on volt). Never remove focus visibility.

**0.5 Keyboard.** Everything operable by mouse is operable by keyboard. Logical tab order, Enter/Space activate, Esc closes overlays, arrow keys within composite widgets (menus, tabs, radio, table rows).

**0.6 Motion.** Transitions are gated behind `prefers-reduced-motion: no-preference`. Default durations: 120ms (state), 200ms (overlay).

**0.7 States matrix.** Every interactive component must define: `default · hover · focus · active · disabled · loading · error · selected` where applicable. "Not applicable" is stated explicitly, never left silent.

**0.8 Density.** Components support `comfortable` (default) and `compact` where data density matters (tables, lists, forms).

**0.9 Responsive baseline.** Breakpoints: `sm 640 · md 768 · lg 1024 · xl 1280`. Mobile-first. No component may render content that is unreachable on mobile (see AppShell mobile nav).

**0.10 Tenancy/branch context.** Components that display or mutate scoped data never infer scope from props alone; scope (gym/branch) comes from app context. Branch-scoped screens must surface the active branch (see TopBar / BranchContextChip).

**0.11 Icons.** Lucide only, consistent stroke width, sized in rem, given `aria-hidden` when decorative or an accessible label when meaningful.

**0.12 Loading & empty.** Every data-bearing component defines loading (Skeleton) and empty (EmptyState/NoResultsState) presentations. These are mandatory, not optional.

---

# 1. Layout Components

## AppShell
1. **Purpose** — Root authenticated frame; composes Sidebar + TopBar + content slot.
2. **Responsibilities** — Owns the responsive layout grid, theme root, mobile-nav orchestration, and the brand-token scope. Guarantees auth context is present.
3. **Variants** — `default` (sidebar + topbar) · `focused` (topbar only, e.g. full-screen wizard).
4. **Anatomy** — Sidebar (left rail) · TopBar (top) · main scroll region (renders PageContainer) · mobile nav drawer + scrim.
5. **Props / Config** — `variant`, `sidebar` slot, `topbar` slot, `children`. No data props.
6. **Visual Behavior** — Desktop: `260px` rail + fluid content. Content scrolls independently of rail/topbar (both fixed).
7. **Interaction Rules** — Owns the open/close state of the mobile drawer; Esc and scrim-click close it; focus trapped while open.
8. **Accessibility** — `<header>`, `<nav>`, `<main>` landmarks; skip-to-content link as first focusable element.
9. **Responsive** — ≥1024px: persistent rail. <1024px: rail becomes an off-canvas drawer toggled from TopBar (audit fix — nav must never disappear).
10. **Do** — Use exactly once, at the root of every authenticated route group.
11. **Don't** — Don't nest AppShells; don't put business logic here; don't hardcode the rail width.
12. **Usage** — Wraps the entire `(dashboard)` route group.

## Sidebar
1. **Purpose** — Primary navigation rail and brand anchor.
2. **Responsibilities** — Renders logo, gym/branch switcher, NavGroups/NavItems, user menu. Reflects active route.
3. **Variants** — `expanded` (default) · `collapsed` (icon-only, ≥1280) · `drawer` (mobile overlay).
4. **Anatomy** — Brand block (top) · BranchSwitcher · scrollable nav list · user/account block (bottom).
5. **Props / Config** — `items[]`, `activePath`, `collapsed`, `user`, `branchContext`.
6. **Visual Behavior** — Dark rail in both themes, but **dark-mode rail is lifted above the canvas** (audit fix) for separation; uses `--rail-*` role tokens, not raw ink.
7. **Interaction Rules** — Active item shows brand left-bar + brand label; one active item at a time; collapse toggle persists per user.
8. **Accessibility** — `<nav aria-label="Primary">`; active item `aria-current="page"`; collapsed items expose labels via tooltip + accessible name.
9. **Responsive** — Becomes `drawer` under lg; collapse mode only ≥xl.
10. **Do** — Drive structure from `items[]`; reuse NavGroup/NavItem.
11. **Don't** — Don't hand-build nav rows; don't exceed two nav depth levels.
12. **Usage** — Passed into AppShell's sidebar slot.

## TopBar
1. **Purpose** — Page-level header bar for title, global search, branch context, notifications, user.
2. **Responsibilities** — Hosts PageHeader title slot, SearchBar (global), BranchContextChip, NotificationBadge trigger, mobile nav toggle.
3. **Variants** — `default` · `with-search` · `minimal` (focused shell).
4. **Anatomy** — Left: mobile-nav button + title slot. Right: search · branch chip · notifications · avatar menu.
5. **Props / Config** — `title`, `showSearch`, `branchContext`, `actions`.
6. **Visual Behavior** — `64px` (4rem) height, surface background, bottom hairline border.
7. **Interaction Rules** — Notification trigger opens NotificationCenter; avatar opens ActionMenu.
8. **Accessibility** — `<header role="banner">`; controls have labels; unread state announced via `aria-live` politely.
9. **Responsive** — <md: title truncates, search collapses to an icon, branch chip shortens to code.
10. **Do** — Keep to one row; offload overflow into ActionMenu.
11. **Don't** — Don't stack actions that overflow; don't place primary page actions here (use PageHeader).
12. **Usage** — AppShell topbar slot.

## PageContainer
1. **Purpose** — Standard content wrapper providing max-width, gutters, vertical rhythm.
2. **Responsibilities** — Centers content at `1280px` max, applies page padding and section spacing.
3. **Variants** — `default` · `wide` (full-bleed for dashboards/tables) · `narrow` (forms, ~640px).
4. **Anatomy** — Outer padded region → optional PageHeader → stacked sections.
5. **Props / Config** — `width`, `children`.
6. **Visual Behavior** — Padding `2rem` desktop / `1rem` mobile; section gap `2.5rem`.
7. **Interaction Rules** — None (structural).
8. **Accessibility** — Renders inside `<main>`; one `<h1>` per page (via PageHeader).
9. **Responsive** — Gutters and max-width adapt by breakpoint.
10. **Do** — Use on every page; pick width by content type.
11. **Don't** — Don't set custom page margins; don't nest PageContainers.
12. **Usage** — Every route page body.

## PageHeader
1. **Purpose** — Page title zone with description, breadcrumb, and primary actions.
2. **Responsibilities** — Renders the page `<h1>`, optional Breadcrumb, optional subtitle, and a primary/secondary action cluster.
3. **Variants** — `default` · `with-breadcrumb` · `with-tabs` (Tabs dock beneath).
4. **Anatomy** — Breadcrumb (optional) → title + subtitle (left) · actions (right) → optional Tabs row.
5. **Props / Config** — `title`, `subtitle`, `breadcrumb`, `primaryAction`, `secondaryActions[]`, `tabs`.
6. **Visual Behavior** — Title `display-lg`; bottom margin `2rem`.
7. **Interaction Rules** — Primary action is a single prominent Button; extras collapse into ActionMenu.
8. **Accessibility** — Title is the page's only `<h1>`.
9. **Responsive** — <sm: actions wrap below title; >2 actions collapse to ActionMenu.
10. **Do** — Exactly one primary action.
11. **Don't** — Don't put multiple primary buttons; don't omit the `<h1>`.
12. **Usage** — Top of nearly every page.

## SectionHeader
1. **Purpose** — Labels a content section within a page.
2. **Responsibilities** — Eyebrow/title + optional description + optional section-level action.
3. **Variants** — `default` · `with-action` · `eyebrow-only`.
4. **Anatomy** — Eyebrow (uppercase, accessible-sized 12px) · title (`heading-1/2`) · action (right).
5. **Props / Config** — `eyebrow`, `title`, `description`, `action`.
6. **Visual Behavior** — Bottom margin `1.5rem`; divider optional.
7. **Interaction Rules** — Action is secondary/ghost, never the page primary.
8. **Accessibility** — Uses `<h2>`/`<h3>` per nesting; eyebrow is decorative, not a heading.
9. **Responsive** — Action wraps below on mobile.
10. **Do** — Use to break long pages into scannable sections.
11. **Don't** — Don't use as a page title; don't stack eyebrows.
12. **Usage** — Above ContentGrid blocks, table sections, form groups.

## ContentGrid
1. **Purpose** — Responsive grid for arranging cards/panels.
2. **Responsibilities** — Provides consistent column counts and gaps; reflows by breakpoint.
3. **Variants** — `cols-2` · `cols-3` · `cols-4` · `auto` (min-track auto-fit) · `sidebar-split` (main + aside).
4. **Anatomy** — Grid container → equal/asymmetric children.
5. **Props / Config** — `variant`, `gap`, `children`.
6. **Visual Behavior** — Default gap `1.5rem`; `auto` variant prevents fixed-count brittleness (audit fix).
7. **Interaction Rules** — None.
8. **Accessibility** — Pure layout; preserves DOM source order for tab/reading order.
9. **Responsive** — Collapses toward 1 column by sm; `sidebar-split` stacks aside below main.
10. **Do** — Use `auto` when item count varies.
11. **Don't** — Don't hardcode column counts that can't reflow.
12. **Usage** — Dashboard panels, card collections.

---

# 2. Navigation Components

## NavGroup
1. **Purpose** — Labeled cluster of NavItems in the Sidebar.
2. **Responsibilities** — Renders an optional group label and its NavItems; optional collapse.
3. **Variants** — `default` · `collapsible` · `unlabeled`.
4. **Anatomy** — Group label (eyebrow) → NavItem list.
5. **Props / Config** — `label`, `items[]`, `collapsible`.
6. **Visual Behavior** — Group spacing `1rem`; label muted on rail.
7. **Interaction Rules** — Collapsible groups remember state.
8. **Accessibility** — `aria-label` on the group; collapse button `aria-expanded`.
9. **Responsive** — Identical in drawer mode.
10. **Do** — Group by domain (Members, Billing, Settings).
11. **Don't** — Don't exceed ~6 items per group without grouping.
12. **Usage** — Inside Sidebar.

## NavItem
1. **Purpose** — A single navigation link.
2. **Responsibilities** — Route link with icon + label, active/hover/focus states, optional count badge.
3. **Variants** — `default` · `active` · `with-badge` · `collapsed` (icon-only).
4. **Anatomy** — Brand left-bar (active) · Lucide icon · label · optional NotificationBadge/count.
5. **Props / Config** — `href`, `icon`, `label`, `active`, `badgeCount`.
6. **Visual Behavior** — Active = brand left-bar + brand text + raised rail surface.
7. **Interaction Rules** — Active reflects current route via `activePath`; whole row is the hit target.
8. **Accessibility** — `aria-current="page"` when active; collapsed mode keeps accessible name.
9. **Responsive** — Full-width hit area in drawer.
10. **Do** — Reuse for every nav link.
11. **Don't** — Don't style raw `<a>` as nav; don't mark two items active.
12. **Usage** — Inside NavGroup.

## Breadcrumb
1. **Purpose** — Shows hierarchical location and enables upward navigation.
2. **Responsibilities** — Renders trail of links + current page; truncates long trails.
3. **Variants** — `default` · `truncated` (middle ellipsis).
4. **Anatomy** — Link · separator (chevron) · … · current (non-link).
5. **Props / Config** — `items[]` (label + href), `maxItems`.
6. **Visual Behavior** — `body-sm`, muted; current item emphasized, not linked.
7. **Interaction Rules** — Last item never a link.
8. **Accessibility** — `<nav aria-label="Breadcrumb">`, ordered list, current `aria-current="page"`.
9. **Responsive** — Collapses middle items under sm.
10. **Do** — Mirror real route hierarchy (incl. branch scope where relevant).
11. **Don't** — Don't use for steps/wizards (use a stepper).
12. **Usage** — PageHeader on nested pages.

## Tabs
1. **Purpose** — Switch between sibling views within one page/context.
2. **Responsibilities** — Tab list + active panel; URL-syncable.
3. **Variants** — `underline` (default) · `segmented` · `scrollable` (overflow).
4. **Anatomy** — Tab list (role=tablist) → tabs → panels.
5. **Props / Config** — `tabs[]`, `value`, `onChange`, `syncToUrl`.
6. **Visual Behavior** — Active tab uses brand indicator (underline/segment), not volt text alone.
7. **Interaction Rules** — Arrow keys move between tabs; Home/End jump; activation on focus or click per `activation` mode.
8. **Accessibility** — Full WAI-ARIA tabs pattern (`tablist/tab/tabpanel`, `aria-selected`, `aria-controls`).
9. **Responsive** — Overflow scrolls horizontally; never wraps to two rows.
10. **Do** — Keep ≤6 tabs; sync to URL for deep-linking.
11. **Don't** — Don't use tabs for primary navigation; don't hide critical actions in inactive tabs without indication.
12. **Usage** — Member profile (Overview/Memberships/Payments/Notes).

## ActionMenu
1. **Purpose** — Overflow/contextual menu of actions ("…" / dropdown).
2. **Responsibilities** — Houses secondary actions, destructive actions (separated), and row/page overflow.
3. **Variants** — `icon-trigger` (kebab) · `button-trigger` · `with-sections` · `with-destructive`.
4. **Anatomy** — Trigger → popover → grouped MenuItems (icon + label + optional shortcut) → destructive group.
5. **Props / Config** — `trigger`, `items[]` (label, icon, onSelect, variant, disabled).
6. **Visual Behavior** — Destructive items use danger `*-text` token, visually separated.
7. **Interaction Rules** — Opens on click; arrow-key navigation; Esc closes; destructive items may require ConfirmationDialog.
8. **Accessibility** — `menu`/`menuitem` roles, `aria-haspopup`, focus returns to trigger on close.
9. **Responsive** — On mobile may present as a bottom sheet.
10. **Do** — Use for >1 secondary action; always reuse for table-row actions.
11. **Don't** — Don't bury the primary action here; don't trigger destructive actions without confirmation.
12. **Usage** — Table rows, PageHeader overflow, card menus.

---

# 3. Dashboard Components

## StatCard
1. **Purpose** — Display a single KPI with context.
2. **Responsibilities** — Render label (eyebrow), MetricValue (mono tabular), and a sentiment-aware delta.
3. **Variants** — `default` · `with-delta` · `with-sparkline` · `compact`.
4. **Anatomy** — Eyebrow label · MetricValue · delta row (arrow + value) · optional sparkline.
5. **Props / Config** — `label`, `value`, `format`, `delta`, `sentiment` (positive/negative/neutral — **decoupled from direction**, audit fix), `icon`.
6. **Visual Behavior** — Brand left accent-bar; value uses `metric` mono token.
7. **Interaction Rules** — Optional click navigates to the filtered source list.
8. **Accessibility** — Label + value associated; delta has text equivalent ("up 12% vs last month"), not color alone.
9. **Responsive** — Fills its KPIGrid cell; value never truncates.
10. **Do** — Always set `sentiment` explicitly per metric.
11. **Don't** — Don't assume down=bad; don't put non-numeric content in MetricValue.
12. **Usage** — KPIGrid: Active Members, Expiring 7d, New This Month, Revenue MTD.

## FeaturedStatCard
1. **Purpose** — A single emphasized hero metric (the dashboard's focal number).
2. **Responsibilities** — Larger StatCard with stronger brand treatment and richer context.
3. **Variants** — `default` · `with-trend` · `with-breakdown`.
4. **Anatomy** — As StatCard at larger scale + secondary stat row/mini-chart.
5. **Props / Config** — Extends StatCard with `trend[]`, `breakdown[]`.
6. **Visual Behavior** — `surface-raised` + full brand left-bar; `display-xl` value.
7. **Interaction Rules** — Same as StatCard.
8. **Accessibility** — Same; trend/breakdown have accessible summaries.
9. **Responsive** — Spans 2 columns on lg, full width on mobile.
10. **Do** — Use at most one per dashboard.
11. **Don't** — Don't use volt as readable text; don't feature more than one.
12. **Usage** — Top-left of the dashboard (e.g., Revenue MTD).

## KPIGrid
1. **Purpose** — Arrange StatCards consistently.
2. **Responsibilities** — Count-agnostic responsive grid for KPIs (audit fix — not hardcoded to 4).
3. **Variants** — `auto` (default) · `fixed-4`.
4. **Anatomy** — Grid → StatCard/FeaturedStatCard children.
5. **Props / Config** — `minCardWidth`, `gap`, `children`.
6. **Visual Behavior** — Auto-fit columns at min track width.
7. **Interaction Rules** — None.
8. **Accessibility** — Source order = visual order.
9. **Responsive** — 4→2→1 columns by viewport via auto-fit.
10. **Do** — Use `auto` so any KPI count flows.
11. **Don't** — Don't hardcode 4 columns.
12. **Usage** — Dashboard header band.

## InsightCard
1. **Purpose** — Surface a derived insight or recommended action.
2. **Responsibilities** — Title + supporting text + optional CTA; optional severity accent.
3. **Variants** — `info` · `success` · `warning` · `action` (with CTA).
4. **Anatomy** — Icon · title · body · optional CTA button · optional dismiss.
5. **Props / Config** — `severity`, `title`, `body`, `cta`, `dismissible`.
6. **Visual Behavior** — Severity via accessible status tokens + icon (not color alone).
7. **Interaction Rules** — CTA performs one clear action; dismiss persists if configured.
8. **Accessibility** — Non-urgent: normal flow; urgent: `aria-live` polite.
9. **Responsive** — Full width on mobile.
10. **Do** — Make insights actionable.
11. **Don't** — Don't stack many; don't use for raw alerts (use Alert).
12. **Usage** — "12 memberships expire this week — review renewals."

## ActivityFeed
1. **Purpose** — Chronological list of recent system/user events.
2. **Responsibilities** — Render time-ordered items with actor, action, target, Timestamp.
3. **Variants** — `default` · `compact` · `grouped-by-day`.
4. **Anatomy** — Vertical list → ActivityItem (Avatar · text · Timestamp) · optional connector line.
5. **Props / Config** — `items[]`, `grouping`, `emptyState`.
6. **Visual Behavior** — Relative timestamps; quiet dividers.
7. **Interaction Rules** — Items may link to the related entity.
8. **Accessibility** — `<ul>`/`<li>`; timestamps use `<time datetime>`.
9. **Responsive** — Single column; text wraps.
10. **Do** — Provide EmptyState when no activity.
11. **Don't** — Don't use as a notification system (that's NotificationCenter).
12. **Usage** — Dashboard side column.

---

# 4. Data Components

## DataTable
1. **Purpose** — Canonical tabular display for entity lists (members, memberships, payments).
2. **Responsibilities** — Columns, rows, sort, selection, density, sticky header, loading/empty, responsive fallback. The **only** table in the system.
3. **Variants** — `default` · `selectable` (checkboxes + bulk bar) · `compact` (default for large lists) · `with-toolbar`.
4. **Anatomy** — DataTableToolbar (optional) → header (sticky, sentence-case 12–13px) → rows → footer (Pagination). Numeric columns right-aligned mono tabular.
5. **Props / Config** — `columns[]` (key, header, align, sortable, render, priority), `rows[]`, `selection`, `sort`, `density`, `loading`, `empty`, `onRowClick`.
6. **Visual Behavior** — Hairline row separators; selected/focused row shows brand left-bar via **row-level** indicator (audit fix — not first-cell shadow).
7. **Interaction Rules** — Sortable headers toggle asc/desc/none; row hover **and focus** both show indicator; selectable shows bulk-action bar; row click configurable.
8. **Accessibility** — Semantic `<table>`; `scope` on headers; sort state `aria-sort`; selection checkboxes labeled; keyboard row navigation.
9. **Responsive** — Below md: horizontal scroll with sticky first column **or** stacked-card layout via column `priority` (audit fix — tables must be usable on mobile).
10. **Do** — Use for all entity lists; drive everything from `columns[]`.
11. **Don't** — Don't build bespoke tables; don't render money/dates in non-mono; don't leave mobile undefined.
12. **Usage** — Members list, Payments list, Memberships list.

## DataTableToolbar
1. **Purpose** — Controls strip above a DataTable.
2. **Responsibilities** — Hosts SearchBar, FilterBar, SortControl, density toggle, bulk actions, primary list action.
3. **Variants** — `default` · `with-bulk-actions` · `minimal`.
4. **Anatomy** — Left: search + filters. Right: sort · density · primary action.
5. **Props / Config** — `search`, `filters`, `sort`, `actions`, `selectionCount`.
6. **Visual Behavior** — When rows selected, transforms to a bulk-action bar showing count.
7. **Interaction Rules** — Filter/sort changes update the table and URL query.
8. **Accessibility** — Controls grouped and labeled; selection count announced.
9. **Responsive** — Filters collapse into a "Filters" popover under md.
10. **Do** — Reuse for every table.
11. **Don't** — Don't scatter table controls outside the toolbar.
12. **Usage** — Above every DataTable.

## SearchBar
1. **Purpose** — Free-text search input.
2. **Responsibilities** — Debounced query input with clear button and optional scope.
3. **Variants** — `global` (TopBar) · `inline` (toolbar) · `with-scope`.
4. **Anatomy** — Search icon · input · clear (×) · optional scope select.
5. **Props / Config** — `value`, `onChange`, `placeholder`, `debounceMs`, `scope`.
6. **Visual Behavior** — PULSE input styling; brand focus ring.
7. **Interaction Rules** — Debounced (~300ms); Esc clears; Enter submits where applicable.
8. **Accessibility** — `role="search"`, labeled input, clear button labeled.
9. **Responsive** — Global variant collapses to icon under md.
10. **Do** — Reuse everywhere search is needed.
11. **Don't** — Don't build raw search inputs.
12. **Usage** — TopBar global search, table toolbars.

## FilterBar
1. **Purpose** — Apply structured filters to a dataset.
2. **Responsibilities** — Render filter controls (select, date range, status), show active-filter chips, clear-all.
3. **Variants** — `inline` · `popover` (mobile/compact) · `with-chips`.
4. **Anatomy** — Filter controls → active-filter chips → "Clear all".
5. **Props / Config** — `filters[]` (field, type, options), `value`, `onChange`.
6. **Visual Behavior** — Active filters shown as removable chips (`radius-xs`).
7. **Interaction Rules** — Changes update table + URL; chips remove individual filters.
8. **Accessibility** — Each control labeled; chips removable by keyboard.
9. **Responsive** — Collapses into a "Filters" popover with a count badge under md.
10. **Do** — Reflect filters in the URL for shareable views.
11. **Don't** — Don't hide the active-filter state.
12. **Usage** — Members/Payments filtering.

## SortControl
1. **Purpose** — Choose sort field/direction (esp. on mobile where header-sort is hard).
2. **Responsibilities** — Surface sortable fields + direction toggle.
3. **Variants** — `dropdown` · `header-integrated` (desktop).
4. **Anatomy** — Field select · asc/desc toggle.
5. **Props / Config** — `fields[]`, `value` (field+dir), `onChange`.
6. **Visual Behavior** — Active field shows direction arrow.
7. **Interaction Rules** — Mutually exclusive single-field sort (MVP).
8. **Accessibility** — Reflects/controls table `aria-sort`.
9. **Responsive** — Dropdown variant is primary on mobile.
10. **Do** — Keep in sync with header sort state.
11. **Don't** — Don't offer sort options the table can't honor.
12. **Usage** — DataTableToolbar.

## Pagination
1. **Purpose** — Navigate paged datasets.
2. **Responsibilities** — Page controls + page-size select + range summary.
3. **Variants** — `numbered` · `prev-next` · `load-more`.
4. **Anatomy** — Range text ("1–25 of 312", mono) · prev/next · page numbers · size select.
5. **Props / Config** — `page`, `pageSize`, `total`, `sizes[]`, `onChange`.
6. **Visual Behavior** — Counts use mono tabular; current page emphasized.
7. **Interaction Rules** — Disabled at bounds; size change resets to page 1; syncs to URL.
8. **Accessibility** — `nav aria-label="Pagination"`; current `aria-current="page"`; disabled states real.
9. **Responsive** — Collapses to prev/next + range under sm.
10. **Do** — Always pair with DataTable for >1 page.
11. **Don't** — Don't load unbounded rows without paging.
12. **Usage** — DataTable footer.

## EmptyState
1. **Purpose** — Communicate a section has no data **yet** and guide the first action.
2. **Responsibilities** — Icon/illustration + headline + supporting text + primary CTA.
3. **Variants** — `default` · `with-cta` · `compact` (inline).
4. **Anatomy** — Icon · headline (`heading-2`) · description · CTA.
5. **Props / Config** — `icon`, `title`, `description`, `action`.
6. **Visual Behavior** — Centered, generous spacing, muted.
7. **Interaction Rules** — CTA starts the create flow.
8. **Accessibility** — Heading conveys state; CTA is a real button/link.
9. **Responsive** — Scales down gracefully.
10. **Do** — Always provide for first-run lists/dashboards.
11. **Don't** — Confuse with NoResultsState (that's filtered-empty).
12. **Usage** — "No members yet — add your first member."

## NoResultsState
1. **Purpose** — Communicate that **filters/search** returned nothing.
2. **Responsibilities** — Explain zero matches + offer "clear filters".
3. **Variants** — `default` · `with-clear`.
4. **Anatomy** — Icon · "No results" · active-criteria summary · clear-filters action.
5. **Props / Config** — `query`, `onClearFilters`.
6. **Visual Behavior** — Quieter than EmptyState; no create CTA.
7. **Interaction Rules** — Clear-filters resets FilterBar/SearchBar.
8. **Accessibility** — Announced via `aria-live` when results change to zero.
9. **Responsive** — Same as EmptyState.
10. **Do** — Offer a way back to results.
11. **Don't** — Don't show a "create" CTA here.
12. **Usage** — Filtered table with no matches.

---

# 5. Member Components

## MemberCard
1. **Purpose** — Compact member summary in lists/grids.
2. **Responsibilities** — Avatar, name, key meta, MembershipStatusBadge, AssignedTrainerBadge, quick actions.
3. **Variants** — `default` · `compact` · `selectable`.
4. **Anatomy** — Avatar · name + meta · status badge · trainer badge · ActionMenu.
5. **Props / Config** — `member`, `onClick`, `actions`, `selected`.
6. **Visual Behavior** — Interactive card hover; selected shows brand left-bar.
7. **Interaction Rules** — Click → member profile; actions via ActionMenu.
8. **Accessibility** — Whole card has an accessible name; actions individually labeled.
9. **Responsive** — Grid item; stacks meta on mobile.
10. **Do** — Reuse for any member representation in a grid.
11. **Don't** — Don't duplicate as a bespoke card; don't put raw status text (use the badge).
12. **Usage** — Members grid view, trainer's member list.

## MemberProfileHeader
1. **Purpose** — Identity header on the member detail page.
2. **Responsibilities** — Large avatar, name, status, key facts, primary actions, Tabs dock.
3. **Variants** — `default` · `with-tabs`.
4. **Anatomy** — Avatar (lg) · name + MembershipStatusBadge + AssignedTrainerBadge · meta row · actions · Tabs.
5. **Props / Config** — `member`, `primaryAction`, `actions`, `tabs`.
6. **Visual Behavior** — Sits at top of profile; acts as PageHeader for the member.
7. **Interaction Rules** — Primary action context-aware (e.g., "Renew"/"New Membership").
8. **Accessibility** — Member name is the page `<h1>`.
9. **Responsive** — Avatar shrinks; actions move to ActionMenu under sm.
10. **Do** — Use once per member page.
11. **Don't** — Don't duplicate identity info below.
12. **Usage** — Member detail page top.

## MemberInfoPanel
1. **Purpose** — Structured display of member attributes.
2. **Responsibilities** — Render labeled field/value pairs (contact, demographics, join date).
3. **Variants** — `default` · `two-column` · `editable` (inline edit entry points).
4. **Anatomy** — Card → definition list of label/value rows.
5. **Props / Config** — `fields[]`, `editable`, `onEditField`.
6. **Visual Behavior** — Labels muted; values `body`; dates/IDs mono.
7. **Interaction Rules** — Edit affordance opens the appropriate form/field.
8. **Accessibility** — `<dl>/<dt>/<dd>` semantics.
9. **Responsive** — Two-column collapses to one.
10. **Do** — Use for read display of member data.
11. **Don't** — Don't mix in editable inputs without the editable variant.
12. **Usage** — Member profile overview tab.

## AssignedTrainerBadge
1. **Purpose** — Show a member's assigned trainer (optional relationship).
2. **Responsibilities** — Render trainer mini-identity or an "Unassigned" state.
3. **Variants** — `assigned` (avatar + name) · `unassigned` (muted) · `assignable` (opens picker).
4. **Anatomy** — Small Avatar · trainer name · optional change affordance.
5. **Props / Config** — `trainer | null`, `assignable`, `onAssign`.
6. **Visual Behavior** — Unassigned is clearly muted, not empty.
7. **Interaction Rules** — Assignable opens a trainer picker (ActionMenu/dialog).
8. **Accessibility** — Conveys assignment in text, not color.
9. **Responsive** — Truncates name with tooltip.
10. **Do** — Use wherever trainer assignment appears.
11. **Don't** — Don't invent ad-hoc trainer chips.
12. **Usage** — MemberCard, MemberProfileHeader.

## MembershipStatusBadge
1. **Purpose** — Canonical visual for membership lifecycle state.
2. **Responsibilities** — Map status → accessible status token + label + dot/icon.
3. **Variants** — `active` (success) · `expiring` (warning) · `expired` (danger) · `frozen` (info) · `cancelled` (danger, distinct icon).
4. **Anatomy** — Status dot/icon · uppercase label · accessible `*-text` on tint.
5. **Props / Config** — `status`, `size`.
6. **Visual Behavior** — Built on StatusBadge with the membership status map; meets contrast (audit fix).
7. **Interaction Rules** — Display-only.
8. **Accessibility** — Text label always present; never color-only; ≥4.5:1.
9. **Responsive** — Constant.
10. **Do** — Use everywhere membership status is shown.
11. **Don't** — Don't render raw colored text; don't invent new statuses outside the model.
12. **Usage** — Tables, cards, profile.

---

# 6. Membership Components

## MembershipCard
1. **Purpose** — Summarize one membership (current or historical).
2. **Responsibilities** — Plan, PlanBadge, period (start–end), status, price snapshot, actions (renew/upgrade/freeze/cancel).
3. **Variants** — `current` · `historical` (muted) · `compact`.
4. **Anatomy** — PlanBadge · date range (mono) · MembershipStatusBadge · price (mono) · ActionMenu.
5. **Props / Config** — `membership`, `actions`, `variant`.
6. **Visual Behavior** — Current uses brand left-bar; historical muted.
7. **Interaction Rules** — Actions gated by status (can't renew a cancelled one) and role.
8. **Accessibility** — Dates as `<time>`; price labeled with currency.
9. **Responsive** — Stacks fields on mobile.
10. **Do** — Show snapshotted price/plan, not live plan values.
11. **Don't** — Don't expose actions invalid for the status/role.
12. **Usage** — Member profile Memberships tab.

## MembershipTimeline
1. **Purpose** — Chronological history of a member's memberships (renewals, upgrades, freezes).
2. **Responsibilities** — Ordered events with type, dates, and UpgradeIndicator where relevant.
3. **Variants** — `default` · `compact`.
4. **Anatomy** — Vertical timeline → nodes (event type icon · label · dates) · connectors.
5. **Props / Config** — `events[]`, `density`.
6. **Visual Behavior** — Current period emphasized; gaps/freezes visually distinct.
7. **Interaction Rules** — Nodes may link to the membership/payment.
8. **Accessibility** — Ordered list; dates in `<time>`; event type in text.
9. **Responsive** — Single column; condenses labels.
10. **Do** — Use to make renewal/upgrade history legible.
11. **Don't** — Don't conflate with PaymentSummary.
12. **Usage** — Member profile, membership detail.

## PlanBadge
1. **Purpose** — Identify a membership plan compactly.
2. **Responsibilities** — Render plan name (+ optional tier accent) consistently.
3. **Variants** — `default` · `tier-accented` · `inactive` (retired plan).
4. **Anatomy** — Optional tier dot · plan name.
5. **Props / Config** — `plan`, `showTier`.
6. **Visual Behavior** — Neutral by default; tier accent uses data-viz palette, not status colors.
7. **Interaction Rules** — Display-only (may link to plan).
8. **Accessibility** — Name in text; tier not color-only.
9. **Responsive** — Truncates with tooltip.
10. **Do** — Reuse wherever a plan is named.
11. **Don't** — Don't use status colors for tiers.
12. **Usage** — MembershipCard, tables.

## UpgradeIndicator
1. **Purpose** — Mark a membership change as an upgrade (or downgrade).
2. **Responsibilities** — Show direction (from-plan → to-plan) with clear semantics.
3. **Variants** — `upgrade` · `downgrade` · `renewal-same`.
4. **Anatomy** — From PlanBadge · arrow · To PlanBadge · direction label.
5. **Props / Config** — `from`, `to`, `direction`.
6. **Visual Behavior** — Direction conveyed by icon + label (sentiment decoupled from color).
7. **Interaction Rules** — Display-only.
8. **Accessibility** — Direction stated in text ("Upgraded from X to Y").
9. **Responsive** — Stacks vertically on mobile.
10. **Do** — Use in timeline/history for plan changes.
11. **Don't** — Don't imply value judgment by color alone.
12. **Usage** — MembershipTimeline.

---

# 7. Payment Components

## PaymentCard
1. **Purpose** — Represent a single recorded payment.
2. **Responsibilities** — Amount, date, method (manual), linked membership, paid/unpaid status.
3. **Variants** — `paid` · `unpaid` · `refunded` (future) · `compact`.
4. **Anatomy** — Amount (mono, prominent) · date (`<time>`) · status badge · linked membership · ActionMenu.
5. **Props / Config** — `payment`, `actions`.
6. **Visual Behavior** — Amount uses mono tabular; status via accessible badge.
7. **Interaction Rules** — Mark paid/unpaid gated by role (Owner).
8. **Accessibility** — Currency announced; status in text.
9. **Responsive** — Amount stays prominent; meta stacks.
10. **Do** — Show captured amount/currency snapshot.
11. **Don't** — Don't imply gateway processing (MVP records only).
12. **Usage** — Payments list, member Payments tab.

## PaymentSummary
1. **Purpose** — Aggregate payment totals for a context (member, period).
2. **Responsibilities** — Totals (paid/outstanding), counts, optional breakdown.
3. **Variants** — `member-scope` · `period-scope` · `compact`.
4. **Anatomy** — Summary rows (label · mono amount) · totals · optional mini-breakdown.
5. **Props / Config** — `totals`, `breakdown`, `scope`.
6. **Visual Behavior** — Outstanding uses warning `*-text`; all amounts mono.
7. **Interaction Rules** — Display-only; may link to filtered Payments.
8. **Accessibility** — Amounts labeled; totals emphasized in text.
9. **Responsive** — Single column.
10. **Do** — Reuse for any payment rollup.
11. **Don't** — Don't reinvent totals layouts.
12. **Usage** — Member profile, billing views.

## RevenueWidget
1. **Purpose** — Visualize revenue over time on the dashboard.
2. **Responsibilities** — Chart + headline metric + period selector.
3. **Variants** — `line` · `bar` · `sparkline` (compact).
4. **Anatomy** — Header (metric + delta + period select) · chart (data-viz tokens) · legend.
5. **Props / Config** — `series[]`, `period`, `format`, `onPeriodChange`.
6. **Visual Behavior** — Uses the **data-viz palette** (audit fix), brand for primary series; ink grid; mono axis labels.
7. **Interaction Rules** — Hover/focus tooltips; period select updates data.
8. **Accessibility** — Chart has a text/table alternative; not color-only series; keyboard-reachable data points.
9. **Responsive** — Chart reflows; legend wraps; sparkline variant on small cards.
10. **Do** — Provide an accessible data summary.
11. **Don't** — Don't render multi-series with status colors; don't ship a chart with no text alternative.
12. **Usage** — Dashboard revenue panel.

---

# 8. Notification Components

## NotificationItem
1. **Purpose** — A single in-app notification row.
2. **Responsibilities** — Icon/type, message, Timestamp, read/unread state, optional action.
3. **Variants** — `unread` · `read` · `with-action` · severity-tinted.
4. **Anatomy** — Type icon · message · Timestamp · unread dot · optional CTA/ActionMenu.
5. **Props / Config** — `notification`, `onRead`, `onAction`.
6. **Visual Behavior** — Unread emphasized (weight + brand dot), not color-only.
7. **Interaction Rules** — Opening marks read; dismiss removes from active list.
8. **Accessibility** — Read state in text/`aria`; time in `<time>`.
9. **Responsive** — Full-width; message wraps.
10. **Do** — Reuse in NotificationCenter and any list.
11. **Don't** — Don't build bespoke notification rows.
12. **Usage** — NotificationCenter.

## NotificationCenter
1. **Purpose** — Panel listing notifications.
2. **Responsibilities** — Grouped list, mark-all-read, empty state, filter (all/unread).
3. **Variants** — `popover` (from TopBar) · `page` (full view).
4. **Anatomy** — Header (title · mark-all-read · filter) · NotificationItem list · footer ("view all").
5. **Props / Config** — `items[]`, `filter`, `onMarkAllRead`.
6. **Visual Behavior** — Unread grouped first; quiet dividers.
7. **Interaction Rules** — Opens from NotificationBadge; Esc closes popover; focus trapped in popover.
8. **Accessibility** — `aria-live` polite for new items; list semantics; focus returns to trigger.
9. **Responsive** — Popover becomes full-screen sheet under sm.
10. **Do** — Always provide EmptyState.
11. **Don't** — Don't mix with ActivityFeed semantics.
12. **Usage** — TopBar notifications.

## NotificationBadge
1. **Purpose** — Indicate unread count on a trigger.
2. **Responsibilities** — Render count/dot overlay with cap ("9+").
3. **Variants** — `dot` · `count` · `cap` (9+).
4. **Anatomy** — Host element · overlaid badge (mono count).
5. **Props / Config** — `count`, `max`, `showZeroAs` (hidden).
6. **Visual Behavior** — Brand/danger dot; count in mono.
7. **Interaction Rules** — Reflects live unread count.
8. **Accessibility** — Count in accessible name ("3 unread notifications"); not color-only.
9. **Responsive** — Constant.
10. **Do** — Reuse on bell, nav items, tabs.
11. **Don't** — Don't show "0"; don't use as a decorative dot elsewhere.
12. **Usage** — TopBar bell, NavItem counts.

---

# 9. Form Components

## FormLayout
1. **Purpose** — Standard structure/spacing for all forms.
2. **Responsibilities** — Constrain width, stack FormSections, host a sticky action bar.
3. **Variants** — `single-column` (default, ~640px) · `two-column-region` (short related fields) · `wizard`.
4. **Anatomy** — Form title (optional) → FormSections → sticky footer (submit/cancel).
5. **Props / Config** — `width`, `onSubmit`, `actions`, `children`.
6. **Visual Behavior** — Section gap `2rem`; sticky action bar on long forms.
7. **Interaction Rules** — Submit disabled while invalid/loading; prevents double-submit.
8. **Accessibility** — `<form>`; errors summarized at top and linked to fields.
9. **Responsive** — Two-column region collapses to one; action bar full-width.
10. **Do** — Use for every create/edit form.
11. **Don't** — Don't hand-space forms; don't omit cancel.
12. **Usage** — Member create/edit, Plan create, Membership sell.

## FormSection
1. **Purpose** — Group related fields with a label.
2. **Responsibilities** — Eyebrow/title + description + grouped FormFields.
3. **Variants** — `default` · `collapsible` · `card` (boxed).
4. **Anatomy** — Section header (SectionHeader-style) → FormField stack.
5. **Props / Config** — `title`, `description`, `collapsible`, `children`.
6. **Visual Behavior** — Clear separation between sections.
7. **Interaction Rules** — Collapsible remembers state in long forms.
8. **Accessibility** — `<fieldset>/<legend>` for grouped inputs.
9. **Responsive** — Stacks naturally.
10. **Do** — Group logically (Contact, Plan, Schedule).
11. **Don't** — Don't over-fragment short forms.
12. **Usage** — Within FormLayout.

## FormField
1. **Purpose** — Wrapper binding label, control, help, and error.
2. **Responsibilities** — Associate label↔control, render required indicator, help text, and validation error consistently.
3. **Variants** — `default` · `inline` · `with-help`.
4. **Anatomy** — Label (+ required glyph **and text**, audit fix) · control slot · help/error.
5. **Props / Config** — `label`, `name`, `required`, `help`, `error`, `children`.
6. **Visual Behavior** — Error sets control to danger + message below; required uses visible glyph + `aria-required`, not color-only.
7. **Interaction Rules** — Error appears on blur/submit per form policy.
8. **Accessibility** — `htmlFor`/`id` association; `aria-describedby` for help/error; `aria-invalid` on error.
9. **Responsive** — Full-width control.
10. **Do** — Wrap **every** input in FormField.
11. **Don't** — Don't place bare inputs without label association.
12. **Usage** — Around every input below.

## TextInput
1. **Purpose** — Single-line text entry.
2. **Responsibilities** — Standard PULSE text input behavior/validation hooks.
3. **Variants** — `default` · `with-prefix/suffix` · `with-icon`.
4. **Anatomy** — Optional prefix · input · optional suffix/clear.
5. **Props / Config** — `value`, `onChange`, `placeholder`, `maxLength`, `disabled`, `error`.
6. **Visual Behavior** — `2.75rem` height; brand focus ring; danger on error.
7. **Interaction Rules** — Standard text editing; trims per policy.
8. **Accessibility** — Labeled via FormField; placeholder is not a label.
9. **Responsive** — Full-width.
10. **Do** — Use for names, emails, free text.
11. **Don't** — Don't repurpose for currency/date (use specialized inputs).
12. **Usage** — Member name, email.

## SelectInput
1. **Purpose** — Choose one option from a list.
2. **Responsibilities** — Accessible select/combobox with chevron and optional search.
3. **Variants** — `native` · `searchable` (combobox) · `grouped`.
4. **Anatomy** — Trigger (value + chevron) → listbox → options.
5. **Props / Config** — `options[]`, `value`, `onChange`, `searchable`, `placeholder`.
6. **Visual Behavior** — Distinct from TextInput (chevron affordance, audit fix).
7. **Interaction Rules** — Arrow keys navigate; type-ahead; Esc closes.
8. **Accessibility** — Listbox/combobox ARIA; selected announced.
9. **Responsive** — May open as sheet on mobile.
10. **Do** — Use for plans, trainers, statuses.
11. **Don't** — Don't use for free text.
12. **Usage** — Plan picker, trainer assignment.

## DateInput
1. **Purpose** — Enter/select a date (or range).
2. **Responsibilities** — Calendar picker + typed entry, range support.
3. **Variants** — `single` · `range` · `with-presets` (Today, 30 days).
4. **Anatomy** — Input (mono date) · calendar popover · optional presets.
5. **Props / Config** — `value`, `onChange`, `min`, `max`, `range`, `timezone`.
6. **Visual Behavior** — Date shown in mono; respects gym timezone.
7. **Interaction Rules** — Keyboard-enterable; calendar navigable by arrows.
8. **Accessibility** — Grid pattern for calendar; labeled; announced selection.
9. **Responsive** — Calendar as sheet on mobile.
10. **Do** — Use for membership start/end, report ranges.
11. **Don't** — Don't use plain TextInput for dates.
12. **Usage** — Membership dates, report filters.

## CurrencyInput
1. **Purpose** — Enter monetary amounts safely.
2. **Responsibilities** — Currency symbol, decimal handling, integer-minor-unit safety, locale formatting.
3. **Variants** — `default` · `with-currency-select`.
4. **Anatomy** — Currency prefix · mono numeric input.
5. **Props / Config** — `value` (minor units), `currency`, `onChange`, `min`.
6. **Visual Behavior** — Mono tabular; right-aligned numerals.
7. **Interaction Rules** — Rejects invalid chars; formats on blur; never uses floats.
8. **Accessibility** — Currency in accessible name; numeric input mode on mobile.
9. **Responsive** — Numeric keypad on mobile.
10. **Do** — Use for all money entry.
11. **Don't** — Don't store/display money as float; don't use TextInput.
12. **Usage** — Plan price, payment amount.

## TextArea
1. **Purpose** — Multi-line text entry.
2. **Responsibilities** — Auto-grow, min/max height, char count.
3. **Variants** — `default` · `auto-grow` · `with-counter`.
4. **Anatomy** — Multi-line field · optional counter.
5. **Props / Config** — `value`, `onChange`, `rows`, `maxLength`.
6. **Visual Behavior** — Min-height not fixed-height (audit fix — distinct from TextInput).
7. **Interaction Rules** — Grows with content to a max, then scrolls.
8. **Accessibility** — Labeled; counter announced politely.
9. **Responsive** — Full-width.
10. **Do** — Use for notes/descriptions.
11. **Don't** — Don't apply input fixed-height styling.
12. **Usage** — MemberNote body, plan description.

## Checkbox
1. **Purpose** — Boolean or multi-select choice.
2. **Responsibilities** — Checked/unchecked/indeterminate with label.
3. **Variants** — `single` · `group` · `indeterminate`.
4. **Anatomy** — Box (brand when checked) · label.
5. **Props / Config** — `checked`, `indeterminate`, `onChange`, `label`, `disabled`.
6. **Visual Behavior** — Brand fill when checked; visible focus ring; ≥`1rem` box, `2.75rem` hit area.
7. **Interaction Rules** — Space toggles; group supports select-all (indeterminate).
8. **Accessibility** — Real `<input type=checkbox>` semantics; label clickable.
9. **Responsive** — Adequate touch target.
10. **Do** — Use for table select-all, multi-select filters.
11. **Don't** — Don't use for mutually exclusive choices (use RadioGroup).
12. **Usage** — DataTable selection, settings toggles.

## RadioGroup
1. **Purpose** — Choose exactly one from a small set.
2. **Responsibilities** — Mutually exclusive options with one label/legend.
3. **Variants** — `vertical` · `horizontal` · `card-style`.
4. **Anatomy** — Legend · radio options (control + label).
5. **Props / Config** — `options[]`, `value`, `onChange`, `name`.
6. **Visual Behavior** — Brand selected indicator; card-style highlights selected card with brand bar.
7. **Interaction Rules** — Arrow keys move/select within group; one selected always.
8. **Accessibility** — `role="radiogroup"` + `<legend>`; roving tabindex.
9. **Responsive** — Stacks vertically on mobile.
10. **Do** — Use for ≤5 exclusive options.
11. **Don't** — Don't use for many options (use SelectInput).
12. **Usage** — Billing cycle, payment status.

---

# 10. Feedback Components

## Alert
1. **Purpose** — Inline contextual message within a page.
2. **Responsibilities** — Convey info/success/warning/danger with icon, text, optional action.
3. **Variants** — `info` · `success` · `warning` · `danger`; `with-action`, `dismissible`.
4. **Anatomy** — Status icon · title · body · optional action/dismiss.
5. **Props / Config** — `severity`, `title`, `body`, `action`, `dismissible`.
6. **Visual Behavior** — Accessible status tokens + icon (not color alone).
7. **Interaction Rules** — Persistent until dismissed/resolved.
8. **Accessibility** — `role="alert"` for urgent; `status` for non-urgent.
9. **Responsive** — Full-width; text wraps.
10. **Do** — Use for in-context, persistent messages.
11. **Don't** — Don't use for transient feedback (use Toast).
12. **Usage** — Form-level validation summary, page warnings.

## Toast
1. **Purpose** — Transient, non-blocking confirmation/notice.
2. **Responsibilities** — Brief auto-dismissing message after an action.
3. **Variants** — `success` · `error` · `info` · `with-action` (undo).
4. **Anatomy** — Icon · message · optional action · dismiss.
5. **Props / Config** — `severity`, `message`, `action`, `duration`.
6. **Visual Behavior** — Bottom/corner stack; auto-dismiss (~4s), pause on hover.
7. **Interaction Rules** — Action (e.g., Undo) optional; manually dismissible.
8. **Accessibility** — `aria-live` (polite/assertive by severity); not the only confirmation of critical results.
9. **Responsive** — Full-width bottom on mobile.
10. **Do** — Use for "Saved", "Payment recorded".
11. **Don't** — Don't put critical/irreversible info only in a toast.
12. **Usage** — After save/create/delete.

## ConfirmationDialog
1. **Purpose** — Confirm a consequential/destructive action.
2. **Responsibilities** — State consequences, require explicit confirm, support danger styling.
3. **Variants** — `default` · `destructive` · `with-input` (type-to-confirm).
4. **Anatomy** — Title · body (consequences) · cancel + confirm (danger if destructive).
5. **Props / Config** — `title`, `body`, `confirmLabel`, `variant`, `onConfirm`, `requireText`.
6. **Visual Behavior** — Destructive confirm uses danger button.
7. **Interaction Rules** — Esc/cancel dismisses; focus starts on safe action; type-to-confirm for high-risk.
8. **Accessibility** — `role="alertdialog"`, focus trapped, returns focus to trigger.
9. **Responsive** — Centered; full-width buttons on mobile.
10. **Do** — Use for cancel/delete/refund and irreversible changes.
11. **Don't** — Don't fire destructive actions without it.
12. **Usage** — Cancel membership, delete note, archive member.

## SuccessState
1. **Purpose** — Full-context success (post-flow/wizard completion).
2. **Responsibilities** — Confirm completion + next-step actions.
3. **Variants** — `default` · `with-actions` · `inline`.
4. **Anatomy** — Success icon · headline · summary · next actions.
5. **Props / Config** — `title`, `summary`, `actions`.
6. **Visual Behavior** — Success token accent + icon.
7. **Interaction Rules** — Offers logical next steps.
8. **Accessibility** — As a full-page flow-completion state it replaces the PageHeader, so its `title` renders the page's single `<h1>` (§7 — one `<h1>` per page) at the calm `heading-2` size; heading conveys success, not color-only.
9. **Responsive** — Centered, scales down.
10. **Do** — Use after multi-step flows.
11. **Don't** — Don't use for trivial saves (use Toast).
12. **Usage** — After membership-sale wizard.

## ErrorState
1. **Purpose** — Full-context error/failed-load with recovery.
2. **Responsibilities** — Explain failure + retry/support path.
3. **Variants** — `inline` · `page` (boundary) · `with-retry`.
4. **Anatomy** — Error icon · headline · explanation · retry action.
5. **Props / Config** — `title`, `description`, `onRetry`.
6. **Visual Behavior** — Danger accent + icon; calm, non-alarming copy.
7. **Interaction Rules** — Retry re-runs the failed operation.
8. **Accessibility** — `role="alert"`; actionable.
9. **Responsive** — Centered.
10. **Do** — Use for failed loads/actions and error boundaries.
11. **Don't** — Don't dead-end without a recovery path.
12. **Usage** — Failed data fetch, route error boundary.

## LoadingState
1. **Purpose** — Communicate in-progress loading for a region/page.
2. **Responsibilities** — Spinner or Skeleton with optional label; prevents layout shift.
3. **Variants** — `spinner` · `skeleton` (preferred for content) · `inline` · `overlay`.
4. **Anatomy** — Indicator + optional label, sized to the awaited content.
5. **Props / Config** — `variant`, `label`, `size`.
6. **Visual Behavior** — Prefer Skeleton to reduce perceived latency and CLS.
7. **Interaction Rules** — Blocks interaction only in `overlay`.
8. **Accessibility** — `aria-busy`/`role="status"`; label for context.
9. **Responsive** — Matches target region.
10. **Do** — Use for every async region.
11. **Don't** — Don't leave blank screens; don't cause layout jump.
12. **Usage** — Table/dashboard loads.

## Skeleton
1. **Purpose** — Placeholder mimicking content shape while loading.
2. **Responsibilities** — Render shimmer blocks matching final layout.
3. **Variants** — `text` · `card` · `table-row` · `stat` · `avatar`. *Implemented (Pilot Readiness) as composable exports of `loading-state.tsx`: `Skeleton` (base block), `SkeletonText`, `SkeletonPageHeader`, `SkeletonTable` (toolbar + rows), `SkeletonStat`/`SkeletonKpiGrid`, `SkeletonForm`. `avatar` remains specified/unshipped (no consumer).*
4. **Anatomy** — Shaped placeholders matching target component.
5. **Props / Config** — `variant`, `count`, `width/height`.
6. **Visual Behavior** — Subtle shimmer via the token-owned `.skeleton` base (`pulse-shimmer` keyframe + `--duration-shimmer`, globals §5); RTL-aware sweep; honors reduced-motion (static fallback).
7. **Interaction Rules** — Non-interactive.
8. **Accessibility** — `aria-hidden`; parent carries `aria-busy`.
9. **Responsive** — Matches the component it stands in for.
10. **Do** — Provide a skeleton per major component (table, card, stat).
11. **Don't** — Don't mismatch skeleton vs final layout (causes shift).
12. **Usage** — DataTable, KPIGrid, MemberProfileHeader loading.

---

# 11. Utility Components

## Avatar
1. **Purpose** — Represent a person (member/trainer/user).
2. **Responsibilities** — Image with initials fallback, sizes, optional status ring.
3. **Variants** — `xs/sm/md/lg` · `with-status` · `group` (stacked).
4. **Anatomy** — Circular image / initials / optional ring.
5. **Props / Config** — `src`, `name`, `size`, `status`.
6. **Visual Behavior** — Deterministic initials background from name; `radius-full`.
7. **Interaction Rules** — Optionally links to profile.
8. **Accessibility** — `alt`/accessible name = person's name; decorative ring not sole indicator.
9. **Responsive** — Size tokens only.
10. **Do** — Use for all person representations.
11. **Don't** — Don't ship without initials fallback.
12. **Usage** — MemberCard, ActivityFeed, TopBar.

## StatusBadge
1. **Purpose** — Generic base for all status pills.
2. **Responsibilities** — Map a semantic status → accessible token + dot/icon + uppercase label. Base for MembershipStatusBadge and payment status.
3. **Variants** — `success · warning · danger · info · neutral`; sizes `sm/md`.
4. **Anatomy** — Status dot/icon · label · accessible `*-text` on tint, `radius-xs`.
5. **Props / Config** — `status`, `label`, `size`, `icon`.
6. **Visual Behavior** — Contrast-correct tokens (audit fix); sentence/upper label per system.
7. **Interaction Rules** — Display-only.
8. **Accessibility** — Always text label; ≥4.5:1; never color-only.
9. **Responsive** — Constant.
10. **Do** — Base all status pills on this.
11. **Don't** — Don't create new colored pills outside it.
12. **Usage** — Membership/payment/system statuses.

## MetricValue
1. **Purpose** — Render any data number consistently.
2. **Responsibilities** — Format numbers/money/percentages in mono tabular with units.
3. **Variants** — `number · currency · percent · duration`; sizes `sm/md/lg/xl`.
4. **Anatomy** — Formatted value (mono) + optional unit/affix.
5. **Props / Config** — `value`, `format`, `currency`, `size`.
6. **Visual Behavior** — JetBrains Mono, `tabular-nums`; right-alignable.
7. **Interaction Rules** — Display-only.
8. **Accessibility** — Full value in accessible text (not just abbreviated "1.2k").
9. **Responsive** — Size tokens.
10. **Do** — Use for **every** user-read number (audit/PULSE rule).
11. **Don't** — Don't render data numbers in body sans.
12. **Usage** — StatCard, tables, PaymentCard.

## CopyButton
1. **Purpose** — Copy a value (ID, email) to clipboard.
2. **Responsibilities** — Copy + transient confirmation.
3. **Variants** — `icon` · `with-label` · `inline-field`.
4. **Anatomy** — Copy icon (→ check on success) · optional label.
5. **Props / Config** — `value`, `label`, `onCopied`.
6. **Visual Behavior** — Brief success swap (icon → check), reduced-motion safe.
7. **Interaction Rules** — Click copies; confirmation auto-resets.
8. **Accessibility** — Accessible name ("Copy member ID"); success announced politely.
9. **Responsive** — Adequate touch target.
10. **Do** — Use for IDs/emails/links.
11. **Don't** — Don't copy without feedback.
12. **Usage** — Member ID, invite links.

## Timestamp
1. **Purpose** — Display dates/times consistently.
2. **Responsibilities** — Relative or absolute time, gym-timezone aware, hover for exact.
3. **Variants** — `relative` ("2h ago") · `absolute` · `datetime` · `date-only`.
4. **Anatomy** — `<time datetime>` text · optional tooltip with absolute value.
5. **Props / Config** — `value`, `format`, `timezone`, `relative`.
6. **Visual Behavior** — Mono for absolute/data contexts; muted in lists.
7. **Interaction Rules** — Hover/focus reveals exact time for relative.
8. **Accessibility** — Machine-readable `datetime`; full value available.
9. **Responsive** — Truncates to relative on small screens.
10. **Do** — Use for all dates/times; respect gym timezone.
11. **Don't** — Don't hand-format dates inline.
12. **Usage** — ActivityFeed, tables, payments.

## Divider
1. **Purpose** — Visual separation between content.
2. **Responsibilities** — Horizontal/vertical rule, optional label.
3. **Variants** — `horizontal` · `vertical` · `with-label`.
4. **Anatomy** — Hairline rule · optional centered label.
5. **Props / Config** — `orientation`, `label`, `spacing`.
6. **Visual Behavior** — Uses `border` token; consistent spacing tokens.
7. **Interaction Rules** — None (decorative).
8. **Accessibility** — `role="separator"`; labeled dividers expose text.
9. **Responsive** — Vertical collapses to horizontal in stacked layouts.
10. **Do** — Use token spacing around dividers.
11. **Don't** — Don't overuse; prefer whitespace first.
12. **Usage** — Menus, form sections, list groups.

---

# Component Usage Governance

> These rules are **binding** for all contributors, human and AI. They exist so dozens of future features stay visually and behaviorally consistent. Violations are defects.

## A. Mandatory Components (must be used; no alternatives)
The following are **required** wherever their purpose occurs — building a substitute is forbidden:
- **Layout:** AppShell, PageContainer, PageHeader on every authenticated page.
- **Data display:** **DataTable** for every tabular entity list. **MetricValue** for every user-read number. **Timestamp** for every date/time.
- **Status:** **StatusBadge** (and its derivatives) for every status indicator.
- **Forms:** **FormLayout + FormField** for every form and every input; **CurrencyInput** for all money; **DateInput** for all dates.
- **Feedback:** **ConfirmationDialog** before every destructive/irreversible action; **EmptyState/NoResultsState** for every empty data view; **Skeleton/LoadingState** for every async region.
- **Navigation:** **NavItem/NavGroup** for all navigation; **ActionMenu** for row/overflow actions.

## B. Components That May Never Be Duplicated (single canonical implementation)
There must be exactly **one** implementation of each; never fork, copy, or re-implement:
- DataTable, StatusBadge (and MembershipStatusBadge), MetricValue, Avatar, Timestamp, FormField, ConfirmationDialog, Toast, Pagination, SearchBar, EmptyState, NoResultsState, NotificationItem, CurrencyInput, DateInput.
- Rationale: these encode accessibility, formatting, tenancy, and money/date safety that must not diverge.

## C. Components That Must Always Be Reused (no bespoke variants)
When the need arises, compose these — do not invent a one-off:
- Any status pill → **StatusBadge**. Any KPI → **StatCard** in **KPIGrid**. Any person → **Avatar**. Any list of records → **DataTable** (or MemberCard grid). Any money figure → **CurrencyInput** (entry) / **MetricValue** (display). Any destructive action → **ConfirmationDialog**. Any transient confirmation → **Toast**. Any empty view → **EmptyState/NoResultsState**.

## D. Rules for Introducing a New Component
A new component may be added **only** when ALL hold:
1. **No existing component (or composition of them) covers the need.** Composition is always tried first and documented as insufficient.
2. **The pattern will recur** (used in ≥2 places or clearly will be). One-offs are composed inline from existing components, not catalogued.
3. **It is proposed to the catalog first** — added to this document (all 12 sections) **before** implementation. The catalog is updated in the same change.
4. **It uses only PULSE tokens** (via Tailwind utilities), inherits all Global Conventions (§0), and defines its full states matrix and accessibility/responsive behavior.
5. **It does not overlap** an existing component's purpose. Overlap = extend the existing one, not create a sibling.
6. **Human approval is required** for any net-new component. The AI must stop and ask.

## E. Rules for Modifying an Existing Component
1. **Backward-compatible by default.** Changes must not break existing usages; if a breaking change is unavoidable, it is a versioned, human-approved decision with a migration note.
2. **Update the catalog entry in the same change.** Code and catalog never diverge.
3. **Never weaken** accessibility, tenancy/scope handling, money/date safety, or the states matrix to satisfy a single screen.
4. **No screen-local overrides** of a shared component's internals. Need different behavior? Add a documented variant/prop, or compose around it.
5. **Tokens only.** No hardcoded values introduced during modification.

## F. Rules for AI-Generated UI Contributions (Claude Terminal)
1. **Catalog-first.** Before generating any UI, identify the components here that satisfy the screen and compose them. Reading this catalog + the target feature folder is sufficient context.
2. **Never invent inline.** Do not produce ad-hoc tables, badges, modals, inputs, or cards. If nothing fits, **stop and follow Rule D** (propose, get approval) — do not improvise.
3. **Reuse over creation, always.** Prefer composing existing components even if slightly more effort than a bespoke element.
4. **Tokens only, utilities only.** Use PULSE Tailwind utilities; never hardcode hex/px/font; never use volt as readable text; always use MetricValue/Timestamp/StatusBadge for numbers/dates/statuses.
5. **Inherit Global Conventions (§0)** automatically — focus ring, keyboard, reduced-motion, loading/empty states, responsive nav, branch context.
6. **Mandatory safety patterns:** ConfirmationDialog before destructive actions; FormField around every input; accessible status text; mobile-usable tables.
7. **Match the nearest existing screen** for structure and naming; consistency outranks novelty.
8. **When uncertain which component applies, ask** rather than inventing a pattern.
9. **A request that requires violating this catalog is refused with a citation** to the relevant rule; a deliberate catalog change is a separate, human-approved update to this document.
10. **Definition of done for any UI task includes:** uses only catalogued components, passes the states matrix, meets accessibility (§0.3–0.6), is responsive (§0.9), and adds no undocumented pattern.

---

---

# 12. v1.2 Adaptive Additions

> **Status: implemented** (v1.2 implementation slice, 2026-07-02 — `AdaptiveBottomSheet`
> `components/pulse/adaptive-bottom-sheet.tsx` + `FilterSheet` wrapper, `CreationFAB`
> `creation-fab.tsx`, `StickyMobileActionBar` `sticky-mobile-action-bar.tsx` (auto-applied by
> FormLayout's action row), DataTable card mode in `data-table.tsx`). These entries are the
> approved design authority; they are **additive** and backward-compatible (design-system-v1.2
> §2/§9). Every §0 Global Convention applies. Nothing in §1–§11 changes except the single
> backward-compatible DataTable enhancement in §12.4.

## 12.1 AdaptiveBottomSheet
1. **Purpose** — One overlay primitive that renders as a **centered Dialog/popover on desktop (≥md)**
   and a **bottom-anchored sheet on mobile (<md)**. The single home for AP-3/AP-4/AP-7.
2. **Responsibilities** — Own the adaptive overlay shell (scrim, focus trap, focus-return, dismiss),
   built on the existing `components/ui/sheet.tsx` Radix Dialog (already powering the nav drawer) — no
   new dependency, no new overlay a11y.
3. **Variants** — `dialog↔sheet` (default, forms/confirmations) · `menu↔sheet` (ActionMenu actions,
   AP-7) · `filter↔sheet` (FilterBar, AP-3) · `picker↔sheet` (SelectInput/DateInput on mobile).
4. **Anatomy** — Scrim · sheet surface (mobile: drag handle + top-rounded `--sheet-radius`, max
   `--sheet-max-h`, safe-area bottom inset) → header (title + close) → scrollable content → optional
   footer actions.
5. **Props / Config** — `open`, `onOpenChange`, `title`, `variant`, `children`, `footer`.
6. **Visual Behavior** — Mobile: slides up (`--duration-slow` + `--ease-emphasized`); desktop:
   standard dialog/popover entrance. Reduced-motion → fade/no-transform.
7. **Interaction Rules** — Esc closes; scrim tap closes; mobile drag-down closes **with** a tap/scrim
   fallback (never drag-only); returns focus to trigger.
8. **Accessibility** — Inherits v1.1 overlay gate: `role="dialog"`/`alertdialog`, `aria-modal`, focus
   trap, labeled by title. Content DOM order preserved across desktop/mobile.
9. **Responsive** — The `md` boundary flips dialog↔sheet; identical content and actions on both
   (adaptive-parity, design-system-v1.2 §5.11).
10. **Do** — Route **every** mobile overlay through this; keep desktop dialog behavior identical to today.
11. **Don't** — Don't hand-build a bottom sheet per screen; don't make drag the only dismiss; don't
    drop any desktop action on mobile.
12. **Usage** — Filters (AP-3), confirmations/pickers (AP-4), row/section overflow (AP-7), mobile
    Select/Date menus, NotificationCenter mobile.

## 12.2 CreationFAB
1. **Purpose** — Thumb-zone **create** action on mobile, scoped to list/index screens whose primary
   job is to create a new entity (design-system-v1.2 §5.2).
2. **Responsibilities** — Relocate the screen's single PageHeader primary "create" action into a
   floating bottom-trailing button on `<md` only.
3. **Variants** — `default` (icon + `aria-label`) · `extended` (icon + short label, first-run/empty).
4. **Anatomy** — Circular `--fab-size` button, brand fill + `--primary-foreground`, Lucide plus icon,
   bottom-trailing at `--fab-offset` above `--safe-bottom`, `--z-fab`.
5. **Props / Config** — `label` (accessible), `icon`, `href|onClick`.
6. **Visual Behavior** — Brand fill (an *action* color — compliant), solid focus ring, `--shadow-md`.
7. **Interaction Rules** — Single tap starts the create flow (same target as the desktop primary).
8. **Accessibility** — Real button/link with an accessible name ("Add member"); ≥44px; focus-visible;
   not the only path to create (the flow is also reachable via nav/empty-state CTA).
9. **Responsive** — **Mobile-only.** ≥md: hidden; the inline PageHeader primary is used instead.
10. **Do** — One per eligible list screen; mirror the desktop primary exactly.
11. **Don't** — Never on detail/form/dashboard/report/settings screens; never a second FAB; never
    coexist with a Sticky Mobile Action Bar; never overlap the last row (list gets bottom padding).
12. **Usage** — Members, Memberships, Plans, Staff list screens (mobile).

## 12.3 StickyMobileActionBar
1. **Purpose** — The primary **mobile** action pattern for **forms** (submit/cancel) and **detail
   pages** (primary action), pinned in the thumb zone (design-system-v1.2 §5.3).
2. **Responsibilities** — Keep the screen's primary (and at most one secondary) action reachable
   without scrolling back to the header; respect the safe-area inset and the on-screen keyboard.
3. **Variants** — `form` (Cancel + Submit; reuses SubmitButton `useFormStatus`) · `detail` (one
   primary + overflow) · `confirm` (destructive primary uses danger button).
4. **Anatomy** — Bottom-pinned bar, `--action-bar-h` + `--safe-bottom` padding, `--z-sticky`, top
   hairline border, `surface` background; primary right/full-width, secondary left.
5. **Props / Config** — `primary`, `secondary?`, `variant`, `sticky` (auto on `<md`).
6. **Visual Behavior** — Mobile-only pin; on desktop the same actions render inline in
   FormLayout/PageHeader (today's behavior, unchanged).
7. **Interaction Rules** — Submit disabled while invalid/pending (`aria-busy`), preventing
   double-submit; stays above the keyboard; never covers the focused field.
8. **Accessibility** — Buttons labeled; ≥44px; focus order after content; destructive still requires a
   confirm step.
9. **Responsive** — `<md`: pinned. ≥md: static inline (no pin).
10. **Do** — Use for every mobile create/edit form and every detail page with a primary action;
    exactly one primary.
11. **Don't** — Don't stack >2 actions (overflow → ActionMenu/sheet); don't coexist with a FAB;
    don't let it hide content (page reserves bottom padding = bar height + safe inset).
12. **Usage** — Member/Plan/Membership/Payment/Staff forms; membership & member detail primaries.

## 12.4 DataTable — Adaptive Card Mode (backward-compatible enhancement)

Per **Rule E (modifying an existing component)**, this is an **additive, backward-compatible** change
to the single canonical DataTable (§4 DataTable) — existing tables keep working unchanged.

- **New behavior:** below `md`, DataTable may render each row as a **stacked card** (AP-1) instead of
  the horizontal-scroll table. Cards surface the **operational-first** fields (design-system-v1.2 §6)
  using column `priority` (priority-1 fields lead) and an **optional** `renderCard?(row)` for a
  tailored card; when `renderCard` is absent, the card is derived from the visible columns as
  label/value pairs. The desktop table (priority columns + scroll backstop) is **unchanged**.
- **One data path:** the same `columns[]`/`rows[]` drive both forms; no second query, no divergent
  logic (money/date/status still render via MetricValue/Timestamp/StatusBadge inside cells/cards).
- **Row actions** move into the card's ActionMenu (→ Adaptive Bottom Sheet on tap, AP-7) — every
  desktop row action remains available (adaptive-parity).
- **Opt-in & safe:** tables that don't pass `renderCard` and don't need cards keep today's responsive
  behavior; nothing regresses. Selection/sort remain as-is (still deliberately minimal).
- **Accessibility:** the card list is a labeled `<ul>/<li>` (or preserves table semantics via ARIA);
  reading order matches the table's logical order; the `caption` is retained as the list's accessible
  description.

## 12.5 Adaptive presentation notes for existing components (no contract change)

These are **clarifications**, not modifications — each behavior is already permitted by the component's
§9 Responsive line; v1.2 unifies them onto the new primitives:

- **FilterBar** (AP-3): the "popover under md" becomes the **AdaptiveBottomSheet `filter↔sheet`**;
  active-filter chips stay above results.
- **ActionMenu** (AP-7): the "bottom sheet on mobile" becomes the **AdaptiveBottomSheet `menu↔sheet`**.
- **SelectInput / DateInput** (pickers): the "sheet on mobile" becomes **AdaptiveBottomSheet
  `picker↔sheet`**; date entry prefers the native mobile picker where it is more ergonomic.
- **NotificationCenter** (§9): the "full-screen sheet under sm" aligns to the same primitive.
- **PageHeader primary** (AP-6): relocates on mobile to **CreationFAB** (create-list screens) or
  **StickyMobileActionBar** (forms/details); still exactly one primary.
- **ContentGrid `sidebar-split`** (AP-5): mobile stack order follows the operational-first doctrine
  (design-system-v1.2 §6), not source order.
- **CurrencyInput / TextInput / etc.** (§5.10): render at `--control-font-mobile` (≥16px) on `<md` to
  prevent iOS focus-zoom — a token-level tweak, no API change.

## 12.6 Deferred patterns (considered, not adopted)

Recorded so a future session does not re-invent or re-litigate them (design-system-v1.2 §7):
- **BottomTabBar** — deferred in favor of drawer + StickyMobileActionBar (task-flow product, not
  browse-heavy). Not catalogued.
- **SwipeActions** — deferred (gesture discoverability/a11y cost; ActionMenu-in-sheet already covers
  row actions accessibly). Not catalogued.

A future adoption of either requires a new human-approved catalog entry per **Rule D**.

---

# 13. Member Workspace Additions

> **Status: approved 2026-07-03** (human ruling (c) on the member-workspace design authority —
> `docs/sprints/member-workspace-design-authority.md`, the copy + behavior source of truth for
> these components; this catalog defines the component contracts, the authority owns the frozen
> copy/vocabulary §D14 — cite, don't restate). **13.1/13.2 implemented** (W1 slice, 2026-07-03 —
> `components/pulse/answer-strip.tsx`, `components/pulse/disclosure.tsx`; the PageHeader additive
> props in `page-header.tsx`). **13.3/13.4 implemented** (W2 rail slice, 2026-07-03 —
> `modules/memberships/ui/membership-rail-card.tsx` + `membership-rail-client.tsx` (13.3),
> `modules/memberships/ui/membership-rail.tsx` over the pure `modules/memberships/rail-model.ts`
> (13.4); actions/ledger panels arrive with the W3 phase).
> Every §0 Global Convention applies. §12's adaptive doctrine (one DOM order, reflow-only
> breakpoint changes, 44-pt targets under md) applies unchanged.

## 13.1 AnswerStrip
1. **Purpose** — The member workspace's fixed page-top zone: identity · coverage · money · one
   computed action, in that order, for every member, forever (authority §D3). The "3-second
   answers" surface — read at arrival, identical scan path on every member.
2. **Responsibilities** — Own the four-line layout and its breakpoint reflow only. Every line's
   *content* is composed by the page from module-owned reads/badges; the strip renders slots and
   never computes, fetches, or interprets.
3. **Variants** — None. The strip has one shape; states are expressed by which optional slots are
   present (money absent without `payments.read`; action absent in the calm state).
4. **Anatomy** — L1 identity (the page's PageHeader: `<h1>` name + member badge accessory + muted
   trainer/tenure meta + line-end overflow) → L2 coverage (the largest line) → L3 money → L4 one
   primary Button. No other children, ever.
5. **Props / Config** — `identity` (required node) · `coverage?` · `money?` · `action?` ·
   `className?`. Absent slot = absent line (never a blank placeholder).
6. **Visual Behavior** — Mobile: four stacked lines. ≥lg: two visual rows — identity+coverage
   left, money+action right-aligned — same DOM, CSS grid reflow only (authority §D12). The strip
   is **not sticky** at any breakpoint (one-sticky rule §D3.3); its action is mirrored in the
   StickyMobileActionBar by the page.
7. **Interaction Rules** — Exactly one action, computed by the page's precedence rule (§D6.2);
   the action targets its home elsewhere on the page (anchor/expand), never a form inside the strip.
8. **Accessibility** — L1 hosts the page's only `<h1>`; statuses via StatusBadge (icon + label +
   `*-text`, never color alone); money via MetricValue; dates in `<time>`. DOM order = reading
   order at every breakpoint.
9. **Responsive** — Reflow only (see 6). L1 may wrap its trainer/tenure meta under 360-pt; L2
   truncates the plan name first — status and boundary always survive; L3/L4 never wrap.
10. **Do** — Keep the hard budget: 3 facts + 1 action. New facts compete for existing lines
    (authority §D13); the budget never grows.
11. **Don't** — No lists, ledgers, alert content/counts, secondary or destructive actions,
    scheduled-membership detail, or anything that scrolls within the strip (§D3.2). Never sticky.
12. **Usage** — Member workspace (`/members/[memberId]`) only. A second surface needing this shape
    is a design-authority decision first.

## 13.2 Disclosure (folded section card)
1. **Purpose** — The folded summary-card system for workspace zones: a Section-idiom card whose
   header is always visible (title + operational summary facts) and whose detail folds
   (authority §D1/§D9). Nothing critical is ever invisible — only *detail* is deferred.
2. **Responsibilities** — Own the fold state, the disclosure a11y contract, and the
   breakpoint-dependent default (folded on mobile, open on desktop). Header summary content is
   supplied by the page.
3. **Variants** — Default `defaultOpen="desktop"` (folded <md, open ≥md) · `defaultOpen={false}`
   (folded everywhere — future sensitive cards, e.g. medical notes §D13) · `defaultOpen={true}`.
   User toggles always win over the default.
4. **Anatomy** — Bordered `bg-surface` card → header row (chevron + `<h2>` title + muted summary
   line + optional header action, e.g. Edit) → foldable content region.
5. **Props / Config** — `title` · `summary?` (node — the always-visible facts) · `headerAction?`
   (interactive, sits beside the toggle, never nested in it) · `defaultOpen?` · `children`.
6. **Visual Behavior** — Chevron ▸/▾ states the fold; muted summary in the header; content region
   indented to the card padding. No entrance animation (reduced-motion safe by construction).
7. **Interaction Rules** — The whole header row (except `headerAction`) is the toggle target,
   ≥44-pt under md with ≥8-pt separation (v1.2 §5.4). Expansion state is per-visit, never
   persisted.
8. **Accessibility** — WAI-ARIA disclosure pattern: the toggle is a real `<button>` inside the
   `<h2>` with `aria-expanded` + `aria-controls`; the region is labeled by the header. Folded
   content is removed from the tab order.
9. **Responsive** — Same DOM both breakpoints; only the *default* open state differs (see 3).
10. **Do** — Put the section's two most operational facts in `summary` (the fold-header design
    rule: e.g. phone + trainer for Member info §D9). One folding system per page.
11. **Don't** — Don't fold anything answer-critical (that belongs in the AnswerStrip); don't nest
    Disclosures; don't render an empty summary; a card that outgrows one summary view graduates
    to a sub-page (§D13), not a taller card.
12. **Usage** — Member workspace Zone 3: Member info (W1), Alerts (W5), every future member-scoped
    module card (§D13 growth contract).

## 13.3 MembershipCard — `expandable` variant (Rule E amendment to §6 MembershipCard)
Per **Rule E**, an **additive** variant; existing `current`/`historical`/`compact` usages are
unchanged. Implementation lands with the W2 rail.
- **New behavior:** the card renders a one-line collapsed header (chevron · snapshot plan ·
  coverage `<time>` range · MembershipStatusBadge · the ONE money fact `Paid ✓`/`Owes …`) and
  expands in place to fixed-order panels: Coverage → Freezes → Payments → Actions (authority
  §D2.2–D2.3). Panels render only if they have content; Payments loads lazily on expand via the
  payments module's existing public read; Actions render **only** on live cards (current/next) —
  never disabled rows on historical cards.
- **States:** current (expanded by default, 3-pt brand accent-bar) · next/queued (dashed border,
  collapsed) · past (collapsed, `historical` muted). Multiple cards may be open at once; expanding
  anchors the tapped header near the viewport top (authority §D11).
- **Accessibility:** header row is the disclosure button (≥44-pt), `aria-expanded`; whole-row
  target; panel order identical at every breakpoint.
- **Money safety:** snapshot values only (unchanged §6 rule); ledger rows render voided entries
  struck-through with reason — the ledger never hides corrections.

## 13.4 MembershipRail primitives
1. **Purpose** — The connective tissue that renders a member's immutable memberships as **one
   continuous story** on a vertical rail (authority §D2): transition connectors, gap markers, the
   terminus node, and the severed-rail treatment.
2. **Responsibilities** — Presentation-only chronology grammar between MembershipCards; carries
   origin/causality copy. Zero derivation — origins/dates come from the member-scoped read (A-1).
3. **Variants** — Connector `renewed` · `upgraded` · `smaller-plan` (UpgradeIndicator semantics —
   direction in text + icon, never color alone) · gap marker (muted, centered, no card chrome) ·
   terminus ("Joined the gym · <date>") · severed segment (the rail visibly stops under a
   cancelled card).
4. **Anatomy** — The rail is a single `<ol>` (chronology is semantic), newest first; connectors
   sit **between two real cards only** — never above the conditional Next slot.
5. **Props / Config** — Per primitive: `origin`/labels + dates; `days` for gaps; `joinedOn` for
   the terminus.
6. **Visual Behavior** — Connector copy per authority §D2.4 frozen vocabulary; gaps muted; the
   current card is the only emphasized segment.
7. **Interaction Rules** — Display-only; cards own all interaction.
8. **Accessibility** — Ordered-list semantics; every relationship stated in text ("Upgraded ·
   Silver Monthly → Gold Monthly"), dates in `<time>`; never color/line-style alone.
9. **Responsive** — Single column at every breakpoint; labels condense, never disappear.
10. **Do** — Show gaps explicitly (a lapse is operational truth); label every transition with its
    origin.
11. **Don't** — Never render payments as rail events (money lives inside card panels); never
    number cards in collapsed headers; never draw a connector to the Next slot.
12. **Usage** — Member workspace Zone 2 rail (W2). The §6 MembershipTimeline remains the
    **per-record** lifecycle timeline on `/memberships/[id]` — a different grain; don't conflate.

### PageHeader (Rule E, additive)
To host the AnswerStrip's L1 without forking the mandatory header: `subtitle` widens from string
to node, and a new optional `titleAccessory` node renders inline after the `<h1>` (the member
badge). Both are backward-compatible; no existing usage changes.

---

*End of PULSE Component Catalog. v1.1 core (§1–§11) + v1.2 Adaptive additions (§12) + Member
Workspace additions (§13). This document is authoritative. New or changed components require
updating this catalog in the same change set.*
