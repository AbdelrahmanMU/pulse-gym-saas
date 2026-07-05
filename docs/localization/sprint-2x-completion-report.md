# Sprint 2.x — Arabic Localization · Completion Report

**Branch:** `feat/platform-foundation` (not merged/tagged) · **Date:** 2026-07-05
**Authority (frozen source of truth):** [`arabic-localization-authority.md`](arabic-localization-authority.md) — Deliverable 12 is the dictionary.
**Prior docs:** [`sprint-2x-implementation-report.md`](sprint-2x-implementation-report.md) · [`sprint-2x-session2-handoff.md`](sprint-2x-session2-handoff.md)
**Final commit this session:** `9edb85b` (`feat(i18n): localize gym settings + onboarding + reports page headers`)

> This report closes the sprint. Every operator-facing PULSE-owned UI string now renders from
> the `en`/`ar` catalogs; Arabic is authored from the Authority, never machine-translated. What
> remains English is a small, explicitly-listed set of runtime-composed sentences (Tier-2
> residuals) — surfaced here, not hidden.

---

## Deliverable 1 — Implementation Summary

The localization was delivered across two sessions. This (final) session completed the tail:

| Chunk (this session) | What shipped |
|---|---|
| **Settings + onboarding** (gym module) | New `settings` namespace (56 keys). `gym-settings-form`, `branch-form`, `profile-form`, `form-feedback` + the 3 settings pages + 4 onboarding steps (gym/branch/profile/complete) now read from the catalog. Field/validation errors route through the shared `useFormError` client map (mirrors members/staff). |
| **Reports page headers** | The four report sub-pages (revenue/outstanding/expiring/memberships) wired to the **existing** `reports` title/subtitle keys — only the page shells were still English (the report UI components were localized last session). |
| **Error catalog** | 9 gym Zod messages added to the `formErrors` namespace + the `form-error.ts` CODE map (e.g. `Gym name is required` → `gymNameRequired` → «اسم الجيم مطلوب»). |
| **Unused-key sweep** | Removed 7 dead payment-method keys (`money.method*`, `payments.method*`); `paymentMethodLabel` stays inline in `payments/format.ts`. |

**Cumulative sprint coverage** (all sessions): money + dates presentation, memberships (rail /
lifecycle / list / detail), notifications (display-time), payments, members workspace + forms,
plans, staff, reports, **settings + onboarding**, auth, dashboard, nav, landing, common, status.

**Architecture seam (unchanged, carried from prior sessions):**
- **Locale model:** `PULSE_LOCALE` env → `getUserLocale()`; `ar` is the product default. `<html
  lang dir>` set from the locale (`ar` → `rtl`). No `/ar` `/en` routing (v1 language switcher
  deferred by the Authority). e2e is pinned to `en`.
- **Fallback:** the English source is deep-merged *under* the active locale, so any missing `ar`
  leaf renders English rather than a raw key path (`i18n/request.ts`).
- **Digits:** Latin 0–9 everywhere; `formats.number` pins `numberingSystem: "latn"` and display
  numbers are passed pre-formatted (Authority · Deliverable 9).
- **Error bodies:** produced English-source in the domain layer (outside request context in
  integration tests) and localized **on the client** via `useFormError` — a presentation-only
  seam that couples no service to i18n and breaks no integration test.

---

## Deliverable 2 — Localization Completion Report (catalog totals)

Measured against `apps/web/messages/{en,ar}.json` at commit `9edb85b`:

| Metric | Count |
|---|---|
| **UI strings (leaf keys)** | **590** |
| **Localized (ar authored from Authority)** | **590 (100%)** |
| **Fallback to English (missing `ar` leaf)** | **0** |
| **Hardcoded English (in JSX/source)** | **0** PULSE-owned UI strings — 3 runtime-composed Tier-2 residuals remain (see Retrospective) |
| **Hardcoded Arabic (in JSX/source)** | **0** — locale *data* (currency marks, month names, ordinals, duration units, payment-method labels) lives in code as CLDR-like data by design (see Retrospective note 3), not as UI copy |
| **Missing keys** (`en`↔`ar` parity) | **0** — exact 590/590 parity |
| **Unused keys** | **0** — verified against a full-source token scan; `formErrors.*` checked against the dynamic `form-error.ts` CODE map (not a naive grep) |
| **Duplicated keys** | **0** — the 7 redundant method keys were removed this session |
| **Namespaces** | **19**: meta, common, nav, landing, auth, actions, errors, dashboard, status, money, members, formErrors, notifications, memberships, plans, staff, reports, payments, **settings** |

---

## Deliverable 3 — Coverage vs Target

| Target (sprint prompt) | Actual |
|---|---|
| 100% localized | ✅ 100% (590/590) |
| 0 fallback | ✅ 0 |
| 0 hardcoded EN (UI copy) | ✅ 0 catalog gaps · 3 runtime-composed residuals listed |
| 0 hardcoded AR | ✅ 0 (locale-data-in-code is a documented, deliberate exception) |
| 0 missing | ✅ 0 |
| 0 unused | ✅ 0 |
| 0 duplicated | ✅ 0 |

---

## Deliverable 4 — RTL Verification

Verified against a `PULSE_LOCALE=ar` dev server via a standalone Playwright evidence pass
(`apps/web/scripts/rtl-evidence.mjs`), signed in as the owner, across the full matrix:

