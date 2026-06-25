# Definition of Ready (DoR)
### PULSE Gym SaaS · Engineering Governance

| | |
|---|---|
| **Status** | ✅ Authoritative — the gate that must pass **before** implementation begins |
| **Relationship to DoD** | DoR gates the **start**; Definition of Done (CLAUDE.md / `feature-template.md`) gates the **finish**. |
| **References** | `feature-template.md`, `development-workflow.md`, `authorization-architecture.md`, `domain-boundary-rules.md`, Component Catalog |

> **Why a strict DoR:** The most expensive AI mistakes come from building before the work is fully understood. A feature that isn't *ready* will drift, guess, or land a rule in the wrong place. **If any item below is unmet, the feature is NOT ready — Claude Terminal must STOP and resolve it before writing code.** Readiness is cheap; rework is not.

---

## The Readiness Checklist
A unit of work is **Ready** only when **all** of the following are true and recorded in its `feature-template` spec:

### Understanding & business
- [ ] **Business Rules** — every rule the feature depends on is identified by ID (`business-rules.md`); any new rule is written and approved. No rule is implied or assumed.
- [ ] **Workflow** — the business flow, alternatives, and failures are documented (`workflows.md`); the owning **bounded context** is named (`bounded-contexts.md`), and no rule is placed outside its owner (`domain-boundary-rules.md`).
- [ ] **Acceptance Criteria** — testable Given/When/Then, each mapped to at least one planned test.

### Authorization (permission-based — non-negotiable)
- [ ] **Permissions** — the exact **permission key(s)** the feature requires are named (`authorization-architecture.md`), and the roles that hold them are confirmed via the matrix. **No role-name logic is planned.** Dormant-role implications (e.g., Front Desk) are noted if relevant.

### Design & reuse
- [ ] **Design Components** — the Catalog components for every screen/state are identified (incl. empty/loading/error). No bespoke UI is planned.
- [ ] **Reused Components/Modules/Logic** — existing modules, domain logic, and tokens to reuse are listed; nothing to be duplicated is being re-created.

### Correctness
- [ ] **Validation Rules** — the Zod-validated inputs and constraints at each boundary are specified.
- [ ] **Error Cases** — the failure taxonomy for this feature is defined (`error-handling.md`): validation, authz, conflict, not-found, unexpected — each with a user-safe message.
- [ ] **Edge Cases** — domain edge cases are enumerated (e.g., early renewal, freeze near end date, archive with active membership per ADR-P3).

### Verification & dependencies
- [ ] **Testing** — the test plan (P0 tenancy + invariants mandatory) is written and mapped to acceptance criteria (`testing-standards.md`).
- [ ] **Dependencies** — upstream features/contexts are complete (per `implementation-strategy.md` order); no unmet prerequisite; any new library/abstraction is **approved** (else STOP).
- [ ] **Documentation** — the docs that will change are identified; no fact will be duplicated across docs.

### Approval
- [ ] **Review Approval** — the human has approved the spec (`development-workflow.md` stage 2). For Memberships/Payments, the relevant **ADR-P decisions are resolved** (`decision-log.md`).

---

## Readiness gates by risk
Some work needs extra readiness before it may start:
- **Any membership/payment feature** — ADR-P1…P7 relevant items resolved; P0 invariant test plan written. *Why:* money/contract correctness.
- **Any authorization-touching feature** — permission keys exist (or are added append-only) and the gate plan asserts on permissions, not roles. *Why:* the top drift risk.
- **Any cross-context interaction** — the public-interface call is identified; no rule is being re-implemented in the consumer (`domain-boundary-rules.md`). *Why:* boundary integrity.
- **Any new UI pattern** — if no Catalog component fits, STOP and follow Catalog governance (propose/approve) **before** the feature is Ready. *Why:* prevent inconsistent UI.

## What "Not Ready" looks like (STOP signals)
- A business rule is "obvious" but unwritten. → Write it, get approval.
- The permission for an action isn't named, or someone proposes `if (role === …)`. → Define the permission; forbid role logic.
- A needed component/token/module doesn't exist. → Propose it; get approval.
- An ADR-P decision the feature depends on is still Proposed. → Resolve it first.
- A rule would live in a context that doesn't own it. → Reassign to the owner.

## Outcome
- **Ready** → implementation may begin (enter `development-workflow.md` stage 4).
- **Not Ready** → Claude Terminal **STOPS**, states which item failed and why, proposes the resolution, and waits (AI rules §F). **Never proceed on an unmet DoR.**
