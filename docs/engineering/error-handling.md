# Error Handling
### PULSE Gym SaaS · Engineering Governance

| | |
|---|---|
| **Status** | ✅ Authoritative |
| **References** | `api-standards.md`, `logging-observability.md`, Component Catalog (Alert/Toast/ErrorState), `code-style-guide.md` |

> **Why a single error strategy:** Errors are where systems lose data and users lose trust. One consistent model — typed errors, validated boundaries, user-safe messages, full developer context in logs — means failures are predictable, debuggable, and never silently swallowed.

---

## Error Taxonomy
| Class | Meaning | HTTP | User sees | Logged at |
|---|---|---|---|---|
| **ValidationError** | Input failed Zod | 422 | Field-level messages | `warn` |
| **AuthError** | Not authenticated | 401 | "Please sign in" | `info` |
| **AuthorizationError** | Role/tenant denied | 403 / 404* | "You don't have access" | `warn` |
| **NotFoundError** | Missing (or out-of-tenant) | 404 | "Not found" | `info` |
| **ConflictError** | Invariant violated (e.g., 2nd active membership) | 409 | Specific, actionable message | `warn` |
| **ApplicationError** | Known domain failure | 4xx | Domain message | `warn` |
| **UnexpectedError** | Bug / unhandled | 500 | Generic "Something went wrong" | `error` |

\* Cross-tenant access returns **404**, never 403 — never confirm another gym's record exists (`api-standards.md`).

## Application Errors
- **Represented as typed errors** (a small error class hierarchy or tagged result type) carrying a stable `code`, a user-safe `message`, and optional `details`. *Why:* the boundary can map them to HTTP/UI deterministically.
- **Thrown/returned from `service.ts`**, handled at the boundary (Action/Handler). *Why:* logic stays clean; one place formats responses.

## Validation Errors
- **Always from Zod at the boundary**, before logic. Return `422` with field-level `details`. *Why:* consistent, localized form feedback via Catalog `FormField`.
- **Never** hand-roll ad-hoc validation that bypasses the schema. *Why:* one source of validation truth.

## Database Errors
- **Caught and translated**, never surfaced raw. Unique-constraint → `ConflictError`; FK violation → `ConflictError`/`NotFoundError`; connection/unknown → `UnexpectedError`. *Why:* never leak SQL/schema to clients (security) and give the user a meaningful message.
- **Multi-write operations are transactional;** a failure rolls back fully (`code-style-guide.md`). *Why:* no partial financial/membership state.

## Unexpected Errors
- **Caught at the boundary and at React error boundaries** (Catalog `ErrorState`). Return generic `500`/UI error with a correlation id; **log full context** server-side. *Why:* users get a calm recovery path; engineers get everything needed to debug.
- **Never swallow an error silently** (no empty `catch {}`). *Why:* invisible failures are the most expensive (CLAUDE.md forbidden list).

## Logging Strategy (see logging-observability.md)
- **Log at the boundary where the error is handled, once** — not at every layer it passes. *Why:* avoids duplicate noise.
- **Include:** `code`, message, correlation id, `gymId`/`userId` (no secrets/PII beyond ids), and stack for `error`. *Why:* enough to reproduce, nothing sensitive.
- **Severity mapping** per the taxonomy table. *Why:* alert on `error`, not on expected `warn`.

## User-Friendly Messages
- **Actionable, calm, specific where safe:** "This member already has an active membership — renew it instead." *Why:* good errors are UX; they tell the user what to do.
- **Never expose** stack traces, SQL, internal ids, or "undefined". *Why:* security + trust.
- **Rendered via Catalog components:** inline → `Alert`/`FormField`; transient → `Toast`; full failure → `ErrorState`. *Why:* one feedback language.

## Developer Messages
- **Full technical detail goes to logs**, keyed by a correlation id shown (abbreviated) to the user. *Why:* support can trace a user's exact failure without leaking it to them.

## Recovery Strategy
- **Every error path offers a way forward:** retry (transient), fix-and-resubmit (validation), or navigate away — never a dead end (Catalog `ErrorState` requires a recovery action). *Why:* users must never be stuck.
- **Idempotency for retried mutations** (e.g., recording a payment) so a retry can't double-write. *Why:* safe retries protect financial integrity.
- **Fail safe, not open:** on uncertainty, deny the action rather than risk a wrong write. *Why:* in a financial/tenant system, a blocked action beats a corrupt one.
