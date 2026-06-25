# Testing Standards
### PULSE Gym SaaS · Engineering Governance

| | |
|---|---|
| **Status** | ✅ Authoritative |
| **References** | ADR §14, `development-workflow.md`, Design System v1.1 §7 |

> **Why this policy:** We test what protects **money and tenants**, not a coverage number. In a SaaS where one bug can leak another gym's data or mis-record revenue, a few high-value tests beat thousands of trivial ones. Tests also encode business invariants so the AI can refactor for months without silently breaking them.

---

## Priorities (what to test, in order)

| Priority | Target | Mandatory? |
|---|---|---|
| **P0** | **Tenant isolation** — Gym A can never read/write Gym B's data, per module | ✅ Always |
| **P0** | **Business invariants** — money math, plan-snapshot immutability, membership status transitions, renewal/upgrade/freeze date logic | ✅ Always |
| **P1** | **Authorization** — role boundaries (OWNER vs TRAINER), unauthenticated rejection | ✅ For any guarded path |
| **P1** | **Validation** — Zod schemas reject malformed input | ✅ For any input boundary |
| **P2** | **Key user flows** (E2E happy paths) | Recommended |
| **P3** | Trivial CRUD that's a thin Prisma call | ❌ Skip (types already guard it) |

**A feature is not "done" until its P0 tests pass.** *Why:* tenancy and money are catastrophic, not cosmetic.

---

## Unit Testing
- **Scope:** pure logic — `service.ts` functions, date/money utilities, status calculators, Zod schemas.
- **Rules:** test **behavior, not implementation** (survives refactors); one assertion-concept per test; descriptive names (`renews from end_date when renewed early`). *Why:* behavior tests are the durable safety net for invariants.
- **Mock only true boundaries;** prefer real logic over mocks where cheap. *Why:* over-mocking tests the mock, not the code.

## Integration Testing
- **Scope:** Server Actions / Route Handlers end-to-end through the mutation pipeline against a **real test database** (containerized Postgres).
- **Rules:** every guarded action gets a **tenant-isolation test** (acting as Gym A, assert Gym B rows are untouched/invisible) and an **authorization test**. Multi-write operations assert transactional all-or-nothing. *Why:* the pipeline (authn→authz→validate→scope→execute) is where real bugs live.
- **Reset DB state between tests;** deterministic seed. *Why:* flaky tests erode trust and get ignored.

## E2E Testing
- **Scope:** critical journeys — *create member → sell membership → record payment*; *renew expiring membership*; *login/logout + route protection*.
- **Tooling:** Playwright (browser). Run against a seeded test instance.
- **Rules:** happy paths + the few highest-value failure paths; keep the suite small and fast. *Why:* E2E is expensive; reserve it for journeys that span modules.

## UI Testing
- **Scope:** component behavior/states for non-trivial interactive components (forms, DataTable, dialogs): empty/loading/error/selected states, validation display, keyboard interaction.
- **Rules:** assert via **accessible queries** (role/label/text), not test-ids where avoidable. *Why:* testing by role doubles as an accessibility check.
- **Don't snapshot-test** large DOMs as a substitute for real assertions. *Why:* brittle, low-signal.

## Accessibility Testing
- **Automated:** an axe-core (or equivalent) check in component/E2E tests for WCAG violations.
- **Manual (per Design System v1.1 §7):** keyboard-only traversal, visible focus ring, contrast via `*-text` tokens, reduced-motion respected, responsive reflow to one column, color-not-sole-signal.
- **Gate:** any UI change passes the §7 checklist before "done." *Why:* a11y regressions are silent and compounding.

## Manual Testing Checklist (human acceptance)
The human verifies at acceptance:
- [ ] Acceptance Criteria from the feature spec all hold
- [ ] Works as OWNER and as TRAINER (correct permissions)
- [ ] Tenant/branch scope correct (no cross-gym leakage observed)
- [ ] Money/dates display correctly (currency, gym timezone)
- [ ] Empty / loading / error states render
- [ ] Keyboard + focus usable; responsive on mobile width
- [ ] No console errors

## Coverage Expectations
- **No global %-coverage target.** Instead: **100% of P0 paths covered** (tenancy + invariants), all guarded actions have authz + isolation tests, all input boundaries have validation tests. *Why:* a coverage number rewards testing trivia; path-based requirements reward testing what matters.
- **Every bug fix adds a regression test** reproducing the bug. *Why:* bugs cluster; lock each one out permanently.
- **Tests live beside the code** they cover and run in CI; **red CI blocks merge.**
