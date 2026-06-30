# Sprint 1 · Epic 3 — Retrospective (Membership Plans)

**Outcome:** the second CRUD slice landed clean in Fast Delivery Mode, and it introduced the project's **money handling** without a single float touching a stored amount. The Members pattern (module + minimal catalog components + URL-param filters + explicit-`principal` service) ported almost verbatim; the only genuinely new surface was money mechanics.

## What went well
- **Money was isolated to one pure module (`lib/money.ts`) with the server as the single parse authority.** No business policy leaked in (it's parse/format only), and the `CurrencyInput` never has to be trusted — it submits a string, the service converts to exact `BigInt` minor units. The end-to-end proof (`"29.99"` → `2999n` in the DB) is one assertion that covers the whole path.
- **Pattern reuse kept the slice small.** DataTable/StatusBadge/Pagination from Epic 2, plus three new catalog components (MetricValue/CurrencyInput/TextArea) born minimal — the marginal cost of each new list feature is dropping.
- **Carried Epic-2's review lessons forward proactively:** asserted the status filter + search (not just "it compiled"), and kept `toData` to exactly the user fields so `tier`/`archivedAt`/currency-on-update can't be silently written.

## What was tricky / judgment calls
- **`isActive` vs `archivedAt`.** The schema has both; the user wanted one "Active/Archived" status. The permission key (`plans.deactivate`) and PLN-2/PLN-4 made `isActive` the unambiguous choice — `archivedAt` stays reserved. Flagged for veto rather than inventing a second status concept.
- **Money display and hydration.** Formatting money in a `"use client"` component with the ambient locale is a latent hydration-mismatch bug that never shows in dev (same machine/locale). Keeping `MetricValue` a **plain Server Component** and formatting server-side removed the risk entirely; `CurrencyInput` is the only money component that needs the client.

## Caught in verification (worth internalizing)
- **The seed gym's currency is mutated to EUR by the gym integration test** — a hardcoded `expect(currency).toBe("USD")` failed. Lesson: integration tests share one seeded DB; assert against **dynamically-read** state (the gym's actual default currency), never a hardcoded seed value another suite can change. The money proof (`2999n`) survived only because USD/EUR are both 2-decimal.

## Carry forward
- When Memberships (Epic D) snapshot a plan's terms, reuse `lib/money` for the captured price and **never** re-derive from the live plan (PLN-3/M-8: edits affect only future memberships).
- If a 0- or 3-decimal currency ever becomes the seed/test gym default, revisit the `2999n` literal in the plans money proof (compute expected minor from the currency instead).
- `CurrencyInput` blur-formatting/grouping is deferred; add it if a story needs nicer money entry.
