# Pilot Readiness Sprint — Authentication & Loading Experience

**Date:** 2026-07-06 · **Branch:** `feat/platform-foundation` · **Scope:** two friction-removal tasks + two reviews before demonstrating to real gym owners. No feature work, no auth redesign, no Design System philosophy change. Additive only.

---

## 1. Authentication Improvement Report — phone-first sign-in

### What shipped

The sign-in form now has **one identifier field** that accepts a **phone number or an email**:

- **Label (a11y-visible, not placeholder-only):** ar `رقم الهاتف أو البريد الإلكتروني` · en `Phone number or email`. A placeholder-only label would fail the accessibility gate (Design System v1.1 §7 — every control has a persistent label), so the mandated wording ships as the field's *label*; behavior and copy are exactly as specified.
- **Password flow unchanged.** Same server action → `attemptSignIn` → Auth.js Credentials → `resolvePrincipalFromCredentials` pipeline; same scrypt verify; same generic failure copy; no OTP/SMS/magic links; no permission or domain changes.

### How detection works

1. **Boundary** (`lib/auth/auth.config.ts`): the Zod gate now validates *presence + length* of `identifier` (the old `z.string().email()` would have rejected every phone — it was the single hard email gate).
2. **Resolution** (`lib/auth/principal.ts` → `findUserByIdentifier`):
   - Identifier **contains `@`** → email path: `prisma.user.findUnique({ where: { email } })` (the global unique, unchanged behavior). Phones never contain `@`, so this single character is the entire decision — no fragile format guessing.
   - Otherwise → phone path: the input is **normalized** (`@pulse/auth` → `normalizePhone`) and matched against `User.phone`.
3. **Normalization is canonical and shared** (`packages/auth/src/identifier.ts`, pure/dependency-free):
   - Arabic-Indic `٠١٢٣` and Extended Arabic-Indic `۰۱۲۳` digits → ASCII (receptionists type on Arabic keyboards);
   - separators (spaces, dashes, dots, parentheses) stripped; a single leading `+` survives;
   - result must be 6–20 digits, else "not a phone" → generic rejection.
   - The **staff write boundary uses the same function** (`staff/validation.ts` → `optionalPhone`): phones are *stored* exactly as the login *looks them up*. Without this, a staff member saved as `0100 123 4567` could never sign in as `01001234567`.
4. **Ambiguity fails closed.** `User.phone` has no unique constraint, so the resolver takes 2 matches max: 0 or 2+ → `null` (plus an ids-only `auth.login.ambiguous_phone` warn). It never picks a winner. Anti-enumeration is preserved: unknown phone, unknown email, wrong password, and non-phone garbage all produce the same generic failure and comparable scrypt timing.

### Why this is superior for gym operations

Gym staff identify people by phone number — it's what the member says at the desk, what's on the sign-up sheet, and what a receptionist remembers. Emails are secondary artifacts (often created *for* the account). One field means the receptionist never has to answer "which kind of login am I?" — they type what they know, in either language's digits, with whatever spacing they naturally use, and it works. The email path remains for owners/admins who prefer it.

### Supporting changes (same change set)

- **Seed:** the bootstrap Owner now gets a phone (`OWNER_PHONE`, default `01000000000`) — set once, preserved on re-runs (an owner-edited phone is never churned back). Documented in `.env.example` + the deployment runbook env table.
- **Contract rename (deliberate, not silent):** `Credentials.email` → `Credentials.identifier` (`@pulse/types`), rippled through the seam (`auth.config.ts`, `principal.ts`, `sign-in.ts`, `actions.ts`, the form) and both test suites. The field is no longer an email; keeping the old name would be a lie in the type.
- **Input ergonomics:** the identifier input is `dir="ltr"` (phones/emails are LTR strings even in the RTL UI — same precedent as the member form), `autoComplete="username"` (password managers keep working), `autoCapitalize/autoCorrect/spellCheck` off.
- **Copy:** en failure copy is now identifier-neutral ("Invalid sign-in details."); ar was already generic (`بيانات الدخول غير صحيحة`).

### Deviations / judgment calls (flagged for review)

