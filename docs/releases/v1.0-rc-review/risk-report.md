# Release-Candidate Risk Report — PULSE Gym SaaS

**Deliverable 2 of 5** · companion to [architecture-review](./architecture-review.md) ·
branch `feat/platform-foundation` @ `59f2c61` · 2026-07-02

Risks are rated by **likelihood × impact** for the *near-term target* (a single supervised pilot
gym), with a separate note where the rating changes for broader rollout. Each risk links to its
technical-debt item; the debt report holds the fix framing, this report holds the exposure.

| ID | Risk | L × I | Exposure now (pilot) | Trigger that raises it |
|---|---|---|---|---|
| **R-1** | **Suspended/terminated staff retain access.** JWT session, no `session.maxAge`, no middleware re-check → a revoked account's already-issued token stays valid ≈30 days. Suspension blocks *new* sign-ins only. | Med × High | **Elevated.** Epic 9 made suspension a *security control*; the control is partially ineffective against an active session. | Any real staff offboarding / compromise; more staff accounts; multi-role gyms. |
| **R-2** | **Regression in an untested service *command* allow-path** (payment record/void, report commands) slips the suite. Pure cores + deny-path units are tested; live-DB allow-path/404/idempotency for the *commands* are thin (TD-6, partially closed by Slice 1). | Med × Med | Moderate. Correctness rests on tested pure cores + generic tenancy/authz units. | Any change to payments/reports command layer without adding a live-DB test. |
| **R-3** | **An a11y defect ships unseen on a newer module page** (members/plans/memberships/payments/notifications/reports/staff not independently axe-scanned — TD-7). | Low × Med | Low — pages reuse axe-clean primitives + identical landmark scaffold. | A bespoke layout added to a module page; a primitive regressed without a scan. |
| **R-4** | **Owner reads "Payments" as unavailable.** The sidebar "Payments" item is a disabled placeholder, yet payments ship (recorded/voided from membership detail). Misrepresents shipped functionality (TD-15). | Med × Low | Real but cosmetic — a discoverability/trust dent, not a data risk. | First real owner using the product unassisted. |
| **R-5** | **Count-vs-cached-list drift confuses an operator** — a time-drifted membership can count under "Expired" yet list under "Active" with an Expired badge (TD-2). | Low × Low | Low — visible only at the exact expiry boundary before a write refreshes the cache. | High membership volume near expiry; sweep/cache reconciliation still deferred. |
| **R-6** | **`assignTrainer` race** — concurrent set on the same member can surface a P2002/500 instead of a clean result (TD-4). | Low × Low | Low — single-operator pilot; low-frequency action. | Multiple concurrent front-desk operators. |
| **R-7** | **Notification generation depends on someone opening the page** (on-open server action, no cron — TD-8). Alerts don't materialise until the notifications page is visited. | Med × Low | Low for a supervised pilot (owner visits regularly). | Expectation of push/scheduled alerts; unattended operation. |
| **R-8** | **Pre-prod auth hardening absent** — rate-limiting, password-strength, `AUTH_URL`/`trustHost`, Argon2id decision (TD-10/11); automated `/security-review` never run (no remote, TD-17). | Med × High **at prod** | N/A for a supervised local pilot; **blocks a public production launch.** | Public deployment / real credentials over the internet. |

## Risk posture

- **No risk in this table bypasses the mutation pipeline.** Tenant isolation, money correctness,
  authorization, and immutable history are all sound and test-backed (see
  [architecture-review §0.2, §1, §2, §5](./architecture-review.md)). There is **no critical,
  RC-blocking architecture violation** to surface for a human STOP.
- **The one risk that moved since Sprint 1.5 is R-1.** It is not a new bug — the session-lifetime
  behaviour is documented (TD-10) — but Epic 9 changed its *meaning*: account suspension is now a
  security control, and a control that a live session can outlast for weeks deserves to be treated
  as a fix-before-RC item, not a generic pre-prod line. This is the review's sharpest delta from the
  existing reports.
- **The rest of the near-term exposure is coverage and UX** (R-2, R-3, R-4), all cheap to close and
  all on the fix-before-RC / high list.
- **R-8 is deliberately out of scope for the pilot** but is the wall between "supervised pilot" and
  "public production." It must be planned before any internet-facing launch.

Fix sequencing and the fix-before-RC vs. after-Beta call live in
[rc-readiness-report](./rc-readiness-report.md) and
[post-rc-implementation-order](./post-rc-implementation-order.md).
