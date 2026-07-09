# Sprint 1 · Epic 4 — Membership Lifecycle (Implementation Brief)

| | |
|---|---|
| **Mode** | Fast Delivery. One-page brief; no long planning docs. |
| **Platform** | Frozen `v1.0.0-sprint-0`; built on the Epic-1/2/3 module pattern (explicit-`principal` service core; thin `"use server"` actions + RSC queries). |
| **Scope (IN)** | Create · View (details + timeline) · Renew · Upgrade/Downgrade (deferred) · Freeze · Resume · Cancel a membership. Derived Status / Remaining Days / Expiring-Soon computed on read in the gym time zone. |
| **Scope (OUT)** | Payments, revenue, receipts, refunds, discounts, promotions, attendance, QR, auto-renew, notifications/sweep, dashboard metrics. |
| **Source rules** | MSH-1..7, REN-1..4, UPG-1..3, FRZ-1..4, ARC-3; INV-12/13/14/16/17/18/19, INV-37/38/39; time-rules T-2..T-9; money-rules M-1/M-4/M-8; immutable-history H-1..H-5. |

## Decisions (resolvable from the ranked docs — flagged for human veto in the verification report)

1. **SCHEDULED→ACTIVE keys off the predecessor's *derived terminal state*, never the stored `scheduledEffectiveFrom`** (state-machines: trigger = "predecessor reached its end"). A successor is **SCHEDULED while its predecessor is non-terminal**; it becomes **ACTIVE only when the predecessor is EXPIRED/CANCELLED *and* today ≥ the successor's own start**. This is the one rule that keeps INV-13 correct when a freeze extends the predecessor's effective end past the successor's original effective-from. `scheduledEffectiveFrom` is the informational initial date only.
2. **Decision A (activation mechanism) — derive live on read; persist on write.** No sweep/cron (out of scope) and **no write-on-RSC-GET**. Status/Remaining/Expiring-Soon are **derived live** (pure function, gym-tz) on every read; the auto-activation P0 asserts on the *derived* view-model status. Activation (`activatedAt`, `cached_*`) is persisted only inside **write-path** transactions, which already touch the member. `cached_*` are recomputable accelerators, never the source of truth (DDS §1.6).
3. **INV-12/13 are write-path checks in a `Serializable` transaction**, asserted against **freshly-derived** status (after reconciling the member's memberships in-tx), never stale `cached_status`. The GiST exclusion + partial-uniques remain DB backstops.
4. **Decision B — Resume is gated by `memberships.freeze`** (freeze lifecycle); there is intentionally **no `memberships.resume` key** (INV-7: no new key without approval). Flagged for veto.
5. **Decision C — Timeline is composed read-only** from immutable records (membership create/activate/cancel + freeze rows + predecessor/successor links); **no new events table**.
6. **Underspecified interactions (defensible defaults, flagged):** (a) freeze while a SCHEDULED successor exists → **allowed** (predecessor-gated activation in #1 makes it safe). (b) cancel a predecessor that has a SCHEDULED successor → the successor **keeps its own start date and activates then** (member paid for that future period).
7. **No new patterns:** like plans/members, this slice writes **no `AuditLog`** (that pattern needs approval). Renew re-snapshots the current plan's live terms onto the same plan; Upgrade snapshots a chosen active target plan; origin = `UPGRADE` when target price ≥ current snapshot price else `DOWNGRADE`. No proration/refund/money math anywhere (UPG-3).

## Date math (one helper, reused everywhere — `modules/memberships/dates.ts`, unit-tested)
`addDays` / `addMonths` (with **end-of-month clamping**: Jan 31 +1mo → Feb 28/29) / `dayDiff` / `inclusiveEndDate(start,value,unit)` (`end_exclusive = start + duration`; **`end_inclusive = end_exclusive − 1 day`**, T-3/T-6). All math on `YYYY-MM-DD` gym-tz calendar strings; `Date` only at the `@db.Date` boundary. Remaining-days, expiring-soon window, and frozen-days-on-resume all use the same `dayDiff`.

## Constraints honoured
- **No schema/migration change** — `Membership` + `MembershipFreeze` + every constraint (GiST exclude, partial-uniques, CHECKs) already shipped in the init migration. Never run `migrate dev`.
- Mutation pipeline: authenticate → authorize *by permission* → validate (Zod) → scope (`gymId`) → execute (Serializable) → revalidate. `IClock` injected (`clock: IClock = systemClock`); no raw `new Date()` in `modules/**`. `BigInt` (snapshot price) never crosses to the client → view models expose strings.
- Snapshot (name/price/currency/duration) captured once at creation, **never re-read from the live Plan** (INV-14/M-8). Immutable history: corrections are new records (cancel→new membership; resume closes a freeze row).

## Permissions
`memberships.read` (list/detail) · `memberships.create` · `memberships.renew` · `memberships.upgrade` · `memberships.freeze` (freeze **and** resume) · `memberships.cancel`. All present in `@pulse/auth`; Owner-only per the authz matrix.

## Deliverables
`modules/memberships/{dates,validation,service,actions,queries,format}.ts` + `ui/*` (membership-status-badge, lifecycle controls, create/renew/upgrade forms, timeline) · routes `(app)/memberships/{page,new,[membershipId]}` and member-scoped create entry · nav (Memberships gated by `memberships.read`) · unit tests (`dates.test.ts`, `validation.test.ts`) + integration P0 `tests/integration/memberships.test.ts` · Verification Report + Retrospective.
