# Sprint 1 · Epic 7 — Notifications (implementation brief)

**Mode:** Fast Delivery. **Schema/permission change:** none (Notification model, `NotificationType`,
`NotificationState`, `notifications.read`/`manage` already exist). **Scope confirmed with human;
generation-trigger decision made (below).**

## Goal
In-app, staff-facing alerts that drive renewals: generate **Expiring-Soon** / **Expired** notifications
from the existing membership lifecycle, list them, and progress **Unread → Read → Dismissed**. Surface
the unread count in the app shell. In-app only (NTF-1) — no email/SMS/push.

## Grounding rules
- **NTF-2** generate for Expiring-Soon / Expired, evaluated ≥ daily. **NTF-3 / INV-30 / INV-33** non-
  duplicating (unique `dedupeKey` per gym). **NTF-4** gym-scoped; Unread→Read→Dismissed. **INV-34 /
  state-machines §3** Dismissed never resurrected; forbidden `DISMISSED→*`, `READ→UNREAD`.
- **FRZ-3** frozen memberships are excluded from expiry notifications.
- **workflows.md §10 / DDS index** *"a renewed membership no longer qualifies — no new alert"* →
  **suppression-on-renewal** (interpretation, flagged — see Decisions).

## Key decision — generation trigger (surfaced; human chose Option 1)
No scheduler/cron exists (Sprint 0 shipped none). **Chosen: idempotent Server Action invoked when the
Notifications page opens**, inside a replaceable `NotificationGenerationService`. Flow:
**client `GenerateOnOpen` (mount) → Server Action → generation service → `revalidatePath` → RSC reads the
read model.** No writes during RSC render (honors the Epic-4 precedent); the Server Action is the *MVP
trigger only*, swappable for cron/worker/queue later without touching business logic.

## Architecture (reuse, don't duplicate)
- **Derivation stays in its home module.** memberships gains a **public** read
  `getExpiryCandidates(principal, clock)` → `ExpiryCandidate[]` (neutral `event: "EXPIRING_SOON" |
  "EXPIRED"`), consumed by notifications via the bare-dir import `@/modules/memberships` (Epic-6
  `no-cross-context` pattern). memberships never learns the notifications vocabulary.
  - Uses the **full `deriveMemberLifecycle`** (not the light `deriveRow`) grouped per member in one
    query pass, so the freeze-extended `effectiveEndDate` and SCHEDULED→ACTIVE resolution are correct.
  - **Candidate rule (pure `pickExpiryEvent`, unit-tested):** only a **tail** membership (no successor)
    can alert. Derived FROZEN/SCHEDULED/CANCELLED → none (FRZ-3). ACTIVE + expiring-soon → EXPIRING_SOON.
    EXPIRED → EXPIRED. A membership with a successor is suppressed (renewed/upgraded → no longer
    qualifies), which also collapses a chain to one alert.
- **notifications module** (`apps/web/src/modules/notifications/**`):
  - `generation.ts` (pure) — `buildNotificationInput(candidate, gymId)`; `dedupeKey =
    "{membershipId}:{type}:{effectiveEndDate}"`; **message stores the absolute end date** (written once,
    no stale "in N days"). `canTransition(from, to)` state guard.
  - `service.ts` — `generateExpiryNotifications` (the GenerationService: authorize `notifications.read`,
    compose candidates, `createMany({ skipDuplicates: true })` → NTF-3/INV-33/INV-34 natively);
    `listNotifications` / `getUnreadCount` (authorize `notifications.read`); `markNotificationRead` /
    `dismissNotification` / `markAllRead` (authorize `notifications.manage`; `assertSameGym`→404;
    transition-guarded). DISMISSED rows never listed (leave the active queue — NTF-4).
  - `queries.ts` (RSC reads, no writes), `actions.ts` (`"use server"` trigger + transitions +
    `revalidatePath`), `format.ts` (client-safe tone/label maps — no `@pulse/db` enum values), `ui/*`.
- **UI:** new generic `pulse/notification-badge.tsx` (catalog NotificationBadge — count/cap, a11y name,
  hidden at 0). NotificationCenter/Item realized as **module UI** (`notifications/ui/*`) composing
  catalog pieces (StatusBadge, EmptyState, Button, ActionMenu) — the `page` variant, avoiding a new
  Radix popover primitive. Badge wired into `TopBar` (bell → `/notifications`) via the shell; a
  permission-gated **Notifications** nav item added. Client components use string-union types only.

## Out of scope (explicit)
email/SMS/push · per-user assignment · re-notify cadence · payment-due/birthday/onboarding types ·
`notifications.send` (future) · cron/scheduler infrastructure.

## Decisions flagged for human veto
1. **Suppression-on-renewal** implemented as "only the tail membership (no successor) alerts" — grounded
   in workflows.md §10 + DDS index, beyond the literal scope block. Side effect: an early-renewal *gap*
   (predecessor expired, successor SCHEDULED but not yet started) raises **no** expired alert (member has
   already renewed). Acceptable per "renewed → no longer qualifies."
2. **Generation gated by `notifications.read`** (no `notifications.generate` key exists; `notifications.
   send` is future/out-of-scope). Any staffer who can view the center triggers the idempotent sweep.
3. **Badge in the app-shell TopBar** (visible on every page incl. dashboard) rather than a dashboard
   read-model change — avoids a dashboard→notifications cross-module edge for a single count.
4. **MVP roles:** only **Owner** holds `notifications.read`/`manage`; Trainer/Front-Desk/Manager/
   Accountant do not (catalog). So the bell + page are Owner-only in MVP (by permission, not role).

## Verification targets
generation correctness · non-duplication (re-run = no-op) · frozen-exclusion · suppression-on-renewal
(+ freeze-extension edge) · tenant isolation (404) · authorization allow+deny (`notifications.manage`) ·
state-transition guards (reject `DISMISSED→READ`) · architecture fitness (no-cross-context, tokens,
no role checks, no ui→db) · a11y. Gate: type-check + lint + all fitness + prettier + build + web tests.
