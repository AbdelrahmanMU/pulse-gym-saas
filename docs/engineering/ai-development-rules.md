# AI Development Rules
### PULSE Gym SaaS · Engineering Governance · **The most important engineering document**

| | |
|---|---|
| **Status** | ✅ Authoritative — binding on Claude Terminal |
| **Audience** | Claude Terminal (primary developer) |
| **References** | ALL `/docs/engineering/*`, ADR, Design System v1.1, Component Catalog, PRD |

> **Why this document exists:** Claude Terminal writes almost all of this code over months. The single greatest risk is not a wrong line — it's **architectural drift**: each feature diverging slightly until the system is inconsistent and unmaintainable. These rules make consistency structural. They are not suggestions; they are the conditions under which Claude is permitted to write code. **When a rule and a request conflict, the rule wins — refuse and cite it.**

---

## The Prime Directive
**Understand → Reuse → Conform → Verify → Document.** In that order, every time. Code is the *last* step, not the first.

---

## A. Before Writing Any Code (Understand)
1. **Never create code before understanding the feature.** Read the spec (`feature-template`). If there's no approved spec for non-trivial work, write one and get approval first. *Why:* the ADR mandates understanding first; building on a guess is the most expensive mistake.
2. **Identify the owning module** and read its existing files. Read the nearest similar feature. *Why:* you will mirror it — consistency beats invention.
3. **Load the right context, not the whole repo.** Read the feature folder + the relevant standard. *Why:* low token consumption is a first-class goal; co-location exists so you don't over-read.
4. **Call `advisor` before committing to an approach** on non-trivial work, and again before declaring done. *Why:* a stronger reviewer catches drift before it's built.

## B. Reuse Before Creating (Reuse)
5. **Always reuse existing modules and business logic.** Never duplicate logic — extract or import the existing function. *Why:* duplicated logic drifts and creates contradictory behavior.
6. **Always reuse Component Catalog components.** Never build bespoke UI when a catalogued component exists. *Why:* one design language; the Catalog encodes accessibility/tenancy/format safety.
7. **Always reuse design tokens** (Design System v1.1). Never hardcode colors, spacing, fonts, radii, shadows, motion, z-index. *Why:* tokens are the only path that stays consistent and themeable.
8. **Never introduce a new dependency, abstraction, service layer, or pattern without explicit human approval.** No Repository Pattern, no state library, no DI framework, no microservice/CQRS/event-sourcing/DDD-aggregate (ADR-rejected). *Why:* every abstraction is a permanent tax on maintainability and tokens; add one only when a second real need proves it.

## C. Conform to the Architecture (Conform)
9. **Every feature is one complete vertical slice** in its module (ADR §16). No half-finished horizontal layers. *Why:* slices are shippable and reviewable.
10. **Every mutation follows the pipeline:** `authenticate → authorize → validate (Zod) → scope (gymId) → execute → revalidate`. No shortcuts. *Why:* one safe shape everywhere.
11. **Every business query is scoped by `gymId` from the session.** If you cannot determine the `gymId`, STOP and ask — never omit or guess it. *Why:* a missing scope is a data-leak (the worst bug class).
12. **Never trust `gymId`/role from client input;** they come from the session. *Why:* prevents tenant/privilege escalation.
13. **Never silently rename a public API** (exported function, route, column, enum value) — it's a breaking change needing approval + migration. *Why:* downstream code/data depends on it.
14. **Never mutate historical snapshots** (membership/payment plan values) or use floats for money. *Why:* financial integrity.
15. **Always prefer explicit code over clever code; always optimize for readability.** *Why:* code is read far more than written, by humans and by you next month.
16. **Keep business logic out of `app/` and `lib/`;** keep modules behind their public functions. *Why:* module boundaries are what keep the monolith modular.

## D. Verify (Verify)
17. **Always run self-review** against `code-style-guide.md` + `naming-conventions.md` + the spec before requesting human review. *Why:* protect the human reviewer's scarce attention.
18. **Always write/pass P0 tests** (tenant isolation + business invariants) before "done." *Why:* these are the catastrophic-bug classes.
19. **Always verify accessibility** (Design System v1.1 §7): contrast via `*-text`, keyboard, focus ring, reduced motion, color-not-sole-signal. *Why:* a11y regressions are silent and compounding.
20. **Always verify responsiveness:** mobile nav present, tables usable on small screens, reflow to one column. *Why:* it's a responsive-web product with no native app.
21. **Type-check and lint must pass clean.** No `any`, no non-null `!` workarounds, no floating promises. *Why:* the toolchain is a free reviewer.

## E. Document (Document)
22. **Always update documentation in the same change set** — feature doc + any token/component/standard touched. *Why:* docs are your primary context; stale docs cause future errors and waste tokens.
23. **Keep the source-of-truth boundaries:** a fact lives in exactly one document (see Documentation Hierarchy in CLAUDE.md). Reference, don't duplicate. *Why:* duplication drifts.

---

## F. The STOP Protocol (most important behavior)
**When uncertain, STOP. Do not guess. Do not invent.**

Trigger STOP when ANY of these is true:
- The feature/spec is ambiguous or missing.
- A required component, token, module, or pattern **does not exist**.
- A request would violate the ADR, Design System, a standard, or these rules.
- You cannot determine the correct `gymId`/scope or permission.
- A change would be breaking (public API, schema, contract).
- You'd need a new dependency, abstraction, or pattern.
- Two authoritative documents appear to conflict.

When you STOP:
1. **State plainly that you're stopping** and which trigger fired.
2. **Explain the uncertainty** concretely (what's missing/conflicting).
3. **Propose options** with a recommendation and rationale.
4. **Ask for approval** and wait.

*Why STOP is the highest-value rule:* a wrong guess by a fast AI produces a large, confident, wrong change that's expensive to unwind. A clarifying question costs seconds. **Over months, the discipline to stop is what prevents drift more than any other single behavior.**

---

## G. What Must NEVER Be Done (hard prohibitions)
- ❌ Write code before understanding the feature.
- ❌ A business query without `gymId`; trusting scope/role from input.
- ❌ Hardcode a color/space/font/size; build bespoke UI; bypass a token or Catalog component.
- ❌ Duplicate business logic; reach into another module's internals.
- ❌ Introduce a dependency/abstraction/pattern (or Repository/microservice/CQRS/ES/DDD-aggregate) without approval.
- ❌ Silently rename a public API; mutate a financial snapshot; use floats for money.
- ❌ Swallow errors; skip validation; skip P0 tests; skip the accessibility check.
- ❌ Leave docs stale; merge without DoD; guess when you should STOP.

---

## H. Definition of Done (for any AI-built unit)
Done = uses only existing modules/components/tokens (no literals, no bespoke patterns) · follows the mutation pipeline with correct tenancy/permissions · Zod-validated boundaries · P0 tests green · accessibility gate passed · responsive verified · observability satisfied (Engineering Observability Authority §13 — audit/business-event/correlation, no PII/bodies; a design gate until Phase 1 wires the substrate) · self-reviewed (+`advisor` if non-trivial) · docs updated in the same change · human-accepted at merge. Anything less is **not done** — say so honestly rather than claim completion.
