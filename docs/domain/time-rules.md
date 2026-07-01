# Time Rules
### PULSE Gym SaaS · Domain Documentation · Temporal Governance

| | |
|---|---|
| **Status** | ✅ Authoritative — the single source of truth for time/date behavior |
| **References** | `business-rules.md` (MSH-*, REN-*, FRZ-*, NTF-*), `money-rules.md`, `business-invariants.md`, ADR-009 |

> Time bugs are silent and expensive: a membership that expires a day early, a freeze that doesn't extend, revenue counted in the wrong month. These rules fix one consistent model — **store in UTC, judge in the gym's time zone, reason in whole business days.**

---

## 1. Timezone Strategy
- Each **gym** has a configured **time zone** (a setting). It is the single reference for judging "today," expiry, period boundaries, and reporting windows for that gym.
- A gym's time zone is **authoritative for all its temporal decisions**; server location is irrelevant.
- Multi-branch gyms use the **gym** time zone in MVP; per-branch time zones are a future consideration.

## 2. UTC Storage
- All timestamps are **stored in UTC**, unambiguously (ADR-009).
- UTC is the storage/transport truth; it is **never** the basis for business-day decisions directly — those convert to the gym time zone first.

## 3. Local Display
- All dates/times shown to staff are **converted to the gym time zone** for display.
- Display formatting is presentation-only and never written back as the stored value.

## 4. Business Day
- Membership periods, expiry, "expiring soon," "new this month," and revenue periods are reasoned in **whole calendar days / months in the gym time zone** — not in raw instants.
- **"Today"** = the current calendar day in the gym time zone.
- A membership's **end day is inclusive**: the member has access through the end of that day (gym time zone); expiry takes effect the **day after** (MSH-5).

## 5. Membership Start
- A membership's **start date** is a calendar day in the gym time zone (default: today; may be set/overridden by an authorized actor — MSH-1).
- Access begins at the start of the start day.

## 6. Membership End
- **End date = start date + plan duration** (captured at sale — MSH-2), expressed in whole days/months per the plan's duration unit.
- The end day is inclusive (§4). **Expired** begins the day after the end date (MSH-5).

## 7. Upgrade Timing (deferred model)
- An **Upgrade** does **not** change the current period's dates. The current membership runs to its scheduled end.
- The upgraded (Scheduled) membership's **effective start = the day after the current membership's end** (UPG-1, MSH-7); it activates automatically at that boundary.

## 8. Renewal Timing
- **Renewal** continues into a new period starting the **later of today or the day after the current end date** (REN-1) — early renewal preserves remaining days (the new period is Scheduled until the current ends).
- Renewal **after expiry** starts a new period **today** (immediately Active).

## 9. Freeze Timing
- A **Freeze** stops the clock for a defined number of **whole days** (gym time zone).
- On **resume**, the membership's **end date is extended by exactly the frozen duration** (FRZ-2), preserving the full paid number of access days.
- A frozen membership does **not** expire while paused and is excluded from expiry evaluation (FRZ-3).

## 10. Notification Window
- A membership is **"Expiring Soon"** when, in the gym time zone, its end date is within the gym's configured **warning window** (default **7 days**) — MSH-4.
- An **"Expired" alert** is generated only while, in the gym time zone, the membership expired **within the recent window** (system default **7 days** after the effective end date — i.e., the first 7 days it is Expired, the day after the inclusive end through the 7th day after it). From the 8th day onward the lapse is **historical** and raises **no new alert** (NTF-5). This bounds **generation only** — status, dashboards, reports, and history still count every expired membership.
- Expiry/expiring evaluation runs on a **regular sweep (at least daily)** against "today" in the gym time zone (NTF-2), and is **non-duplicating** (NTF-3).
- **Dashboard "expiring within 7/30 days"** buckets are computed the same way but are **range counts**, distinct from the per-membership Expiring-Soon indicator (RPT-2).

## 11. Grace Period
- **MVP has no grace period:** access ends the day after the end date (MSH-5). "Expiring Soon" is a *warning*, not extra access.
- A **configurable post-expiry grace period** is a defined future capability (it would extend access by N days before Expired takes effect) — additive, per gym.

## 12. Determinism & Evaluation
- Temporal states (**Active, Expiring Soon, Expired, Scheduled→Active**) are **derived** by evaluating immutable dates against "today" in the gym time zone — never stored as a mutable flag that can drift (`immutable-history.md` H-5).
- The daily sweep makes time-based transitions (expiry, scheduled activation, expiring alerts) observable and is **idempotent** (re-running the same day changes nothing).

## 13. Business Invariants (time)
- **T-1** — All timestamps are stored in UTC; all business-day decisions are made in the gym time zone.
- **T-2** — "Today," expiry, period boundaries, and reporting windows are whole-day/month in the gym time zone.
- **T-3** — End day is inclusive; Expired begins the day after the end date.
- **T-4** — Frozen days extend the end date exactly; frozen memberships never expire while paused.
- **T-5** — A Scheduled (upgrade/renewal) membership activates exactly the day after its predecessor's end; **Active periods never overlap** for one member.
- **T-6** — Time-derived states are recomputed from immutable dates, never stored as mutable truth.
- **T-7** — The expiry/notification sweep is idempotent and non-duplicating.

*(These feed `business-invariants.md`.)*