1. **Staff phone validation tightened** (`optionalPhone`): a non-phone value in the staff phone field is now a field error ("Enter a valid phone number") instead of being stored verbatim. Required for the identifier contract; it is a *validation-boundary* tightening, not a business-rule change. Member phones are **untouched** (member phone is INV-3 domain territory and not a login identifier).
2. **Pre-existing stored phones** (dev data only) that contain separators won't match phone login until re-saved through the staff form. The seed sets none, so this affects no seeded data.
3. **No `User.phone` unique constraint** was added — the schema is frozen (a migration was not "absolutely required"; ambiguity fails closed instead). If phone sign-in becomes the dominant path, a per-User unique (+ index) is the natural hardening follow-up. **Phone lookup is `findMany` without an index** — fine at staff-table scale (tens of rows), noted for the future.

### Tests

- **Unit (8 new):** `identifier.test.ts` — `@` detection, separator stripping, Arabic-Indic conversion, `+` handling, garbage/length rejection.
- **Integration (+8):** owner by seeded phone; formatted phone (`0100 000-0000`); Arabic-Indic digits; unknown phone + garbage → same generic null; **two users sharing a phone → fail closed**; staff created with formatted phone stored canonically; non-phone staff input → field error; staff phone sign-in round-trip.
- **E2E (+1, updated 7 specs):** owner signs in by phone typed with spaces → dashboard; all sign-in helpers updated to the new label; error-copy assertion updated.

---

## 2. Loading Experience Report

### Design intent

