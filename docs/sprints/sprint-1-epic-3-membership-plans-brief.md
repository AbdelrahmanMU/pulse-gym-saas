# Sprint 1 · Epic 3 — Membership Plans (Implementation Brief)

| | |
|---|---|
| **Mode** | Fast Delivery. One-page brief; no long planning docs. |
| **Platform** | Frozen `v1.0.0-sprint-0`; built on the Epic-1/2 module pattern. |
| **Scope (IN)** | Create · Edit · Archive · View · Search plans. Each plan: name, duration (value + unit), price, optional description, Active/Archived status. |
| **Scope (OUT)** | Membership creation, payments, discounts, promotions, taxes, proration, auto-renew, session packages, attendance, PT scheduling. |
| **Source rules** | PLN-1/2/3/4, PRM-1/2/3; money-rules M-1/M-8; INV-1/2/5/8/22/31/32/40. |

## Decisions (no STOP required — all resolvable from the ranked docs)

1. **"Active / Archived" status is backed by `Plan.isActive`** (PLN-2: active=sellable ⇄ inactive=retired; PLN-4: retired never destroyed). The lifecycle permission is `plans.deactivate` (gates both archive **and** restore — there is no `plans.reactivate` key). `Plan.archivedAt` is left untouched, reserved for a future true soft-delete. *UI uses the user's terms "Active/Archived"; the domain term is "inactive/retired" — flagged for veto.*
2. **Money: store exact `BigInt` minor units + currency; never float (M-1).** Plan currency = the gym's `defaultCurrency` (snapshot at create; unchanged on edit — multi-currency is out, money-rules §1). A new cross-cutting `lib/money.ts` does currency-aware conversion: fraction digits from `Intl.NumberFormat(...).resolvedOptions().maximumFractionDigits`; **exact string→minor parse** (no float); minor→display via Intl (presentation-only rounding, money-rules §3). The `CurrencyInput` submits the major-unit string; the **service** parses it to minor with the gym currency, so over-precise input (e.g. cents on JPY) is rejected as a field error.
3. **First money/long-text catalog components are born here** (minimal, to-spec, like Epic 2's table set): `MetricValue` (mono-tabular money/number — §3 "currency component for money"), `CurrencyInput` (§"all money entry"; rejects invalid, no floats), `TextArea` (description). Plan status reuses the canonical `StatusBadge`.
4. **Search/filter server-side via URL params** (`?q=&status=&page=`), mirroring Members. `q` → `name` contains (insensitive); status → `isActive` true/false/both. No DB unique on plan name → no P2002 mapping needed (simpler than Members).

## Constraints honoured
- **No schema/migration change** — `Plan` + its `CHECK (price >= 0 AND duration_value > 0)` and `(gym_id, is_active)` index already shipped in the init migration. Never run `migrate dev`.
- **Mutation pipeline**: authenticate → authorize *by permission* → validate (Zod) → scope (`gymId`) → execute → revalidate. Explicit-`principal` service core; thin actions/queries.
- **BigInt never crosses the RSC→client boundary** — view models expose `priceMinor: string`; client components (`MetricValue`/`CurrencyInput`) format from the string + currency.
- Catalogued components + tokens only; permission keys from `@pulse/auth` constants; timestamps via `IClock` (no raw `new Date()` in `modules/**`).

## Permissions
`plans.read` (list/search/detail — all roles) · `plans.create` · `plans.update` · `plans.deactivate` (archive + restore) — create/update/deactivate are Owner-only per the authz matrix.

## Deliverables
`modules/plans/{validation,service,actions,queries}.ts` + `ui/*` · `lib/money.ts` · shared `components/pulse/{metric-value,currency-input,text-area}.tsx` · routes `(app)/plans/{page, new, [planId], [planId]/edit}` · nav wired (Plans gated by `plans.read`) · unit tests (`validation.test.ts`, `lib/money.test.ts`) + integration P0 `tests/integration/plans.test.ts` · Verification Report + Retrospective.
