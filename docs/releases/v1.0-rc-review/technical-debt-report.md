# Release-Candidate Technical Debt Report — PULSE Gym SaaS

**Deliverable 3 of 5** · companion to [architecture-review](./architecture-review.md) ·
branch `feat/platform-foundation` @ `59f2c61` · 2026-07-02

**Consolidated and re-classified** from the per-epic verification reports and the
[Sprint 1.5 stabilization report](../../sprints/sprint-1.5-stabilization-report.md) (which owns the
original TD-1…TD-17 register), updated for what **Epic 9** and **Reliability Slice 1** have since
closed or changed. This report keeps the original TD-N ids for traceability and adds a fresh
**Critical/High/Medium/Low** severity plus a **fix-before-RC / after-Beta / pre-prod** call.

> A fact lives in one place: the *rationale and history* of each item stays in its owning report.
> This table is the **re-classification and disposition**, not a re-narration.

## Status changes since Sprint 1.5

- **TD-1 (ARC-3/INV-11 archive precondition) — CLOSED** by Reliability Slice 1 (`c55f608`): real
  policy layer + 8 live-DB P0 tests; Frozen-blocks-archive human-ruled and reconciled across docs.
- **TD-5 (INV-36 revoke side) — CLOSED** by Epic 9 (`2dda36c`): suspending a trainer clears their
  open member assignments via the members public `unassignAllForTrainer`.
- **TD-6 — PARTIALLY CLOSED:** Slice 1 added the first live-DB coverage of the payments + memberships
  per-member reads; the **command** allow-paths (record/void/report) remain deny-path-only.
- **TD-10 — RE-SCOPED UP:** Epic 9 turned account suspension into a security control, so the
  JWT-session-lifetime sub-item is promoted from generic pre-prod hardening to a **fix-before-RC**
  recommendation (see [risk-report R-1](./risk-report.md)). The rest of TD-10 stays pre-prod.

## Consolidated register

| # | Item | Severity | Disposition | Notes |
|---|---|---|---|---|
| TD-1 | ARC-3/INV-11 archive precondition | — | ✅ **CLOSED** | Reliability Slice 1. |
| TD-5 | INV-36 revoke side (clear removed trainer's assignments) | — | ✅ **CLOSED** | Epic 9 INV-36 revoke path. |
| TD-13 | Bare framework 404 on missing/cross-tenant links | — | ✅ **CLOSED** | Sprint 1.5 `(app)/not-found.tsx`. |
| TD-14 | No route-level loading feedback | — | ✅ **CLOSED** | Sprint 1.5 `(app)/loading.tsx`. |
| **TD-10a** | **JWT session has no `maxAge`/re-check → suspended staff keep access ≈30 days** | **High** | **Fix before RC** | The Epic-9 security-control gap. Set a short `session.maxAge`; a middleware/layout re-check of account status is the fuller fix. |
| **TD-6** | Thin live-DB integration on E5/E7/E8 **command** allow-paths (record/void/report) | **High** | **Fix before RC** | Partially closed by Slice 1 (per-member reads). Add live-DB allow-path + 404 + idempotency for the commands. |
| **TD-7** | Members/plans/memberships/payments/notifications/**staff**/reports pages not independently e2e-axe-scanned | **High (cheap)** | **Fix before RC** | Extend the existing e2e axe harness to the module routes. Closes the a11y honesty gap. |
| **TD-15** | "Payments" nav placeholder misrepresents shipped payments | **High (cheap)** | **Fix before RC** | IA decision (§11): remove or repoint. Trivial, high trust value. |
| TD-3 | Notifications & Reports are Owner-only in MVP (Manager/Accountant dormant) | Medium | After Beta | Intentional; unblocks when dormant roles activate. |
| TD-2 | Count-vs-cached-list drift (report/dashboard) | Medium | After Beta | Reconcile at a single derive source; touches cache-sweep. |
| TD-8 | Notification generation = on-open server action (no cron) | Medium | After Beta | Replaceable trigger by design; swap for worker/cron. Shares infra with TD-18. |
| TD-18 | Frozen membership never auto-resumes → a forgotten freeze silently over-extends the end date | Medium | After Beta | Product/lifecycle decision. Owning report: [decision-note-freeze-auto-resume](../../sprints/decision-note-freeze-auto-resume.md). Recommend Beta = "resume due" cue (no new infra); true auto-resume = scheduled job, decide with TD-8. |
| TD-4 | `assignTrainer` race not serialized | Low | After Beta | Low-frequency; wrap in a serializable tx like INV-12. |
| TD-9 | Membership-level trainer / freeze-reason / cancel-reason / notes not persisted | Low | After Beta | Needs a reviewed schema migration (frozen foundation → ADR). |
| TD-12 | `authorization-architecture.md §4/§6` `gym.view` + `DDS §16` seed reconciliations | Low | After Beta | Governance-doc edits; human's call. |
| TD-16 | No autofocus on first create-form field | Low | Nice-to-have | Deliberate a11y trade-off. |
| TD-11 | Argon2id-vs-scrypt KDF evaluation | — | **Pre-prod** | KDF change = rehash-on-next-login. |
| TD-10b | Auth rate-limiting, password-strength, `AUTH_URL`/`trustHost` | — | **Pre-prod** | The remainder of the original TD-10. |
| TD-17 | Automated `/security-review` can't run (no git remote) | — | **Pre-prod** | Manual review found no critical/high; re-run once a remote exists. |

## New findings this review

The review surfaced **no new defect** beyond the register above. The only substantive delta is the
**re-scoping of TD-10a up to fix-before-RC** — a re-classification of documented behaviour under the
new Epic-9 meaning, not a newly discovered bug. *(Added 2026-07-02 out of band: **TD-18** — freezes
never auto-resume; a product/lifecycle decision, not a defect, raised during the member-centric
workspace review. See its owning [decision note](../../sprints/decision-note-freeze-auto-resume.md).)* One latent, currently-harmless coupling is noted for
the record: `unassignAllForTrainer` authorizes `assignments.manage` (correct today because the Owner
who suspends staff also holds it) — revisit if suspension is ever delegated to a role that lacks
`assignments.manage`.

## Fix-before-RC set (the short list)

1. **TD-10a** — set a short `session.maxAge` (and, ideally, a layout/middleware account-status
   re-check) so suspension takes effect promptly.
2. **TD-6** — live-DB allow-path/404/idempotency tests for payment record/void + the report commands.
3. **TD-7** — extend e2e axe to the module pages (incl. staff).
4. **TD-15** — resolve the Payments nav placeholder.

Everything else is genuinely **after-Beta** (TD-2/3/4/8/9/12/16) or **pre-prod** (TD-10b/11/17).
The GO/NO-GO that rests on this list is in [rc-readiness-report](./rc-readiness-report.md); the
build order is in [post-rc-implementation-order](./post-rc-implementation-order.md).
