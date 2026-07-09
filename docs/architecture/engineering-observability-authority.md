# Engineering Observability Authority

### PULSE Gym Membership Management SaaS

| | |
|---|---|
| **Status** | 📐 **PROPOSED AUTHORITY — awaiting human ratification** (see §16 Governance). Design-only; no code, tables, or libraries introduced by this document. |
| **Tier** | Architecture-level authority (`/docs/architecture/`). On observability it is the **parent** of the engineering-level implementation specs it cites (`logging-observability.md`, `error-handling.md`). It is **subordinate to the ADR** on any structural conflict (§12 of the constitution). |
| **Owns** | The *philosophy, taxonomy, correlation model, audit doctrine, exception overlay, unexpected-behaviour doctrine, replay method, metrics/tracing/dashboard/incident principles, developer gates, privacy doctrine, and roadmap* for making PULSE observable. |
| **Does NOT own (cites instead)** | The concrete log field list, level table, and redaction paths (`logging-observability.md`); the error class taxonomy and result shape (`error-handling.md`); the `audit_logs` table shape and audit fields (`database-standards.md` / DDS §2.17 / INV-39); the `domain.action` naming grammar (`naming-conventions.md`); the mutation pipeline + tenancy laws (ADR §7, §12, §15). **A fact lives in one place; this document references, never restates, those facts.** |
| **Horizon** | Designed to govern every PULSE feature for **at least five years**, across single-gym pilot → multi-tenant → future background workers, external integrations, and AI agents. |

> **How to read this document.** Every normative rule is a numbered **law (OBS-n)** — cite them like the ADR's `ADR-nnn` and the domain's `INV-nn`. Each substantive section separates **PRINCIPLE** (permanent), **CURRENT STATE** (what the repo actually does today — honest, and mostly *unwired*), and **ROADMAP** (deferred, dependency-gated). Heavy sections end with **⚖ Rejected alternatives** because a decision without its discarded options is an assertion, not an authority.

---

## §0. Current-State reckoning (read this before believing the rest)

This authority governs a foundation that is **specified and partially coded, but almost entirely inert.** Stating that honestly is what keeps a permanent document from lying to next year's reader.

| Capability | Substrate that exists | Actually wired? |
|---|---|---|
| Structured logging | `lib/logger.ts` (Pino, canonical fields, redaction) | ✅ works, but only **9 call sites, all in infra/auth** (boundary sink, health, sign-in, principal). **Zero** domain-module business-event logs. |
| Per-request correlation + tenant scope | `lib/request-context.ts` (AsyncLocalStorage: `correlationId, gymId, branchId, userId`) | ❌ **never populated.** `runWithRequestContext` has **0 call sites**; `newCorrelationId` is never called. Every log line today carries **no** correlationId/tenant unless passed inline. |
| Boundary error capture | `instrumentation.ts` `onRequestError` (+ Next `error.digest`) | ✅ works. |
| Durable audit trail | `audit_logs` table (DDS §2.17, **INV-39**: append-only; carries `action, actorUserId, targetType/targetId, correlationId, metadata`) | ❌ **zero application writes.** The table is schema-ready and referenced by tests only. |
| Health probe | `/api/health` (liveness + DB readiness) | ✅ works. |
| Metrics / tracing / dashboards / alerting | — | ❌ none. Named as staged roadmap in `logging-observability.md §Future Observability`. |

**The single highest-leverage gap** is that the correlation spine (`correlationId`) is designed into *both* the log context *and* the `audit_logs` table — the two were built to be joined — yet neither is populated. **Phase 1 of the roadmap (§15) wires exactly this.** Until then, treat the laws below as the contract the wiring must satisfy, not a description of a working system.

---

## The Prime Laws (summary — normative bodies follow in-section)

