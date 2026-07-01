# Sprint 1 · Epic 7 — Business-Rule Refinement: Bounded EXPIRED notification generation

**Type:** product refinement (business rule). **Decided by:** human. **Status:** documented →
implemented. Resolves the open question flagged in `sprint-1-epic-7-verification-report.md` (§gaps).

## The rule (canonical home: business-rules.md **NTF-5**)
**Expired**-membership notifications are generated only within a **recent window** — system default
**7 days** after the effective end date. Beyond the window an expired membership is a **historical
record**, not an operational alert, and generates no new expiry notification.

**Scope — generation only.** The bound does **not** affect membership status/access, dashboards,
reports, or history; those continue to see every expired membership. Only the *alert queue* is
bounded, so it reflects lapses that are still worth chasing (NTF-3: a trustworthy, low-noise queue).

## Precise semantics
- Judged in the gym time zone against the **effective end date** (inclusive end; Expired begins the
  day after — INV-28). A membership is a generatable EXPIRED candidate iff it is derived **EXPIRED**
  and `remainingDays >= −WINDOW` (`remainingDays = effectiveEnd − today`).
- With `WINDOW = 7`: alerts on **end+1 … end+7** (the first 7 Expired days); on **end+8** and later,
  no new alert. EXPIRING_SOON is unaffected.
- Combines with the existing rules unchanged: tail-only suppression-on-renewal, frozen-exclusion
  (FRZ-3), and dedupeKey non-duplication (NTF-3/INV-33/INV-34).

## Configurability decision
Realized as a **fixed system-default constant** (`EXPIRED_NOTIFICATION_WINDOW_DAYS = 7`) — a single
named source of truth — **not** a per-gym column. **No schema change / migration.** This is the minimal
footprint and avoids an unapproved DB-foundation change. **Future:** promote to a per-gym
`Gym.expiredNotificationWindowDays` (mirroring `expiringSoonWindowDays`) if per-gym control is wanted —
that would be an additive migration + a Gym-settings field (human's call).

## Where it lives (implementation note)
Applied in the **notifications** module (the consumer/policy owner), not in the membership lifecycle:
`memberships.getExpiryCandidates` stays an unbounded lifecycle read (so dashboards/other consumers are
unaffected — satisfying the scope limitation by construction), and
`notifications.generateExpiryNotifications` filters EXPIRED candidates through the pure
`isWithinNotificationWindow` predicate before writing. Keeping the constant in notifications also
respects the module dependency direction (notifications → memberships, never the reverse).
