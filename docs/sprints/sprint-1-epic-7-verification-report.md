# Sprint 1 · Epic 7 — Notifications · Verification Report

**Status:** IMPLEMENTED + VERIFIED (Fast Delivery). **Not merged/tagged** — awaiting human acceptance.
**Schema/permission change:** none. **New pattern:** none (reuses the Epic-6 cross-module composition
and the Epic-4 derived-lifecycle engine).

## What shipped
- **New module `apps/web/src/modules/notifications/**`** — `generation.ts` (pure: dedupeKey + message
  + `canTransition` guard), `service.ts` (generate/list/count + Unread→Read→Dismissed transitions),
  `queries.ts` (RSC reads — no writes), `actions.ts` (`"use server"` MVP trigger + transitions +
  revalidate), `format.ts`, `ui/{notification-list,notification-item,generate-on-open}.tsx`.
- **memberships gains a public read** `getExpiryCandidates` (+ `ExpiryCandidate`, `ExpiryEvent`,
  pure `pickExpiryEvent`) exported through `index.ts` — derivation stays in its home module.
- **Catalog:** new generic `components/pulse/notification-badge.tsx`; TopBar bell + badge wired via
  AppShell; permission-gated **Notifications** nav item; `/notifications` route.

## Generation trigger (decision recorded)
Idempotent **Server Action fired on page open** (`GenerateOnOpen` → `generateExpiryNotifications` →
`revalidatePath` → `router.refresh()`), inside a **replaceable** generation service. No writes during
RSC render (Epic-4 precedent honored); no new infrastructure/ADR. Trigger is MVP-only and swappable
for cron/worker/queue without touching business logic. (Human chose this option.)

## Verification targets → evidence
| Target | Result | Evidence |
|---|---|---|
| **Generation correctness** (NTF-2) | ✅ | `pickExpiryEvent` flags EXPIRING_SOON / EXPIRED from the **full** `deriveMemberLifecycle`; `buildNotificationInput` maps event→type + dated message. `generation.test.ts`, `lifecycle.test.ts`. |
| **Non-duplication** (NTF-3/INV-33/INV-34) | ✅ | Stable `dedupeKey` (`{membership}:{type}:{end}`) unit-tested for stability + distinctness; enforced by the schema `@@unique([gymId, dedupeKey])` + `createMany({ skipDuplicates })`. Re-run is a no-op; a **dismissed** row keeps its key so it is never recreated. |
| **Frozen-exclusion** (FRZ-3) | ✅ | `pickExpiryEvent` returns null for derived FROZEN (test). Frozen status comes from the lifecycle engine, so no expiry event is emitted while paused. |
| **Suppression-on-renewal** (workflows §10) | ✅ | Only a **tail** membership (no successor) alerts; a renewed/upgraded predecessor is suppressed. Tested for active-expiring + successor and expired + successor. |
| **Freeze-extension edge** | ✅ | `deriveMemberLifecycle` + `pickExpiryEvent` composed: a 10-day freeze pushes the end into the window → EXPIRING_SOON against the **extended** date (the case that breaks under the light `deriveRow`). |
| **State transitions** (NTF-4) | ✅ | `canTransition` allows Unread→Read→Dismissed (+ Unread→Dismissed); forbids Read→Unread, Dismissed→Read/Unread (INV-34). Service refuses illegal writes; idempotent no-op when already in target. |
| **Authorization (by permission)** | ✅ **tested** | `service.test.ts`: every guarded entry point refuses a permission-less principal with `AuthorizationError`; the **read≠manage** split is pinned (a reader cannot transition state). read/generate → `notifications.read`; transitions → `notifications.manage`. No role branching (fitness `no-role-checks` green). *Deny paths are pure (authorize precedes Prisma); allow paths need the DB — see gaps.* |
| **Tenant isolation** | 🟡 partial | Every read/write scopes `gymId` from the session; transitions load-then-`assertSameGym`→**404** (the same helper unit-tested in `tenancy.test.ts`). The end-to-end 404 on a cross-gym id needs the DB — deferred (Epic-5 precedent). |
| **Architecture fitness** | ✅ | `architecture.test.ts` green: no cycles, no ui→db, **no cross-context** (proves notifications→memberships composes only the public `index`). Token-compliance + ui-layering + catalog-consistency green. |
| **Client-bundle safety** | ✅ | Production build succeeds; the client trigger/badge import no `@pulse/db` enum values (list/item are server-rendered). |
| **A11y** | ✅ | Bell carries the count in its accessible name (badge `aria-hidden`); "New"/type states are text+icon+token (never colour alone); filter uses `aria-current`; dates as `<time>`. |

## Gate (all green)
`pnpm type-check` · `pnpm lint` (incl. all fitness eslint rules) · `pnpm --filter @pulse/web test` =
**163 tests** (was 146; +6 generation, +8 pickExpiryEvent/edge, +3 authorization deny) ·
`pnpm format:check` · `pnpm build` (`/notifications` route emitted). Platform: Node 20.20.0 / pnpm
9.15.4 / Next 15.5.

## Honest gaps / decisions flagged for human veto
1. **No live DB integration suite for the notifications service** — the **deny/authorization** P0 is
   now a real unit test (`service.test.ts`); what remains deferred is the **allow paths + 404
   cross-gym isolation + re-run idempotency end-to-end**, which need the seeded test DB. This follows
   the **Epic-5 precedent** (which likewise added no service DB integration). Non-duplication rests on
   the stable dedupeKey (unit-tested) + the DB unique constraint (DB-integrity plan INV-33). A future
   integration pass would close this consciously-deferred slice.
6. **EXPIRED recency bound — RESOLVED (refinement applied).** The open question is closed: EXPIRED
   notification generation is now bounded to a recent window (default **7 days**, fixed constant) per
   **NTF-5** — see `sprint-1-epic-7-refinement-expired-window.md`. Applied in the notifications
   consumer (`isWithinNotificationWindow`); the lifecycle read stays unbounded so dashboards/reports
   are unaffected. Future: per-gym `Gym.expiredNotificationWindowDays` (human's call).
2. **Suppression-on-renewal** interpreted as "only the tail membership alerts" — grounded in
   workflows §10 / DDS index, beyond the literal scope block. Early-renewal *gap* (predecessor expired,
   successor SCHEDULED not yet started) raises **no** expired alert (member has already renewed).
3. **Generation gated by `notifications.read`** (no `notifications.generate` key exists; `send` is
   future/out-of-scope). Any reader triggers the idempotent sweep.
4. **MVP visibility:** only **Owner** holds `notifications.read`/`manage` (catalog); the bell + page are
   Owner-only in MVP — by permission, not role.
5. **Runtime refresh** of the just-generated list relies on `revalidatePath` + `router.refresh()`;
   verified structurally (build) — a manual/e2e pass on a running app would confirm the visible refresh.
