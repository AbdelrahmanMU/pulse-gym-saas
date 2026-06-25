# Feature Template
### PULSE Gym SaaS · Engineering Governance

| | |
|---|---|
| **Status** | ✅ Authoritative — mandatory for every feature |
| **Usage** | Copy this template into `/docs/features/<feature>.md` at the **Technical Specification** stage |
| **References** | PRD, ADR, Design System v1.1, Component Catalog, `/docs/engineering/*` |

> **Why a mandatory template:** A fixed spec shape means the human reviews the same structure every time and the AI never forgets a dimension (tenancy, permissions, validation). It converts "understand before building" (ADR) into a checklist that is cheap to write and cheap to verify. Sections that don't apply are marked **"N/A — <reason>"**, never deleted — an empty section is a decision, not an oversight.

---

## Template

### 1. Purpose
*One paragraph: what user/business problem this solves and which module owns it.* Link the PRD item. **Why:** anchors scope and prevents feature sprawl.

### 2. Business Rules
*Numbered, testable rules (BR-1, BR-2…).* Reference existing ADR/PRD rules rather than restating; add only new ones. **Why:** business rules are the spec's contract and the source of invariant tests.

### 3. Acceptance Criteria
*Given / When / Then, testable.* Each maps to at least one test. **Why:** defines "works" objectively for human acceptance.

### 4. Dependencies
*Modules, components, tokens, services this reuses; upstream/downstream features; external libraries (must already be approved).* **Why:** surfaces coupling and prevents duplicate logic / unapproved deps.

### 5. Database Changes
*Models/columns/indexes/migrations, per `database-standards.md`. Confirm `gymId` (+ `branchId` where relevant), audit fields, soft-delete, snapshot needs.* State "N/A" if none. **Why:** schema changes are the highest-risk, least-reversible change.

### 6. API Changes
*New/changed Route Handlers or Server Actions, per `api-standards.md`: route, method, auth, request/response shape, errors.* Note whether a Server Action suffices (ADR decision rule). **Why:** API is a contract; changes must be deliberate and documented.

### 7. UI Changes
*Screens/components from the Component Catalog being composed; new states (empty/loading/error). Confirm: only catalog components, only tokens, responsive + accessible.* **Why:** keeps the UI consistent and forbids bespoke patterns.

### 8. Permissions
*Which roles (OWNER/TRAINER) may do what; tenancy/branch scope. Reference ADR authorization.* **Why:** authorization is checked server-side per action; specifying it prevents privilege leaks.

### 9. Validation
*Zod schemas at each trust boundary: fields, types, constraints, error messages.* **Why:** every external input is validated; the spec is where the rules are agreed.

### 10. Testing
*Planned tests by level (P0 tenancy + invariants mandatory), mapped to acceptance criteria, per `testing-standards.md`.* **Why:** test plan is part of design, not an afterthought.

### 11. Documentation
*Which docs update in this change set (this feature doc + any token/component/standard touched).* **Why:** docs and code never diverge (workflow stage 8).

### 12. Checklist (pre-merge)
- [ ] Spec approved by human before implementation
- [ ] One vertical slice; owning module correct
- [ ] Mutation pipeline followed (authn → authz → validate → scope → execute → revalidate)
- [ ] `gymId` on every business query; branch scope correct
- [ ] Only catalog components; only design tokens (no literals)
- [ ] Zod validation at every boundary
- [ ] Money as integer/Decimal; dates UTC + gym timezone; snapshots immutable
- [ ] P0 tests (tenancy + invariants) written and passing
- [ ] Accessibility gate (Design System v1.1 §7) passed
- [ ] Self-review note written; `advisor` consulted if non-trivial
- [ ] Docs updated in this change set
- [ ] No new dependency/abstraction without approval

### 13. Definition of Done
A feature is **done** only when: every Acceptance Criterion passes; the Checklist (§12) is fully and honestly checked; P0 tests are green; the accessibility gate passes; docs are updated; and the human has accepted it at Merge. **Why:** a single, repeated DoD is what makes "done" trustworthy across months of AI development.

---

## Rules
1. **No implementation before §1–§11 exist and the spec is approved.** (ADR: understand first.)
2. **Never delete a section** — mark N/A with a reason.
3. **Reference, don't restate** rules/components/tokens already defined elsewhere.
4. **The Checklist is binding**, not advisory; an unchecked box blocks merge.
