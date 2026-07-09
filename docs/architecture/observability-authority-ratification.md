# Observability Authority — Governance Ratification Report

### PULSE Gym SaaS · Architecture Governance

| | |
|---|---|
| **Status** | ✅ Complete — governance integration enacted 2026-07-09. |
| **Subject** | Ratifying `engineering-observability-authority.md` into the project's governance model. |
| **Canonical decision** | `decision-log.md` **ADR-030**. |
| **Scope** | Documentation + governance only. **No code, libraries, tables, monitoring, or CI changed.** |

> This report is the record of the Governance Ratification Sprint. It does not restate the authority's technical content (that is complete and frozen at v1.0 in `engineering-observability-authority.md`); it records *what changed in the governance model* and proves the integration is unambiguous.

---

## 1. Governance Ratification Report

### 1.1 What was ratified
The **Engineering Observability Authority** (proposed in commit `8e366f0`) was reviewed, accepted, and made a **first-class permanent architecture-tier authority (v1.0)**. Its status moved **PROPOSED → ACCEPTED**, with acceptance date, version, supersession status, and a ratification record now in its header and §16.

### 1.2 What was integrated (the six governance actions)
1. **Status ratified** — authority header now `✅ ACCEPTED AUTHORITY · v1.0 · Accepted 2026-07-09`, with an explicit supersession row and a §16 "Ratification Record".
2. **Inserted into the documentation hierarchy** — `CLAUDE.md §12` architecture tier now lists the authority (peer to the ADR on observability, subordinate on structural conflict); `logging-observability.md` is annotated there as an implementation spec; the "Canonical homes" note now names the observability doctrine's home.
3. **Ownership resolved** — `logging-observability.md` **demoted to an Implementation Specification** with supersession pointers on its `Audit Logging`, `Monitoring`, and `Future Observability Strategy` sections. **No information was deleted** — the retained notes stand as implementation reference; only the *authority claim* moved.
4. **Collisions resolved** — every observability fact now has exactly one home (§3 map below).
5. **Governance rules updated** — the observability gate was added to the Definition of Done (`CLAUDE.md §10`, `development-workflow.md §9`, `ai-development-rules.md §H`) and to the pre-merge / feature checklists (`feature-template.md §10a`, `§12`, `§13`). Architecture reviews reference the authority's §13.4. **CI unchanged.**
6. **Decision registered** — `decision-log.md` **ADR-030** (canonical) + the register in §4 below.

### 1.3 Honest caveat (carried from the authority, unchanged)
Ratification is **governance only**. The observability substrate remains **intentionally unbuilt** until after the pilot. The DoD observability gate is therefore a **design gate today** — it governs how a feature is *specified and reviewed* — and becomes a **code gate** (with a supporting architecture-fitness test) only when Phase 1 wiring lands (§5).

---

## 2. Updated Documentation Hierarchy (as integrated)

The authority's place in the constitution's §12 ranking:

```
1. CLAUDE.md ............................. summary constitution
2. PRD ................................... product truth
3. ADR (gym-saas-adr-v1.md) .............. structural truth
   └─ Engineering Observability Authority  observability truth  ◄── INSERTED
      (subordinate to the ADR on structural conflict; ratified ADR-030)
4. UI/visual truth (Design System, Tokens, Catalog)
5. How we build — /docs/engineering/
      ├─ error-handling.md ............... AUTHORITY (error taxonomy) — observability overlay in Authority §6
      ├─ database-standards.md ........... AUTHORITY (audit_logs shape/INV-39) — audit doctrine in Authority §3
      ├─ naming-conventions.md ........... AUTHORITY (domain.action grammar) — cited by Authority
      ├─ security-guidelines.md .......... AUTHORITY (secrets/PII rules) — cited/extended by Authority §14
      └─ logging-observability.md ........ IMPLEMENTATION SPEC under the Authority  ◄── DEMOTED
                                           (owns log field schema/levels/redaction/perf-threshold only)
6. Per-feature specs — /docs/features/*
```

**Document classification (mission item 3):**

