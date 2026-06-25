# Code Style Guide
### PULSE Gym SaaS · Engineering Governance

| | |
|---|---|
| **Status** | ✅ Authoritative |
| **References** | ADR (§10–13 standards), `naming-conventions.md`, Design System v1.1, Component Catalog |

> **Why these standards:** Consistent, explicit, boring code is what lets an AI build for months without drift and lets a human review quickly. Every rule below optimizes for **readability first** — code is read far more than written, and for an AI, readable code is also cheaper context (fewer tokens to understand a file). Cleverness is a cost, not a virtue.

---

## Readability
- **Code reads top-to-bottom like prose.** Most important/most general first; helpers below.
- **Match the surrounding file** — its naming, idioms, comment density. Consistency > personal preference. *Why:* a uniform codebase is pattern-matchable by the AI.
- **Explicit over implicit.** No clever one-liners that hide control flow; no magic. *Why:* explicit code is reviewable and debuggable; the audit of "what does this do" should never be required.

## Function Size
- **Target ≤ 30 lines; hard ceiling ~50.** One function = one responsibility its name describes. *Why:* small functions are testable, nameable, and fit in a glance.
- **≤ 3 levels of nesting.** Prefer early returns / guard clauses over deep `if` trees. *Why:* flat code is easier to follow than nested.
- **≤ ~4 parameters;** beyond that pass a typed object. *Why:* positional args are error-prone and unreadable at call sites.

## Component Size (React)
- **One component per file;** target ≤ ~150 lines. Split when it grows. *Why:* keeps the feature slice navigable.
- **Server Components by default;** `"use client"` only at interactive leaves (ADR §12). *Why:* less client JS, simpler data flow.
- **Components compose Catalog components + tokens only** — never bespoke UI, never literals. *Why:* Component Catalog governance; one design language.

## Service / Logic Size
- **Business logic lives in a feature's `service.ts`/`actions.ts`/`queries.ts` only when non-trivial;** trivial CRUD calls Prisma directly (ADR — no blanket service layer). *Why:* avoid ceremony; add a layer only when it earns its keep.
- **A service function does one business operation,** is pure where possible, and is unit-testable. *Why:* invariants are tested at this layer.

## Comments
- **Comment the *why*, never the *what*.** The code says what; comments justify non-obvious decisions, trade-offs, or business reasons. *Why:* "what" comments rot and add noise.
- **No commented-out code, no `TODO` left dangling** without a tracked task. *Why:* dead code misleads future readers (and the AI).
- **Public/service functions get a one-line doc** when intent isn't obvious from the signature.

## Imports
- **Order:** external libs → internal modules (`@/modules/...`) → relative (`./...`) → types. Blank line between groups. *Why:* predictable, diff-friendly.
- **Absolute imports** via the configured alias for cross-module; relative only within a slice. *Why:* clarifies module boundaries (ADR).
- **No deep imports into another module's internals** — import its public `queries/actions/service` only. *Why:* enforces module boundaries.
- **No unused imports;** no wildcard barrel files that obscure origin.

## Formatting
- **Prettier + ESLint are authoritative;** never hand-format against them. *Why:* zero style debates, deterministic diffs.
- **TypeScript `strict: true`.** Lint must pass clean before self-review. *Why:* the type checker is a free reviewer.

## Dependency Injection
- **Constructor/DI frameworks are NOT used.** Dependencies are passed as function arguments or imported singletons (`lib/prisma.ts`, `lib/auth.ts`). *Why:* the ADR rejects unnecessary abstraction; explicit imports are clearer for an AI than an IoC container.
- **The Prisma client is a single shared singleton;** never instantiate `new PrismaClient()` elsewhere. *Why:* connection safety (ADR §11).

## Async Rules
- **`async/await` only;** no raw `.then()` chains. *Why:* readability.
- **Always handle rejections;** never leave a floating promise. Errors propagate to the boundary handler (`error-handling.md`). *Why:* silent failures are the worst failures.
- **Multi-write invariants use `prisma.$transaction`.** *Why:* partial writes corrupt financial/membership state.
- **No `await` inside loops** when operations are independent — batch with `Promise.all`. *Why:* avoid accidental N+1 / serial latency.

## TypeScript Best Practices
- **No `any`** — use `unknown` + narrowing. **No non-null `!`** to silence the compiler — fix the type. *Why:* defeating the type system reintroduces the bugs it prevents.
- **Derive types from source** — Prisma models + `z.infer` from Zod. Don't hand-duplicate shapes. *Why:* one source of truth; types can't drift.
- **Prefer `type` for unions/shapes;** `interface` for extensible object contracts (see `naming-conventions.md`).
- **Exhaustive `switch`** on enums/unions with a `never` default. *Why:* compile-time completeness.

## Next.js Best Practices
- **Follow ADR §12 verbatim:** Server Components default; `app/` is routing only; mutations = Server Actions following the pipeline; Route Handlers only for stable/external contracts; `revalidatePath/Tag` after mutations; never import server-only modules into client components. *Why:* one canonical data-flow the AI repeats every time.

## Prisma Best Practices
- **Follow ADR §11 verbatim:** single schema, single client, no Repository Pattern, **`gymId` in every business `where`**, deliberate `select/include`, transactions for invariants, migrations via Prisma Migrate only. *Why:* tenancy safety + predictable data layer.

## Zod Best Practices
- **One schema per input boundary;** infer the TS type from it (`z.infer`). *Why:* validation and type are the same source.
- **Validate at the edge** (Server Action / Route Handler entry), before any logic. *Why:* never trust client input (incl. `gymId`/role — those come from session, never the body).
- **Reuse shared field schemas** (email, phone, money) from the feature/`lib`; don't redefine per call. *Why:* consistent rules and messages.
- **Coerce/transform explicitly;** clear, user-safe error messages.

## Forbidden Patterns
- ❌ Hardcoded colors, spacing, fonts, sizes — **tokens only** (Design System v1.1).
- ❌ Bespoke UI when a Catalog component exists.
- ❌ A business query without `gymId`; trusting `gymId`/role from request input.
- ❌ `any`, non-null `!` as a workaround, floating promises, `.then()` chains.
- ❌ New dependency, abstraction, service layer, or Repository Pattern without human approval.
- ❌ Microservices/CQRS/event-sourcing/DDD-aggregates (ADR-rejected).
- ❌ Floats for money; dates without timezone handling; mutating historical snapshots.
- ❌ Business logic in `app/` or `lib/`; deep imports into another module's internals.
- ❌ Duplicated business logic — extract/reuse instead.
- ❌ Skipping the type checker or linter.
