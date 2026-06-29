# Session 4 Execution Plan — Design System, Shell & Errors

> **Status: ✅ APPROVED (2026-06-29) with six implementation-quality refinements (§8).
> Implementation in progress.** The refinements strengthen quality only; they change
> no approved architecture or design-system decision. A mandated **UI Verification
> Report** is produced at session end (`session-4-verification-report.md`).
>
> **Original gate (kept for record):** awaiting human approval before implementation begins.
> No source code, config, or scaffolding is produced in this document. Task
> definitions, decisions, and acceptance criteria are authoritative in
> `sprint-0-technical-specification.md` (§6 tasks, §7.1 Session 4 row); the visual
> authority is `design-system-v1.1.md` + `design-tokens.md` + `pulse-component-catalog.md`
> + `globals.css`. This plan documents **execution strategy and a critical readiness
> audit only.** It cites those sources; it never restates or overrides them.

| | |
|---|---|
| **Session** | 4 of 5 |
| **Theme** | Design System, Shell & Errors |
| **Spec tasks** | T-12 (Tailwind v4), T-13 (shadcn/ui via PULSE), T-14 (PULSE Design System integration), T-08 (authenticated Application Shell), T-17 (error boundary → Catalog `ErrorState`) |
| **Prerequisite** | Sessions 1–3 approved ✅ (`session-progress.md`); Session 3 committed `8ec6cc2`, tag `v0.3.0-iam-foundation`, 45 tests green |
| **Frozen perimeter** | The Session-3 **auth/authz code is FROZEN** for Session 4. No change to `lib/auth/**`, `@pulse/auth`, the credential/permission path, `assertSameGym`, or the JWT/session shape. Session 4 adds the **visual layer on top** of the working protected session. |

---

## 0. Readiness Audit (critical review board — read first)

The prompt requires a Catalog completeness audit and an honest verdict before any
plan is acted on. This section is the audit; §1–§7 are the execution strategy that
the audit's decisions feed.

### 0.1 What already exists (the Session-3 seam Session 4 builds on)

| Artifact | State at end of Session 3 | What Session 4 does to it |
|---|---|---|
| `apps/web/src/app/layout.tsx` (root) | Bare `<html><body>`; imports `@/env`; **no `next/font`, no `globals.css` import, no theme** | T-14: load 3 fonts via `next/font`, apply variable classes to `<html>`, import `globals.css` |
| `globals.css` (repo root) | Complete v1.1 token implementation (primitives → roles → `@theme inline`, base layer, focus/reduced-motion/forced-colors, `.skip-link`, shimmer keyframe) | T-14: relocate to `@pulse/design-tokens` ownership; import at `src/app/globals.css` (CLAUDE.md §12) |
| `@pulse/design-tokens` | Package exists; `src/index.ts` is an intentional `export {}` placeholder | T-14: becomes the `globals.css` owner / token source |
| `apps/web/src/app/(app)/layout.tsx` | **Server Component**: `requireSession()` → redirect; bare `<header>` "Signed in as …" + `signOutAction`; `<main>` | T-08: replaces the bare chrome with AppShell/Sidebar/TopBar — **keeping** server-side `requireSession()` and the working `signOutAction` |
| `(app)/dashboard/page.tsx` | `<h1>Dashboard</h1>` placeholder; catches `AuthorizationError` → inline "Access denied" `<p role="alert">` | T-08/T-17: page gets `PageHeader` (single `<h1>`); the 403 deny path becomes an inline Catalog `ErrorState` |
| `(auth)/sign-in/*` | Works (bare HTML form) | **Out of Session-4 scope** — see decision D-4.3; do not rework |
| `lib/errors.ts` | Typed taxonomy `AuthError` 401 / `AuthorizationError` 403 / `NotFoundError` 404 | T-17: the boundary maps this taxonomy to user-safe `ErrorState` UI |
| Tailwind / shadcn / `lucide-react` / `next/font` | **None installed** | T-12 / T-13 / T-14 install them |
| `@pulse/ui` | **Does not exist** (deferred at D-7) | See decision D-4.1 — not created this session (recommended) |
| axe-core a11y harness | Wired via `@axe-core/playwright`; "home + axe baseline" E2E green | T-08/T-17/T-14: **extend** the existing axe pass to the shell + error UI (not new tooling) |

> **Implication:** Session 4 is the first session that renders real styled UI. The
> token *implementation* (`globals.css`) is done and untouched since Session 2 — the
> work is **wiring** (Tailwind/shadcn/fonts) and **composition** (shell + error UI),
> not authoring tokens.

### 0.2 Catalog completeness — does Session 4 have every component it needs?

The constitution forbids inventing UI: **Catalog components only; if one is missing,
STOP and request it** (Design System v1.1 §8; Catalog §D). The critical distinction
for this session:

> **Building a component the Catalog already *specifies* (for the first time) is
> conformant — it is the catalog spec becoming code.** Only needing a component the
> Catalog does **not describe at all** triggers STOP. Per A1/D-7, Catalog components
> are built on demand per feature; Session 4 is the first feature that needs the shell
> and error surfaces, so it builds them from their existing specs.

**Components Session 4 strictly needs, mapped to their Catalog entries:**