| Document | Class | Owns (single home) |
|---|---|---|
| `engineering-observability-authority.md` | **Architecture Authority** | Observability doctrine, taxonomy, correlation model, audit rules, exception overlay, unexpected-behaviour, replay, metrics/tracing/dashboard/incident principles, privacy doctrine, roadmap |
| `error-handling.md` | Engineering Authority | Error class taxonomy, HTTP mapping, result shape |
| `database-standards.md` (+ DDS §2.17) | Engineering Authority | `audit_logs` table shape, audit fields, INV-39 |
| `naming-conventions.md` | Engineering Authority | `domain.action` naming grammar |
| `security-guidelines.md` | Engineering Authority | Secrets/PII/log-injection rules |
| `immutable-history.md` (domain) | Reference (domain invariant) | Audit append-only invariant H-4 |
| `event-catalog.md` (domain) | Reference | Event vocabulary + past-tense convention |
| `logging-observability.md` | **Implementation Specification** | Log field schema, level table, redaction paths, perf threshold |
| `logging-observability.md §Monitoring / §Future Observability` | **Historical / superseded** | (doctrine moved to Authority §9/§11/§12/§15; retained as reference) |

---

## 3. Authority Supersession Map

| Fact / topic | Single authoritative home | Others may only REFERENCE | Change made |
|---|---|---|---|
| Observability philosophy, non-goals, success | Authority §1 | — | new |
| Event taxonomy (8 families, planes, `domain.action` usage) | Authority §2 (grammar cited from `naming-conventions.md`) | naming-conventions.md, event-catalog.md | new |
| **Audit doctrine** (MUST/NEVER audit, retention, attribution, immutability, transactional write) | **Authority §3** | logging-observability.md §Audit (pointer), database-standards.md, immutable-history.md | logging-observability §Audit → pointer |
| `audit_logs` **table shape** / INV-39 | database-standards.md / DDS §2.17 | Authority §3 (cites) | cross-ref row added |
| Audit **append-only invariant** (H-4) | immutable-history.md | Authority §3 | unchanged |
| Log **field schema / levels / redaction / perf threshold** | **logging-observability.md** (impl spec) | Authority §4 (cites) | status → impl spec |
| Correlation model (spine, IDs, replay-without-ES) | Authority §5, §8 | — | new |
| **Error taxonomy / result shape** | error-handling.md | Authority §6 (overlay only) | cross-ref row added |
| Error→observability overlay (plane/severity/audit/alert) | Authority §6 | error-handling.md | new |
| Unexpected-behaviour doctrine | Authority §7 | — | new |
| **Metrics / monitoring / health doctrine** | **Authority §9, §11, §12** | logging-observability.md §Monitoring (pointer) | logging-observability §Monitoring → pointer |
| Tracing / dashboards / incident principles | Authority §10, §11, §12 | logging-observability.md §Future (pointer) | new |
| **Observability roadmap** | **Authority §15** | logging-observability.md §Future (pointer) | logging-observability §Future → pointer |
| **PII-in-telemetry / redaction paths** | logging-observability.md + security-guidelines.md | Authority §14 (extends) | unchanged (extension declared) |
| Retention tiering + sampling | Authority §3.4/§4.4/§4.5/§14.5 (genuine gap, newly owned) | — | new |
| `domain.action` naming grammar | naming-conventions.md | Authority OBS-9 (cites) | unchanged |

**Result:** every listed fact resolves to exactly one home; every other mention is a reference or a supersession pointer. No fact is defined in two places.

---

## 4. Decision Register (this sprint)

Canonical entry: `decision-log.md` **ADR-030**. Consolidated here:

