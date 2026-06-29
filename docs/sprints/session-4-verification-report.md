# Session 4 — UI Verification Report

### Design System, Shell & Errors · Sprint 0

| | |
|---|---|
| **Session** | 4 of 5 |
| **Tasks delivered** | T-12 (Tailwind v4 on PULSE tokens), T-13 (shadcn primitives via PULSE), T-14 (PULSE design-system integration), T-08 (Application Shell), T-17 (error boundary + UI states) |
| **Refinements honored** | R-1…R-6 (plan §8) |
| **Branch** | `feat/platform-foundation` (not merged) |
| **Verified on** | 2026-06-29 · Node 20.20.0 · pnpm 9.15.4 · Windows 11 + Docker Desktop · Next 15.5.19 · Tailwind v4 · React 19 |
| **Auth perimeter** | ✅ **Untouched / frozen.** No edit to `lib/auth/**` or `@pulse/auth`; Session-3 authn/authz tests unchanged and green |
| **Status** | ✅ All exit criteria satisfied and **empirically reproduced** — awaiting human acceptance |

> Authoritative criteria: `sprint-0-technical-specification.md` §7.1 (Session 4 row) + T-12/T-13/T-14/T-08/T-17, the **Session 4 UI/UX Execution Plan**, and its §8 approved refinements. Every claim below maps to a reproduced result. Implemented-but-unverified items are stated as such under §7 — never asserted as "verified".

---

## 0. What shipped (file map)

