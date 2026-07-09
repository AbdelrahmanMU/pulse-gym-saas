# Sprint 2 — W2: Membership Rail Foundation — Implementation Report

**Date:** 2026-07-03 · **Branch:** `feat/platform-foundation` · **Phase:** W2 only (per the frozen
build authority `member-workspace-design-authority.md`; W1 accepted).
**Scope kept:** rail, expandable cards, current/next/past rendering, connectors, gaps,
cancellation, A-1, tests. **Not touched:** payments ledger/actions (W3), alerts (W5), member list
(W4), lifecycle/permissions/notifications/schema/services' business logic.

---

## 1. Implementation Summary

**A-1 read model** — `getMemberMembershipTimeline(principal, memberId)`
(`modules/memberships/service.ts`): every membership of one member as immutable rail entries,
derived through the **existing** `deriveMemberLifecycle` engine (composed, never recomputed — the
same one query + local active-freeze set as every read path). Payload: derived
status/effective-end/remaining/expiring, snapshots (plan/price/duration), chain facts
(`origin`, `predecessorMembershipId`, `scheduledEffectiveFrom`), freeze episodes (oldest first,
open + finalized), the display-only frozen projection (same non-authoritative rule as the detail
page), `cancelledOn/ByName`, `soldOn/ByName` (gym-tz calendar days), `joinedOn`, and `today` (so
presentation never consults a clock). Newest first. `memberships.read`-gated; cross-gym/unknown
member → 404. RSC wrapper `loadMemberMembershipTimeline`; exported via the module's public index.

**Per-card money facts** — `getMemberPaymentSummaries(principal, memberId)`
(`modules/payments/service.ts`): one query, the single `summarizeLedger` per membership.
Deliberately **not** the aggregate "outstanding" definition: a card states its own ledger truth,
so cancelled (written-off in aggregates) and unstarted scheduled memberships are included — this
is the §0.3 separation, visible in scenario F where the strip says *Paid up* while the cancelled
card says *Owes E£1,200*. `payments.read`-gated; foreign member → empty. This implements the
review §11 payload addition; it lives in the payments module because money derivation may never
leave it.

**Pure rail grammar** — `modules/memberships/rail-model.ts`: `buildRailSegments` turns the A-1
order into segments — cards (slots `current`/`next`/`past` from derived status; INV-12 makes the
first two singular), origin-labeled connectors on predecessor match (`renewed` / `upgraded` /
`smaller-plan`), explicit gap markers (a cancellation cuts coverage at its cancel day), the
lapsed `gap-to-now` head, the conditional `renewal-warning` head (§D5.2), and `severedBelow` on
cancelled cards. Presentation-only adjacency arithmetic; zero lifecycle rules.

**Rail UI** (catalog §13.3/§13.4, flipped to implemented):
- `modules/memberships/ui/membership-rail.tsx` — the `<ol>` (chronology is semantic), glue rows
  (connector lines, dashed gap segments, warning heads), "Joined the gym" terminus,
  empty state ("No memberships yet." + Sell CTA), and the "Show older" split after 5 past cards
  (glue hides/shows with the card below it, which it describes).
- `modules/memberships/ui/membership-rail-card.tsx` — the expandable card: one-line header
  (plan · coverage `<time>` · `MembershipStatusBadge` · the ONE money fact `Paid ✓ / Owes … /`
  `unpaid …`), panels in fixed order **Coverage → Freezes → Payments(summary)**, each rendered
  only with content. Current = brand accent-bar + expanded by default; Next = dashed + collapsed;
  past = muted + collapsed. **No actions on any card** (W3).
- `modules/memberships/ui/membership-rail-client.tsx` — expansion state + WAI-ARIA disclosure
  only; all content is server-rendered and passed through. Multiple cards may be open; state is
  per-visit.

**Workspace wiring** — the Zone-2 interim body (W1's `View memberships` `?q=` link + standing
empty state) is replaced by the rail; the `?q=` name-search link is retired exactly as the
authority planned. The Answer Strip is untouched (see §5).

**D14 label fix** — `PaymentStandingBadge` labels → `Paid / Partly paid / Unpaid` (frozen
vocabulary; enum untouched; no test pinned the old labels).

**New public entries** — `modules/plans/index.ts` (exposes the single `formatDuration`) and
`PaymentStandingBadge` via `modules/payments/index.ts`: the rail needed both cross-module, and
modules may only import each other's public index (fitness rule ③).

## 2. Architecture Notes

- **Composition, not ownership.** The rail renders what the lifecycle engine derived and what the
  ledger summarized. A-1 adds zero derivation logic (`deriveMemberLifecycle`,
  `deriveFreezeProjection`, `summarizeLedger` are all pre-existing single homes). The one new
  "logic" file (`rail-model.ts`) is adjacency/copy classification and is pure + unit-tested.
- **Server/client split.** Card content (money, dates, badges) renders on the server; the client
  owns only `aria-expanded` state ("Disclosure content server-side" — the same pattern as W1's
  Disclosure). No `@pulse/db` values enter the client bundle through the rail.
- **Mutation pipeline untouched.** No action, permission, invariant, schema, or service-ownership
  change. The A-serie reads follow the exact envelope the human approved (Plan A).
- **Freshness note:** lifecycle actions revalidate `/memberships` + `/dashboard` but not
  `/members/[id]`; the workspace is a dynamic page (fresh per request; Next 15 dynamic router
  cache staleTime 0), so the rail is current on every navigation. If a future Next version
  changes that default, the actions' revalidate lists should gain the member path.

## 3. Visual Decisions