- **OBS-1 — One family per event.** Every event belongs to *exactly one* of the eight families (§2). Families partition; they never overlap. Disambiguation is by *primary engineering intent* (§2.3).
- **OBS-2 — Money-safe consistency split.** For the **MUST-audit** set (§3.1), the `audit_logs` write happens **inside the same Prisma transaction** as the business mutation — a recorded payment and its audit fact commit together or not at all. Every other plane (diagnostic logs, metrics, traces) is **best-effort, fire-and-forget, off the mutation hot path**; its failure must never fail or measurably slow a business operation.
- **OBS-3 — The correlation spine.** `correlationId` is present on every event on every plane, and every business event is tenant-scoped by `gymId`. No spine, no event.
- **OBS-4 — Ids, not bodies.** Log and audit *identifiers and non-sensitive context*, never record bodies, free text, secrets, or PII values (extends `logging-observability.md`; see §14). `MemberNote.body` and `Member.notesSummary` never leave the domain row.
- **OBS-5 — Observe from the server, at the source.** Events are emitted by the server action/service performing the change, never by the UI (mirrors `logging-observability.md §Audit Logging`).
- **OBS-6 — Emit in-app, detect in the drain.** The application *emits richly-tagged signals*; anomaly/threshold *detection* lives in the query/drain/alerting layer. No in-app real-time detection loops; no dependency on a scheduler PULSE does not have (TD-8).
- **OBS-7 — Audit is append-only.** Audit facts are never updated or deleted; a correction is a new compensating event (mirrors the ledger's void-not-edit, ADR-008).
- **OBS-8 — No new distribution machinery.** Nothing in observability may reintroduce an event bus, message queue, or event-sourcing (ADR-017). Replay is a correlation-join over immutable domain state (§8), not a rebuild from an event stream.
- **OBS-9 — Event names are a public contract.** Every business/audit event name is `domain.action`, lowercase-dotted, past tense, `domain` drawn from the fixed vocabulary (`naming-conventions.md`). Renaming a persisted event name is a breaking change requiring approval.
- **OBS-10 — Erasure and immutability coexist.** PII is erased/anonymized in the (mutable, erasable) domain row; the immutable audit fact survives, referencing only a stable non-PII id (§14.4).
- **OBS-11 — Fail safe, and say so.** On uncertainty the system denies (per `security-guidelines.md`) *and* emits the denial as an event; errors are never swallowed silently (`error-handling.md`).
- **OBS-12 — Observability is Definition-of-Done.** A feature that does not satisfy the developer gates (§13) is not done. This is enforceable as a future architecture-fitness rule.

---

## §1. Observability Philosophy

### 1.1 Why observability exists (PRINCIPLE)
PULSE holds two sacred things — **tenant isolation** and **money correctness** (constitution §1). Observability exists so that, for any moment in the system's life, an engineer can answer the twelve questions the mission demands — *what happened, why, who, which tenant, which member, which request, which action, which release, how long, did it fail, can we reproduce it, can we replay it* — **without guessing, and without access to the customer's screen.** In a product built almost entirely by AI, observability is also how humans retain the ability to *audit the machine's work* after the fact.

### 1.2 Engineering principles (PRINCIPLE)
1. **Truth over telemetry.** The immutable domain (ledger, snapshots, soft-deletes, `created_by`/`recorded_by`) is the *first and most trustworthy* observability source. Logs and metrics *surround* that truth with who/when/why/how-long; they never become the system of record for money or membership state.
2. **The spine before the signal.** Correlation (OBS-3) is worth more than volume. One correlated line beats a hundred orphaned ones.
3. **Cheap by default, rich on demand.** Steady-state emission is near-free; depth (debug, full traces, payload-adjacent context) is opt-in and bounded, never on the ~450ms mutation hot path (perf matched-set, ADR-029).
4. **Emit at the source, decide downstream** (OBS-6). The app is a good *witness* and a poor *detective*; keep detection out of tenant-critical request paths.
5. **Every event is attributable and scoped** (OBS-3, OBS-5). Anonymous or cross-tenant-ambiguous events are defects.
6. **Observability is designed, not sprinkled.** It is a first-class part of each vertical slice, gated at review (OBS-12), not retrofitted after an incident.

### 1.3 Non-goals (PRINCIPLE — these fence future implementers, incl. AI)
This authority **explicitly does not**, now or as a consequence of any law here:
- introduce **event-sourcing, an event bus, or a message queue** (ADR-017) — "events" here are *observations and audit facts*, not a distribution mechanism;
- assume or require a **cron/scheduler/background worker** — none exists (TD-8); detection and aggregation are drain-side (OBS-6);
- add **per-request APM/tracing overhead** that breaches the mutation performance budget (ADR-029);
- add **external alerting/notification channels** — the product is in-app-only (ADR-010); operational escalation channels are a roadmap dependency (§15), not implied capability;
- pursue **real-time in-app anomaly/ML detection**, vanity dashboards, or "log everything" volume for its own sake;
- introduce any **new dependency, library, or abstraction** — that is a human decision (ADR §15.4). Everything below is achievable first with primitives already in the repo.

### 1.4 Success definition (PRINCIPLE)
Observability is succeeding when:
- **MTTD / MTTR fall** — mean time to *detect* and to *resolve* an incident, measured per incident (§12).
- **The twelve questions are answerable from durable evidence** for any past operation, within the retention window (§14.5), *without reproducing it live*.
- **No money or membership incident is ever "unexplainable."** Because the domain is immutable, financial truth is always reconstructable (§8); an unexplainable money event would mean the audit/correlation contract was violated — itself a SEV incident.
- **Observability never appears in an incident's root cause** — i.e., a logging/metric/trace failure never caused or worsened a customer-facing outage (OBS-2).

---

## §2. Event Taxonomy

### 2.1 Two orthogonal axes (PRINCIPLE)
An event has an **identity** (its *family* — what kind of thing happened) and one or more **destinations** (its *planes* — where it is recorded). These axes are independent: `payment.recorded` is family **Business** and is simultaneously routed to the **audit**, **diagnostic**, and **metric** planes. Confusing the two is the classic taxonomy failure; this authority keeps them separate.

**The four planes (destinations):**
| Plane | Store character | Consistency (OBS-2) | Retention character |
|---|---|---|---|
| **Audit** | durable, append-only, tamper-evident, tenant-scoped (`audit_logs`) | **transactional** for MUST-audit | longest (§14.5) |
| **Diagnostic** | high-volume structured logs (Pino→stdout→drain) | best-effort | short/medium, sample-able |
| **Metric** | numeric aggregates over time | best-effort | medium (rolled up) |
| **Trace** | causal spans across a request/operation | best-effort, sampled | short |

### 2.2 The eight families (PRINCIPLE) — OBS-1: exactly one per event
Families **partition** all events; every event belongs to exactly one. `domain` segment is drawn from the fixed vocabulary (OBS-9).

| # | Family | Definition — "an event that…" | Canonical PULSE examples | Default planes |
|---|---|---|---|---|
| 1 | **Business** | records a deliberate, successful domain state change with money/membership meaning | `payment.recorded`, `membership.renewed`, `member.created`, `plan.archived` | audit + diagnostic + metric |
| 2 | **Lifecycle** | records a *derived* or time-driven state transition, not a direct user command | `membership.expired`, `membership.frozen`, `notification.generated` | audit (if state-bearing) + diagnostic + metric |
| 3 | **Security** | concerns authentication, authorization, tenancy, or trust — success *or* denial | `auth.login`, `auth.signin.invalid`, `authz.denied`, `tenant.scope_violation` | audit + diagnostic + metric |
| 4 | **System** | records the application's own internal behavior/health outside a single business intent | `request.error`, `slow.operation`, `job.completed` (future) | diagnostic + metric (+ trace) |
| 5 | **Infrastructure** | concerns the runtime/platform beneath the app | `health.db_unreachable`, `startup.env_invalid`, container/deploy signals | diagnostic + metric |
| 6 | **Integration** | concerns a boundary with an external system (future: SMS, payment gateway, email) | `integration.<provider>.called/failed/timed_out` | diagnostic + metric + trace (+ audit if money-affecting) |
| 7 | **Unexpected-Behaviour** | a *concern signal that is not an exception* — something engineering-worthy but not a thrown error (§7) | `concern.repeated_login_failure`, `concern.duplicate_operation`, `concern.impossible_sequence` | diagnostic + metric (+ security audit if trust-relevant) |
| 8 | **Customer-Experience** | records how the product *felt* to the user — latency, friction, abandonment, client-perceived failure | `cx.slow_page`, `cx.action_retried`, `cx.form_abandoned` (future, client-origin) | diagnostic + metric |

### 2.3 Disambiguation rule (PRINCIPLE) — resolving OBS-1 at the boundary
Because real events straddle families, the rule is: **assign by primary engineering intent — the question the event most exists to answer — with this precedence when genuinely ambiguous: Security ▸ Unexpected-Behaviour ▸ Business/Lifecycle ▸ System ▸ everything else.** A trust concern about a business action is *Security*, not *Business*. Worked adjudications (these belong in the doc precisely because they are hard):

- **A suspicious burst of payments by one user.** Each `payment.recorded` is **Business** (it *is* a real, audited money fact). The *pattern* is a separate emitted **Unexpected-Behaviour**/**Security** signal `concern.suspicious_payment_rate` — a distinct event, not a re-labelling of the payments. → *Two events, two families; never overload one.*
- **A payment rejected by the Zod boundary (bad amount).** This is a validation **Exception** surfaced to the user, family **Business** if you emit an observation of the *attempt* — but note: a *rejected* attempt is not a state change, so by default it is a diagnostic `warn` under family **Business** with no audit row (nothing changed). → *Audit records what changed, not what was refused.*
- **Cross-tenant read that 404s (OBS: `tenant.scope_violation`).** Always **Security** (precedence), never NotFound-flavored System — a tenancy breach attempt is the highest-intent reading.
- **A membership auto-expires overnight.** **Lifecycle** (derived, time-driven), audited because it bears state. Contrast a user clicking "cancel" → **Business**.

### 2.4 CURRENT STATE
The only families with *any* live emission are **Security** (auth logs) and **System** (boundary error, health). Business, Lifecycle, Integration, Unexpected-Behaviour, and Customer-Experience families emit **nothing** today.

### 2.5 ⚖ Rejected alternatives
- **Severity-as-taxonomy** (organize events by info/warn/error). Rejected: severity is a *property* of an event, not its identity; the same family spans severities (a `payment.recorded` info and a `payment.record_failed` error are both Business).
- **Plane-as-taxonomy** (call things "log events" vs "audit events" vs "metrics"). Rejected: it forces a fact to be re-modelled per destination and breaks the single-identity requirement (OBS-1). Family is identity; plane is routing.
- **Free-form event names.** Rejected by OBS-9 — un-greppable, un-contractable, and impossible to build fitness tests or dashboards on.

---

## §3. Audit Authority

### 3.1 What MUST always be audited (PRINCIPLE)
The audit plane answers *who did what to money, membership, people, and access* — durably, for years, tamper-evident. **The MUST-audit set** is any mutation that:
1. **moves or reclassifies money** — `payment.recorded`, `payment.voided`;
2. **changes membership state or terms** — `membership.created/renewed/upgraded/downgraded/cancelled/frozen/resumed`;
3. **changes a person's record or access** — `member.created/updated/archived/restored`, `membernote.created/edited/archived`, `gymuser.invited/role_changed/suspended/reactivated`, `trainer.assigned/unassigned`;
4. **authenticates or authorizes at a trust boundary** — `auth.login`, `auth.logout`, `authz.denied`, `tenant.scope_violation`, owner-only setting changes (`gym.settings_updated`, currency/timezone);
5. **exercises an administrative or destructive capability** — any soft-delete/restore, any `AUTH_SECRET`-class operational action performed through the app.

Every MUST-audit event writes one `audit_logs` row using the **existing** shape (cite DDS §2.17 / INV-39; do not restate the columns here): `{ action:<domain.action>, actorUserId (null = system actor), targetType, targetId, gymId, branchId?, occurredAt, correlationId, metadata }`.

### 3.2 What MUST never be audited (PRINCIPLE)
- **Never a body or PII value** (OBS-4). `metadata` is "ids, not bodies" — the affected `targetId`, prior/next *enum* state, integer amounts *by reference to the ledger row*, never `MemberNote.body`, `notesSummary`, names, phones, emails, card data, or free text.
- **Never a read.** Views/queries are not audited by default (they are not state changes and would bury signal). *Sensitive reads* (e.g., exporting a member list) may be audited as a deliberate **Security** event when that capability exists — a roadmap decision, not a default.
- **Never from the UI** (OBS-5) — only the server action performing the change.
- **Never a secret, token, or credential**, even redacted-in-shape.

### 3.3 Immutability & actor attribution (PRINCIPLE)
- **OBS-7**: `audit_logs` has no `updated_at`; rows are write-once. A correction is a *new* compensating event referencing the original `targetId`/`correlationId` — never an edit (mirrors void-not-edit, ADR-008). *DB-level enforcement* (revoke `UPDATE`/`DELETE`, or a trigger) is a roadmap hardening item (§15 Phase 4), flagged because today immutability is a discipline, not a constraint.
- **Actor attribution** is mandatory and precise: `actorUserId` is the authenticated principal (`AuthenticatedPrincipal.userId`); **system-initiated** events (lifecycle transitions, future jobs) use the seeded **system actor** with `actorUserId = null` *and* an explicit `metadata.actor = "system"` marker so "null" is never ambiguous between *unknown* and *system*. Impersonation/support-access (future) must record both the acting human and the impersonated principal.

### 3.4 Retention philosophy (PRINCIPLE; numbers ROADMAP)
Audit is the **longest-lived** plane. Financial audit facts have statutory retention (Egypt PDPL / commercial record-keeping — §14.5); membership/access audit is retained for the tenant relationship plus a tail. **This authority commits to the *tiering*, not to specific durations** — the exact financial-retention period is **legal-confirmation-required** (§14.5), not asserted here. Audit is **never sampled** and **never dropped** for volume (unlike diagnostics).

### 3.5 CURRENT STATE
`audit_logs` exists and is join-ready (`correlationId`), but **no code writes to it.** Phase 1 (§15) implements the MUST-audit writes, transactionally (OBS-2).

### 3.6 ⚖ Rejected alternatives
- **Audit derived from diagnostic logs** ("just grep the logs"). **Rejected, firmly.** Logs are best-effort, sample-able, short-retention, and mutable-in-transit — they are evidence, not a tamper-evident record. Money facts demand a store with transactional and immutability guarantees the log stream cannot give.
- **Audit as full before/after row snapshots.** Rejected: PII/write amplification and an erasure headache (§14.4). Audit records *the fact and its references*; the domain already snapshots the *values* immutably where it matters (payments, memberships).
- **A second event-sourced audit stream feeding projections.** Rejected by OBS-8/ADR-017. The `audit_logs` append-only table is sufficient and does not make audit the source of truth for state.
- **Auditing reads by default.** Rejected: signal-to-noise collapse and privacy exposure; sensitive-read auditing is opt-in per capability.

---

## §4. Structured Logging Authority

> **Ownership note.** The **canonical log field schema, the severity/level table, and the redaction path list are owned by `logging-observability.md`** and mirrored in `lib/logger.ts`. This authority **cites** them and governs only the cross-cutting laws + the genuinely unowned gaps (sampling, retention, correlation obligation, PII extension). It does **not** restate the field list.

### 4.1 Canonical schema & severity (CITE)
Use the existing canonical fields `{ timestamp, level, message, code, correlationId, gymId, branchId, userId, module, durationMs? }` and the existing level semantics (`error`/`warn`/`info`/`debug`) exactly as defined in `logging-observability.md`; error classes map to levels per `error-handling.md`. **Do not invent parallel fields.** New cross-cutting fields this authority *requires the schema to grow* (a governance edit, §16): `family` (§2), `eventName` (the `domain.action`, distinct from the human `message`), `traceId`/`actionId` when present (§5), and `releaseId` (§4.6). These are additive and must be ratified into `logging-observability.md`.

### 4.2 Correlation requirement (PRINCIPLE) — OBS-3
Every log line MUST carry `correlationId` and, for any request touching a tenant, `gymId`. This is satisfied by threading the request-context ALS (§5.4), not by asking each caller to pass ids. **A log line with no correlationId is a defect** once Phase 1 lands.

### 4.3 PII & redaction (CITE + EXTEND) — OBS-4
Redaction paths and "log ids, not bodies" are owned by `logging-observability.md`/`lib/logger.ts`. This authority **extends** them with PULSE-specific sensitive fields that must never be logged *by value* under any key: `Member.fullName/phone/email/dateOfBirth/gender/notesSummary`, `MemberNote.body/category`, `Payment.reference/note/voidReason` free text, and `User.email/phone/displayName` beyond the id. Reference members/users/payments **by id**; never their attributes (§14).

### 4.4 Sampling (PRINCIPLE — this authority owns it; genuine gap)
- **Never sample:** audit (§3), Security-family events, and `error`-level events. These are low-volume and high-value; losing one loses an incident.
- **May sample (drain-side, tail-based preferred):** high-volume `info`/`debug` diagnostics and traces on hot read paths, **only** above a volume threshold, and **only** in a way that preserves *all* events sharing a `correlationId` with an error (keep the whole failing journey). Sampling is a **drain/collector policy, not app logic** (OBS-6) — the app emits; the collector thins.

### 4.5 Retention (PRINCIPLE; numbers ROADMAP)
Tiered, longest-to-shortest: **audit ≫ security ≫ error diagnostics ≫ info diagnostics ≫ debug/traces.** Specific windows are set at drain configuration and are **legal/ops decisions** (§14.5), deliberately not hard-coded here. Principle: *diagnostics are disposable; audit is not.*

### 4.6 Release attribution (PRINCIPLE; mechanism ROADMAP)
Every event should be attributable to a **build/release** so "which release" is answerable (mission Q8). PULSE has **no `/api/version` and no build-id plumbing today** (deferred in the pilot release checklist). The requirement: a `releaseId` (git SHA or build tag) injected at build and stamped onto every event + exposed at a version endpoint. Mechanism is roadmap; do not assert one.

### 4.7 CURRENT STATE
Logger solid; correlation unpopulated; domain modules emit no business logs (9 infra/auth call sites total). Phase 1 closes both.

### 4.8 ⚖ Rejected alternatives
- **Head-based random sampling.** Rejected: it drops failing journeys as readily as boring ones. Tail-based, error-aware sampling keeps the incidents.
- **Per-caller correlation passing.** Rejected: forgettable, verbose, and it *will* drift; ALS threading is the one place to get it right (§5.4).
- **Logging request/response bodies for "richer" debugging.** Rejected by OBS-4/§14 — the debugging value never outweighs the PII/secret exposure; ids + typed context suffice.

---

## §5. Correlation Model

### 5.1 The identifiers (PRINCIPLE)
| Id | Grain | Role | Source of truth |
|---|---|---|---|
| **CorrelationId** | one logical operation / journey | **the spine** (OBS-3) — on every event, every plane; the primary join key for replay | `newCorrelationId()` at request entry (or adopted from an inbound header) |
| **RequestId** | one HTTP request / RSC render / server-action invocation | the unit of server work | minted per request |
| **TraceId / SpanId** | one distributed trace / one span within it | causal timing across pipeline stages and (future) hops | W3C `traceparent` if inbound, else minted = RequestId (§10) |
| **ActionId** | one *mutation* invocation | finer diagnostic sub-identity for a state-changing action; join for idempotency + audit `metadata` | minted in the action; carried in log fields / audit `metadata` |
| **SessionId** | one authenticated login | correlate all activity in a session for security replay | **requirement**, derivation deferred (a JWT claim vs a minted token id — implementation decision, not asserted here) |
| **GymId / BranchId** | tenant / sub-tenant | mandatory scope dimension (tenancy law) | session principal, never client input |
| **UserId (ActorUserId)** | the human/system actor | attribution dimension | session principal / system actor |
| **MemberId** | the business subject | "who is this about" dimension for member-journey replay | the operation's target; rides in event fields / audit `targetId` |

### 5.2 The relationship graph (PRINCIPLE)
```
SessionId (1) ──< CorrelationId (N)          one login spawns many journeys
CorrelationId (1) ──< RequestId (N)          a journey spans requests (v1 default: often 1:1)
RequestId (1) ── TraceId (1) ──< SpanId (N)  one trace per request, many spans
RequestId[mutation] (1) ── ActionId (1) ──> audit_logs row (0..1, MUST-audit only)
   dimensions stamped on every event:  GymId, BranchId?, ActorUserId, MemberId?
```
**Spine = CorrelationId.** Everything else is either a finer grain *below* it (Request/Trace/Action) or a *dimension across* it (Gym/Branch/User/Member/Session). `correlationId` — and only `correlationId` — is guaranteed present in *both* the log stream *and* `audit_logs`, which is why replay (§8) joins on it.

### 5.3 CorrelationId scope: per-request now, journey-capable later (PRINCIPLE + decision)
**v1 default: `CorrelationId == RequestId`** — each request is its own journey. The model is deliberately built to *elevate* to multi-request journeys (e.g., a whole onboarding flow, or a client retry chain) the moment the client can echo a correlation header back — **without schema change**, because `correlationId` is already a free-form string in `audit_logs` and the ALS. We do **not** force cross-request journeys now (the client has no correlation SDK, and Next 16 RSC/action request boundaries are subtle — proven costly last sprint).

### 5.4 Threading requirement & seam (PRINCIPLE; mechanism PROPOSED, not canonized)
**Requirement:** every request and every server action executes *inside* a `runWithRequestContext({ correlationId, gymId, branchId, userId }, …)` scope so the logger (and future audit writer) inherit the spine automatically. **Candidate seams (to be chosen at implementation, not fixed here):** Next `instrumentation`/request lifecycle hooks; a thin wrapper composed into the mutation pipeline's authenticate/scope steps; a shared `withObservedAction()` helper the action layer calls. **No `middleware.ts` exists today**, and Next 16 wiring has bitten this repo before — so this authority states the *invariant*, names options, and defers the mechanism to a reviewed Phase-1 slice.

### 5.5 ⚖ Rejected alternatives
- **Collapse everything into one id.** Rejected: replay needs *both* a stable cross-request spine and a per-request grain; one id cannot be both without losing journey- or request-level questions.
- **Make MemberId ambient in the ALS** (like gymId). Rejected: a request often touches zero or many members; member context is per-operation, so it rides in event fields/`targetId`, not the request-wide store.
- **Equate ActionId with `audit_logs.id`.** Rejected (advisor-flagged): it implies a schema coupling and breaks for the many mutations that are not in the MUST-audit set. `correlationId` is the established join; ActionId is a diagnostic sub-id that *references* the spine.

---

## §6. Exception Authority

> **Ownership note.** The **error class taxonomy, HTTP mapping, result shape (`code`/`message`/`details`), cross-tenant→404 rule, retry/idempotency, and customer-vs-internal messaging are owned by `error-handling.md`** (and coded in `lib/errors.ts`). This section is the **observability overlay** on that taxonomy — not a second taxonomy.

### 6.1 Classification × observability (PRINCIPLE)
| Error class (cite `error-handling.md`) | Expected? | Customer-visible? | Recoverable? | Plane + family | Severity | Audited? | Alerts? |
|---|---|---|---|---|---|---|---|
| `ValidationError` (422) | expected | yes (field msgs) | yes (fix input) | diagnostic · Business | warn | no (nothing changed) | no |
| `AuthError` (401) | expected | yes ("sign in") | yes | diagnostic + audit · Security | info | yes | on rate spike (§7) |
| `AuthorizationError` (403) | expected | yes | no | diagnostic + audit · Security | warn | yes | on rate spike |
| `NotFoundError` (404, incl. cross-tenant) | expected | yes | no | diagnostic (+ audit as `tenant.scope_violation` when cross-tenant) · Security/System | info→warn | cross-tenant: yes | cross-tenant: yes |
| `ConflictError` (409, invariant) | expected | yes (actionable) | yes | diagnostic · Business/Lifecycle | warn | if state-adjacent | no |
| `ApplicationError` (4xx domain) | expected | yes | varies | diagnostic · Business | warn | if state-changing | no |
| `UnexpectedError` (500) | **un**expected | generic only | maybe | diagnostic (+ System) · System | **error** | no | **yes** |

### 6.2 Expected vs Unexpected is the load-bearing line (PRINCIPLE)
- **Expected** errors are *control flow* — a `warn`/`info`, one line at the boundary, no alert, never a stack-trace to the user (`error.digest` correlation only). They are *normal*.
- **Unexpected** errors (`UnexpectedError`/uncaught) are *defects* — `error` level with stack, captured once at `instrumentation.ts onRequestError`, alertable, and each one earns a regression test (`testing-standards.md`).
- **OBS-11**: no silent catch. If code handles an error, it emits an event; swallowing is forbidden (`error-handling.md`).

### 6.3 Retry & escalation (PRINCIPLE; cite + extend)
- **Retry/idempotency** for retried mutations (esp. `payment.recorded`) is owned by `error-handling.md` (§Recovery). Observability requirement: a retried operation reuses the **same `correlationId`** and emits `cx.action_retried` (family Customer-Experience) so repeated retries are *visible* and become an Unexpected-Behaviour signal (§7) rather than an invisible loop.
- **Escalation** (who gets woken) is defined in §12; the *channel* is a roadmap dependency (ADR-010 in-app-only), so escalation today = the incident dashboard + drain alerts, not a pager.

### 6.4 ⚖ Rejected alternatives
- **Alert on `warn`.** Rejected: expected errors are routine; alerting on them trains responders to ignore alerts. Alert on `error` and on *rates* of `warn` (§7), never on individual `warn`s (matches `logging-observability.md`).
- **Map cross-tenant to 403.** Rejected — confirms record existence across tenants; the 404 disguise is a tenancy-safety rule (`error-handling.md`/`api-standards.md`), and the *attempt* is separately audited as Security.

---

## §7. Unexpected-Behaviour Authority

> The critical section: the system must notice things that are **not exceptions** — no error is thrown, yet an engineer should look.

### 7.1 Doctrine — emit in-app, detect in the drain (PRINCIPLE) — OBS-6
PULSE is a **good witness and a poor detective.** The application's job is to **emit a richly-tagged Unexpected-Behaviour event** at the moment of concern; the job of *deciding it's an anomaly* (thresholds, rates, correlations, baselines) belongs to the **drain/metrics/alerting layer**, which has global view, history, and no tenant-critical latency budget. This keeps state, races, and detection cost **out of the request hot path** and away from tenant isolation risk.

### 7.2 The concern taxonomy (PRINCIPLE)
Family **Unexpected-Behaviour**, named `concern.<thing>`:
| Concern | Emit trigger (in-app, cheap) | Detected/alerted (drain-side) |
|---|---|---|
| Repeated auth failure | each `auth.signin.invalid` (already emitted) | N failures / window / identifier or IP → Security alert |
| Impossible business sequence | a domain-invariant rejection (the lifecycle/ledger engine *already* refuses illegal transitions) → emit `concern.impossible_sequence` | any occurrence → engineering review (it implies a client or logic bug) |
| Suspicious payment activity | `payment.recorded` volume/amount outliers per actor/member | rate/amount threshold → Security review |
| Excessive retries | `cx.action_retried` (§6.3) | K retries / correlation → reliability alert |
| Slow request / latency spike | `slow.operation` when `durationMs` > threshold (existing perf-logging stance, `logging-observability.md`: e.g. >500ms) | p95/p99 regression → performance alert |
| Duplicate operation | idempotency layer detects a repeat → `concern.duplicate_operation` | trend → correctness review |
| Unexpected state transition | derived-status engine sees a transition it cannot explain | any occurrence → engineering review |

### 7.3 Why the domain makes this cheap (PRINCIPLE — PULSE-specific strength)
PULSE's **invariants already reject impossible states** (two active memberships, editing immutable money, archiving a member with obligations). Today those rejections are *silent control flow*. This authority requires them to **also emit a `concern.*` event** — turning existing correctness guards into a free anomaly signal. No new detection engine; just *observe the refusals we already make.*

### 7.4 CURRENT STATE / ROADMAP
Only the raw ingredients exist (auth-failure `warn`s; perf-logging *stance* but no emitter wired). Threshold detection requires the metrics/drain layer (§15 Phase 3). **No in-app cron** means detection is inherently drain-side or request-triggered — which is exactly OBS-6, so the constraint and the doctrine agree.

### 7.5 ⚖ Rejected alternatives
- **In-app real-time detection loops** (count failures in memory, block on threshold). Rejected hard: needs shared state across a horizontally-scaled stateless app (correctness + races), risks tenant-data mixing, adds hot-path latency, and re-implements what a drain does better. The app *emits*; the drain *decides*.
- **A machine-learning anomaly model now.** Rejected: YAGNI for a single-gym pilot; thresholds on emitted signals cover the real risks. Revisit only at multi-tenant scale with real baselines.
- **Treating concerns as exceptions** (throw on suspicion). Rejected: a concern must **never** block a legitimate business operation (a real member paying twice legitimately must not be denied); concerns are observations, not gates.

---

## §8. Business Replay

### 8.1 What replay means here (PRINCIPLE) — and what it is NOT
Replay = **reconstruct an incident from first request to final business result** by joining evidence on the correlation spine and reading the immutable domain — **not** re-executing an event stream (OBS-8; ADR-017 forbids event-sourcing). PULSE can do this *deterministically for money and membership* because the domain is immutable: the payment ledger (void-not-edit), membership/payment **snapshots**, soft-deletes, and `recorded_by`/`created_by` mean **financial and lifecycle truth is always reconstructable from state alone.** Logs/audit/traces add the *who/when/why/how-long* around that spine.

### 8.2 The replay method (PRINCIPLE)
1. **Anchor.** Start from any known handle: an `error.digest`, a `correlationId`, a `payment.id`, a `member.id`, an `audit_logs` row, a user complaint + timestamp.
2. **Pivot to the spine.** Resolve the anchor to its `correlationId` (every plane carries it; the audit row and the error digest both do).
3. **Fan out and order.** Gather all diagnostic logs, `audit_logs` rows, and (future) trace spans sharing that `correlationId`; order by `timestamp`/`occurredAt`.
4. **Read immutable truth.** Overlay the domain records the audit rows reference (`targetId`): the ledger entries, the membership snapshot, the derived status at that instant. Because these are immutable, *what the money/membership actually was* is not inferred — it is read.
5. **Reconstruct narrative.** Actor (`actorUserId`) → action (`domain.action`) → target → outcome → duration → any `concern.*`/error. The twelve questions fall out of this join.

### 8.3 Worked example (PRINCIPLE — illustrative)
*"A gym owner says a member was charged twice last Tuesday."* Anchor on `member.id` + date → query `audit_logs [gymId, targetType='membership', member's memberships]` for that day → find two `payment.recorded` rows → pivot each to its `correlationId` → fan out logs: were they two distinct requests (two `RequestId`s, seconds apart → likely a double-submit / missing idempotency → `concern.duplicate_operation` should be present) or one journey mis-recorded? → read the immutable ledger: are there two `PAYMENT` entries or one? → resolution is a `payment.voided` compensating event (never an edit), itself audited. **Every step reads durable evidence; nothing is reproduced live.**

### 8.4 Requirement this places on features (PRINCIPLE)
For replay to work, every MUST-audit mutation must (a) run inside a correlation scope (§5.4), (b) write its audit row transactionally (OBS-2), and (c) reference the domain rows it changed by id. **This is the §13 developer gate.** Where these hold, replay is guaranteed; where they don't, replay degrades to guesswork — which is why they are laws, not suggestions.

### 8.5 ⚖ Rejected alternatives
- **Event-sourcing / rebuild-from-events.** Rejected by ADR-017 and unnecessary: the immutable domain *is* the trustworthy record; a parallel event log would duplicate truth and risk divergence.
- **Full request/response capture for replay.** Rejected by OBS-4/§14: storing bodies to "replay exactly" is a PII/secret liability; correlation-join + immutable state answers the real questions without hoarding payloads.

---

## §9. Metrics Authority

### 9.1 Two sources, one vocabulary (PRINCIPLE)
| Metric class | Source | Examples | Note |
|---|---|---|---|
| **Business** | **derived from the existing domain read models** — *not* a parallel counter pipeline | revenue, active members, memberships expiring, outstanding balance, new members/day | PULSE already *computes* these in the dashboard/reports modules; the Metrics Authority forbids double-counting them via emitted metrics — **the domain is the source; metrics observe, they don't re-derive money** |
| **System / Operational (RED)** | the diagnostic + trace planes | request **R**ate, **E**rror rate, **D**uration (p50/p95/p99), DB pool/health, saturation | not domain-derivable; comes from emitted `durationMs`/error events |
| **SLA / Experience** | composition of the above | availability %, first-login success rate, mutation success rate, p95 latency vs target | the promises we make; §12 uses them for incident severity |

### 9.2 Principles, not tools (PRINCIPLE)
- **RED for request flows, USE for resources** — choose *what* to measure by these shapes, independent of any vendor.
- **Every metric has an owner, a question, and a threshold** — an unowned metric with no decision attached is noise and should be deleted.
- **Money metrics reconcile to the ledger.** A business metric that disagrees with the immutable domain is *wrong by definition*; the ledger wins (relates to TD-2 count-vs-cache drift — the ledger is the arbiter).
- **Cardinality discipline.** Never key a metric by unbounded PII (memberId/phone as a label) — tenant (`gymId`) and coarse dimensions only, or it becomes a privacy leak and a cost explosion.

### 9.3 CURRENT STATE / ROADMAP
No metrics pipeline exists. Business metrics exist only as on-demand domain reads. Metrics collection is §15 Phase 2 (dependency-gated).

### 9.4 ⚖ Rejected alternatives
- **Emit business metrics as counters from the app** (increment revenue on each payment). Rejected: it creates a second, drift-prone source of money truth; derive from the ledger instead.
- **High-cardinality per-member metrics.** Rejected (§9.2) — privacy + cost.

---

## §10. Tracing Authority

### 10.1 Philosophy (PRINCIPLE)
Adopt **OpenTelemetry semantic conventions as a vendor-neutral *principle*** (not a committed dependency): a **trace** spans one operation; **spans** mark its causal stages. In PULSE the natural spans are **the mutation pipeline stages** — `authenticate → authorize → validate → scope → execute(Prisma) → revalidate` — so a trace of `payment.recorded` shows exactly where time and failure live. `traceId` adopts inbound W3C `traceparent` if a proxy sets one, else equals `RequestId` (§5).

### 10.2 Scope across surfaces (PRINCIPLE)
- **Server Actions / RSC:** the primary traced unit; one trace per action, spans per pipeline stage + DB call.
- **Background jobs (future):** each job run is a trace; if a job continues a user-initiated journey, it **propagates the originating `correlationId`** (OBS-3) so the journey stays whole across the async boundary.
- **External integrations (future — SMS/gateway/email):** each outbound call is a child span; failures/timeouts are family **Integration**; money-affecting integrations also audit.
- **Future AI agents:** each agent invocation is a trace; each tool/LLM call a span, tagged with model + token cost; agent actions that mutate domain state are **subject to every law here** — same audit, same correlation, same permission gate. This is stated now so the authority governs agents *before* they exist.

### 10.3 Cost constraint (PRINCIPLE) — OBS-2
Tracing is **sampled and best-effort**; it must never breach the mutation budget (ADR-029) or fail a business op. Always-on tracing of hot read paths is forbidden; trace mutations and a sampled fraction of reads.

### 10.4 ⚖ Rejected alternatives
- **Committing to a specific tracing vendor/library now.** Rejected: premature dependency (ADR §15.4); the *principle* (OTel conventions, pipeline-stage spans) is what a permanent authority fixes, tools come at Phase 3 with approval.
- **100% trace sampling for "completeness."** Rejected: cost + hot-path risk; tail/error-biased sampling preserves the traces that matter.

---

## §11. Production Dashboard Philosophy

Four dashboards, defined by **audience and the questions they answer** — tool-agnostic. A dashboard that doesn't drive a decision is deleted.

| Dashboard | Audience | Answers | Draws from |
|---|---|---|---|
| **Executive** | owner / business | Is the gym healthy? revenue trend, active vs expiring members, outstanding balance, growth | Business metrics (§9, domain-derived) |
| **Operations** | front-desk / manager | What needs action *today*? expiring memberships, unpaid balances, pending notifications, today's activity | domain read models + Lifecycle events |
| **Engineering** | engineers | Is the system healthy? RED (rate/error/p95), DB health, slow operations, `concern.*` trends, release marker | System/CX metrics + diagnostic plane |
| **Incident** | on-call / responder | What is broken *right now*, for whom, since when? error spikes by `correlationId`/`gymId`, active SEV, blast radius, recent deploy | error/security planes joined on spine + `releaseId` |

**Principles:** (1) every panel names its **owner + threshold + the action a red panel triggers**; (2) **tenant-privacy in dashboards** — engineering/incident views key on `gymId` and ids, never member PII (§14); (3) the **Executive dashboard reconciles to the ledger** (money panels are domain-derived, §9.2); (4) dashboards are **read models over the planes**, never a new source of truth.

**CURRENT STATE:** only the in-app operational/executive *product* dashboard exists (the KPI read models). Engineering/Incident dashboards require the metrics + drain layer (§15 Phase 2–3).

**⚖ Rejected:** one mega-dashboard for all audiences (rejected — different questions, different privacy postures; an owner must never see raw engineering internals, an engineer must never need member PII to debug).

---

## §12. Incident Response

### 12.1 Classification (PRINCIPLE)
| Severity | Definition (PULSE-specific) | Examples |
|---|---|---|
| **SEV-1** | money incorrectness or a tenant-isolation breach — a violation of the two sacred properties | cross-tenant data exposure; a mis-recorded/lost payment; audit/ledger disagreement |
| **SEV-2** | core flow down for a tenant | cannot sign in; cannot record a payment; app 5xx storm |
| **SEV-3** | degraded / partial | elevated latency, a non-core feature failing, a single `concern.*` firing |
| **SEV-4** | cosmetic / no customer impact | a dashboard panel wrong, a benign warn spike |

*A tenancy or money-integrity signal is SEV-1 until proven otherwise* — the isolation/money-correctness bar (constitution §1) sets the floor.

### 12.2 Investigate via replay (PRINCIPLE)
Incident investigation **is** Business Replay (§8): anchor → spine → fan-out → immutable read → narrative. The immutability of the domain means a SEV-1 money incident is *reconstructable, not speculative* — and if it is *not* reconstructable, that unreconstructability is itself the finding (the correlation/audit contract was breached).

### 12.3 Evidence collection (PRINCIPLE) — OBS-7-adjacent
- Evidence is the **durable planes** (audit + retained diagnostics + immutable domain), captured by `correlationId`/`gymId`/time window — **never** by asking the customer to reproduce, and **never** by editing any record to "test."
- Preserve the incident's evidence for the postmortem before any remediation that changes state; remediation itself is audited (compensating events, OBS-7).

### 12.4 Postmortem (PRINCIPLE)
- **Blameless**, focused on the system and the missing guard, not the actor (human or AI).
- Mandatory for SEV-1/SEV-2. Output: timeline (from replay), root cause, **the regression test added** (`testing-standards.md` — every bug fix adds one), and **any observability gap that made detection/replay harder** — closing that gap is an action item (this is how the authority self-improves).
- **Escalation** today = incident dashboard + drain alerts; a real on-call channel is a roadmap dependency (ADR-010 in-app-only). State the human path explicitly per deployment.

### 12.5 ⚖ Rejected alternatives
- **Reproduce-in-prod / edit-to-test.** Rejected absolutely — mutates sacred data and destroys evidence; replay from durable evidence is the only sanctioned method.
- **Blame-based review.** Rejected — in an AI-built codebase it is doubly useless; the guard that was missing is the finding.

---

## §13. Developer Rules (the Definition-of-Done gate) — OBS-12

### 13.1 Minimum requirements for every feature (PRINCIPLE)
A vertical slice is **not done** unless:
1. **Every MUST-audit mutation** (§3.1) writes an `audit_logs` row `{action:<domain.action>, actorUserId, targetType, targetId, gymId, branchId?, correlationId, metadata}` **inside the mutation's transaction** (OBS-2).
2. **Significant business events** emit an `info` diagnostic with `family` + `eventName` (`domain.action`) (`logging-observability.md` "significant business events").
3. **Errors** follow §6 — typed, boundary-logged once, correct severity, no silent catch (OBS-11).
4. **Every emission carries the spine** — runs inside a correlation scope (§5.4); no orphan events (OBS-3).
5. **No PII/bodies** in any event (OBS-4; §14) — ids only.
6. **Slow/among concern paths emit** the relevant `slow.operation`/`concern.*` where applicable (§7).
7. **Names** conform to `domain.action`, vocabulary-drawn, past tense (OBS-9).

### 13.2 Code-review checklist (concrete — future fitness-testable)
- [ ] Does each state-changing action write its audit row **in the same transaction**? (grep: mutation without `audit_logs` write where §3.1 applies)
- [ ] Is any member/user/payment attribute logged **by value** instead of by id? (violation of OBS-4/§14)
- [ ] Any `catch` that neither rethrows nor emits an event? (OBS-11 violation)
- [ ] Any `console.*`? (forbidden — lint) Any direct Pino/`audit_logs` access bypassing the sanctioned helpers?
- [ ] Do new event names match `domain.action` + the fixed vocabulary?
- [ ] Does the action run inside a correlation scope (no orphan logs)?

### 13.3 PR checklist (author self-attests)
- [ ] MUST-audit events implemented + **tested** (an isolation/attribution test asserts the audit row, its `gymId`, and `actorUserId` — mirrors P0 tenancy tests).
- [ ] Business events + severities per §6.1.
- [ ] No new PII surface in logs/audit/metrics; redaction paths updated if a new sensitive field was added.
- [ ] No new dependency/library/abstraction introduced without an approved decision (ADR §15.4).

### 13.4 Architecture-review checklist (for cross-cutting changes)
- [ ] Any new event family or plane? (must update §2 + get ratification — taxonomy is a contract)
- [ ] Any new identifier or change to the correlation model? (§5 is load-bearing for replay)
- [ ] Any new external integration/job/agent? (must define its trace/audit/correlation posture per §10.2 *before* merge)
- [ ] Retention/sampling/privacy impact assessed (§14)?

---

## §14. Privacy Rules

### 14.1 The real PII inventory (PRINCIPLE — grounded in the schema)
| Category | Fields (actual) | Rule |
|---|---|---|
| **Identity PII** | `Member.fullName/phone/email/dateOfBirth/gender`, `User.email/phone/displayName` | never by value on any plane; reference by id (OBS-4) |
| **Free-text / quasi-health** | `MemberNote.body`, `MemberNote.category`, `Member.notesSummary` | **never** logged, audited, metricised, or traced by value — these are where injury/health/behaviour notes live ("medical" surface); they never leave the domain row |
| **Credentials/secrets** | `User.passwordHash`, `AUTH_SECRET`, tokens, `DATABASE_URL` | never anywhere — redacted at the logger even if mistakenly passed (`lib/logger.ts`); §Password/Secrets rules of `security-guidelines.md` |
| **Financial** | `Payment.amount/method/reference/note/voidReason` | amount by reference to the immutable ledger row; free-text `reference/note/voidReason` never by value |

### 14.2 Passwords, tokens, secrets (CITE)
Owned by `security-guidelines.md` + the logger redaction list. Restated only as the law: **never logged, audited, traced, or metricised — in any form.** Log-injection (reflecting raw user input into logs) is a named threat (`security-guidelines.md`); event `message`s are static, values are typed fields.

### 14.3 Financial & "medical" data (PRINCIPLE)
Money is observed **by reference** to the immutable ledger, never by copying values into telemetry. The free-text member fields are treated as **potentially health-sensitive by default** (a gym records injuries, conditions, restrictions) and get the strictest handling (§14.1) regardless of what a given gym actually stores — because the authority cannot know per-tenant.

### 14.4 Erasure vs immutable audit — the core tension, resolved (PRINCIPLE) — OBS-10
A subject's right to erasure collides with append-only audit (§3) and statutory financial retention. **Resolution:** separate *PII* from *audit facts*.
- **PII lives in the (mutable, erasable) domain row.** On a valid erasure request, the domain row's PII is **anonymized/crypto-shredded** (name→tombstone, contact nulled) — the member record persists as a pseudonymous shell where financial/legal retention requires it.
- **The immutable audit fact survives**, because it only ever referenced a **stable non-PII id** + non-PII `metadata` (OBS-4 made this possible by construction). "User X did action Y to target Z at time T" remains true and retained; it contains no erasable PII.
- Therefore erasure and immutability **do not conflict** — they were designed not to (this is *why* OBS-4 forbids PII in audit in the first place).

### 14.5 Compliance & retention (PRINCIPLE; specifics LEGAL-CONFIRM)
- **Regime:** the pilot is Egyptian → **Personal Data Protection Law (Law 151 of 2020, PDPL)** is the named baseline; design to a **GDPR-shaped** posture (lawful basis, minimization, subject rights, breach notification) so future Gulf/EU tenants need no re-architecture.
- **Retention tiers** (§3.4, §4.5): audit ≫ security ≫ error ≫ info ≫ debug/trace. **Exact durations — especially the statutory financial-record period — are legal-confirmation-required and deliberately NOT asserted here.** This authority fixes the *tiering and the requirement to set them*, and flags the number as a decision for counsel + the human, not a fact to guess.
- **Data minimization is the default** (OBS-4): the cheapest way to stay compliant is to never collect the PII into telemetry in the first place.

### 14.6 ⚖ Rejected alternatives
- **Field-level encryption of PII in telemetry** (so we can log it "safely"). Rejected as the *primary* control: encryption is not erasure (you still hold the ciphertext against a retention/erasure obligation) and it invites logging PII "because it's encrypted." Minimization (don't log it) + crypto-shred-on-erasure in the domain is the stronger posture. Field-level encryption remains a *defense-in-depth* option for the domain store (already a `security-guidelines.md` future item), not a license to telemetrize PII.
- **Anonymize the audit log on erasure.** Rejected — it breaks OBS-7 immutability and the legal value of audit; the correct move is to have never put PII in the audit, so there is nothing to anonymize there.

---

## §15. Implementation Roadmap

Incremental, dependency-honest. **No phase is authorized to add a dependency/library/table without a separate approved decision** — the roadmap sequences *intent*, not permission.

### Phase 1 — Wire the spine + the audit trail (highest leverage; uses existing primitives only)
- Thread `runWithRequestContext` at the request/action boundary so `correlationId` + tenant scope populate automatically (§5.4) — closes the "every log is orphaned" gap.
- Emit **business/lifecycle events** from domain `service.ts`/`actions.ts` (Business/Lifecycle families) — closes the "domain logs nothing" gap.
- Write the **MUST-audit set** to `audit_logs` **transactionally** (OBS-2) with attribution + `correlationId` — activates the dormant table.
- **Dependencies:** none new (ALS, logger, `audit_logs` all exist). **Governance:** additive schema fields `family`/`eventName`/`releaseId` into `logging-observability.md` (§16). **Enables:** replay (§8), incident response (§12), the §13 gates. *This phase alone makes PULSE meaningfully observable.*

### Phase 2 — Metrics, dashboards, retention & sampling
- Business metrics **derived from the domain read models** (§9.1); RED system metrics from the diagnostic plane; Executive/Operations/Engineering dashboards (§11); set retention tiers + tail-based sampling at the drain (§4.4–4.5).
- **Dependencies (approval-gated):** a metrics/collector + a log drain/aggregator; `/api/version` + `releaseId` build plumbing (§4.6). **Depends on** Phase 1 (spine + events).

### Phase 3 — Tracing + drain-side unexpected-behaviour detection
- OTel-shaped spans over the mutation pipeline (§10); drain-side threshold/anomaly detection over the `concern.*` + Security signals (§7); Incident dashboard + alerting rules (§11–12).
- **Dependencies (approval-gated):** a tracing library + an alerting mechanism (note ADR-010 in-app-only — an operational channel is a new decision). **Depends on** Phase 1–2.

### Phase 4 — Hardening, integrations, agents, scale
- DB-level **audit immutability enforcement** (revoke UPDATE/DELETE or trigger — OBS-7); error-tracking grouped by `correlationId`; per-tenant usage analytics; observability posture for the **first external integration**, **first background job/cron** (also unblocks TD-8/TD-18), and **first AI agent** (§10.2).
- **Dependencies (approval-gated):** per capability. **Depends on** the prior phases + product demand (YAGNI until real).

**Dependency graph:** Phase 1 (no new deps) → Phase 2 (drain+metrics) → Phase 3 (tracing+detection) → Phase 4 (hardening+new surfaces). Correlation-spine wiring (Phase 1) is the root dependency of *everything*; nothing downstream works without it, which is why it is first and cheapest.

---

## §16. Governance — Ratification Required (human decisions; not performed by this document)

Per constitution §11 (human owns new patterns/authorities) and §13 (doc conflict → surface, ask, *then* fix the lower doc), the following are **surfaced for the human, not enacted here**:

1. **Insert this document into the §12 documentation hierarchy** as a ratified architecture-level authority (peer to the ADR on observability; subordinate to it on structural conflict). Until ratified, its status stays 📐 PROPOSED.
2. **Reconcile the dual-authority collision with `logging-observability.md`** (currently "✅ Authoritative"). **Recommended, not performed:** demote it to *"implementation spec under the Engineering Observability Authority"* — it keeps the concrete field list/level table/redaction/perf-threshold; its `Monitoring` + `Future Observability` sections are **superseded** by §§9–12/§15 here and should point up to them. Exact edit: add a scope line to its header + supersession pointers on those two sections. **This authority makes zero edits to it this sprint** (ask-before-fix).
3. **Ratify the additive log-schema fields** `family`, `eventName`, `traceId`/`actionId`, `releaseId` (§4.1) into `logging-observability.md` (they are a public-contract change to the log schema).
4. **Future dependency approvals** (each a separate decision, ADR §15.4): a log drain/aggregator + metrics collector (Phase 2); a tracing library (Phase 3); an alerting/on-call channel (Phase 3 — note ADR-010 in-app-only); DB-level audit-immutability trigger + error-tracking (Phase 4); `/api/version` + build-id plumbing (Phase 2).
5. **Correlation-id generation seam** (§5.4): confirm whether infra correlation/trace-id minting routes through the existing `lib/platform` clock/id seam (used by domain UUID-v7, ADR-026) or stays a distinct infrastructure concern. *Note:* the "no raw `Date.now()`/`crypto.randomUUID()`" expectation is enforced by code/fitness tests today but is **not** written in any ranked governance doc — deciding its scope for infra ids is part of this ratification, not an assumption this authority makes.

---

*This is a proposed engineering authority. On ratification it becomes the permanent observability constitution for PULSE — superseded only by the human and the ranked documents the constitution's §12 places above it. Design-only: no code, tables, libraries, or configuration were changed to produce it.*
