# Sprint 1.6 — Public Experience · Verification Report

**Date:** 2026-07-02 · **Branch:** `feat/platform-foundation` · **Mode:** Fast Delivery
**Type:** UI-composition slice — no business logic, schema, permission, dependency, or
design-system change.

## 1. What shipped

The public (unauthenticated) surface is now composed from the PULSE Design System,
replacing the two Sprint-0 placeholders (T-06 home, T-19 sign-in form) that the
2026-07-02 runtime RCA identified as the source of the "unstyled UI" report.

| File | Change |
| --- | --- |
| `apps/web/src/app/page.tsx` | T-06 placeholder → branded landing (eyebrow + display headline + single Sign-in CTA); signed-in staff redirect to `/dashboard` |
| `apps/web/src/app/(auth)/layout.tsx` | **New** — public auth layout: brand header + centered auth column (`main` landmark) |
| `apps/web/src/app/(auth)/sign-in/page.tsx` | Bare markup → auth card (`h1` "Sign in" + subtitle + form), route metadata title |
| `apps/web/src/app/(auth)/sign-in/sign-in-form.tsx` | Recomposed from catalog: `FormLayout` + `FormField`/`TextInput` + `SubmitButton` (pending "Signing in…") + danger `Alert` for the generic failure |
| `apps/web/src/app/(auth)/loading.tsx` | **New** — catalog `LoadingState` skeleton (mirrors the `(app)` pattern) |
| `apps/web/src/app/(auth)/error.tsx` | **New** — segment boundary, catalog `ErrorState` + Try-again (mirrors `(app)/error.tsx`, T-17 contract) |
| `apps/web/src/app/error.tsx` | **New** — root boundary covering `/` (the only route without a nearer boundary) |
| `apps/web/e2e/smoke.spec.ts` | T-23 placeholder test → public-surface gate: axe on `/` and `/sign-in` + landing→sign-in navigation |

**Unchanged, verified by diff scope:** `(auth)/sign-in/actions.ts`, `lib/auth/**`,
`@pulse/auth`, all modules, all catalog components, tokens, schema, permissions.

## 2. Contracts preserved (authentication untouched)

- Same server action (`signInAction`), same `attemptSignIn` path, same redirect to
  `/dashboard`, same generic failure copy "Invalid email or password." (no
  user-enumeration hint — rendered via `Alert` `role="alert"`).
- Field names `email`/`password`; `autoComplete` `username`/`current-password`;
  native `required` (now also announced via the FormField required contract).
- Accessible names unchanged: labels **Email**/**Password**, button **Sign in**,
  heading matches /sign in/i — the existing auth/shell/onboarding e2e specs pass
  **unmodified**.

## 3. Gates (all executed this session, in order)

| Gate | Result |
| --- | --- |
| `tsc --noEmit` | ✅ |
| `eslint .` | ✅ |
| Unit + fitness (vitest) | ✅ **178/178** — incl. token-compliance (no literals/arbitrary values in the new files), ui-layering (routes import `components/pulse` only), architecture (no cycles/cross-context), no-role-checks |
| Prettier | ✅ (one wrap fixed by `--write` during the session) |
| `next build` | ✅ 36 routes; `/sign-in` static 4.1 kB; `/` now **dynamic** (session read) — see D-1 |
| Playwright e2e | ✅ **21/21 in a single clean run** (auth 4, gym-settings, onboarding, shell 10, new smoke 2). One earlier run hit the **known pre-existing dark-mode-axe flake** on the *dashboard* (`shell.spec.ts`, StatCard eyebrow contrast 4.47 vs 4.5 in dark, surface untouched by this slice); it passed on the isolated rerun and in the final full run. Logged below as a follow-up. |
| axe baseline (public surface) | ✅ `/` and `/sign-in` violation-free (new smoke tests) |
| Responsive | ✅ visually verified at 1280 and 375 (screenshots reviewed: landing, sign-in, sign-in failure state); reflow clean, no horizontal scroll |

## 4. Decisions flagged for human veto

- **D-1 (routing):** `/` reads the session via the existing platform `ICurrentUser`
  (`currentUser.get()`) and redirects signed-in staff to `/dashboard`; signed-out
  visitors get the landing. Consequence: `/` is server-rendered per request (was
  static). No auth logic added — it is a read of the existing adapter.
- **D-2 (identity):** landing/auth brand block reuses the Sidebar idiom — decorative
  volt square + neutral wordmark ("brand is never readable text").
- **D-3 (tests):** `smoke.spec.ts` re-pointed (not deleted) — it remains the
  public-surface axe gate. Landing heading asserted as /operational pulse/i.
- **D-4 (copy):** landing headline "The operational pulse of your gym." + supporting
  line; sign-in subtitle "Use your staff account to manage your gym." Product copy is
  the human's to overrule.

## 5. Known issues / follow-ups (pre-existing, not introduced here)

- **Dark-mode axe flake** (`shell.spec.ts` dashboard, eyebrow `text-muted-foreground`
  contrast 4.47:1 on a raised dark surface) — intermittent since Sprint 1; now has a
  concrete measurement and deserves a token-level look in the v1.2 adaptive slice.
- The framework-default 404 for arbitrary unmatched public URLs remains (Sprint-1.5
  decision, unchanged).
- No dark-mode toggle exists on the public surface (dark class is applied only inside
  the app shell) — public pages render light; consistent with current product scope.

## 6. Definition of Done

Existing modules/components/tokens only — no literals, no bespoke patterns, no new
dependency ✅ · mutation pipeline untouched (no new mutations) ✅ · validation boundary
unchanged (credentials validated in the Credentials `authorize` Zod boundary, as
before) ✅ · P0 suites green ✅ · a11y gate passed (axe on both public pages; labels,
landmarks, `role="alert"`, focus ring from base layer) ✅ · responsive verified ✅ ·
self-reviewed ✅ · docs updated in the same change set (brief + this report) ✅ ·
**awaiting human acceptance at merge** (per constitution §10/§11).
