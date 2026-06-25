# Development Workflow
### PULSE Gym SaaS · Engineering Governance

| | |
|---|---|
| **Status** | ✅ Authoritative |
| **Scope** | The lifecycle EVERY feature follows — no exceptions |
| **References** | ADR (architecture), PRD (product), Design System v1.1 + Component Catalog (UI), other `/docs/engineering/*` |

> **Why a fixed workflow:** Claude Terminal builds most of this product over many months. A single, repeated lifecycle is what prevents architectural drift — the 40th feature is built the same way as the 1st, so reviewers (human) and the builder (AI) both know exactly what "in progress" and "done" mean. Predictability is the feature.

---

## The Pipeline (mandatory order)

```
Idea → Technical Spec → Task Breakdown → Implementation → Self-Review
→ Testing → Accessibility Check → Documentation Update → Definition of Done → Merge → Release
```

No stage is skipped. A stage may be *trivially small* (a one-line spec), but it is never *absent*. Each stage has an entry gate (what must be true to start) and an exit gate (what must be true to finish).

---

### 1. Idea
- **Input:** a product need from the human (PRD item, bug, enhancement).
- **Action:** restate the need in one or two sentences; confirm it maps to an existing module (per ADR) or flag that it doesn't.
- **Exit gate:** the goal and the owning module are named. *Why:* every change belongs to exactly one feature slice; "where does this live" is answered before any code.

### 2. Technical Specification
- **Action:** produce a `feature-template.md`-shaped spec (Purpose, Business Rules, Acceptance Criteria, Dependencies, DB/API/UI changes, Permissions, Validation, Testing, Docs).
- **Exit gate:** spec is written and, for anything non-trivial, **approved by the human** before implementation. *Why:* the ADR mandates "understand the feature before writing code"; the spec is that understanding made reviewable, and it is far cheaper to correct a spec than a built feature.

### 3. Task Breakdown
- **Action:** decompose the spec into ordered, small tasks (schema → validation → server logic → UI → tests → docs), each independently verifiable. Track them (TODO list / task tool).
- **Exit gate:** a checklist exists where each item is a single, reviewable unit. *Why:* small ordered tasks keep context (and tokens) bounded and make partial progress legible.

### 4. Implementation
- **Action:** build the feature **as one complete vertical slice** (ADR §16), following the canonical mutation pipeline (`authenticate → authorize → validate → scope → execute → revalidate`), reusing existing modules, components, and tokens.
- **Rules:** tokens only (no literals), catalog components only, tenancy (`gymId`) on every query, no new abstractions without approval.
- **Exit gate:** the slice compiles, type-checks, and lints clean. *Why:* a vertical slice is shippable; half-finished horizontal layers are forbidden (ADR).

### 5. Self-Review
- **Action:** Claude reviews its own diff against `code-style-guide.md`, `naming-conventions.md`, and the spec **before** asking for human review. Use the `advisor` tool on non-trivial work.
- **Exit gate:** a short self-review note listing what changed, what was verified, and any uncertainty. *Why:* the human reviewer's time is the scarcest resource; self-review catches the obvious so review focuses on judgment.

### 6. Testing
- **Action:** write/run tests per `testing-standards.md`. **P0 tests are mandatory: tenant isolation + business invariants** (money math, snapshot immutability, status transitions).
- **Exit gate:** P0 tests pass; relevant unit/integration tests pass. *Why:* tenancy and money are the two places a bug is catastrophic, not cosmetic.

### 7. Accessibility Check
- **Action:** verify against Design System v1.1 §7 — contrast (`*-text` tokens), keyboard, focus ring, reduced-motion, responsive reflow, color-not-sole-signal.
- **Exit gate:** the §7 gate passes for any UI change. *Why:* accessibility regressions are silent and compound; catching them per-feature is the only sustainable way.

### 8. Documentation Update
- **Action:** update affected docs **in the same change set** — feature doc, and any token/component/catalog/standard touched.
- **Exit gate:** no doc contradicts the code. *Why:* docs are the AI's primary context; stale docs actively cause future errors and waste tokens.

### 9. Definition of Done
- **Action:** confirm the feature's DoD (from its `feature-template`) and the global DoD (CLAUDE.md) are fully met.
- **Exit gate:** every DoD box checked, honestly. *Why:* "done" must mean the same thing every time, or quality drifts silently.

### 10. Merge
- **Action:** follow `git-workflow.md` — PR from a feature branch, review, squash-merge to the default branch.
- **Exit gate:** human approval + green checks. *Why:* the human owns acceptance; merge is where that authority is exercised.

### 11. Release
- **Action:** follow `git-workflow.md` release/versioning. Deploy per ADR (Docker Compose).
- **Exit gate:** released change is tagged and noted in the changelog. *Why:* traceability — every production change maps to a spec, a PR, and a version.

---

## Workflow Rules
1. **One feature, one slice, one PR** wherever feasible. Large features are split into independently-mergeable slices.
2. **A blocked or uncertain stage STOPS the pipeline** — Claude surfaces the uncertainty and asks, rather than guessing forward (CLAUDE.md decision hierarchy).
3. **Stages are not reordered.** Tests before docs, accessibility before done. The order encodes dependencies.
4. **Trivial ≠ skipped.** Even a typo fix passes self-review, the relevant check, and DoD.
5. **The human gates Spec (3) and Merge (10).** Everything between is Claude's to execute within these standards.
