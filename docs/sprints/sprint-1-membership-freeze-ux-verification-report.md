# Verification Report — Membership Freeze & Scheduled-Renewal UX Clarity

**Type:** UX clarification slice (presentation only) · **Sprint 1** · **Date:** 2026-07-02
**Follows:** the freeze-pipeline investigation (verdict: *not a bug* — the lifecycle engine is correct;
the UI was correct but not self-explanatory). This slice makes two correct-but-non-obvious states
legible to operational staff. **No business behavior changed.**

---

## 1. Problem

Manual QA read the running app as broken, even though the engine is correct:

- **P1 — Frozen membership.** While frozen, the displayed **End Date does not move** (it extends on
  *resume*, per FRZ-2/INV-18). Staff read the un-moved date as *"the freeze wasn't applied."*
- **P2 — Scheduled renewal.** A scheduled successor shows its **stored Start Date**, which — after a
  long freeze on the predecessor — can already be in the past while the membership correctly stays
  SCHEDULED. Staff read the past start date as *"stuck / broken."*

Both are documented, tested behaviors. The gap was **presentation**, not logic.

---

## 2. What changed (4 touch-points, presentation + read-model only)

| # | File | Change |
|---|------|--------|
| 1 | `modules/memberships/service.ts` | Added a **display-only** `activeFreeze: { plannedDays, projectedEndDate } \| null` to the `MembershipDetail` **read model**, derived in `getMembership` from the already-loaded freeze rows via a new pure helper `deriveFreezeProjection`. Projected end = `effectiveEndDate + plannedDays` (the requested freeze), returned **only** while derived status is `FROZEN`. |
| 2 | `modules/memberships/ui/membership-period-note.tsx` **(new)** | Presentational component: an informational catalog `Alert` (`severity="info"` → `role="status"`). "Freeze in progress" explains the end date extends on resume (with the estimated projected date, clearly labeled an estimate). "Scheduled renewal" explains it activates when the current membership ends. Renders `null` otherwise. |
| 3 | `app/(app)/memberships/[membershipId]/page.tsx` | Period section: added a secondary, muted **"Projected end on resume · estimate"** row beneath the authoritative "Ends (inclusive)", and mounted `<MembershipPeriodNote>` (fed `status`, `isRenewal = predecessorMembershipId !== null`, `activeFreeze`). |
| 4 | `modules/memberships/ui/memberships-table.tsx` | List "Ends" column: for a `FROZEN` row, a muted **"Extends on resume"** caption under the date (keyed on the already-present `status`; no new data). |

No new dependency, API/server action, permission, schema, migration, or interaction pattern.
Catalog components + tokens only (`Alert`, `<time>`, `text-caption`, `text-muted-foreground`).

---

## 3. Why NO business behavior changed

- **Authoritative value untouched.** Status is still judged against `effectiveEndDate` (derived in
  `lifecycle.ts`). The projection is a *separate, read-only* field, rendered as visibly secondary
  and explicitly labeled "estimate"; it is **never read back into any decision, mutation, or status
  derivation**. Grep confirms `activeFreeze`/`projectedEndDate` are written once in `getMembership`
  and consumed only by the two UI components.
- **Engine, mutations, invariants intact.** `freezeMembership` / `resumeMembership` / the freeze
  extension (finalized to *actual* paused days on resume) / SCHEDULED→ACTIVE activation / snapshot
  immutability — all unchanged. `deriveFreezeProjection` performs no write and calls no lifecycle
  logic; it reads `freezes` already loaded by `getMembership`.
- **No stored date rewritten.** P2 is fixed purely with copy; the successor's immutable snapshot
  Start/End dates are still displayed as-is (INV-14 append-only).
- **Truthful projection.** The real resume extension = actual days paused, which may be less (early
  resume) or more (late resume) than the requested days. The copy states the end date "extends by the
  days it stays paused," shows the requested days → "about <date> … if resumed as planned," and labels
  it "an estimate, not the saved end date" — so the projection can never be mistaken for the
  authoritative end, and never implies a cap.

---

## 4. Tests — all pass, unchanged

No test files were modified (the constitution's "no logic change" is proven by unchanged tests).

| Suite | Result |
|-------|--------|
| `vitest run src/modules/memberships/` (unit: lifecycle, dates, validation) | **36 passed** |
| `vitest run --config vitest.integration.config.ts tests/integration/memberships.test.ts` (live-DB) | **18 passed** |
| `tsc --noEmit` | clean |
| `eslint` (4 changed files) | clean |

The freeze→resume extension test (`memberships.test.ts:329`) and the freeze-does-not-early-activate
test (`lifecycle.test.ts:107`) — the two that lock in the behaviors this slice explains — remain
green and untouched.

---

## 5. Accessibility, responsiveness, tokens

- **A11y.** Informational `Alert` announces via `role="status"` (polite); severity carried by icon +
  text + `*-tint`/`*-text` tokens, never color alone. Projected date uses semantic `<time dateTime>`.
- **Mobile-first.** The frozen **detail** (the full projection + alert) reflows and is fully legible
  at 390px (see mobile shot). The list "Ends" column is `priority: 2` (hidden below `sm`) — so on
  mobile the un-extended date is *not shown at all*, meaning there is nothing to misread there; the
  FROZEN badge carries state and the detail page provides the projection. The "Extends on resume"
  caption therefore lives with the date on ≥`sm`, exactly where it's needed.
- **Tokens only.** No hardcoded color/space/font/size introduced.

---

## 6. Screenshots (before / after)

Stored in `docs/sprints/assets/membership-freeze-ux/`.

| State | Before | After |
|-------|--------|-------|
| Frozen detail (desktop) | `before-desktop-frozen-detail.png` — "Ends 2026-08-01", no freeze context | `after-desktop-frozen-detail.png` — adds "Projected end on resume 2026-08-11 · estimate" + "Freeze in progress" alert |
| Frozen detail (mobile) | — | `after-mobile-frozen-detail.png` — full projection + alert reflow at 390px |
| Scheduled detail (desktop) | `before-desktop-scheduled-detail.png` — "Scheduled to start 2026-08-02", no context | `after-desktop-scheduled-detail.png` — adds "Scheduled renewal — activates when the current membership ends" alert |
| List (desktop) | `before-desktop-list.png` — FROZEN row shows bare "2026-08-01" | `after-desktop-list.png` — FROZEN row adds "Extends on resume" caption |

*Data used:* the exact QA pair in the dev DB — Membership A (FROZEN, 10-day freeze, end 2026-08-01 →
projected 2026-08-11) and its SCHEDULED renewal B (predecessor = A). The frozen state was captured
by freezing A **through the app** (mutation pipeline), never by hand-editing the DB.

---

## 7. Definition of Done

Catalog components + tokens only · no literals/bespoke UI · read-model addition is display-only and
never authoritative · no schema/permission/lifecycle/API change · P0 & integration tests green and
**unchanged** · a11y (role/status, icon+text, semantic `<time>`) verified · responsive verified at
390px and desktop · self-reviewed + advisor-reviewed · docs updated (this report). **Done.**
