# Database Performance Review
### PULSE Gym SaaS · Indexes · Query patterns · Read models · Volume

| | |
|---|---|
| **Status** | ✅ Authoritative review (pre-bootstrap) |
| **Inputs** | DDS §4 (indexes), §5 (query patterns + frequency/targets), §6 (read models), §7 (volume) |
| **Targets** | lists/dashboard < ~2s at 5k members (ADR §14 AC-NFR-4); per-query targets in DDS §5 |
| **Rule** | Recommend improvements **only if justified by a real query**. Recommendations that would change DDS §4 are flagged as **proposals requiring human approval** — this review does not silently alter the index set. |

> **Bottom line:** the §4 index set covers every hot path in §5. No missing index blocks a hot query; one **justified consolidation** (member active-list sort) and a few **scale-triggered** additions are proposed but not mandatory. No redundant index is harmful today.

---

## 1. Hot tables & access shape (from DDS §7 volume)

| Table | Growth | Dominant access | Risk |
|---|---|---|---|
| **payments** | fastest; 100M+ at enterprise | append; ledger-by-membership; revenue-by-period | write volume; revenue aggregation |
| **memberships** | ×3–10 members; 50M+ | append; current-by-member; dashboard/sweep | sweep scan; cache maintenance |
| **audit_logs** | steady, very high | append; feed; entity history | write volume; partition candidate |
| **notifications** | expiry-driven | unread queue/count; dedupe | queue scan |
| **members** | 10M+ | active list; partial search | search latency |

**UUID v7 directly mitigates the top write risk:** time-ordered PKs keep inserts at the right edge of each PK B-tree on payments/audit_logs/memberships, avoiding random-key page splits and index bloat (see identifier-strategy §1.1). This is the single biggest structural win for the heaviest tables.

---

## 2. Index coverage vs the §5 hot queries

| §5 query (freq/target) | Backing index | Verdict |
|---|---|---|
| Active members list, sort name (VH, <300ms) | `members(gym_id,status,full_name)` (R-1, applied) | ✅ filter **and** sort served in one index |
| Member partial search (VH, <300ms) | `members` GIN trigram on `full_name` | ✅ (pg_trgm) |
| Member by exact contact (H, <50ms) | partial unique `(gym_id,phone)`/`(gym_id,email)` | ✅ |
| Member's membership history (H) | `memberships(gym_id,member_id)` | ✅ |
| Current membership for a member (H, <50ms) | `memberships(member_id,cached_status)` | ✅ accelerator |
| Dashboard/sweep: expiring within N & expired (H/L, <1s) | `memberships(gym_id,cached_status,cached_effective_end_date)` | ✅ the central composite |
| New memberships this month (H) | `memberships(gym_id,created_at)` | ✅ |
| Payment ledger for membership (H, <100ms) | `payments(gym_id,membership_id)` | ✅ |
| Revenue for period (H, <1s) | `payments(gym_id,received_at)` + `(gym_id,entry_type,received_at)` | ✅ |
| "Is this payment voided?" | `payments UNIQUE(voids_payment_id)` | ✅ |
| Unread queue/count (VH, <100ms) | `notifications(gym_id,state)` | ✅ |
| Dedupe on generation (L) | `notifications UNIQUE(gym_id,dedupe_key)` | ✅ |
| Active plans (H, <50ms) | `plans(gym_id,is_active)` | ✅ |
| Resolve permissions (VH every action, <20ms) | `gym_users UNIQUE(gym_id,user_id)`, `role_permissions(role_id)` + session cache | ✅ |
| Audit feed / entity history / by-actor | `audit_logs(gym_id,occurred_at)`, `(gym_id,target_type,target_id)`, `(gym_id,actor_user_id,occurred_at)` | ✅ |

**Every hot query has a backing index.** The only gap is a sort optimization (R-1).

---

## 3. Findings

### 3.1 Justified recommendation (proposal — would amend DDS §4)

- **R-1 — member active-list sort.** The default, **very-high-frequency** screen is `WHERE gym_id=? AND status='ACTIVE' ORDER BY full_name`. Today `(gym_id,status)` serves the filter but the sort needs a separate sort step; `(gym_id,full_name)` serves the sort but not the status filter. **Propose** a single covering composite **`members(gym_id, status, full_name)`**, which serves filter **and** ordered scan in one index — directly improving the most-used list toward its <300ms target at 10k+ members.
  - *Disposition:* if accepted, **replace** `(gym_id,full_name)` with `(gym_id,status,full_name)` (the plain name index is then redundant unless an all-status name sort is needed) and update DDS §4. Trigram GIN continues to serve partial search. **Low risk, high frequency → recommended.**

