# CLAUDE.md — Engineering Constitution
### PULSE Gym Membership Management SaaS

> **Claude Terminal must read this file before every implementation.** It is the single, authoritative summary of how this project is built. It does not replace the detailed docs — it points to them and states the non-negotiable rules. When anything conflicts with this constitution, this constitution (and the documents it ranks) wins. **When in doubt, STOP and ask. Never guess.**

This project is built **almost entirely by Claude Terminal**. Humans own product decisions, review, testing, and acceptance. Therefore: **consistency and predictability matter more than cleverness.** The same problem is solved the same way every time.

---

## 1. Project Philosophy
- **Build for one gym, design for many.** Multi-tenant from day one; single-gym MVP. (PRD, ADR)
- **Simplicity over purity.** A simpler design that's 90% as good wins. No speculative architecture.
- **One obvious way to do each thing.** Predictable structure lets the AI pattern-match instead of invent.
- **Tenant safety and money correctness are sacred.** A leak or a mis-recorded payment is a breach, not a bug.
- **Code is read more than written** — by humans and by future-you. Optimize for readability and low context cost.

## 2. Architecture Rules (see ADR)
- **Modular monolith, feature-sliced.** Each module is a vertical slice under `modules/<feature>/`. `app/` is routing only; `lib/` is cross-cutting non-business only.
- **No microservices, CQRS, event-sourcing, DDD-aggregates, or Repository Pattern.** Prisma *is* the data layer.
- **Communicate between modules through public functions** (`queries/actions/service`), never internals. No circular deps.
- **Every feature ships as one complete vertical slice.** No half-finished horizontal layers.

## 3. Design Rules (see Design System v1.1, Tokens, Component Catalog)
- **Tokens only** — never hardcode color, spacing, font, radius, shadow, motion, z-index. All sizing rem.
- **Catalog components only** — never build bespoke UI when a catalogued component exists. If it's missing: **STOP, request it.**
- **Status via `*-text` tokens + icon + label** (never color alone). **Brand is never readable text.**
- **Mono-tabular numbers, `<time>` for dates, currency component for money, 3px accent-bar for active/selected.**
- **Focus = solid 2px ring + offset.** Honor reduced-motion and responsive reflow.

## 4. Engineering Rules (see /docs/engineering)
- **Every feature follows the same lifecycle:** Idea → Spec → Tasks → Implement → Self-Review → Test → A11y → Docs → DoD → Merge → Release. (`development-workflow.md`)
- **Every feature uses the `feature-template`** and its checklist. (`feature-template.md`)
- **Git:** feature branches, Conventional Commits, small PRs, squash-merge, SemVer. Human approves merge. (`git-workflow.md`)
- **Update docs in the same change set.** A fact lives in exactly one document.

## 5. Coding Rules (see code-style-guide.md, naming-conventions.md)
- **TypeScript `strict`. No `any`, no non-null `!` workarounds, no floating promises, `async/await` only.**
- **Functions ≤ ~30 lines, ≤3 nesting; components ≤ ~150 lines; one responsibility each.**
- **Explicit over clever. Comment the *why*, never the *what*.** No dead/commented-out code.
- **Names are predictable from purpose** and use the fixed domain vocabulary (Gym, Branch, User, GymUser, Member, MemberNote, Plan, Membership, Payment, Notification). Never coin synonyms.
- **Derive types from source** (Prisma + `z.infer`); never duplicate shapes.

## 6. Testing Rules (see testing-standards.md)
- **P0 tests are mandatory and gate "done": tenant isolation + business invariants** (money math, snapshot immutability, status transitions).
- **Every guarded action has authorization + isolation tests; every input boundary has validation tests.**
- **Test behavior, not implementation. Every bug fix adds a regression test.** No global coverage target; cover the paths that matter.

## 7. Database Rules (see database-standards.md)
- **Every business table has `gym_id` (indexed) and `branch_id`; every query filters by `gymId` from the session.**
- **Uniqueness is per-tenant. PKs are non-sequential (cuid/uuid). Audit fields on every table; timestamps UTC.**
- **Soft-delete people/financial/historical records. Snapshot plan values on memberships/payments — never mutate them. Money = integer/Decimal, never float.**
- **Prisma Migrate only, forward-only, reviewed. Never edit the DB or a shipped migration by hand.**

## 8. AI Rules (see ai-development-rules.md — the most important doc)
**Prime Directive: Understand → Reuse → Conform → Verify → Document. Code is the last step.**
- Never code before understanding the feature. Never introduce new deps/abstractions/patterns without approval.
- Always reuse modules, components, tokens, and business logic. Never duplicate logic.
- Always run self-review (+`advisor` on non-trivial work), verify accessibility and responsiveness, and update docs.
- **The mutation pipeline is always:** authenticate → authorize (**by permission**) → validate → scope (`gymId`) → execute → revalidate.
- **Authorization is permission-based, never role-based.** Check the required **permission** (e.g., `payments.record`); roles are only permission bundles. **Never** write `requireRole(...)`, `if (role === …)`, `switch(role)`, or any role-name branch (`authorization-architecture.md`). Tests assert on permissions.