**Build/token pipeline (T-12/T-14):** `apps/web/postcss.config.mjs` (Tailwind v4 plugin — no JS theme config); `apps/web/src/app/globals.css` (entry: loads Tailwind, then the token layer); `packages/design-tokens/globals.css` (the token implementation, **relocated** from the repo root, now the package's owned source, exported via `./globals.css`); root `layout.tsx` (three fonts via `next/font` + the stylesheet import, env validation kept).

**shadcn primitive layer (T-13) — `apps/web/src/components/ui/`:** `button.tsx`, `avatar.tsx`, `dropdown-menu.tsx`, `sheet.tsx` (Radix-based, restyled entirely to PULSE tokens); `components.json` (shadcn-via-PULSE config); `src/lib/utils.ts` (`cn`).

**PULSE component layer (T-08/T-17) — `apps/web/src/components/pulse/`:** `app-shell.tsx`, `sidebar.tsx`, `topbar.tsx`, `nav.tsx` (NavGroups/NavItem), `page-container.tsx`, `page-header.tsx`, `avatar.tsx`, `action-menu.tsx`, `button.tsx` (app-facing re-export), `error-state.tsx`, `empty-state.tsx`, `loading-state.tsx` (LoadingState + Skeleton).

**Routes / boundaries:** `app/(app)/layout.tsx` (Server Component — `requireSession()` + AppShell), `app/(app)/dashboard/page.tsx` (PageHeader + inline 403 `ErrorState`), `app/(app)/ui-states/page.tsx` (the five-state demo — R-6), `app/(app)/error.tsx` + `app/global-error.tsx` (Catalog `ErrorState` boundaries), `src/instrumentation.ts` (`onRequestError` — one server-side log keyed to the digest).

**Tests:** `fitness/ui-layering.test.ts` (R-1), `fitness/token-compliance.test.ts` (R-3), `e2e/shell.spec.ts` (R-4/R-5 + dark-mode axe), `e2e/auth.spec.ts` (updated for the real shell's user menu).

---

## 1. Acceptance Criteria (spec §7.1 Session 4 row + task ACs)

| Criterion | Result | Evidence |
|---|---|---|
| Tailwind v4 on PULSE tokens; no literals | ✅ | `next build` green; token-compliance scan (R-3) finds zero hex/rgb/px/arbitrary-value across `apps/web/src`. |
| shadcn on PULSE (no default-theme leakage); one primitive proven token-driven | ✅ | Primitives consume only PULSE role utilities; `components.json` points at the token CSS (init never overwrote `globals.css`); Button demonstrated inside the shell user menu. |
| `globals.css` owned by `@pulse/design-tokens`, imported at `src/app/globals.css`; 3 fonts | ✅ | File relocated + exported; `next/font` loads Space Grotesk / Inter / JetBrains Mono; build green. |
| Roles resolve **light and dark** | ✅ | axe clean on `/dashboard` in **both** light and `.dark` (E2E). |
| Authenticated **AppShell/Sidebar/TopBar** renders; keyboard; mobile reflow; active-nav bar; user shown; sign-out; **zero axe** | ✅ | 14 shell/auth E2E incl. axe (light+dark), keyboard, focus order/return, landmarks, `aria-current`, 375/768/1280 reflow, sign-in→dashboard→sign-out. |
| Error boundary → Catalog `ErrorState` + correlation reference; one server log; safe UI; inline 403 | ✅ | A **forced server throw** (`/ui-states?throw=1`) is caught by `(app)/error.tsx` → Catalog `ErrorState` (calm copy + Try-again) renders (E2E); `instrumentation.ts` logs the error once server-side (observed in the dev-server log); `error.digest` is the user reference. The inline 403 is rendered by the `/dashboard` permission catch (control flow implemented; see §8.9). |
| Session-3 auth/authz **unchanged**; prior tests green | ✅ | `lib/auth/**`/`@pulse/auth` untouched; authn/authz unit + integration + the full sign-in E2E all green. |
| `pnpm -w run verify` green; axe CI/test-only | ✅ | build + lint + type-check + format:check all pass; axe runs only in Playwright (never on commit). |

---

## 2. Design System Compliance

- **Catalog components only.** Every app-facing surface is a catalogued PULSE component (AppShell, Sidebar, TopBar, NavGroup/NavItem, PageContainer, PageHeader, Avatar, ActionMenu, ErrorState, EmptyState, LoadingState, Skeleton). No bespoke UI was invented; building these specced components for the first time is conformant (plan §0.2). **No net-new, undescribed component was required** — no STOP-and-request was triggered.
- **One styling path.** Tokens → shadcn primitives → PULSE components. No parallel `.pulse-*` sheet; no `tailwind.config.js` re-declaring theme (Tailwind v4 CSS-first, Design System §5).
- **Signature behaviors.** 3px brand left accent-bar on the active nav item (`--border-accent` + `--rail-fg-active`); uppercase tracked `eyebrow`; mono-tabular numerals available via the `.tabular`/`text-num`/`text-metric` tokens (no user-read numbers in this structural slice yet); brand used only as an accent (the volt mark), **never as readable text** (the "PULSE" wordmark is neutral rail text).
- **Inherited base-layer guarantees.** Focus = the global solid 2px ring + 2px offset (never re-declared per component); reduced-motion and forced-colors blocks inherited unchanged; skip-link anchor rendered by AppShell as globals.css expects.

**Result: COMPLIANT.**

## 3. Token Compliance (refinement R-3)

An automated scan (`fitness/token-compliance.test.ts`) statically asserts that **`apps/web/src` contains no hardcoded visual values** — four checks, all green:

| Check | Result |
|---|---|
| Raw hex colors (`#rrggbb`) | ✅ none |
| `rgb()` / `hsl()` colors | ✅ none |
| Raw `px` lengths in class/style | ✅ none |
| Tailwind arbitrary-value utilities (`bg-[#…]`, `p-[15px]`, `z-[999]`, `shadow-[…]`) | ✅ none |

Values not exposed as named utilities are referenced **by token** via Tailwind v4's custom-property shorthand — `w-(--border-accent)`, `z-(--z-dropdown)`, `shadow-(--shadow-md)`, `opacity-(--opacity-disabled)`, `h-(--topbar-h)`, `max-w-(--content-max)` — and control heights map to the 4px spacing scale (`h-11` = `--control-h`). The token **source** (`@pulse/design-tokens/globals.css`) legitimately holds the raw values and is out of scope.

**Result: COMPLIANT (colors, spacing, radius, typography, shadows — all token-sourced).**

## 4. Accessibility Results (refinement R-4)

Beyond the automated axe pass, the shell is driven by keyboard/AT in `e2e/shell.spec.ts`:

| Aspect | Result | Evidence |
|---|---|---|
| Automated axe (light) | ✅ 0 violations | `/`, `/dashboard`, `/ui-states` |
| Automated axe (dark) | ✅ 0 violations | `/dashboard` with `.dark` |
| Landmarks | ✅ | `banner` (TopBar), `navigation "Primary"` (Sidebar — contains the brand block so all rail content is in a landmark), `main` |
| Focus order | ✅ | the skip link is the **first** focusable app element |
| Visible focus | ✅ | inherited 2px ring + offset (base layer); never removed by primitives |
| Keyboard nav flow | ✅ | user menu opens on Enter, items reachable, Esc closes |
| Focus return | ✅ | Esc returns focus to the trigger for **both** the user menu and the mobile drawer (drawer wired via `onCloseAutoFocus` since it opens programmatically) |
| Active nav (not colour alone) | ✅ | `aria-current="page"` + the 3px bar + label |
| Reduced motion | ✅ | inherited base-layer block; Skeleton’s `animate-pulse` collapses to a static block |
| Error boundary (forced throw) | ✅ | `/ui-states?throw=1` → `error.tsx` renders the `ErrorState` alert + Try-again recovery; `role="alert"`; calm copy |

**Result: PASSED (Design System v1.1 §7 gate).**

## 5. Responsive Results (refinement R-5)

Driven at three viewports in `e2e/shell.spec.ts`:

| Viewport | Expectation | Result |
|---|---|---|
| **Mobile 375** | rail hidden; toggle visible; drawer opens (focus-trapped Radix Dialog), Esc closes + returns focus | ✅ |
| **Tablet 768** | rail hidden; toggle visible (below `lg` = 1024) | ✅ |
| **Desktop 1280** | persistent rail visible; toggle hidden | ✅ |

The nav never disappears (audit fix): below `lg` it becomes the off-canvas drawer; content reflows to a single column with the rail offset removed. **Result: PASSED.**

## 6. Visual Consistency & Component Reuse (refinement R-1)

- **shadcn is a primitive library only.** `fitness/ui-layering.test.ts` proves, statically:
  - `@radix-ui/*` is imported **only** inside `components/ui/**` (the primitive layer);
  - `@/components/ui/*` is imported **only** by the PULSE layer (`components/pulse/**`).
  Therefore route/layout/app code depends on **PULSE components, never raw shadcn** — exactly R-1.
- **Single canonical implementations.** One Button (primitive + a PULSE re-export boundary), one Avatar (primitive + PULSE initials wrapper), one ActionMenu, one ErrorState/EmptyState/LoadingState. No forks or bespoke variants.
- **Structural-only (R-2).** Search, notifications, branch switching, dashboard data, and feature routes are placeholders/deferred; nav "Manage" items render as inert, muted, non-navigating placeholders.
- **UI states (R-6).** `/ui-states` renders working demos of **Loading, Empty, Error, Unauthorized, Forbidden** with placeholder data; Unauthorized (redirect) and Forbidden (inline 403) also have their real runtime behavior on `/dashboard` and the `(app)` layout.

**Result: COMPLIANT.**

## 7. Test Summary

| Suite | Count | Result |
|---|---|---|
| Unit + architectural fitness (`turbo run test`) | **39** | ✅ (incl. R-1 layering ×2, R-3 token compliance ×4, dependency-cruiser graph) |
| Integration (isolated test DB :55433) | **7** | ✅ (Session-3 credential resolution + health — unchanged) |
| E2E (Playwright + dev DB, axe) | **15** | ✅ (auth ×4, smoke ×1, shell a11y/responsive ×10 incl. light+dark axe + forced-error boundary) |
| **Total** | **61** | ✅ |
| `pnpm -w run verify` (build/lint/type-check/format) | — | ✅ green |

Session 3 ended at 45 tests; Session 4 adds 16 (6 unit fitness + 10 E2E) and keeps all prior auth/authz tests green and unmodified.

## 8. Known Limitations (honest scope boundaries)

1. **shadcn CLI not run; primitives hand-authored.** The interactive `shadcn init` would overwrite `globals.css` (the plan's #1 risk) and cannot run non-interactively here. Primitives were authored in shadcn's Radix idiom, restyled to tokens, with a committed `components.json` so future `shadcn add` targets the token-mapped paths (generated output must still be reconciled to PULSE roles). Functionally equivalent to "shadcn via PULSE".
2. **Dark-mode toggle deferred (D-4.5).** Light is default; dark is verified by toggling `.dark` (E2E + manual). A user-facing ThemeToggle (+ `next-themes`) is a future Catalog proposal + dep approval — not invented this session.
3. **Data-bearing shell widgets deferred (R-2/D-4.2).** Global SearchBar, NotificationBadge/Center, BranchSwitcher/BranchContextChip are built with their first owning feature.
4. **Correlation reference = Next `error.digest`, not the Pino `correlationId`.** The client boundary cannot reach AsyncLocalStorage; `instrumentation.ts` logs full context server-side keyed to the digest (plan decision 0.3.5). Threading the Pino id into the UI is deferred extra plumbing.
5. **Sign-in `(auth)` left as-is (D-4.3).** It remains the bare, working Session-3 form; FormField/TextInput belong to the first form feature (avoids auth-UX scope creep). The representative primitive is shown in the shell instead.
6. **Skeleton uses `animate-pulse`, not the `pulse-shimmer` keyframe.** Both are motion-safe via the base-layer reduced-motion block; the dedicated shimmer treatment can be wired later (the keyframe is present in the tokens).
7. **E2E runs single-worker.** The suite drives `next dev` (on-demand route compilation); parallel workers race the cold compile, so the config pins `workers: 1` for determinism. A production-build E2E in CI could re-enable parallelism.
8. **CI not wired (by design).** axe/fitness run via `turbo run test` / Playwright locally; merge-blocking CI + the full six-rule T-27 suite are **Session 5** (T-24/T-25/T-27), and no git remote exists yet.
9. **Inline-403 control flow implemented but not test-exercised.** The `requirePermission` → catch `AuthorizationError` → inline `ErrorState` path on `/dashboard` is implemented, but the seeded Owner always holds `dashboard.view` and the Session-3 seed (frozen) has no actor lacking it — so the *branch* is not hit by a test. The 403 **visual** is demonstrated on `/ui-states`; the **unexpected-error** boundary path **is** test-exercised (forced-throw E2E). The "logs **exactly once**" property is **observed in the dev-server log**, not asserted by an automated test (asserting log cardinality from E2E is unreliable).

None of these block Session 5; each is a scoped deferral consistent with the approved plan.

## 9. Readiness for Session 5 (Hooks, CI & Architectural Fitness — T-24/T-25/T-27)

**READY.**

- The platform now builds the **real UI** end-to-end (tokens → primitives → PULSE components → shell + boundaries) on top of the working, frozen, gym-scoped session.
- `pnpm -w run verify` is green and the 60-test suite (incl. the new R-1 layering and R-3 token-compliance fitness checks) is a natural input to the Session-5 CI gate; the R-1/R-3 scans and the shell a11y/responsive E2E are ready to be wired merge-blocking.
- The auth/authz perimeter is **unchanged**; the two accepted Session-3 follow-ups (Argon2id evaluation; re-run `/security-review` once a remote exists) are untouched and still open.
- No design-system or architecture decision was changed; the §8 refinements were quality-only.

> **STOP.** Per the approval directive, implementation halts here. **Session 5 does not begin automatically** — it awaits explicit human acceptance of this report.