- **Header dates are short** (`Jun 23 → Jul 22`, machine-readable ISO in `datetime`); the
  expanded Coverage panel carries full dates ("Started Jun 23, 2026 · Ends Jul 22, 2026 (last day
  included)"). The authority's own header examples omit years; years live one tap away.
- **Next sits above Current on the newest-first rail** (authority §D5.1 — the future above the
  present), joined by the labeled connector, so the Current↔Next relationship is adjacent and
  explicit. The W2 brief's "Current ↓ Next" sequence is read as this adjacency; the approved
  authority settles placement, and re-ordering just the pair would break the rail's single
  chronological axis.
- **Rail line as indented segments**: connectors carry a solid left line, gaps a dashed one, and
  the line goes transparent under a cancelled card (the severed rail) — sequence reads before
  text. The current card alone carries the 3-pt brand accent bar; past headers are muted.
- **`gap-to-now` and `NO RENEWAL QUEUED` render as warning-toned heads** with icon + label (never
  color alone). The renewal warning carries no inline `[Renew]` yet — actions are W3.
- **Expansion anchors** with `scrollIntoView({block:"nearest"})` — the tapped header never runs
  away; no scroll jump when the card is already fully visible.

## 4. Scenario Verification

| Scenario | Integration (A-1 data) | Unit (rail grammar) | Visual evidence |
|---|---|---|---|
| A Current only | shape/ordering tests | lone-card test | `scenario-A-desktop.png` |
| B Current + Next | renewal-chain test (ids, origins, dates) + rail-kinds composition check | next/connector test | `scenario-B-desktop(.dark)/-mobile.png` |
| C Freeze → Resume | open episode + projection, then finalized 5-actual-days + end +5 (INV-18) | — (derivation owned by lifecycle tests) | `scenario-C-desktop.png` |
| C2 Currently frozen | same test (open state) | — | `scenario-C2-desktop.png` |
| D Renewal | chain test | renewed connector label | `scenario-D-desktop.png` |
| E Upgrade | origin UPGRADE + both plan names | upgraded + smaller-plan labels (never "downgrade") | `scenario-E-desktop.png` |
| F Cancellation | `cancelledOn`/`ByName` + derived CANCELLED | severed + cut-day gap + gap-to-now tests | `scenario-F-desktop.png` |
| G Coverage gap | 28-day gap composition check | gap/no-gap/contiguous tests | `scenario-G-desktop.png` |
| H Long history | 8-chain: order, links, one current | 8-cards/7-connectors test | `scenario-H-desktop(.dark)/-mobile.png` (Show older engaged) |
| Expansion / viewports / dark / overflow | — | — | e2e "membership rail (W2)": sell→renew journey, `aria-expanded` toggling, 44-pt headers, no horizontal scroll at 375, axe at 1280 + 375 + dark |

P0 isolation: cross-gym member → 404 (timeline) / empty (summaries); unknown id → 404; both reads
deny without their permission. (`tests/integration/member-timeline.test.ts`, 12 tests.)

**Gates (all green):** TypeScript · ESLint · architecture/token/UI-layering fitness ·
**191 unit** (178 + 13 rail-model) · **107 integration** (95 + 12) · **39 e2e** incl. axe ·
production build. One full-suite e2e run flaked on first attempt and passed 39/39 on the
immediate rerun (single-worker dev-server suite; known flake class, no assertion changed).

## 5. Known Limitations / W3+ TODOs (deliberately not implemented)

- **W3 — Payments in-card:** ledger rows, `[Void]`, the record form + quick-fill chip, PAID
  retirement line; the Payments panel currently shows the summary line + standing only.
- **W3 — Actions:** card Panel 4 (Renew/Freeze/Resume/⋯ Cancel), the inline `[Renew]` inside the
  NO-RENEWAL-QUEUED warning, and the strip's full computed primary (rules 1/3/4) + frozen L2
  grammar — the strip still renders its W1 standing-chip grain, and the e2e journey renews via
  the record page (the current canonical mutation surface).
- **W4 — two-slot member list; W5 — Alerts card.**
- The Answer Strip's coverage line and the rail both call member-grain derivation (standing +
  A-1); once W3 rewires the strip onto A-1, the standing read on this page can be dropped.
- `soldOn` is the record's creation timestamp (gym-tz day) — correct for real sales; QA fixtures
  built "in the past" via fake clocks show today's date on connectors (test data artifact only).
- Screenshot fixtures live in the dev DB as clearly-named `QA Rail *` members (built through the
  real mutation pipeline with fake clocks) — kept for human review of W2; archive/ignore freely.

## 6. Evidence Screenshots

`docs/sprints/assets/w2-membership-rail/` — 13 captures: scenarios A–H desktop light, B + H
mobile (375) and desktop dark, H with "Show older" expanded (8-membership chain).

## 7. Retrospective

- **What worked:** the pure `rail-model` made every timeline-semantics rule cheaply testable
  before any pixel existed; the server-content/client-shell split kept money/date formatting in
  one (server) place; building screenshot fixtures through the real services with fake clocks
  produced honest, reproducible visual evidence.
- **What bit:** hidden-panel copy broke naive `getByText(...).first()` e2e assertions (collapsed
  cards keep their panels in the DOM under `hidden`) — fixed with visible-filtered locators;
  a fixture ordered against chronology tripped INV-12 exactly as the invariant should.
- **Honest debt:** the rail's visual "line" is segmented indents rather than one continuous
  drawn rail; if design review wants a literally continuous line, that's a token/CSS refinement,
  not a structural change.
