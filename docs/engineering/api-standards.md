# API Standards
### PULSE Gym SaaS · Engineering Governance

| | |
|---|---|
| **Status** | ✅ Authoritative |
| **References** | ADR §12 (Server Actions vs Route Handlers), `error-handling.md`, `security-guidelines.md`, `database-standards.md` |

> **Why API standards:** A uniform request/response/error contract means every endpoint behaves the same — the AI builds them by pattern and the client handles them by pattern. Consistency here removes a whole class of integration bugs and keeps future clients (mobile, public API) cheap to add.

---

## Server Action vs Route Handler (decide first)
Per **ADR §12**:
- **Server Action** — mutation triggered by our own UI (the default for forms/buttons).
- **Route Handler (`app/api/...`)** — needs a stable HTTP contract: webhooks, external/public consumers, future mobile, or anything versioned.
- **Server Component query** — reads for rendering (no API hop).

Both Actions and Handlers follow the **same pipeline:** `authenticate → authorize → validate (Zod) → scope (gymId) → execute → revalidate/respond`. *Why:* one mutation shape everywhere.

## REST Conventions (Route Handlers)
- **Resource-oriented, noun plural:** `/api/members`, `/api/memberships`, `/api/payments`.
- **HTTP verbs carry intent:** `GET` (read, safe), `POST` (create/command), `PATCH` (partial update), `PUT` (full replace — rare), `DELETE` (archive/soft-delete).
- **Sub-resources & actions:** `/api/memberships/:id/renew` for domain commands that aren't plain CRUD. *Why:* explicit verbs for business operations beat overloading PATCH.
- **No verbs in resource URLs** except explicit command sub-paths (`/renew`, `/freeze`). *Why:* keeps REST predictable.

## Route Naming
- kebab-case, plural resources, IDs as path params: `/api/member-notes/:id`. *Why:* matches `naming-conventions.md` and is guessable.
- **Tenant is implicit** from the session — **never** put `gymId` in the URL/body as the source of scope. *Why:* tenancy comes from auth, never from the client (ADR §7).

## Request Validation
- **Every request body/params/query is parsed by a Zod schema at the boundary, before any logic.** Reject with `422` on failure. *Why:* never trust input; the schema is the contract.
- **Scope/role come from the session, not the payload.** Any `gymId`/`role` in the body is ignored. *Why:* prevents privilege/tenant escalation.

## Response Format
Consistent envelope for Route Handlers:
```
// success
{ "data": <payload>, "meta"?: { ...pagination } }
// error
{ "error": { "code": "STRING_CODE", "message": "human-readable", "details"?: [...] } }
```
- **`data` for the resource; `meta` for pagination/context.** *Why:* clients parse one shape always.
- **Server Actions** return typed results to the UI (success payload or a typed error), not raw throws. *Why:* the UI renders errors via Catalog feedback components.

## Error Format
- **Stable machine `code`** (e.g., `MEMBER_NOT_FOUND`, `MEMBERSHIP_ALREADY_ACTIVE`, `VALIDATION_FAILED`) + a **user-safe `message`** + optional field-level `details`.
- **Never leak internals** (stack traces, SQL, secrets) to clients. *Why:* security + clean UX (`error-handling.md`).

## Status Codes
| Code | Use |
|---|---|
| `200` | Successful read/update |
| `201` | Resource created |
| `204` | Success, no body (e.g., archive) |
| `400` | Malformed request |
| `401` | Not authenticated |
| `403` | Authenticated but not authorized (role/tenant) |
| `404` | Not found **or** out-of-tenant (don't reveal existence) |
| `409` | Conflict / invariant violation (e.g., second active membership) |
| `422` | Validation failed (Zod) |
| `429` | Rate limited |
| `500` | Unexpected server error |

*Why `404` for out-of-tenant:* returning `403` would confirm the record exists in another gym — a leak. Treat cross-tenant as not-found.

## Pagination
- **Cursor or page/size**, returned in `meta`: `{ page, pageSize, total }` or `{ nextCursor }`.
- **Default page size 25, max 100** (`MAX_PAGE_SIZE`). *Why:* bounded responses protect performance and tokens.
- **Always paginate list endpoints;** never return unbounded collections. *Why:* member/payment lists grow without limit.

## Filtering
- **Query params, explicitly whitelisted per endpoint** and Zod-validated: `?status=ACTIVE&branchId=...`. *Why:* arbitrary filters are an injection/perf risk.
- **Filters are tenant-scoped automatically;** a client cannot filter outside its gym.

## Sorting
- **`?sort=field&dir=asc|desc`, field whitelisted.** Single-field sort for MVP. *Why:* predictable, index-friendly.

## Versioning
- **MVP is unversioned internal Server Actions.** When a **public/external** Route Handler is exposed, prefix `/api/v1/...`. *Why:* don't add version ceremony before there's an external consumer; introduce it exactly when a contract becomes public.
- **Breaking an existing public contract requires a new version**, never a silent change.

## Authentication
- **Auth.js session required** for all non-public endpoints; unauthenticated → `401`. *Why:* no anonymous access to business data (`security-guidelines.md`).

## Authorization
- **Role + tenancy checked server-side on every mutating endpoint**, in this order: authenticated? → in this gym/branch? → role permitted? Failures: `401` / `404` (tenant) / `403` (role). *Why:* defense by default; UI gating is UX only, never security (ADR §8).
