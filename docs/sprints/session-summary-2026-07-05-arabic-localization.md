# Session Summary — Arabic Localization (2026-07-05)

**Branch:** `feat/platform-foundation` (not merged/tagged) · **Commits:** `09381d3` → `c78f6da`
**Full deliverables report:** [`docs/localization/sprint-2x-implementation-report.md`](../localization/sprint-2x-implementation-report.md)
**Authority (source of truth):** [`docs/localization/arabic-localization-authority.md`](../localization/arabic-localization-authority.md)

---

## What this session did

Two pieces of work, in order:

1. **Finalized the Arabic Localization Authority** (targeted product-language review → human
   acceptance). Five wording amendments applied and the doc frozen as the implementation source
   (`09381d3`): money → the one `مستحق` family (`متبقي` is time-only), `تسجيل اشتراك` (Sell
   membership), `إضافة باقة`, per-action success messages, expanded forbidden list, two acceptance
   additions (context-sensitive status phrasing; user-created names never translated). All R1–R7
   rulings resolved.

2. **Implemented the localization (Sprint 2.x) — partial but coherent + verified.** next-intl 4.13,
   "without i18n routing" mode; the app defaults to Arabic.

## Localization — shipped (7 commits `e80539d`→`c78f6da`)

| Phase | Commit | Content |
|---|---|---|
| P1 infra | `e80539d` | next-intl plugin, `src/i18n/{locale,request}.ts`, deep-merge English fallback, `latn` digits, provisional Noto Sans Arabic (R7), locale-driven `<html lang dir>` |
| P2 shared + RTL | `b7ae51d` | all shared catalog UI translated + physical→logical CSS migration + `dir` flip |
| P3 auth+landing | `f22c9ec` | landing hero, sign-in page/form/error/loading |
| P3 dashboard | `499e2d3` | KPIs, lists, quick actions + shared `actions`/`errors` namespaces |
| P3 members list | `b689967` | table, adaptive card, filters, member status badge + `status` namespace |
| P3 notifications | `98427ff` | filters, actions, type labels, empty states |
| verify + report | `551d0d3` | `PULSE_LOCALE` test seam, `retries:1`, implementation report |
| screenshots | `c78f6da` | 8 ar-RTL public-surface screenshots (axe=0) |

**Catalog:** `apps/web/messages/{en,ar}.json` — **119 keys, exact en/ar parity** (no missing, no
unused). **Gate:** tsc · lint · fitness · build · **191 unit · 107 integration · 39 e2e+axe** — all
green. **8 Arabic RTL screenshots** at 375/1280 × light/dark, all `dir=rtl lang=ar`, axe=0.

## Key decisions & gotchas (carry forward)

- **Locale = env `PULSE_LOCALE` override → `ar` default.** No cookie (avoided forcing all routes
  dynamic), **no `Gym.locale` schema column** (GYM-2 gap flagged; the literal gym-setting model is a
  future migration). `getUserLocale()` is the single future hook. Faithful to D13 at one-gym scale.
- **Tests kept valid without rewrite:** the functional e2e/test env pins `PULSE_LOCALE=en`;
  `retries:1` absorbs the documented `next dev` cold-compile flake.
- **Server vs client:** server components use `getTranslations` (many badges/tables/KPIs became
  async); client use `useTranslations`.
- **Lint interaction:** the project's hardcoded-permission-key rule flags all-lowercase dotted
  string literals → translation keys use **camelCase leaves** (`t("kpi.expiringSoon")`, never
  `getTranslations("dashboard.kpi")`).
- **Latin-digit ICU:** plurals pass the number as a pre-formatted Latin `{n}` arg, never `#`.
- **Reverted misstep:** running e2e against a `next start` prod server failed all authed tests —
  NextAuth rejects auth under `NODE_ENV=production` (pre-existing prod-config gap, not localization).

## Remaining tail (English fallback today; vocabulary already frozen)

~257 strings across ~39 files: **memberships · member-workspace (the rail — Authority centerpiece)
· plans · payments · reports · staff · settings · member forms.** Each is a mechanical pass.

**Two cross-cutting gaps flagged (do deliberately, not hastily):**
1. **Money** still renders `E£`, not `ج.م` — `lib/money` `currencySymbol(cur, "en")` is hardcoded
   in *tested* money code. **Top next item.**
2. **Generated `notification.message` bodies** are stored/generation-layer content, not UI strings.
3. Dates still ISO (`2026-08-30`) not `30 أغسطس 2026` — `Timestamp` component follow-up.

## Suggested next session order
Money rendering (`ج.م`) → memberships + member-workspace (highest product value) → plans/payments/
reports/staff/settings/member-forms → date formatting → decide the `Gym.locale` migration when
multi-gym is on the roadmap.