| # | Decision | Disposition |
|---|---|---|
| D-1 | Observability Authority **accepted** as a first-class architecture authority (v1.0). | ✅ Enacted |
| D-2 | `logging-observability.md` **becomes an Implementation Specification** under the authority (field schema/levels/redaction retained; doctrine superseded via pointers). | ✅ Enacted |
| D-3 | Authority **inserted into `CLAUDE.md §12`** architecture tier; canonical-homes note updated. | ✅ Enacted |
| D-4 | **Observability added to the Definition of Done** + pre-merge/feature checklists (design gate now; code gate at Phase 1). | ✅ Enacted |
| D-5 | Additive log-schema fields (`family`, `eventName`, `traceId`/`actionId`, `releaseId`) **ratified in principle**; applied to the field schema when Phase 1 wires them. | ✅ Ratified · ⏸ applied at Phase 1 |
| D-6 | **No implementation, libraries, tables, monitoring, or CI changes** before the pilot. | ✅ Affirmed |
| D-7 | **Future observability roadmap approved as deferred** (Phase 2+ after the pilot); each dependency remains a separate future decision. | ✅ Approved-as-deferred |
| D-8 | Correlation-id generation seam (route via `lib/platform` or keep distinct) — **deferred to the Phase-1 slice**. | ⏸ Deferred |

---

## 5. Future Roadmap (governance view — deferral is the decision)

The authority's §15 is the canonical, technical roadmap. This is its governance framing, with the pilot boundary made explicit.

### Phase 1 — Foundational observability *(post-pilot; no new dependencies)*
Wire the correlation ALS (`runWithRequestContext`), emit business/lifecycle events from the domain modules, and write the MUST-audit set to `audit_logs` **transactionally**. Uses only primitives already in the repo. **This is what promotes the observability DoD gate from a design gate to a code gate** (and enables a future architecture-fitness test).

### Phase 2 — Tracing · Metrics · Alerting · Error tracking · Operational dashboards *(intentionally deferred until after the pilot)*
Log drain/aggregation, metrics + Engineering/Incident dashboards, distributed tracing (OTel-shaped), drain-side unexpected-behaviour detection, error tracking, and an operational alerting channel. **Every item here requires a separate dependency approval (ADR §15.4) and is explicitly out of scope until the pilot has run.** ADR-010 (in-app-only) means an operational alerting channel is itself a new decision.

> **Stated clearly:** Phases 1 and 2 are **intentionally deferred until after the pilot.** Ratification approves the *plan and its sequencing*, not its execution. Building any of it now would be cost without payoff and would violate the sprint's stop condition.

---

## 6. Final Governance Verdict

**Question:** *Is the Engineering Observability Authority now fully integrated into the project's governance without ambiguity?*

# ✅ Yes.

**Evidence:**
1. **Single authority claim.** Exactly one document now claims authority over observability doctrine; `logging-observability.md` is explicitly an implementation spec beneath it. The prior dual-"Authoritative" collision is resolved (§3 map; ADR-030). Verified: its status line reads `✅ Implementation Specification — subordinate to the Engineering Observability Authority`.
2. **Discoverable from the top.** `CLAUDE.md §12` (the sole canonical ranked listing) names the authority in the architecture tier and annotates `logging-observability.md` — a reader entering from the constitution reaches the right home. The canonical-homes note points to it.
3. **One home per fact.** The supersession map (§3) shows every observability fact resolving to a single owner; all other mentions are references or pointers. No fact is defined twice.
4. **No information lost.** Every demotion used a supersession pointer; the retained content stands as implementation reference (verified in `logging-observability.md` §Audit/§Monitoring/§Future).
5. **Enforced going forward.** The observability gate is in the DoD (4 locations) and the pre-merge checklist, so every future feature must satisfy the authority; cross-cutting changes run its §13.4 architecture-review checklist.
6. **Decision is durable.** `decision-log.md` ADR-030 records the ratification in the canonical ledger with context, alternatives, and review trigger.
7. **Scope honored.** No code, libraries, tables, monitoring, or CI were changed — confirming a pure governance integration.

**One honest asterisk (not an ambiguity, a schedule):** the authority governs a substrate that is not yet wired. That is by design and is stated everywhere it matters (authority §0/§15, the DoD gate wording, this report §1.3/§5). Governance is unambiguous; *implementation* is deferred. There are no open governance questions — only two deferred **implementation** decisions (D-5 field application, D-8 id seam), both correctly scheduled to the Phase-1 slice, neither blocking.

**Verdict: the authority is fully and unambiguously integrated into the governance model. Nothing further is required until Phase-1 implementation is scheduled.**
