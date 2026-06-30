# Sprint 1 · Epic 4 — Membership Lifecycle · Retrospective

**Outcome.** The core business engine shipped as one vertical slice: the full membership lifecycle (create/view/renew/upgrade/freeze/resume/cancel) + a derived-status engine, on the existing platform with **no schema change, no new permission key, no new pattern**. All gates green (123 unit, 68 integration, build).

## What went well
- **Deriving status instead of storing it** kept the rules-dense part honest: one pure function (`lifecycle.ts`) decides Active/Scheduled/Frozen/Expired/Cancelled from immutable dates + freeze state; `cached_*` stayed a write-path accelerator. This made the invariants testable as pure units before any DB was involved.
- **One date helper** (`dates.ts`) for inclusive-end, month-end clamping, and day-diffs meant remaining-days, expiring-soon, renewal-start, and frozen-days could not drift apart — and the month-end edges (Jan 31 +1mo, leap Feb) were caught by unit tests, not production.
- **The advisor call before writing** changed the design's spine: gating SCHEDULED→ACTIVE on the *predecessor's derived terminal state* (not the stored date) is what keeps INV-13 correct under freeze. That would have been a subtle, expensive bug.

## What was tricky / decisions forced by the constitution
- **Captured fields with no column.** The brief listed Notes / Responsible Trainer / Freeze Reason / Cancellation Reason, none of which have a Membership/Freeze column. "No schema change" + single-ownership (INV-37) forced omitting them (flagged for veto) rather than faking inputs or writing across module boundaries.
- **Server-only db in a client bundle.** The client lifecycle-controls importing the `MembershipStatus` *enum value* dragged `pg` into the client build. Fix: type-only import + status string-literal comparisons — the same shape the existing client components already use.
- **Write-on-read avoided.** The brief floated lazy-recompute-on-read; choosing to derive live on read and persist activation only on writes removed a `Serializable` tx from every page view and the impossible mid-render `revalidatePath`.

## Follow-ups (for the human)
- Decide the veto items in the verification report (esp. the omitted captured fields → a future migration, and Resume = `memberships.freeze`).
- A future **daily sweep** would persist expiry/activation and back a scalable memberships list (the current list leans on `cached_status` as an accelerator).
- Epic 5 (Payments) will wire the deferred ARC-3 balance precondition and the membership↔payment attribution (INV-20/38).
