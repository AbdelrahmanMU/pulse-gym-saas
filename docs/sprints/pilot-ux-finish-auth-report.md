# Pilot UX Finish — Authentication Final Polish

**Date:** 2026-07-06 · **Branch:** `feat/platform-foundation` · **Scope:** the last two UX frictions on the accepted phone-first sign-in, plus a final walkthrough. No auth redesign, no schema/permission/domain change, no refactoring.

---

## 1. Password Visibility Report

### What shipped

A new catalogued **`PasswordInput`** (`components/pulse/password-input.tsx`, Catalog §9 entry added) — TextInput plus exactly one interaction:

- **The input is the unchanged TextInput.** `name`, `autoComplete="current-password"`, and the FormField id/aria wiring pass straight through, so **browser password managers and autofill keep working** — the component only swaps `type` between `password` and `text`.
- **The toggle is a sibling `type="button"`** (can never submit the form) with:
  - its own accessible name — `common.showPassword` / `hidePassword` (en + ar, the only two i18n keys added; existing translations untouched);
  - `aria-pressed` state + `aria-controls` pointing at the field id (from the FormField context);
  - a **full-height 44px hit area** (`w-11` × the field's `h-11`) — mobile-friendly per v1.2 touch rules;
  - lucide `Eye`/`EyeOff` at `--icon-md`, `text-muted-foreground → foreground` on hover — tokens only.
- **No layout shift:** the input always reserves `pe-11`; the icon area exists whether toggled or not.
- **RTL:** positioning is fully logical (`end-0`, `pe-11`) — under `dir="rtl"` the eye sits on the visual left, the correct trailing side. Verified in the ar evidence pass.
- **Keyboard:** the button is in the natural tab order (identifier → password → toggle → submit); Enter/Space toggle it; the global 2px focus ring applies.
- Visibility state is per-mount and never persisted; the field mounts masked.

Consumer: the sign-in form (`sign-in-form.tsx`) — a one-line swap of `TextInput type="password"` for `PasswordInput`. *(Natural next consumer: the staff temporary-password field — deliberately not touched; "no opportunistic cleanup".)*

**Test-suite note:** the toggle's accessible name contains the word "password", and Playwright's `getByLabel` is substring-matching by default — every `getByLabel("Password")` in the e2e suite would have become ambiguous. All password locators now use `{ exact: true }` (5 specs + the ar evidence script). A new e2e verifies reveal → value intact → re-mask.

## 2. Phone Normalization Report

### Audit result

Of the seven mandated inputs, five already resolved correctly; the three *prefix families* (`010…`, `+2010…`, `2010…`) resolved to **three different canonical strings** — same real-world number, three login identities. A staff member stored one way could not sign in typing another. That was the one true gap.

### Fix (additive, still ~30 lines, no dependency)

Two fixed **dialing-rule rewrites** added to `normalizePhone` (`packages/auth/src/identifier.ts`) — applied identically at the staff write boundary and the login lookup, so both sides always agree. This is **not country detection**: nothing is guessed, no locale is consulted, no library added.

Pipeline: trim → Arabic-Indic → ASCII → strip separators → `00…` → `+…` → Egypt equivalence → validate 6–20 digits.

- `00…` → `+…` — the universal international-dialing prefix (generic, country-agnostic).
- `+20…` → `0…` — `+20` is uniquely Egypt (ITU); the local trunk form is canonical **because every existing stored phone is already local-form** (verified in the dev DB before changing: only the owner, `01096816129`).
- bare `20` + 10-digit mobile (`1xxxxxxxxx`) → `0…` — people paste E.164 digits without the `+`. Restricted to the mobile shape; a bare `20`-prefixed **landline** stays as typed (too ambiguous to rewrite — documented limitation, not a gap: nobody types their landline that way at a front desk).

### Supported input formats (canonical output → `01012345678`)

| Input | Canonical | Via |
|---|---|---|
| `01012345678` | `01012345678` | already canonical |
| `010 1234 5678` | `01012345678` | separator strip |
| `010-123-45678` | `01012345678` | separator strip |
| `+201012345678` | `01012345678` | +20 → 0 |
| `201012345678` | `01012345678` | bare-20 mobile → 0 |
| `00201012345678` | `01012345678` | 00 → + → 0 (bonus form) |
| `٠١٠١٢٣٤٥٦٧٨` | `01012345678` | Arabic-Indic → ASCII |
| `٠١٠ ١٢٣٤ ٥٦٧٨` | `01012345678` | Arabic-Indic + separators |
| `+20 233 334 444` (landline) | `0233334444` | +20 → 0 |
| `+1555…`, `+212…`, any non-`+20` | unchanged (`+` kept) | never rewritten |

**All seven mandated forms resolve to the same canonical value.** `libphonenumber` was not needed — the gap was a single fixed prefix equivalence, provably safe (`+20` is unambiguous; the bare form is shape-restricted).

**Deliberate canonical-form change:** an international-form phone now *stores* as local (last sprint it stored as `+20…`). Verified before shipping that no stored row used the `+20` form, so nothing orphaned. One prior test assertion updated to the new contract (documented, not masked).

### Tests

Unit: the seven mandated forms + `00` chaining + landline vs bare-landline + non-Egypt passthrough (`+1`, `+212` — which correctly does not trip the `+20` prefix). Integration: staff stored via `"+20 100-555 0199"` reads back `01005550199`; staff stored local signs in typing the `+20` form (cross-form equivalence, end-to-end through scrypt).

## 3. Authentication UX Verdict

Walked as a gym owner (email habit, desktop) and a receptionist (phone habit, mobile, likely Arabic keyboard):

| Check | State |
|---|---|
| Focus order | logo → skip-free public page → identifier → password → eye toggle → submit. Nothing focusable before the form that matters. |
| Tab order | Matches visual order in LTR and RTL (logical properties). Toggle is one extra stop between password and submit — standard pattern, kept keyboard-reachable by requirement. |
| Mobile keyboard | Identifier = plain text keyboard (correct for the dual type); ≥16px input font <md → no iOS focus-zoom; toggle hit area 44px. |
| Password managers | `autoComplete="username"` + `current-password` preserved; the toggle never blocks autofill (input element unchanged). |
| Copy | Label = the mandated wording; failure = one calm generic line (ar already generic); button verbs match the page title. |
| Spacing | Auth card `max-w-md`, consistent 4/6-gap rhythm; no wrapping issues at 375px in either locale. |
| Loading | Pre-render: auth-segment skeleton card. Submit: button disables + "Signing in…" swap — double-submit impossible. |
| Error state | `role="alert"` Alert above the fields, visible without scrolling at 375px; fields keep their values. |
| Success transition | Redirect → branded root loading fallback → dashboard skeleton → dashboard. No blank frame anywhere in the chain. |

> **"Would a first-time gym receptionist complete login without assistance?"**
>
> **Yes.** The two prior stumbling points are gone: they can type their phone number in *any* form they know it — local, international, Arabic digits, any spacing — and they can now **see the password** they were handed over WhatsApp while typing it. The remaining assistance case is not a UX gap: if they never received (or lost) the password, someone must reset it via the staff module — password *recovery* remains deliberately out of scope (stop condition), and stays the top follow-up after the pilot.

## 4. Verification

| Gate | Result |
|---|---|
| TypeScript / Lint / Fitness | ✅ |
| Production build | ✅ |
| Unit | ✅ **212 passed** (+4 normalization audit) |
| Integration | ✅ **116 passed** (+1 cross-form sign-in; canonical-storage assertion updated) |
| E2E incl. axe | ✅ full suite **39 passed / 0 failed / 1 pre-existing conditional skip** (+1 new toggle test); one occurrence of the *documented* dark-mode-axe flake passed on retry, then the in-repo `reducedMotion` recipe (already used by `adaptive.spec`) was applied to `shell.spec`'s dark test and shell+auth re-ran **17/17 clean** |
| RTL | ✅ ar evidence re-run (script now also asserts the toggle): Arabic accessible name present, toggle on the **trailing/left** side under RTL (bounding-box check), axe **0 violations** at 375+1280 × light+dark, Arabic-Indic phone sign-in end-to-end green |

**Locator lesson recorded:** FormField's accessible name includes the required marker ("Password (required)"), so `getByLabel("Password", { exact: true })` matches nothing — the correct disambiguation against the new "Show password" button is the anchored regex `getByLabel(/^Password/)` (applied across 5 specs + the ar script).