| Need (task) | Catalog entry | Status | Notes |
|---|---|---|---|
| Authenticated frame (T-08) | **AppShell** (§1) | ✅ specced | Owns layout grid, mobile drawer + scrim, skip-link anchor, brand scope |
| Nav rail (T-08) | **Sidebar** (§1) + **NavGroup**, **NavItem** (§2) | ✅ specced | `--rail-*` roles; active = 3px brand left-bar + `aria-current` |
| Header bar (T-08) | **TopBar** (§1) | ✅ specced | Hosts title slot, mobile-nav toggle, user menu (see deferred slots below) |
| Content wrapper (T-08) | **PageContainer** (§1) + **PageHeader** (§1) | ✅ specced | One `<h1>` per page via PageHeader |
| User identity in chrome (T-08) | **Avatar** (§11) + **ActionMenu** (§2) | ✅ specced | Avatar initials fallback; sign-out lives as an ActionMenu item |
| Error boundary surface (T-17) | **ErrorState** (§10) | ⚠️ **specced but underspecified** | **See finding 0.3.1 — no correlation-id slot.** This is the audit's headline item |
| Representative shadcn primitive (T-13) | **Button** (Catalog stack primitive) | ✅ | Demonstrated inside the shell user menu (decision D-4.3) |

**Verdict on completeness:** every component Session 4 needs is described in the
Catalog. **No hard blocker** (nothing requires a net-new, undescribed component, which
would force STOP under §D/§8). One entry (ErrorState) is *underspecified* for T-17's
stated requirement — handled as a documented decision, not a blocker (0.3.1).

### 0.3 Findings, gaps & open questions (each with a recommended default)