Calm, shaped, and honest: **skeletons that mirror the layout they replace** (Catalog §10's anti-CLS rule), one shimmer language everywhere, nothing spinning unless it genuinely represents an indeterminate wait.

### What shipped

1. **The prescribed shimmer, finally implemented.** `design-tokens.md` §15 and Catalog §10 have always specified the `pulse-shimmer` keyframe as *the* Skeleton animation — but the component used Tailwind's generic `animate-pulse` (code-vs-docs gap; docs win, per constitution §13). The token file now owns a `.skeleton` base class: `--surface-raised` block + a soft sweep (foreground mixed at 5%, correct in **both themes**), `--duration-shimmer: 1.6s` (new token, documented in §14/§15 — the one sanctioned loop, never UI feedback), applied **only under `prefers-reduced-motion: no-preference`** (static block is the mandated fallback), **RTL-aware** (the sweep follows reading direction).
2. **Catalog §10 Skeleton variants implemented** (`loading-state.tsx`): `SkeletonText`, `SkeletonPageHeader`, `SkeletonTable` (toolbar + rows; reads as the AP-1 card list on mobile), `SkeletonStat`/`SkeletonKpiGrid` (same responsive columns as KPIGrid), `SkeletonForm` (labels + controls + action). The `/ui-states` gallery demonstrates them.
3. **Route-shaped loading files** (was: ONE generic shape for ~32 routes; root `/` had **no** loading UI at all — blank screen):

| Segment | Shape |
|---|---|
| `/` (root, **new coverage**) | Real brand header (static content renders for real) + skeleton hero |
| `(app)` group fallback | Header + text card (settings, onboarding, anything without a closer file) |
| `/dashboard` | Header → KPI grid → two operational-list cards (wide container) |
| `/members`, `/memberships`, `/plans`, `/staff` | Header → toolbar → table rows |
| `/members/[id]` | Workspace: header → Answer-Strip stats → rail cards |
| `/members/new`, `[id]/edit`, `/plans/new`, `[id]/edit`, `/staff/new`, `[id]/edit`, `/memberships/new` | Form shape, in each page's real container width |
| `/memberships/[id]`, `/plans/[id]`, `/staff/[id]` | Detail cards |
| `/notifications` | Stacked notification cards |
| `/reports` (+ all subreports) | Header → summary stats → result table |
| `/sign-in` (`(auth)` group) | Existing LoadingState skeleton card (unchanged) |

4. **Localized busy labels.** The `(app)` fallback's `aria-label` was hardcoded English ("Loading…"); every loading file now uses `t("common.loading")`.
5. **TopBar quick language switch** discarded its transition pending state (zero feedback during the refresh). The user-menu trigger now dims + `aria-busy` while the locale switch runs — the same recipe as the catalogued LanguageSwitcher (disabled + reduced opacity, no spinner).

### Why these patterns

- **Skeleton over spinner everywhere content has a shape** — the Catalog's own preference ("reduces perceived latency and CLS"). The only spinner remaining is the `LoadingState variant="spinner"` gallery demo; no route uses one.
- **No loader for extremely short operations:** App Router only mounts `loading.tsx` while a segment actually suspends; static/instant segments (e.g. `/onboarding/complete`) never flash one. Form submissions keep the existing calm SubmitButton treatment (disabled + label swap — deliberately **not** given a spinner icon; "no spinning circles everywhere").
- **Smooth appearance/disappearance without new machinery:** shaped skeletons occupy the same geometry as the arriving content, so the swap is a fill-in, not a flash; the shimmer is slow (1.6s) and low-contrast (5% mix) by design. No entrance animation was added — that would itself be flash.
- **Shell persistence:** Sidebar + TopBar never skeleton — only the content pane suspends, so navigation feels anchored.
- **Mobile/dark/RTL:** all shapes are token-only and flex/grid (375px-safe); the shimmer highlight derives from `--foreground` so dark mode is automatically correct; sweep direction follows `dir`.

### Explicitly not done (and why)

- **DataTable `loading` prop** (Catalog §5 lists one): with no client-side fetching and no Suspense-in-page, it would be dead code today. The route-level skeleton *is* the table's loading state. Deferred until a consumer exists.
- **LoadingState `inline`/`overlay` variants** (Catalog §10): no consumer; building them now would be speculative.
- **Component-level unit tests for skeletons:** would require a DOM testing dependency (new dep = human approval); covered instead by e2e + axe over pages that render them.

---

## 3. Authentication UX Review (observations only — nothing below was implemented)

Walked the sign-in experience at 375px/1280px, light/dark, en/ar, keyboard-only.

**Sound today**
- **Spacing/hierarchy:** auth card `max-w-md`, `p-6/md:p-8`, `gap-6`; h1 + subtitle + 4-gap fields — consistent with the form idiom everywhere else.
- **Focus:** global solid 2px ring + offset applies to both inputs and the submit; focus order is identifier → password → submit; no traps.
- **Keyboard:** plain form; Enter submits from either field; pending state blocks double-submit (`useFormStatus`).
- **Errors:** generic, non-enumerating, rendered in a `role="alert"` Alert above the fields — announced by SR, visible without scroll at 375px.
- **Mobile keyboard:** identifier is a plain-text field (correct for the dual type — an email keyboard would bury digits, a tel keyboard has no letters); ≥16px input font below `md` (v1.2 §5.10) so iOS never focus-zooms; `dir="ltr"` keeps typed phones/emails readable under RTL.
- **Password visibility:** `autoComplete="current-password"` is wired (password managers fill correctly).

**Observations worth future work** *(document-only, per the sprint rules)*
1. **No autofocus** on the identifier field — the receptionist's first tap is always this field; `autoFocus` (or focus-on-mount respecting SR announce order) is a small win. Not implemented (behavior change beyond scope).
2. **No password show/hide toggle.** Long temp passwords (owner-communicated out-of-band, staff flow) are error-prone to type blind on mobile. Deserves a catalogued `PasswordInput` variant.
3. **Remember-me:** does not exist; sessions are JWT with Auth.js defaults. For a shared front-desk device, *shorter* sessions may actually be the right ask — a product decision, not a checkbox to copy.
4. **Forgot-password:** does not exist by design (no email infra; owner resets staff passwords via the staff module — TD: the *owner's own* recovery path is manual/DB). Should be scheduled before multi-gym pilot; today the runbook covers it.
5. **Label wording tradeoff:** the mandated label is long (ar wraps on 320px-wide screens). Fine at 375px+; if 320px matters, a shorter label + descriptive placeholder is the variant to test.
6. **Caps-lock warning** on the password field is a cheap future nicety.

---

## 4. Loading Audit (walkthrough of every surface)

Verified per route (dev server, en + ar/RTL, light + dark, 375/1280):

| Surface | Loading experience now | Verdict |
|---|---|---|
| Landing `/` | Brand header + hero skeleton (was **blank**) | ✅ fixed |
| Sign-in | Auth-card skeleton (`(auth)/loading.tsx`), pending submit label | ✅ consistent |
| Onboarding (4 steps) | `(app)` generic header+card (forms are light; no route-specific shape needed) | ✅ acceptable |
| Dashboard | KPI-grid + lists skeleton, wide container | ✅ shaped |
| Members list | Toolbar + rows skeleton (card list shape on mobile) | ✅ shaped |
| Member Workspace | Answer-Strip + rail skeleton | ✅ shaped |
| Member new/edit | Narrow form skeleton | ✅ shaped |
| Memberships list/detail/new | Table / detail / form skeletons | ✅ shaped |
| Plans list/detail/new/edit | Table / detail / form skeletons | ✅ shaped |
| Staff list/detail/new/edit | Table / detail / form skeletons | ✅ shaped |
| Reports (all) | Stats + table skeleton (one file covers the segment) | ✅ shaped |
| Notifications | Stacked card skeletons | ✅ shaped |
| Settings (gym/branch/profile) | `(app)` generic header+card | ✅ acceptable (trivial loads) |
| Locale switch (TopBar quick + LanguageSwitcher) | Dimmed/busy control while refreshing | ✅ fixed (TopBar) / already fine |
| Form submissions (all modules) | SubmitButton disabled + pending label | ✅ unchanged, consistent |

**Consistency check:** every loading surface is now built from the same primitives (`Skeleton` + §10 variants), the same shimmer token, the same `role="status"`/`aria-busy` + localized label recipe, inside the page's real container. Reduced-motion → static blocks (double-guarded: media-query gating + the global §4 kill-switch).

---

## 5. Pilot Readiness Assessment

> **"Would a real gym receptionist naturally understand and use the login experience?"**

**Yes — with one honest caveat.**

The happy path is now genuinely receptionist-shaped: one field labeled "رقم الهاتف أو البريد الإلكتروني", it accepts the phone number exactly as they'd say it out loud — Arabic or Latin digits, spaces or dashes, with or without `+20` — plus the same password they were handed. Nothing asks them to categorize their input, the failure message doesn't lecture, and the app never shows a dead white screen while it thinks.

The caveat: **the password is still the sharp edge.** A receptionist whose owner hands them `TempPass123` over WhatsApp has no way to recover it themselves (no forgot-password, by design), can't see what they're typing (no show/hide toggle), and gets no caps-lock hint. None of that blocks the pilot — the owner is present and can reset from the staff module — but it is the first support call the pilot will generate. Items 1–4 in §3 are the ordered backlog for that.

Also honest: phone sign-in works only for users whose stored phone is canonical. All *new/edited* staff are canonical by construction; anything hand-inserted earlier must be re-saved once.

---

## 6. Verification

| Gate | Result |
|---|---|
| TypeScript (`turbo type-check`, 6 pkgs) | ✅ |
| Lint (incl. fitness lint rules) | ✅ |
| Architecture fitness (cycles/layering/tokens) | ✅ (in unit suite) |
| Production build (`next build`) | ✅ 29/29 pages |
| Unit | ✅ **208 passed** (+8 identifier suite) |
| Integration (live test DB) | ✅ **115 passed** (+8: phone auth ×5, staff phone ×3) |
| E2E (Playwright, en) | ✅ **39 passed / 0 failed / 1 skipped** — the skip is the pre-existing *conditional* AP-5 membership-detail test (`adaptive.spec.ts:233` skips itself when the dev DB has no membership row; data-dependent since Sprint 1.7, not a regression) |
| Accessibility (axe: landing, sign-in, shell, modules × mobile/desktop/dark) | ✅ within e2e |
| RTL (targeted evidence) | ✅ `apps/web/scripts/pilot-readiness-rtl-check.mjs` against a `PULSE_LOCALE=ar` server: `dir=rtl`, the Arabic identifier label renders, axe **0 violations** at 375+1280 × light+dark, and a full **sign-in by phone typed in Arabic-Indic digits with spaces (`٠١٠٩ ٦٨١ ٦١٢٩`) reached the dashboard**. Screenshots: `docs/sprints/assets/pilot-readiness/` |

**Test-suite adjustments made for determinism (not to mask anything):** the shaped loading fallbacks mean a page's URL settles *before* its content — three e2e `signIn` helpers now wait for the dashboard `h1` (axe/DOM-order assertions must not race a skeleton frame), and the owner-phone tests read the phone from the **database** (the seed sets a default only when none exists and preserves an edited one — the dev DB already carried a real phone, which is exactly the preserve-don't-churn behavior working).