### 3.2 Redundancy check (no action needed)

- `payments(gym_id,received_at)` vs `(gym_id,entry_type,received_at)` — **not** redundant: the former serves period scans without an entry-type predicate; the latter serves "revenue excluding voids" (`entry_type='PAYMENT'`). Keep both; revisit only if write cost on payments becomes the bottleneck (then prefer the 3-col and drop the 2-col).
- `memberships(member_id,cached_status)` vs `(gym_id,member_id)` — different lead columns, different queries (current-status accelerator vs member history). Keep both.
- No duplicate or shadowed indexes detected.

### 3.3 Expensive joins / aggregations

- **Outstanding balances read model (§6).** Computed as `snapshot_price − Σ(non-voided PAYMENT amounts)` per Active membership — an aggregate over `payments` grouped by `membership_id`. At small/medium volume this is fine on `payments(gym_id,membership_id)`. **At scale**, "all Active memberships with balance>0" fans out across many ledgers. *Recommendation (scale-triggered, optional):* introduce a **labelled, recomputable per-membership cached balance** (DDS §1.6 permits this) maintained on payment write + nightly reconcile — **only when a measured query misses target** (avoid premature optimization, DDS §6). Not needed for MVP.
- **Permission resolution** is a 3-hop join but is **cached per session** (§6, <20ms) and invalidated on mapping change — no hot-path join cost. ✅
- **Revenue SUM** over `BigInt` returns `numeric` in Postgres — **no overflow** even at 100M+ rows. ✅
- **Member profile / payment history** read models are id-keyed joins on indexed FKs — within targets. ✅

### 3.4 Bottlenecks & hot-spots

- **Daily sweep** scans `memberships(gym_id,cached_status,cached_effective_end_date)` and writes cache columns — the composite makes the scan range-bound per gym; writes are bounded by the changed set. ✅ Risk only if the sweep runs cross-gym unbatched — run **per gym** (tenant-isolated) so each touches only its slice (DDS §7).
- **Notification unread count** on a busy gym is a `COUNT` on `(gym_id,state)` — fine; if a gym accumulates huge UNREAD volume, consider a counter cache (future).
- **Cache write amplification** on memberships during sweeps/freezes is acceptable (bounded set); UUID v7 keeps these row updates from scattering index pages.

---

## 4. Scaling risks & forward plan (consistent with DDS §7/§14)

| Risk | Trigger | Mitigation (already anticipated) |
|---|---|---|
| payments/audit_logs/memberships table+index size | Large/Enterprise | **Partition by `gym_id` (hash) or time (range)** — DDS §7/§14/§16; UUIDv7 + `gym_id`-leading indexes keep per-gym scans local meanwhile |
| Revenue/dashboard aggregation latency | measured > target | nightly **materialized rollups** (DDS §6) — only when measured slow |
| Outstanding-balance fan-out | measured > target | cached per-membership balance (§3.3) |
| Cross-gym total volume | many tenants | **no cross-gym query exists** → total size doesn't degrade tenant queries (DDS §7) |
| Search broadening to phone/email | product ask | add trigram GIN on phone/email (DDS §4 "future candidates") |
| Multi-branch dashboards | feature ships | `memberships(gym_id,branch_id,cached_status)` (DDS §4 future candidate) |

---

## 5. Recommendations summary

| ID | Recommendation | Justification | Status |
|---|---|---|---|
| **R-1** | Add `members(gym_id,status,full_name)`; drop `(gym_id,full_name)` (and the subsumed `(gym_id,status)`) | VH active-list filter+sort | ✅ **Approved & applied 2026-06-25** (perf optimization, not a business requirement) — schema + DDS §4 updated |
| R-2 | Cached per-membership balance | outstanding-balance fan-out at scale | **Defer** until measured |
| R-3 | Materialized revenue rollups | dashboard latency at scale | **Defer** until measured |
| R-4 | Partition payments/audit_logs/memberships | Large/Enterprise volume | **Future** (already in DDS §14) |
| R-5 | Trigram GIN on phone/email | search broadening | **Future** (DDS §4) |
| R-6 | Append-only triggers on payments/audit_logs | defense-in-depth for INV-21/39 | **Recommended** (in migration spec §9) |

**MVP verdict:** performance design is sound and matches the DDS targets. Only **R-1** is worth doing before bootstrap (cheap, high-frequency); the rest are correctly deferred until a measurement justifies them (DDS §6 "avoid premature optimization").