## 9. Forbidden Practices (hard prohibitions)
❌ Business query without `gymId` · trusting scope/role/permission from client input · **branching on a role name (`requireRole`, `role === …`, `switch(role)`) — authorize by permission instead** · hardcoded color/space/font/size · bespoke UI over a Catalog component · duplicated business logic · reaching into another module's internals · new dependency/abstraction/pattern without approval · Repository/microservice/CQRS/ES/DDD · silently renaming a public API or **permission key** · mutating a financial/membership snapshot or any immutable history · editing money in place (void instead) · floats for money · swallowing errors · skipping validation/P0 tests/a11y · stale docs · merging without DoD · **guessing when you should STOP.**

## 10. Definition of Done
Uses only existing modules/components/tokens (no literals, no bespoke patterns) · follows the mutation pipeline with correct tenancy + permissions · Zod-validated boundaries · P0 tests green · accessibility gate passed (Design System v1.1 §7) · responsive verified · **observability satisfied per the Engineering Observability Authority §13 (MUST-audit events written transactionally, business events logged, correlation scope, no PII/bodies) — governs when the substrate is wired (Phase 1); until then it is a design gate, not a code gate** · self-reviewed (+`advisor` if non-trivial) · docs updated in the same change · human-accepted at merge. **Less than this is not done — say so honestly.**

## 11. Decision Hierarchy (whose call is it?)
1. **Human** owns: product decisions, scope, new dependencies/abstractions/patterns, breaking changes, final acceptance/merge.
2. **This constitution + the ranked docs** own: how things are built (architecture, design, standards).
3. **Claude Terminal** owns: execution within the above — implementing the slice, choosing names that fit conventions, writing tests, composing catalogued components.
> If a decision is the human's and you don't have the answer: **STOP and ask.**

## 12. Documentation Hierarchy (the order of authority — a fact lives in ONE place)
Every ranked doc below resolves to a real path. If a path is wrong, STOP and fix the map.
1. **CLAUDE.md** (this file) — `/CLAUDE.md` — the summary constitution; points to everything.
2. **PRD** — `/docs/product/gym-membership-saas-prd.md` — what we're building and why (product truth).
3. **ADR** — `/docs/architecture/gym-saas-adr-v1.md` — architecture decisions (structural truth). · **Engineering Observability Authority** — `/docs/architecture/engineering-observability-authority.md` — observability truth (audit doctrine, logging doctrine, correlation model, exception overlay, unexpected-behaviour, replay, metrics/tracing/dashboards/incident, privacy); a ratified architecture authority **subordinate to the ADR on structural conflict** (accepted 2026-07-09, ADR-030).
4. **UI/visual truth:** Design System — `/docs/design/design-system-v1.1.md` (**+ additive adaptive extension `/docs/design/design-system-v1.2.md`** — both in force; v1.2 adds the Adaptive-first layer, specified/impl-pending) · Tokens — `/docs/design/design-tokens.md` · Component Catalog — `/docs/design/pulse-component-catalog.md` (**§12 = v1.2 adaptive additions**) · token implementation — `/globals.css` (destined for `src/app/globals.css`). *Superseded, do not use: `/docs/design/design-system-v1.md`, `/docs/design/pulse-design-audit.md`.*
5. **How we build — `/docs/engineering/`:** `development-workflow.md`, `feature-template.md`, `code-style-guide.md`, `naming-conventions.md`, `git-workflow.md`, `testing-standards.md`, `api-standards.md`, `database-standards.md`, `error-handling.md`, `logging-observability.md` (**implementation spec under the Observability Authority in the architecture tier (item 3 above); owns the concrete log field schema/levels/redaction/perf-threshold only**), `security-guidelines.md`, `ai-development-rules.md`.
6. **Per-feature specs — `/docs/features/*`.**
> **Canonical homes (cite, don't restate):** the mutation pipeline + tenancy laws live in the **ADR**; visual tokens live in **design-tokens.md / globals.css**; the lifecycle lives in **development-workflow.md**; the **observability doctrine** (audit rules, correlation model, event taxonomy, metrics/tracing/dashboards/incident, retention, privacy) lives in the **Engineering Observability Authority**, while the concrete **log field schema/levels/redaction** live in **logging-observability.md**. Other docs *reference* these, never redefine them.
> Detailed docs override this summary on specifics; this summary overrides ad-hoc instructions. **Reference, never duplicate** — duplication drifts.

## 13. Conflict Resolution
- **Code vs docs →** docs win; fix the code (or, if the doc is wrong, STOP and propose a doc change — don't silently diverge).
- **Two docs conflict →** STOP, surface the conflict, ask the human; then fix the lower-authority doc per the hierarchy (§12) in the same change.
- **A request conflicts with the constitution/docs →** refuse and cite the section. A deliberate change to a rule is a versioned doc update with human approval, never an exception slipped into a feature.
- **Uncertainty anywhere →** STOP, explain, propose options + recommendation, ask. Never guess.

---

*This is the engineering constitution. It supersedes ad-hoc instruction and is superseded only by the human and the ranked documents it points to. Read it before every implementation.*
