# Recommended Implementation Order — RC and Beyond

**Deliverable 5 of 5** · companion to [rc-readiness-report](./rc-readiness-report.md) ·
branch `feat/platform-foundation` @ `59f2c61` · 2026-07-02

Sequenced by **dependency and risk-retirement**, not by ticket size. Each slice keeps the project's
established rhythm (concise brief → implement → verification report → full gate green → commit) and
respects the frozen foundation (a schema/ADR change is a human-approved ADR entry, never an ad-hoc
edit). This ordering *reclassifies and sequences* the debt register — it does not restate item
rationale (that lives in [technical-debt-report](./technical-debt-report.md)).

---

## Phase 0 — Fix-before-RC (clear the four gate items, then tag)

Do these first; they are the conditions on the [CONDITIONAL GO](./rc-readiness-report.md). Small,
independent, parallelizable.

1. **TD-15 — Payments nav placeholder** (trivial, do first). Remove or repoint the disabled item so
   the product stops misrepresenting shipped payments. Pure UI, catalog-only.
2. **TD-10a — session `maxAge` + account-status re-check** (small, highest risk-retirement).
   Set a short JWT `session.maxAge`; ideally add a layout/middleware re-check of the account's
   ACTIVE/REVOKED status so suspension takes effect promptly. This turns a security control that a
   live session outlasts into one that bites. **This is the single most valuable pre-RC change.**
3. **TD-7 — e2e axe on module pages** (small, cheap honesty gate). Extend the existing Playwright +
   axe harness to members/plans/memberships/payments/notifications/reports/**staff**. Converts
   "a11y by inspection" into "a11y verified" and will likely find nothing (reused primitives).
4. **TD-6 — live-DB command allow-path tests** (medium). Add real-DB allow-path + 404 + idempotency
   tests for `recordPayment`/`voidPayment` and the report commands, matching the depth Slice 1 set
   for the per-member reads. Closes the biggest test-depth gap on the money layer.

**Exit:** full gate re-green → human acceptance of Epics 1–9 + Slice 1 → **cut the RC tag**
(companion to `v1.0-foundation.md`).

## Phase 1 — Pilot the RC (single supervised gym)

Run the supervised pilot. It is the right forcing function: real data exercises the command paths,
real screens surface any residual UX/a11y issue, and staff offboarding validates TD-10a in practice.
Fix only pilot-blocking regressions here; feed everything else into Phase 2+.

## Phase 2 — Reliability & consistency slice (after Beta)

Retire the remaining correctness-adjacent debt now that the pilot has exercised the paths.

- **TD-2** — reconcile count-vs-cached-list drift at a single derive source (the sweep/reconciliation
  question the report/dashboard share).
- **TD-4** — serialize `assignTrainer` (wrap in a serializable tx, the INV-12 pattern).

## Phase 3 — Notification delivery (after Beta)

- **TD-8** — replace the on-open generation trigger with a scheduled worker/cron; generation is
  already pure + dedupe-keyed, so this is a trigger swap. Consider the per-gym
  `expiredNotificationWindowDays` column deferred in NTF-5 (schema → ADR).

## Phase 4 — Activate dormant roles (after Beta)

- **TD-3** — once staff can be assigned Manager/Accountant, Notifications and Reports gain their
  intended multi-role visibility. This is unlocked by, and builds on, Epic 9's staff foundation.
- Revisit the latent `assignments.manage` coupling on `unassignAllForTrainer` if suspension is ever
  delegated below Owner.

## Phase 5 — Pre-prod hardening (before any public launch — hard gate for internet-facing)

- **TD-10b** — auth rate-limiting, password-strength enforcement, `AUTH_URL`/`trustHost`.
- **TD-11** — Argon2id-vs-scrypt decision (rehash-on-next-login migration).
- **TD-17** — re-run the automated `/security-review` once a git remote exists.
- **TD-12** — governance-doc reconciliations (`gym.view` §4/§6, DDS §16 seed line).

## Phase 6 — Membership richness (after Beta, schema slice)

- **TD-9** — membership-level trainer / freeze-reason / cancel-reason / notes as **one reviewed
  schema migration** (frozen foundation → ADR entry + human approval). Bundling them avoids repeated
  migrations.
- **TD-16** — first-field autofocus can ride along as a nice-to-have.

## Beyond the debt register — the roadmap's next structural lever

The one architectural addition the current design *invites but does not yet contain* is a
**dedicated HTTP API layer**. Today the command surface is server actions; a future mobile app (or
third-party integration) needs an API. The domain is already positioned for it — services take an
explicit `principal` + injected adapters and are UI-agnostic — so this is **additive** (new route
handlers calling the same service cores), not a rework. Sequence it when a mobile/integration
requirement is real, not before (YAGNI); when it lands, the same permission pipeline and
`assertSameGym` tenancy apply unchanged.

---

### One-line sequence

**Phase 0 (TD-15 → TD-10a → TD-7 → TD-6) → cut RC → Phase 1 pilot → Phase 2 reliability →
Phase 3 notifications → Phase 4 roles → Phase 5 pre-prod hardening → Phase 6 membership richness →
(when a real requirement appears) API layer for mobile/integrations.**
