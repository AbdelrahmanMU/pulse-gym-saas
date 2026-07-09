# Sprint 2.x — Localization Completion · Session 2 Handoff

**Branch:** `feat/platform-foundation` (not merged/tagged) · **Date:** 2026-07-05
**Authority (frozen source of truth):** [`docs/localization/arabic-localization-authority.md`](arabic-localization-authority.md) — Deliverable 12 is the dictionary. Do NOT re-litigate vocabulary.
**Prior report:** [`sprint-2x-implementation-report.md`](sprint-2x-implementation-report.md)

> This session picked up the ~257-string tail. Working tree is **clean** — everything is committed. Session ended on a usage limit mid-task; this file is the durable handoff.

---

## 1. Session stats

| | |
|---|---|
| **Commits this session** | `31db873` money+dates · `b3c80f6` memberships · `d99318a` notifications · `4b1e0ab` **WIP** (payments/members/plans/staff/reports) |
| **Catalog** | `apps/web/messages/{en,ar}.json` — **532 / 532 leaf keys, EXACT parity** (0 missing / 0 extra), **18 namespaces**: meta, common, nav, landing, auth, actions, errors, dashboard, status, money, members, formErrors, notifications, memberships, plans, staff, reports, payments |
| **New shared files** | `apps/web/src/lib/format-date.ts` (+ test) · `apps/web/src/lib/i18n/form-error.ts` |
| **Method** | 3 background forks used (memberships-leaf, mechanical plans/staff/reports/settings, member-workspace). ⚠ Forks committed aggressively and ranged out of scope — see Gotchas. |
| **Gate run** | ✅ tsc · ✅ lint · ✅ 200 unit (money/date/format tests added) · ✅ parity. ❌ **NOT run: production build, 107 integration, 39 e2e, RTL sweep, screenshots.** |

---

## 2. Status by module

### ✅ DONE + committed + gate-green (tsc/lint/200 unit)
- **Money** (`lib/money.ts`) — Arabic currency: 5 marks (EGP→ج.م, SAR→ر.س, AED→د.إ, KWD→د.ك, JOD→د.أ) AFTER amount + space, Latin digits, `,` thousands, whole-amount-no-decimals (bigint space, never-float). `MetricValue`/`CurrencyInput` read `useLocale()`.
- **Dates** (`lib/format-date.ts`) — day·month-name·year, Arabic months (يناير…), Latin digits, `<time dateTime>` machine value; English byte-identical per form (`full`/`short`/`monthYear`/`iso`).
- **Memberships** (whole module) — rail (frozen D6 phrases via `t.rich` with embedded `<time>`/MetricValue/bidi-name; connectors من/إلى no arrows; gaps; NO-RENEWAL-QUEUED; terminus; Arabic ordinals الأول…العاشر), status/standing badges (async server, `status` ns), lifecycle controls, form, timeline, period-note, table, toolbar, detail/list/new pages. `remainingDaysLabel`→{key,values}; `formatDuration(v,u,locale)`. Physical→logical CSS done.
- **Notifications** — message rendered locale-aware at display time from `type`+name+`effectiveEndDate` (parsed from dedupeKey); stored English is source/audit.

### ✅ DONE, WIP-committed (`4b1e0ab`; tsc/lint/parity green, **full gate NOT run**)
- **Payments** (whole module) — summary, history, record/void forms, standing badge, `form-state` via `useFormError`; `paymentMethodLabel(m,locale)` inline AR (نقدًا/تحويل/بطاقة/أخرى); `payments` namespace.
- **Members workspace + forms** — answer-strip (chips اشتراك ساري/مجمّد/قادم · لا يوجد اشتراك حالي; money مستحق / calm لا مستحقات; identity المدرب/منذ), member-info Disclosure, member-form, archive/assign-trainer/overflow. `members` ns (67 keys), `formErrors` ns (16).
- **Plans** (whole module) — table/toolbar/form/lifecycle/status-badge + pages. `plans` ns, `status.planAvailable/planRetired` (متاحة/موقوفة).
- **Staff** (whole module) — table/toolbar/form/role-control/status-badge/status-controls + pages. `staff` ns, `status.staffActive/staffRevoked` (نشط/موقوف), `actions.addStaff`.
- **Reports UI components** — revenue/expiring/membership/outstanding/report-forbidden + `reports/format.ts`. `reports` ns.

