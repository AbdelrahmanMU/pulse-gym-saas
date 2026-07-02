# Sprint 1.6 — Public Experience (Implementation Brief)

**Date:** 2026-07-02 · **Mode:** Fast Delivery · **Type:** UI-composition slice (no feature logic)

## Why

The 2026-07-02 runtime investigation confirmed the PULSE pipeline (Tailwind v4, tokens,
catalog, shadcn primitives) works end-to-end — but the only two public routes (`/`,
`/sign-in`) are still the Sprint-0 placeholders (T-06/T-19) that predate the design
system. Before the Adaptive Mobile v1.2 implementation begins, the public surface must
match the product behind it.

## Scope (in)

1. **`/` landing** — replace the T-06 placeholder with a token-only branded entry
   (brand block + headline + single Sign-in action). A signed-in staff member is
   redirected to `/dashboard` via the existing platform `ICurrentUser` read.
2. **`(auth)/layout.tsx`** — new public layout: brand header + centered auth column
   (the unauthenticated counterpart of the `(app)` shell).
3. **Sign-in rebuild** — recompose the T-19 form from the existing catalog only
   (`FormLayout`/`FormField`/`TextInput`/`SubmitButton`/`Alert`).
4. **States** — `(auth)/loading.tsx` (catalog `LoadingState`), `(auth)/error.tsx` and
   root `error.tsx` (catalog `ErrorState`, mirroring the `(app)` boundary), pending
   submit state, styled generic failure alert.
5. **E2E** — re-point `smoke.spec.ts` at the new public surface (axe on `/` and
   `/sign-in`, landing→sign-in navigation). Existing auth/shell/onboarding specs must
   stay green unchanged.

## Scope (out) — unchanged by this slice

Authentication logic (`actions.ts`, `attemptSignIn`, Auth.js config, redirects of the
`(app)` segment), design system/tokens/catalog, architecture, permissions, database,
business modules. No new dependency, pattern, or component.

## Contracts preserved

- Field names `email`/`password`, `autoComplete` values, native `required`.
- Accessible names: labels "Email"/"Password", button "Sign in", heading /sign in/i,
  failure text "Invalid email or password." (generic — no enumeration hint).
- Sign-out and unauthenticated protection still land on `/sign-in`.

## Decisions flagged for veto

- **D-1:** `/` renders a minimal branded landing for signed-out visitors and redirects
  signed-in users to `/dashboard` (reads the session via `currentUser.get()`; adds no
  auth logic). Alternative was a bare redirect-only route.
- **D-2:** the landing/auth brand block reuses the Sidebar idiom (decorative volt
  square + neutral wordmark) — brand is never readable text.
- **D-3:** `smoke.spec.ts` (T-23 placeholder test) is re-pointed at the landing rather
  than deleted — it remains the public-surface axe gate.

## Definition of done

Catalog/tokens only (fitness suites green) · type-check/lint/format/build green ·
178 unit + fitness green · e2e green (auth, shell, onboarding, gym-settings, new smoke)
· axe baseline on both public pages · verification report before commit.
