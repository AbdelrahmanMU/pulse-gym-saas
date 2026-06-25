# Logging & Observability
### PULSE Gym SaaS · Engineering Governance

| | |
|---|---|
| **Status** | ✅ Authoritative |
| **References** | `error-handling.md`, `security-guidelines.md`, ADR (deployment) |

> **Why observability from day one:** When the AI builds and the human reviews, production behavior is the ground truth neither sees directly. Structured logs + a few key signals are the cheapest way to know the system is healthy, diagnose issues fast, and audit sensitive actions — without building a heavy platform before it's needed.

---

## Logging Levels
| Level | Use | Example |
|---|---|---|
| `error` | A failure needing attention; unexpected | Unhandled exception, failed transaction |
| `warn` | Expected-but-notable; handled domain failure | Validation/conflict/authz denied |
| `info` | Significant business events | Membership created, payment recorded, login |
| `debug` | Developer diagnostics (non-prod by default) | Query shape, branch decisions |

- **Production logs `info` and above;** `debug` is opt-in. *Why:* signal over noise; cost control.
- **Map error classes to levels** per `error-handling.md`. *Why:* alerts fire on `error`, not on routine `warn`.

## Structured Logging
- **JSON logs, one event per line**, with standard fields: `timestamp, level, message, code, correlationId, gymId, branchId, userId, module, durationMs?`. *Why:* machine-queryable; ready for any log aggregator later.
- **A correlation id** is generated per request and threaded through the operation (and shown, abbreviated, to users on errors). *Why:* trace one user's action end-to-end.
- **Never log secrets or sensitive PII** — no passwords, tokens, full payment data, raw request bodies. Log **ids, not bodies.** *Why:* logs are a breach vector; minimize sensitive data (`security-guidelines.md`).
- **One log per handled error, at the boundary.** *Why:* avoid duplicate stack spam.
- **A single logger utility** in `lib/` — no scattered `console.log`. *Why:* consistent format; `console.log` is forbidden in committed code.

## Performance Logging
- **Time and log slow operations:** requests/actions over a threshold (e.g., >500ms) and notably slow DB queries, with `durationMs` + `module`. *Why:* catch N+1/regressions before users feel them.
- **Tag the heavy read paths** (dashboard aggregations, large lists) for review. *Why:* these are the first to degrade as data grows.

## Audit Logging
- **Sensitive/business-critical actions emit an audit event** with the `domain.action` name (`membership.renewed`, `payment.recorded`, `member.archived`, `auth.login`), actor, target id, gym/branch, and timestamp. *Why:* gyms handle money and personal data — who-did-what is a support, trust, and compliance need.
- **Audit events are append-only and tenant-scoped.** Consider persisting key ones (not just logging) when an in-app audit trail is needed. *Why:* immutable history is the point.
- **Never** put audit logic in the UI; emit from the server action that performs the change. *Why:* the UI can be bypassed.

## Monitoring (MVP-appropriate)
- **Track the vital signs:** error rate, request latency (p95), DB health/connections, and a basic uptime check. *Why:* these catch the majority of incidents cheaply.
- **Alert on `error`-level spikes and latency regressions**, not on routine `warn`. *Why:* alert fatigue makes alerts useless.
- **Health endpoint** for the container/orchestrator. *Why:* lets the deploy verify liveness.

## Future Observability Strategy (roadmap, not MVP)
Introduce **only when scale or a real incident justifies it** (avoid premature platform-building):
1. **Centralized log aggregation** (the JSON format is already compatible).
2. **Metrics + dashboards** (request/business KPIs) and on-call alerting.
3. **Distributed tracing** (OpenTelemetry) once flows span more services/jobs.
4. **Error tracking** (e.g., Sentry) for grouped exceptions with the existing correlation id.
5. **Per-tenant usage analytics** as multi-gym SaaS matures.

*Why staged:* the structured-logging foundation makes each step additive; building it all now would be cost without payoff (consistent with the ADR's "add abstraction when a second real need appears").