### ❌ NOT DONE (next session)
- **Settings + onboarding (gym module) — task #9, UNTOUCHED.** No `settings` namespace, no files changed.
- **Reports PAGE headers** — `app/(app)/reports/**/page.tsx` still hardcoded English (`title="Revenue report"` etc.). Only the report UI *components* were localized. (I removed a dangling unused `getTranslations` import from `reports/revenue/page.tsx` to keep the checkpoint green — the header strings there are still English.)

---

## 3. Key decisions (for the completion report — already settled, do not re-open)

1. **Error/validation bodies → client English→code map** (`lib/i18n/form-error.ts` + `formErrors` catalog). English is the frozen source, so this needs **no service/validation change** and **breaks no integration test** (they assert status/field-existence, not text). Named case done: duplicate-phone «رقم الهاتف مسجل لعضو آخر». `t()` via `useFormError()` in each `form-state.tsx`. **Tier-2 residuals (left English, documented):** the multi-reason *archive-blocked* sentence (composed in `members/policy.ts`+`service.ts`) and the currency-composed *amount* field error (`payments/service.ts`).
2. **Notifications** render the stored **absolute** date («ينتهي في 10 فبراير 2026») — a deliberate, surfaced deviation from D11's illustrative relative «خلال N أيام» (the date is baked at generation; avoids UI-side day-derivation).
3. **Formatter locale-data in code (not catalog):** currency marks, month names, `formatDuration` units, Arabic ordinals, `paymentMethodLabel` — treated as CLDR-like locale data (like Intl), not catalog UI copy. If a reviewer objects to "hardcoded Arabic," this is the rationale.
4. **Rail/workspace = strings + logical-CSS only**, zero layout/wording change (reconciling the prompt's STRICT-SCOPE-includes-Rail vs DO-NOT-modify-Rail).
5. **Locale seam unchanged:** `PULSE_LOCALE` env → `ar` default; e2e pinned to `en`.

---

## 4. Remaining work — ORDERED for next session

1. **Settings + onboarding (task #9).** Localize `modules/gym/ui/{form-feedback,gym-settings-form,branch-form,profile-form}.tsx` + `app/(app)/settings/{gym,branch,profile}/page.tsx` + `app/(app)/onboarding/{gym,branch,profile,complete}/page.tsx`. New `settings` namespace. Authority D11: العملة · المنطقة الزمنية · التنبيه قبل الانتهاء (أيام). **NAMED case:** `e2e/gym-settings.spec.ts` asserts `getByText(/gym name is required/i)` — localize that Zod message via the `useFormError` code path (add its English→code to `form-error.ts` + `formErrors` en=byte-identical/ar), so the en-pinned e2e still passes.
2. **Reports page headers.** Localize `app/(app)/reports/page.tsx` + `revenue|outstanding|expiring|memberships/page.tsx` headers (title/subtitle) using the existing `reports` namespace (add keys if missing). Re-add `getTranslations` where needed.
3. **Unused-key sweep.** Reconcile duplicate/unused method keys: `money.methodCash/methodCard/methodTransfer` (mine, unused) + `payments.methodCash/methodBankTransfer/methodCardManual/methodOther` (fork's, unused — `paymentMethodLabel` is inline). **Recommend: delete all 7** (keep `format.ts` inline). Then scan every catalog key for a code reference — NOTE `formErrors.*` keys are referenced *dynamically* through the `form-error.ts` CODE map, so exclude them from a naive static "unused" grep (verify against the map instead).
4. **Full gate.** `pnpm --filter @pulse/web type-check` · `lint` · `pnpm --filter @pulse/web test` (expect 200) · `pnpm test:integration` (107; docker postgres up) · `pnpm --filter @pulse/web build` · `pnpm test:e2e` (39, `next dev` en-pinned, retries:1). Windows: kill stray node + clear `apps/web/.next` before build/e2e if the `.next` lock hangs. If you change any English source string an e2e/unit asserts, update that assertion.
5. **RTL sweep.** Grep touched files for physical CSS `pl-|pr-|ml-|mr-|left-|right-|text-left|text-right|rounded-l|rounded-r` → logical (`ps/pe/ms/me/start/end/text-start/text-end/rounded-s/rounded-e`); mirror directional chevrons/arrows with `rtl:-scale-x-100`. Rail files already done. Verify plans/staff (staff-role-control flagged)/reports/members/payments/settings.
6. **Screenshots (Evidence).** 7+ authenticated modules in `ar` RTL: memberships list, member workspace + rail, plans, payments (detail), reports, staff, settings. Reuse the e2e storage-state/sign-in harness (`e2e/global-setup.ts` marks the gym `setupCompletedAt`; the `signIn` helper lives in `e2e/shell.spec.ts`). Run a standalone Playwright script placed INSIDE `apps/web` against `PULSE_LOCALE=ar pnpm exec next dev -p 3200`. axe (dir=rtl, expect 0) at 375+1280 × light+dark. Prior public shots: `docs/localization/screenshots/`.
7. **Completion report** → `docs/localization/sprint-2x-completion-report.md`, the 6 deliverables the sprint prompt lists: (1) Implementation Summary, (2) Localization Completion Report (totals: UI strings / localized / fallback / hardcoded EN / hardcoded AR / missing / unused / duplicated keys), (3) Coverage vs target (100% / 0 / 0 / 0 / 0 / 0), (4) RTL Verification (desktop/tablet/mobile × light/dark), (5) Evidence (screenshots per module), (6) Retrospective (what remains + any English left — list explicitly, incl. the Tier-2 residuals).
8. **Commit** the finishing chunks; then the sprint STOP condition (commit, stop — do NOT begin W3).

---

## 5. Gotchas / conventions (carry forward)

- **next-intl:** `useTranslations`/`useLocale` work in **sync server components** AND client; `getTranslations`/`getLocale` (from `next-intl/server`) in **async server components**. Namespace arg = single token (lint's permission-key rule flags all-lowercase **dotted** literals) → nested keys use **camelCase leaves**. Latin-digit ICU: pass numbers as pre-formatted Latin `{n}` string args (never `#`), full CLDR Arabic plural categories (zero/one/two/few/many/other). `t.rich` for messages embedding `<time>`/MetricValue/bidi-name tags.
- **en catalog values = current on-screen English byte-for-byte** (regression net; e2e is en-pinned). Arabic is authored from the Authority.
- **User data never translated** — bidi-isolate names inside Arabic sentences (`<span dir="auto">`), force LTR for phone/email.
- **Money** → always via `MetricValue` (locale-aware). **Dates** → `formatDate(v, locale, form)` + `toISODate` for `dateTime`. **Durations** → `formatDuration(v,unit,locale)`. **Methods** → `paymentMethodLabel(m,locale)`.
- **Delegation:** if forks are used again, instruct explicitly: **NO git add/commit, NO build**, only tsc/lint on their slice; keep to disjoint files/namespaces (the shared JSON tolerates concurrent surgical edits to different namespaces, but forks over-reached last time).
- **Never** run e2e against `next start` (NODE_ENV=production makes NextAuth reject auth — pre-existing prod-config gap).
- Dev-server `.next` lock on Windows can hang `next dev`; kill stray node + clear `apps/web/.next`.
