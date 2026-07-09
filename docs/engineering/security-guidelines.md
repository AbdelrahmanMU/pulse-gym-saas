# Security Guidelines
### PULSE Gym SaaS · Engineering Governance

| | |
|---|---|
| **Status** | ✅ Authoritative |
| **References** | ADR §7–8 (tenancy/authz), `api-standards.md`, `database-standards.md`, `error-handling.md` |
| **Observability note** | This doc + `logging-observability.md` **own** the secrets/PII-in-logs and redaction rules. The PII *doctrine* for telemetry — the sensitive-field inventory, the erasure-vs-immutable-audit resolution (OBS-10), and the compliance posture — lives in the **[Engineering Observability Authority §14](../architecture/engineering-observability-authority.md)**, which references/extends these rules, never redefines them. |

> **Why security is non-negotiable:** This system holds members' personal data and the gym's revenue across multiple tenants. A single isolation or auth flaw is not a bug — it's a breach. These rules make the safe path the default path so the AI builds securely by pattern, not by remembering.

---

## Authentication
- **Auth.js / NextAuth only — never roll our own auth or crypto** (ADR). *Why:* auth is easy to get subtly, catastrophically wrong.
- **All non-public routes require a valid session;** unauthenticated → `401`/redirect. Enforced at the layout/boundary, not just the UI. *Why:* no anonymous access to business data.
- **Sessions expire** and are invalidated on logout; short-lived on shared front-desk machines. *Why:* shared terminals are a real threat model here.

## Authorization
- **Two checks, server-side, every mutating action, in order:** authenticated? → **in this gym/branch (tenancy)?** → **role permitted (OWNER/TRAINER)?** (ADR §8). Failures: `401` / `404` (tenant) / `403` (role). *Why:* tenancy and role are distinct gates; both must pass.
- **Tenancy from the session, never the request.** Any `gymId`/`role` in input is ignored. *Why:* prevents tenant/privilege escalation (the top SaaS risk).
- **UI gating is UX only;** the server re-checks every time. *Why:* hidden buttons aren't security.

## Password Rules
- **Hashed with a strong adaptive algorithm** (bcrypt/argon2) — never stored or logged in plaintext. *Why:* basic credential hygiene.
- **Minimum strength enforced** (length + basic checks); **rate-limit auth attempts**; generic failure messages ("invalid credentials"). *Why:* resist brute-force and user enumeration.
- **No password, token, or secret is ever logged** (`logging-observability.md`).

## Secrets
- **All secrets in environment variables**, never in code, repo, or client bundle. *Why:* committed secrets are a permanent leak.
- **Server-only secrets never cross to the client;** only `NEXT_PUBLIC_*` is exposed, and only if truly public. *Why:* the client bundle is public.
- **Rotate on suspicion;** keep a documented secret inventory. *Why:* fast containment.

## Environment Variables
- **Validated at startup** (a Zod-checked env module); the app refuses to boot if required vars are missing/malformed. *Why:* fail fast, not at the first request.
- **`.env` is git-ignored;** a committed `.env.example` documents required keys (no values). *Why:* reproducible setup without leaking.

## Input Validation
- **Every external input validated with Zod at the boundary** before use (`api-standards.md`). *Why:* untrusted input is the root of most vulnerabilities.
- **Parameterized queries only** (Prisma) — never string-built SQL. *Why:* eliminates SQL injection.
- **Whitelist filters/sorts/fields;** reject unknown keys. *Why:* prevents mass-assignment and injection.

## Output Encoding
- **React escapes by default — keep it that way;** avoid `dangerouslySetInnerHTML`. If unavoidable, sanitize rigorously. *Why:* prevents XSS.
- **Never reflect raw user input into responses, logs, or HTML** unencoded. *Why:* XSS/log-injection.
- **API responses never include internals** (stacks, SQL, secrets) (`error-handling.md`).

## Rate Limiting
- **Auth endpoints and sensitive/expensive actions are rate-limited** (per IP + per account); exceed → `429`. *Why:* throttles brute-force, scraping, abuse.
- **Pagination caps** (`MAX_PAGE_SIZE`) bound read cost. *Why:* prevents resource-exhaustion via huge queries.

## File Upload Rules
*(If/when uploads exist — e.g., member photos.)*
- **Whitelist type + cap size; validate content, not just extension;** store outside the web root / in object storage with non-guessable keys; never execute uploads. *Why:* uploads are a classic RCE/abuse vector.
- **Scope uploaded assets by `gymId`** and authorize access. *Why:* tenant isolation extends to files.

## Future Security Roadmap (add when justified)
1. **Postgres Row-Level Security** as defense-in-depth on tenancy (ADR §7 notes this as Phase-2 hardening).
2. **MFA** for owner accounts; **audit-log UI** for sensitive actions.
3. **Automated dependency/secret scanning** in CI; periodic security review (`/security-review`).
4. **Field-level encryption** for the most sensitive PII if requirements demand.
5. **WAF / bot protection** and stricter rate-limiting at the edge as traffic grows.

*Why staged:* ship the non-negotiables (authn, authz, tenancy, validation, secrets) now; layer hardening as the product and threat surface grow — without security theater that slows MVP delivery.