**0.3.1 — HEADLINE: `ErrorState` has no correlation-id slot, but T-17 mandates one.**
The Catalog `ErrorState` props are `title` / `description` / `onRetry`; its anatomy is
icon · headline · explanation · retry (§10). T-17 requires the boundary to render
`ErrorState` **with an abbreviated correlation id**. There is no field for it.
- **Recommended default:** fold the reference into `description` (e.g., *"…If this
  persists, contact support with reference `a1b2c3`."*). Conformant, **zero catalog
  change**, ships this session.
- **Alternative (heavier):** add an explicit `reference` prop to `ErrorState` — a
  Catalog **modification** (Catalog §E): backward-compatible, human-approved, catalog
  entry updated in the **same change set**. Defer unless the human wants it.
- **Decision owner:** human (a Catalog change is §E). Recommendation: default.

**0.3.2 — Data-bearing TopBar/Sidebar slots have no data or feature yet.** The Catalog
TopBar hosts a global **SearchBar**, **BranchContextChip**, **NotificationBadge** →
**NotificationCenter**; Sidebar hosts a **BranchSwitcher**. These are all
**feature-bearing** (need queries, notifications, multi-branch switching) that do not
exist in Sprint 0. T-08 is explicitly *"the **empty** authenticated chrome"* with
*"placeholder"* nav (spec T-08); T-14 says Catalog components are *"built on demand per
feature."*
- **Recommended default:** Session 4 builds the **structural** shell (AppShell,
  Sidebar, TopBar, PageContainer, PageHeader, NavGroup, NavItem, Avatar, ActionMenu)
  and treats SearchBar / NotificationCenter+Badge / BranchSwitcher / BranchContextChip
  as **deferred slots** — not built now (no data, no feature). The single seeded gym's
  branch context may render as a **static, non-interactive** label if useful, but no
  switcher logic. Each deferred component is built with its first owning feature.
- **Decision owner:** human ratifies the minimal-shell scope. Recommendation: default.

**0.3.3 — Dark mode is first-class in tokens, but there is no theme-toggle component or
mechanism.** `globals.css` ships full `.dark` roles; Design System §7 treats light+dark
as first-class; T-14's verification says *"toggle theme."* But the Catalog has **no
ThemeToggle**, nothing sets the `.dark` class, and a no-flash persistent toggle
conventionally needs **`next-themes`** — an **unapproved new dependency**.
- **Recommended default:** Ship **light as default**; verify dark by toggling `.dark`
  on `<html>` manually (devtools) to confirm semantic roles resolve — this satisfies
  T-14's "semantic roles resolve in light/dark" without a shipped toggle. A user-facing
  **ThemeToggle** (+ persistence) is a **future Catalog proposal** (Catalog §D) and a
  separate `next-themes` approval — **not invented this session.**
- **Decision owner:** human (new component + new dep). Recommendation: default (defer).

**0.3.4 — shadcn/ui pulls transitive dependencies; confirm they ride the approved
"shadcn via PULSE" stack.** Initializing shadcn brings `class-variance-authority`,
`clsx`, `tailwind-merge`, `lucide-react`, and Radix UI primitives (per component), plus
Tailwind v4 (`tailwindcss`, `@tailwindcss/postcss`). The named stack (Catalog header:
"Tailwind · shadcn/ui · Lucide") implies these, but the constitution forbids
*unapproved* deps (§9).
- **Recommended default:** treat these as **in-scope under the already-approved stack
  decision** (Tailwind/shadcn/Lucide are the named stack), but **list them explicitly**
  here so the human ratifies them at plan approval rather than discovering them at
  implementation. Add only the Radix primitives the built components actually use
  (Avatar, Dropdown/Menu for ActionMenu) — no speculative installs.
- **Decision owner:** human ratifies the transitive list at approval. Recommendation: accept.

**0.3.5 — Correlation id at the client `error.tsx` boundary cannot read Pino /
AsyncLocalStorage.** `error.tsx` / `global-error.tsx` are **Client Components**; the
server logger's `correlationId` lives in server-side `AsyncLocalStorage` and is
unreachable from the client.
- **Recommended default:** surface Next.js's **`error.digest`** as the user-facing
  reference in the `ErrorState`, and log full context **once, server-side**, via the
  `instrumentation.ts` `onRequestError` hook (or the nearest server seam) — keyed so
  the digest correlates to the server log. The spec says *"abbreviated correlation id,"*
  not *"the Pino correlationId specifically,"* so the digest satisfies T-17. Threading
  the actual Pino id into the UI is **extra plumbing** — flagged, not silently attempted.
- **Decision owner:** Claude (execution detail within the spec). Recommendation: default.

**0.3.6 — Tailwind v4 has no `tailwind.config.js` for theme; reconcile T-12's "shared
Tailwind config in `@pulse/config`."** Design System §5 is explicit: v4 is CSS-first,
**no JS theme config** — everything is in `globals.css` (`@theme inline`). T-12's
phrase "shared Tailwind config lives in `@pulse/config`" must be read in v4 terms.
- **Recommended default:** the "shared config" is (a) the shared **PostCSS** setup
  (`@tailwindcss/postcss`) and (b) the shared **`globals.css`** sourced from
  `@pulse/design-tokens` — **not** a JS theme file. Do **not** author a
  `tailwind.config.js` that re-declares colors/spacing (Design System §5 forbids it).
- **Decision owner:** Claude (execution detail). Recommendation: default.

**0.3.7 — 403 deny path: inline `ErrorState`, not a thrown boundary error.** The
dashboard currently catches `AuthorizationError` and renders an inline notice. A 403 is
an **expected in-page outcome**, not an unexpected crash.
- **Recommended default:** render the deny path as an **inline `ErrorState`** (variant
  `inline`) inside the page; reserve the React error **boundary** (`error.tsx`) for
  **unexpected** throws (Unexpected/Application/Conflict/etc.). Don't throw 403s to the
  boundary. (`NotFoundError` similarly maps to Next `not-found.tsx` if/when a feature
  needs it — out of Session-4 scope; no business resource yet.)
- **Decision owner:** Claude (execution detail, consistent with error-handling.md).
  Recommendation: default.

### 0.4 Contradictions / consistency checks (resolved)

- **Rail width.** Catalog AppShell §6 "260px rail"; `globals.css --sidebar-w: 16.25rem`
  (= 260px); design-tokens §18. **Consistent** — use the token, never a literal.
- **Nav breakpoints.** Catalog AppShell §9 + design-tokens §20: persistent rail ≥`lg`
  (1024), drawer below; Sidebar `collapsed` only ≥`xl` (1280). **Consistent.**
- **TopBar height.** Catalog §6 "64px (4rem)"; `--topbar-h: 4rem`. **Consistent.**
- **Focus.** globals.css base layer already implements the 2px ring + 2px offset for
  interactive elements; components **inherit** it (Design System §7; Catalog §0.4) —
  never re-declare per component.

No two-document conflict requiring escalation (constitution §13) was found.

---

## 1. Objectives

By the end of Session 4 a reviewer can:

1. Run the app with **Tailwind v4** active, all utilities resolving to **PULSE tokens**
   (no design literals anywhere — lint/grep clean).
2. Confirm **shadcn/ui** is installed and configured against **PULSE tokens** (no
   default-theme leakage), with one representative primitive verified token-driven.
3. See `globals.css` owned by `@pulse/design-tokens`, imported at
   `src/app/globals.css`, with the three fonts loaded via `next/font`; semantic roles
   resolve in **light and dark**.
4. Sign in as the seeded Owner and see the **real Application Shell** (AppShell +
   Sidebar + TopBar) render — keyboard-navigable, single-column reflow on mobile,
   active-nav 3px accent-bar, visible focus ring, signed-in user shown, working
   sign-out — with **zero axe violations**.
5. Force an unexpected error and see the **Catalog `ErrorState`** render with a recovery
   action and a correlation reference, while the server logs the full context **once**;
   no stack/SQL/internal id leaks to the user.
6. Confirm the **Session-3 auth/authz perimeter is unchanged** (frozen) and the 45
   prior tests remain green.

No business features, no forms beyond what exists, no data-bearing shell widgets — those
arrive with their features (A1).

---

## 2. Implementation order (dependency-sequenced)

Per spec §7 the intra-session order is **T-12 → T-13 → T-14 → T-08 → T-17**. Each task
below carries the brief's fields plus, for the UI tasks, the prompt-mandated **exact
tokens/components**, **a11y §7 gate steps**, **responsive checks**, and **Session-3
integration**.

---

### T-12 · Tailwind CSS v4 (styling engine on PULSE tokens)

1. **Purpose** — Install/configure Tailwind v4 as the styling engine, driven entirely by
   PULSE tokens (constitution §3; Design System §5).
2. **Dependencies** — T-06 (app), T-04 (`@pulse/config`, `@pulse/design-tokens`).
3. **Exact tokens/components** — No components yet; this task makes the **utilities**
   from `@theme inline` resolve: `bg-surface`, `text-foreground`, `text-success-text`,
   `rounded-md`, `text-h1`, `font-display/sans/mono`, `ease-standard`, breakpoints, etc.
4. **Implementation notes** — Tailwind v4 wired in `apps/web` via the **PostCSS plugin**
   (`@tailwindcss/postcss`); `globals.css` already begins with `@import "tailwindcss"`
   and `@custom-variant dark`. Per **decision 0.3.6**, the "shared config" is the shared
   PostCSS setup + the shared `globals.css` token source — **no `tailwind.config.js`
   theme file** (Design System §5 forbids re-declaring colors/spacing). No arbitrary
   values (`bg-[#…]`, `p-[15px]`, `z-[9999]`).
5. **Acceptance criteria** — App renders with token-mapped utilities applying; a grep
   for hex/px/arbitrary-value literals in app code returns **none**; utilities resolve to
   the documented token values.
6. **a11y §7 gate** — N/A directly (no UI authored); the base-layer a11y primitives in
   `globals.css` become active once imported in T-14.
7. **Responsive checks** — Confirm the `--breakpoint-*` tokens generate `sm/md/lg/xl/2xl`
   prefixes (used by T-08).
8. **Session-3 integration** — None (no auth/route change). Build-pipeline only.
9. **Risks** — Hardcoded values bypassing tokens *(mitigation: token-only lint/grep)*;
   Tailwind-v4 PostCSS wiring under Next 15 *(mitigation: verify the `@tailwindcss/postcss`
   plugin builds CSS before proceeding to T-13)*.
10. **DoD** — Tailwind builds; tokens exposed as utilities; no literals; `pnpm verify` green.
11. **Rollback** — Revert PR.

---

### T-13 · shadcn/ui (primitive layer, restyled to PULSE)

1. **Purpose** — Install shadcn/ui as the primitive layer the PULSE Catalog derives from
   ("shadcn via PULSE"), configured to consume PULSE tokens — not its default theme.
2. **Dependencies** — T-12.
3. **Exact tokens/components** — Initialize shadcn against the existing token roles
   (`--background`, `--foreground`, `--primary`, `--border`, `--ring`); add **only** the
   primitives the Session-4 shell uses (e.g., **Button**, **DropdownMenu** for
   ActionMenu, **Avatar**) — no speculative component installs. Lucide via `lucide-react`,
   sized with `--icon-*` tokens.
4. **Implementation notes** — **TOP RISK (decision 0.3.4 + finding):** shadcn's `init`
   writes its **own** `:root` token block using the **same role names** PULSE already
   owns (`--background/--foreground/--primary/--border/--ring`). **Do NOT let shadcn
   overwrite `globals.css`.** Point `components.json` at the **existing** token-mapped
   file and reconcile generated primitives to PULSE roles. The name overlap helps, but
   PULSE-specific roles shadcn does not know — `--surface`, `--surface-raised`,
   `--accent-text`, status `*-text`, `--rail-*` — mean primitives must be **restyled** to
   those roles, not left on shadcn defaults. Confirm shadcn's **Tailwind-v4** path
   (CSS-first, no JS config) is used.
5. **Acceptance criteria** — A representative primitive (Button, **demonstrated inside the
   shell user menu** — decision D-4.3, *not* by reworking sign-in) renders using PULSE
   tokens with **no default-theme leakage**; inspected computed styles resolve to token
   values; the existing axe baseline still passes.
6. **a11y §7 gate** — shadcn/Radix primitives ship ARIA + keyboard semantics; confirm the
   inherited focus ring (globals.css) is not overridden by shadcn defaults.
7. **Responsive checks** — N/A (single primitive); full responsive verification is in T-08.
8. **Session-3 integration** — None. (Sign-in `(auth)` is deliberately untouched —
   decision D-4.3.)
9. **Risks** — Default shadcn theme overriding PULSE *(mitigation: token-mapped
   `components.json`; never overwrite `globals.css`)*; shadcn-on-Tailwind-v4 maturity
   *(mitigation: verify the v4 path on the first primitive before building the shell)*;
   transitive deps *(mitigation: ratified list, decision 0.3.4; install only what's used)*.
10. **DoD** — shadcn initialized against tokens; one primitive proven token-driven;
    `globals.css` intact; ratified deps only.
11. **Rollback** — Revert PR.

---

### T-14 · PULSE Design System integration (globals.css + fonts + pipeline)

1. **Purpose** — Wire the PULSE token implementation end-to-end so all UI is consistent
   and accessible (Design System v1.1, tokens, Catalog).
2. **Dependencies** — T-12, T-13, T-04 (`@pulse/design-tokens`).
3. **Exact tokens/components** — The whole token registry becomes live: roles
   (`--background/--surface/--foreground/--primary/--ring/--*-text/--rail-*`), type scale
   (`text-eyebrow…display-xl`, `metric`, `num`), radii, motion, z-index, the `.tabular`
   / `.eyebrow` / `.skip-link` helpers, and the base-layer focus/reduced-motion/
   forced-colors guarantees.
4. **Implementation notes** — (a) Relocate `globals.css` to be owned by
   `@pulse/design-tokens` (the source) and import it at `src/app/globals.css` (CLAUDE.md
   §12; the file's own header anticipates this). (b) Load the **three fonts** via
   `next/font/google` in the **root layout** — Space Grotesk (500/600), Inter (400/500/600),
   JetBrains Mono (500/600) — instantiated with `variable: --font-display/-sans/-mono`,
   the three variable classes applied to `<html>` so the vars cascade into the existing
   `@theme`/`body`/`h*` references (Design System §6). `display: swap`, latin subset,
   weights-in-use only. (c) Per **decision 0.3.3**, light is default; dark verified via
   manual `.dark` — no `next-themes`, no ThemeToggle this session.
5. **Acceptance criteria** — Tokens load; semantic roles resolve in **light and dark**
   (manual `.dark` toggle); the §7 primitives (focus ring, contrast via `*-text`,
   reduced-motion) are present; no literals (grep clean).
6. **a11y §7 gate (UI task — gate applies)** — (i) **Contrast:** body/`muted-foreground`
   ≥4.5:1; status text via `*-text` tokens. (ii) **Focus:** the inherited 2px ring +
   offset is visible. (iii) **Reduced motion:** the `prefers-reduced-motion` block
   collapses transitions; shimmer has a static fallback. (iv) **Resize/reflow:** rem
   sizing honors 200% zoom. Confirm via **axe-core (CI/test only, per D-5/D-4 — never on
   commit)** + the §7 manual checklist on whatever first renders the imported CSS.
7. **Responsive checks** — Confirm rem type scales under browser zoom; breakpoint
   utilities active for T-08.
8. **Session-3 integration** — Root layout gains fonts + `globals.css` import while
   **keeping** the `@/env` import (boot-time env validation — T-15) and metadata. No
   auth/route change.
9. **Risks** — Token drift / literals creeping in *(mitigation: token-only lint; axe;
   §7 checklist)*; `next/font` network fetch at build *(mitigation: standard
   `next/font/google` caching; verify offline-build behavior)*; font-variable wiring
   mismatch *(mitigation: the var names must exactly match the `@theme` references already
   in `globals.css`)*.
10. **DoD (UI task)** — Tokens load; no literals; **§7 gate passed**; light/dark verified;
    docs (token/Catalog references) updated in the same change.
11. **Rollback** — Revert PR.

---

### T-08 · Application Shell (AppShell / Sidebar / TopBar)

1. **Purpose** — The authenticated chrome into which all features render — **Catalog
   components only, tokens only** (constitution §3; spec T-08).
2. **Dependencies** — T-07 (the `(app)` segment, exists), T-14 (tokens/components/fonts),
   T-19 (session/principal for user display — **frozen**, consumed not modified).
3. **Exact Catalog components** — **AppShell** (variant `default`) composing **Sidebar**
   (`expanded`; `drawer` under `lg`) + **TopBar** (`default`) + **PageContainer** +
   **PageHeader** (renders the page `<h1>`); **NavGroup** + **NavItem** for nav (active =
   3px brand left-bar + `aria-current="page"`); **Avatar** (initials fallback) +
   **ActionMenu** for the user menu (**sign-out is an ActionMenu item**). **Deferred slots
   (decision 0.3.2 — NOT built now):** global SearchBar, NotificationBadge/Center,
   BranchSwitcher, BranchContextChip — rendered as placeholders/omitted until their
   owning feature.
4. **Exact tokens** — `--rail-bg/-fg/-fg-active/-surface/-border` (Sidebar), `--topbar-h`
   (4rem), `--sidebar-w` (16.25rem), `--border-accent` (3px active bar), `--content-max`,
   `--z-drawer`/`--z-scrim` (mobile drawer), `--icon-md` (nav icons). **No literals.**
5. **RSC / Client split (decision from advisor — load-bearing):** the `(app)/layout.tsx`
   **stays a Server Component**: it keeps the server-side `requireSession()` enforcement
   and fetches the `principal`, then passes `principal` (+ the `signOutAction`) as **props**
   into a **Client** shell component that owns drawer open/close, focus-trap, and
   active-route highlighting. **Enforcement never moves client-side.** The existing
   `signOutAction` is **preserved**, surfaced as the Avatar→ActionMenu "Sign out" item —
   do not drop the working sign-out.
6. **Acceptance criteria** — Authenticated → shell renders with sidebar + topbar;
   keyboard-navigable; reflows to **one column** at mobile width with the **drawer** nav
   (Esc + scrim-click close, focus returns to trigger); shows the signed-in user
   (`principal.displayName` / `email`); sign-out works; **no console errors; zero axe
   violations.**
7. **a11y §7 gate (UI task — full gate)** — **Landmarks:** AppShell emits `<header>` /
   `<nav aria-label="Primary">` / `<main>` + the **skip-link** anchor (globals.css already
   styles `.skip-link` and *expects the shell to render it*). **One `<h1>` per page** via
   PageHeader (reconcile the dashboard's current `<h1>`). **Keyboard:** full operability,
   logical order, arrow-key nav within the nav list, Esc closes the drawer. **Focus:**
   inherited 2px ring + offset, visible on the rail and on brand fills. **Color:** active
   nav carries the brand bar **+** label (not color alone); `aria-current`. **Reduced
   motion / forced-colors:** inherited from the base layer — never overridden.
8. **Responsive checks** — ≥`lg`: persistent rail. `<lg`: off-canvas drawer toggled from
   TopBar (**nav must never disappear** — audit fix). `<md`: TopBar title truncates.
   Verify at 320px, 768px, 1024px, 1280px; verify 200% zoom reflow.
9. **Session-3 integration** — Renders **inside** the existing protected `(app)` segment;
   consumes the frozen session/principal; the gated `/dashboard` now renders within the
   shell; the **403 deny path** becomes an inline `ErrorState` (decision 0.3.7, finalized
   in T-17). No change to `lib/auth/**`.
10. **Risks** — Bespoke drift / a missing Catalog piece *(mitigation: Catalog-only;
    STOP-and-request if a genuinely undescribed component appears — none expected per
    §0.2)*; over-building data-bearing slots *(mitigation: decision 0.3.2 deferral)*;
    moving enforcement client-side *(mitigation: §T-08.5 split; layout stays server)*.
11. **DoD (UI task — a11y applies)** — Catalog components only; tokens only (no literals);
    **§7 gate passed** (axe + manual); responsive verified; sign-out preserved; docs
    updated; `pnpm verify` + the 45 prior tests green.
12. **Rollback** — Revert PR. (Auth perimeter untouched, so no security re-review needed.)

---

### T-17 · Error boundary → Catalog `ErrorState` + correlation reference

1. **Purpose** — A consistent failure surface: React error boundaries rendering the
   Catalog `ErrorState`, mapping the typed taxonomy to safe UI, never swallowing errors
   (`error-handling.md`; spec T-17).
2. **Dependencies** — T-08 (Catalog `ErrorState` + shell), T-16 (logger — **frozen**,
   consumed).
3. **Exact Catalog components** — **ErrorState** — variant `page` for the route boundary,
   variant `inline` for the in-page 403 deny path (decision 0.3.7). Anatomy: danger icon +
   headline + calm explanation + **retry** action.
4. **Exact tokens** — `--danger`/`--danger-text` (accent + accessible text), `--icon-xl`
   (empty/error icon), the inherited focus ring on the retry button. **No literals.**
5. **Implementation notes** — (a) Add App Router `error.tsx` for the `(app)` segment and a
   root `global-error.tsx` (the latter renders its own `<html><body>`, catches
   layout-level errors). Both are **Client Components** (Next requirement). (b) Map the
   taxonomy (`Validation` / `Auth` / `Authorization` / `NotFound` / `Conflict` /
   `Application` / `Unexpected`) to **user-safe** messages — no stack/SQL/internal id
   leaks; cross-tenant stays **404, never 403** (already encoded in `lib/errors.ts`).
   (c) **Correlation reference (decision 0.3.5):** display Next's **`error.digest`** as
   the abbreviated reference in `ErrorState.description` (decision 0.3.1 — no catalog
   change), and log the **full context once, server-side**, via `instrumentation.ts`
   `onRequestError` (or nearest server seam) keyed to the same digest — *not* from the
   client boundary, which cannot reach Pino. (d) The 403 deny path renders an **inline**
   `ErrorState` in the page (not thrown to the boundary). **No empty `catch {}`**;
   unexpected errors propagate to the boundary (never swallowed as "invalid").
6. **Acceptance criteria** — An unexpected error → user sees a calm `ErrorState` with a
   recovery path + correlation reference; server logs **one** entry with full context; no
   internal detail exposed; a 403 → inline `ErrorState`, no boundary crash.
7. **a11y §7 gate (UI surface — gate applies to ErrorState)** — `role="alert"` on the
   error surface; the retry control is a real keyboard-operable button with the inherited
   focus ring; danger conveyed by **icon + text**, not color alone; copy is calm/
   non-alarming; **axe-core (CI/test only)** passes on the error UI.
8. **Responsive checks** — `ErrorState` centers and scales down to mobile; retry button
   reachable; no layout shift.
9. **Session-3 integration** — Consumes the **frozen** taxonomy (`lib/errors.ts`) and the
   **frozen** logger (T-16); replaces the dashboard's current inline "Access denied" `<p>`
   with the inline `ErrorState`. No change to auth/authz logic.
10. **Risks** — Leaking internals *(mitigation: taxonomy → safe messages; no stack/SQL)*;
    duplicate logging *(mitigation: log-once at the server seam, not in the client
    boundary)*; dead-end errors *(mitigation: `ErrorState` requires a recovery action)*;
    digest≠Pino-id confusion *(mitigation: documented as the chosen reference; Pino-id-in-
    UI flagged as deferred extra plumbing)*.
11. **DoD (UI surface)** — Boundary renders Catalog `ErrorState`; taxonomy mapping present;
    one-log-at-boundary (server seam); **§7 gate** on the error UI; no silent swallow;
    docs updated.
12. **Rollback** — Revert PR.

---

## 3. New dependencies (ratify at approval)

All are within the **already-named stack** (Catalog header: Tailwind · shadcn/ui · Lucide)
or are standard shadcn transitive deps. Listed for explicit human ratification (constitution
§9). **No dependency outside this list is introduced.**

| Dependency | Why | Status |
|---|---|---|
| `tailwindcss` (v4) + `@tailwindcss/postcss` | T-12 styling engine (CSS-first) | Named stack |
| shadcn/ui CLI + generated primitives | T-13 primitive layer | Named stack |
| `class-variance-authority`, `clsx`, `tailwind-merge` | shadcn variant/className tooling | shadcn transitive |
| Radix UI primitives (only those used: Avatar, Dropdown/Menu) | underpin Avatar/ActionMenu | shadcn transitive; install-only-what's-used |
| `lucide-react` | Catalog icon set | Named stack |
| `next/font` (Space Grotesk, Inter, JetBrains Mono) | T-14 fonts (Design System §6) | Next built-in; no new package |
| **Explicitly NOT added:** `next-themes` | would back a theme toggle | **Deferred** (decision 0.3.3) |

---

## 4. Decisions requiring human ratification (consolidated)

| # | Decision | Recommended default | Owner |
|---|---|---|---|
| **D-4.1** | Where do shell/error components live? | **`apps/web`** (shadcn's conventional `components/ui` + a `components/shell` area); **do not** create `@pulse/ui` yet (D-7/A1 — one app, no second consumer). T-13's "basis for `@pulse/ui`" is eventual destiny, not Sprint-0 placement. | Human |
| **D-4.2** | Minimal-shell scope (0.3.2) | Build structural shell; **defer** SearchBar / NotificationCenter+Badge / BranchSwitcher / BranchContextChip to their first feature. | Human |
| **D-4.3** | T-13 representative primitive (0.3.4) | Demonstrate **inside the shell** (Button in user menu). **Do not** rework the working `(auth)` sign-in — FormField/TextInput belong to the first form feature (auth-UX scope creep otherwise). | Human |
| **D-4.4** | ErrorState correlation slot (0.3.1) | Fold reference into `description` (no catalog change). Alternative = add `reference` prop (Catalog §E). | Human |
| **D-4.5** | Dark-mode toggle (0.3.3) | Light default; dark verified via manual `.dark`. ThemeToggle + `next-themes` = future Catalog proposal + dep approval. | Human |
| **D-4.6** | shadcn transitive deps (0.3.4) | Accept as in-scope under the named stack; install only what's used. | Human |

Execution-detail decisions owned by Claude (consistent with the spec, not requiring
ratification): 0.3.5 (digest as correlation reference + server-seam logging), 0.3.6
(no v4 JS theme config), 0.3.7 (inline `ErrorState` for 403).

---

## 5. Risks & mitigations (session-level)

| Risk | Likelihood | Mitigation |
|---|---|---|
| shadcn `init` overwrites/fights the hand-authored `globals.css` (shared role names) | **High** | Point `components.json` at the existing token file; never let init overwrite it; reconcile primitives to PULSE roles (incl. PULSE-only `--surface/-raised`, `*-text`, `--rail-*`) |
| shadcn-on-Tailwind-v4 maturity / CSS-first path | Med | Verify the v4 path on the **first** primitive (T-13) before building the shell |
| Enforcement accidentally moved client-side when splitting the shell | Med | Layout stays a Server Component with `requireSession()`; client shell receives principal as props (§T-08.5) |
| Correlation id can't reach the client boundary | Med | Use Next `error.digest`; log full context server-side via `onRequestError` (0.3.5) |
| Hardcoded design literals creeping in | Med | Token-only lint/grep (T-12 AC); axe + §7 checklist |
| Over-building deferred data-bearing widgets (scope creep) | Med | Decision D-4.2 deferral; "empty chrome" per spec T-08 |
| Touching the frozen Session-3 auth perimeter | Low | Hard rule: no edits to `lib/auth/**`/`@pulse/auth`; consume session/principal/logger only; 45 tests must stay green |
| `next/font` build behavior (network/offline) | Low | Standard `next/font/google` caching; verify build |

---

## 6. Acceptance criteria (session exit gate)

From spec §7.1 (Session 4 row) + the per-task DoD above:

- **T-12:** Tailwind v4 active; utilities resolve to tokens; **no literals** (grep clean).
- **T-13:** shadcn installed against PULSE tokens; one primitive proven token-driven (in
  the shell); `globals.css` intact; ratified deps only.
- **T-14:** `globals.css` owned by `@pulse/design-tokens`, imported at
  `src/app/globals.css`; three fonts via `next/font`; roles resolve light **and** dark;
  **§7 gate** passed; no literals.
- **T-08:** Authenticated **AppShell/Sidebar/TopBar** renders (Catalog + tokens);
  keyboard-navigable; **single-column drawer reflow** on mobile; active-nav 3px bar +
  `aria-current`; signed-in user shown; **sign-out preserved**; **zero axe violations**;
  **§7 gate** passed; one `<h1>`/page.
- **T-17:** Error boundary renders Catalog **`ErrorState`** + correlation reference;
  taxonomy → safe UI; **one** server-side log; no internal leak; inline `ErrorState` for
  403; **§7 gate** on the error UI; no silent swallow.
- **Cross-cutting:** Session-3 auth/authz **unchanged**; `pnpm -w run verify` green; the
  **45** prior tests still green; axe runs **CI/test only** (never on commit — D-4/D-5).

---

## 7. Readiness Verdict

> **READY WITH CHANGES.**

Session 4 is implementable with **no hard blocker**: every component it needs is described
in the Component Catalog, and building a *specced* component for the first time is
conformant, not bespoke. The token implementation (`globals.css`) is complete and frozen
since Session 2; the work is wiring (Tailwind/shadcn/fonts) and composition (shell + error
UI) on top of the working, frozen, gym-scoped protected session.

The **"with changes"** is the set of decisions the human must ratify at approval (§4):
component **home** (`apps/web`, not a premature `@pulse/ui` — D-4.1), the **minimal-shell
scope** that defers data-bearing widgets (D-4.2), the **representative-primitive**
placement that leaves the working sign-in alone (D-4.3), the **ErrorState correlation
slot** handling (D-4.4 — the one genuine Catalog underspecification), the **dark-mode
toggle deferral** (D-4.5), and **shadcn transitive deps** (D-4.6). The top *technical*
watch-item is preventing shadcn `init` from overwriting/fighting the hand-authored
`globals.css` (§5).

No two-document conflict requires escalation; no net-new, undescribed Catalog component is
required (so no STOP-and-request blocker). On ratification of §4, implementation may
proceed in the **T-12 → T-13 → T-14 → T-08 → T-17** order.

---

## 8. Approval & Refinements (human-ratified 2026-06-29)

The plan was **approved**; all §4 decisions (D-4.1…D-4.6) are ratified as recommended.
The human added **six implementation-quality refinements** (architecture/design-system
unchanged) and a **mandated end-of-session UI Verification Report**. These are binding
on implementation:

| # | Refinement | How this session honors it |
|---|---|---|
| **R-1** | **shadcn is a primitive library only — NOT the design system.** Every application-facing component is a **PULSE component composed from shadcn primitives**; the app **never depends directly on raw shadcn**. | Two layers: `src/components/ui/*` holds the shadcn-idiom primitives (Radix-based, **restyled to PULSE tokens**) — the *only* consumers of Radix/shadcn; `src/components/pulse/*` (incl. the shell) holds PULSE catalog components that compose those primitives. Routes/layouts import **only** from `pulse/*`, never `ui/*`. A fitness check asserts no app/shell/route file imports `ui/*` or Radix directly. |
| **R-2** | **Structural UI only.** Search, notifications, branch switching, dashboards, other feature behavior stay placeholders. | Confirms D-4.2. Build AppShell/Sidebar/TopBar/PageContainer/PageHeader/NavGroup/NavItem/UserMenu only; data-bearing slots rendered as inert placeholders or omitted. No business behavior. |
| **R-3** | **Design-token enforcement — visual consistency verification step.** Demonstrate **no hardcoded** colors / spacing / border-radius / typography / shadows; all styling from PULSE tokens. | Add an automated **token-compliance scan** (grep/lint over `src/**` for hex, `rgb(`, raw `px`, arbitrary `[...]` utilities, off-scale values) → must be clean; results captured in the Verification Report. |
| **R-4** | **Accessibility verification beyond axe** — keyboard nav, focus order, visible focus, accessible nav flow, responsive sidebar. | Playwright E2E that drives the keyboard (Tab order, skip-link, drawer open/Esc/focus-return, `aria-current`) **plus** the axe pass; manual §7 checklist recorded. |
| **R-5** | **Responsive verification** on mobile / tablet / desktop; AppShell correct across breakpoints. | Playwright runs the shell at 375 (mobile), 768 (tablet), 1280 (desktop); asserts drawer-vs-rail behavior at each; recorded in the report. |
| **R-6** | **UI states** — working demos for **Loading / Empty / Error / Unauthorized / Forbidden** (placeholder data allowed). | Build the PULSE state components (LoadingState/Skeleton, EmptyState, ErrorState) and a **demo surface** that renders all five states; Unauthorized = the unauth→`/sign-in` redirect, Forbidden = the inline 403 `ErrorState` on a permission the Owner lacks. |

**End-of-session deliverable (mandated):** stop after T-17 and produce
`docs/sprints/session-4-verification-report.md` with: Design System Compliance · Token
Compliance · Accessibility Results · Responsive Results · Visual Consistency Results ·
Component Reuse Verification · Known Limitations · Readiness for Session 5. **Do not begin
Session 5 automatically — await approval of the report.**

---

*This is an execution plan and readiness audit, not an implementation contract. Task
scope, decisions, and acceptance criteria are authoritative in
`sprint-0-technical-specification.md`; visual authority is the Design System v1.1 +
tokens + Component Catalog + `globals.css`. **Approved 2026-06-29 with the §8 refinements;
implementation proceeds in T-12 → T-13 → T-14 → T-08 → T-17 order, then STOPS at the
Verification Report for human approval before Session 5.***
