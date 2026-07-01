# Release-Candidate Readiness Report — PULSE Gym SaaS

**Deliverable 4 of 5** · the GO/NO-GO · companion to [architecture-review](./architecture-review.md) ·
branch `feat/platform-foundation` @ `59f2c61` · 2026-07-02

---

## Verdict

> ## 🟡 CONDITIONAL GO — Release Candidate for a single **supervised pilot gym**, after the four fix-before-RC items.
>
> **NOT** yet a GO for public/internet-facing production (that gate is the pre-prod hardening set).

The system is architecturally sound, tenant-safe, money-correct, and drift-protected by a green
fitness suite. There is **no critical, RC-blocking violation** (no pipeline bypass — see
[architecture-review §0.2](./architecture-review.md)). What stands between "committed slices" and
"RC" is a short, cheap, well-understood list — not rework.

## Honest readiness score: **8.5 / 10** (re-derived for the post-Epic-9 state)

This is *not* a rubber-stamp of the Sprint 1.5 8.5 — the underlying rows changed even though the
headline held. The Sprint 1.5 *final* table already had TD-1/TD-5 closed (invariant enforcement was
already a 9 there), so those are not new upward movement relative to that score. The honest reason
the headline holds **despite adding a fresh "6"** is that this review scores two strong dimensions
the 1.5 table did not — **Performance (9)** and **Future Scalability (9)** — which absorb the drag:

- **New drag (down):** Epic 9 exposed the **session-lifetime security-control gap** (R-1/TD-10a) —
  suspension doesn't end active sessions — a new "6" that pulls the security picture off a clean 9
  until a `maxAge` is set. My own R-1 finding did move the row; it just didn't move the rounded
  headline, because —
- **Offsetting (up):** the two newly-scored dimensions (Performance, Future Scalability) are both 9,
  and test depth is modestly higher (94 integration, incl. 8 live-DB archive-guard + 18 staff).

| Dimension | Score | Basis (verification method) |
|---|---:|---|
| Architecture & consistency | 9.5 | Fitness-enforced; zero drift (gate-verified) |
| Domain-invariant enforcement | 9 | ARC-3/INV-11 + INV-12/13/35/36 test-backed (94 integration) |
| Security & tenancy (pipeline) | 9 | Uniform pipeline, permission-based, `assertSameGym→404` (gate + inspection) |
| Security — session lifetime | 6 | **R-1/TD-10a:** suspension outlasted by active JWT (no `maxAge`) |
| UI / design-system fidelity | 9.5 | Tokens-only, catalog-only (fitness-enforced) |
| Accessibility — scanned surfaces | 9 | axe-clean at 3 viewports (e2e-verified) |
| Accessibility — newer modules | 7 | Inspected, not independently scanned (TD-7) |
| Test depth | 7.5 | Strong pure-core + e2e shell + first live-DB per-member reads; command allow-paths thin (TD-6) |
| Product-flow completeness | 8 | Coherent; nav placeholder (TD-15) the one blemish |
| Performance (MVP volumes) | 9 | Gym-scoped, paginated, no N+1, small bundles (inspection + build) |
| Future scalability | 9 | Multi-branch/gym schema, adapter seams; API layer is the additive mobile lever |

**Overall 8.5/10 — beta-ready for one supervised pilot gym; four items to clear for a clean RC tag.**

## The fix-before-RC gate (the conditions on the GO)

| # | Item | Severity | Why it gates RC | Effort |
|---|---|---|---|---|
| 1 | **TD-10a** — set a short `session.maxAge` (+ ideally a layout/middleware account-status re-check) | High | Makes staff **suspension actually take effect**; it is currently a security control an active session outlasts by weeks | Small |
| 2 | **TD-6** — live-DB allow-path/404/idempotency tests for payment record/void + report commands | High | Closes the biggest test-depth gap on the money-touching command layer | Medium |
| 3 | **TD-7** — extend e2e axe to the module pages (incl. staff) | High (cheap) | Turns "a11y by inspection" into "a11y verified"; honesty gate | Small |
| 4 | **TD-15** — resolve the Payments nav placeholder (remove/repoint) | High (cheap) | Stops the product misrepresenting shipped functionality to the first real owner | Trivial |

## Per-debt fix-before-RC vs. after-Beta call (full list)

- **Fix before RC:** TD-10a, TD-6, TD-7, TD-15.
- **After Beta:** TD-2 (count-vs-cached drift), TD-3 (Owner-only Notifications/Reports),
  TD-4 (`assignTrainer` race), TD-8 (notification cron), TD-9 (deferred membership columns),
  TD-12 (governance-doc reconciliations), TD-16 (form autofocus).
- **Pre-prod (before any public launch):** TD-10b (rate-limit/password-strength/`trustHost`),
  TD-11 (Argon2id), TD-17 (automated security-review once a remote exists).
- **Already closed:** TD-1, TD-5, TD-13, TD-14.

## What a "GO" here does and does not authorize

- ✅ **Authorizes:** cutting an RC tag and running a **single, supervised pilot gym** once the four
  items clear. The pilot is the right forcing function for TD-6/TD-7 (real data exercises the
  command paths; real screens get scanned).
- ⛔ **Does not authorize:** an unsupervised or internet-facing deployment. That requires the
  pre-prod set (TD-10b/11/17) and a re-run of the automated security review against a real remote.

## Sign-off conditions

1. Four fix-before-RC items merged, full gate re-green (type-check · lint+fitness · format · build ·
   unit · **integration** · **e2e+axe**).
2. Human acceptance of Epics 1–9 + Slice 1 (currently committed, **not merged/tagged**).
3. Then cut the RC tag as a companion to [`../v1.0-foundation.md`](../v1.0-foundation.md).

The recommended order to execute this — and what follows the RC — is
[post-rc-implementation-order](./post-rc-implementation-order.md).