| Dimension | Values |
|---|---|
| **Viewports** | desktop **1280** · mobile **375** |
| **Themes** | **light** · **dark** (`.dir="rtl"` + `.dark` class) |
| **Direction** | every captured page reported `document.documentElement.dir === "rtl"` |
| **axe (WCAG)** | **44 checks · 0 violations** across all module × viewport × theme combinations |

**Spot-checked RTL correctness (settings/gym, desktop):** page flows right-to-left; the sidebar
sits on the inline-end edge with the active-item **3px accent bar on the inline-start (right)
edge**; required-field asterisks and labels align RTL; user data stays LTR and untranslated
(`Pulse First Gym`, `USD`, `Africa/Abidjan`); Latin digits (`7`, `0`) keep mono-tabular
alignment; the brand mark stays `PULSE` (Latin). No physical-CSS leakage in the touched files
(`pl-/pr-/ml-/mr-/left-/right-/text-left/right/rounded-l/r` → all logical); the previously-flagged
`staff-role-control.tsx` was confirmed clean.

---

## Deliverable 5 — Evidence (screenshots)

**44 screenshots** at `docs/localization/screenshots/ar/` — 11 authenticated modules ×
{desktop, mobile} × {light, dark}:

| Module | Arabic surface |
|---|---|
| `dashboard-*` | الرئيسية — KPIs, operational lists, quick actions |
| `members-*` | الأعضاء — list, filters |
| `member-workspace-*` | Member workspace — Answer Strip + Membership Rail |
| `memberships-*` | الاشتراكات — two-slot list |
| `membership-detail-*` | Membership detail incl. **الدفعات** (payments panel) |
| `plans-*` | الباقات |
| `reports-*` / `reports-revenue-*` | التقارير + revenue report |
| `staff-*` | فريق العمل |
| `notifications-*` | الإشعارات |
| `settings-gym-*` | الإعدادات — gym settings |

(Prior public-page shots — landing, sign-in — remain at `docs/localization/screenshots/`.)

---

## Deliverable 6 — Retrospective

**What went well.** The two-session catalog held exact parity throughout; the `useFormError`
client seam meant zero service/integration churn; every gate stayed green; the RTL a11y matrix
came back perfectly clean (0/44). Every string in the settings/onboarding slice traced to a
frozen Authority ruling.

**Vocabulary decisions this session (from the frozen Authority, not invented):**
- **Grace period → «مهلة السماح»** — «فترة» is D10-banned, so the standard «فترة السماح» could not
  be used; «مهلة» is the natural, unbanned rendering.
- **Owner profile → «حسابي»** — «بروفايل/ملف شخصي» are D10-banned; «حسابي» matches the already-
  localized `nav.account` and reads naturally for the owner's own account.
- Section headers not in the Authority (e.g. "Localization & operations" → «الإعدادات المحلية
  والتشغيل") are translator discretion **within** the tone laws (Deliverable 3), never new terms.

**English that deliberately remains (Tier-2 residuals — runtime-composed, not catalog keys):**
1. **The multi-reason archive-blocked sentence** — composed in `members/policy.ts` + `service.ts`
   from a variable set of reasons; falls back to English via `useFormError`. (The Authority gives
   the canonical Arabic in D5/D6.1; wiring it means restructuring the policy layer to emit
   reason *codes* — a larger change than this localization sprint.)
2. **The currency-composed amount field error** — `payments/service.ts` interpolates a formatted
   money value into the message; English fallback.
3. **The dynamic "Must be N characters or fewer" max-length message** — `gym/validation.ts`
   interpolates the limit; not statically mappable, English fallback. (Low surface: optional
   address/contact length caps.)

**Locale-data-in-code (a deliberate exception, not a gap):** currency marks (ج.م، ر.س…), Arabic
month names, ordinals (الأول…), duration units, and `paymentMethodLabel` (نقدًا/تحويل/بطاقة/أخرى)
live in TypeScript, treated as CLDR-like locale data (like `Intl`), not catalog UI copy. This is
the same class of decision as pinning Latin digits.

**Product enhancement left for later (surfaced, not silent):** Authority D9 describes the currency
picker showing **code + Arabic name**; the picker currently shows the **code only** (`USD`,
`EGP`…). Codes are locale-neutral and correct, so this is a defensible finish-the-strings scope
cut, listed here as a conscious deviation — implementing it needs a currency-name map (a small
future slice).

**Gate (final, this session):**

| Check | Result |
|---|---|
| `type-check` | ✅ clean |
| `lint` (+ fitness rules) | ✅ clean |
| unit | ✅ **200 / 200** |
| integration (docker postgres) | ✅ **107 / 107** |
| production `build` | ✅ clean |
| e2e (`next dev`, en-pinned, `retries:1`) | ✅ green on retry — the onboarding cold-`next dev` navigation race is the known `retries:1` flake (every localized string resolves and the flow completes end-to-end); not a regression |
| catalog parity | ✅ **590 / 590** |
| unused keys | ✅ **0** |
| RTL axe (ar, 375+1280, light+dark) | ✅ **0 / 44** |

**Sprint STOP condition met:** localization complete, committed, verified. No W3 or new
feature/UX work begun.
