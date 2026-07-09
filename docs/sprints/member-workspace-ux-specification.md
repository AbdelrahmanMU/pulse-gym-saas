# Member Workspace — UX Specification (presentation layer only)

**Date:** 2026-07-03 · **Branch:** `feat/platform-foundation` · **Type:** Specification — **no implementation in this task.**
**Authority chain:** this is the full specification that `product-architecture-review-member-centric-workspace.md`
(verdict **MODIFY**, 2026-07-02) called for. Its rulings are honored throughout: the workspace is the
**Job A** ("member in front of me") surface; every global list survives as the **Job B** (cross-member
triage) layer. Continuity also with `operational-ux-review-memberships-projection-and-billing.md`
(Option A LIVE projection, shipped) — this spec is the deferred **Option B destination**, re-scoped.

**Hard constraints (restated, honored):** no change to database, domain model, membership lifecycle,
renewal implementation, payments, notifications engine, services' business logic, or permissions.
Memberships remain immutable; renewals keep creating new Membership records. This document redesigns
**presentation and information architecture only**. Where a section needs a read that does not exist
as a public function today, that is declared in §5 (Data Composition) and ruled on in §8 — never
assumed.

---

## 0. TL;DR

- Enrich `/members/[memberId]` into the **Member Workspace**: identity header + 8 composed sections
  (Overview · Current Membership · Billing Summary · Payment History · Membership Timeline ·
  Notifications · Trainer · Operational Actions), each permission-gated by its owning module's
  existing key, composed exclusively through public module reads — the same pattern the membership
  detail page already ships.
- The **Membership Timeline** renders the member's immutable periods as **chapters of one story**:
  period segments connected by origin-labeled transitions ("Renewed", "Upgraded"), freeze/resume
  nested inside their period, gaps in coverage shown explicitly. The operator never sees "many
  unrelated memberships" — they see one continuous membership history.
- **Memberships list:** collapse the **default LIVE view to one operational row per member**
  (current period + a "Next" chip for the scheduled one). Every explicit status filter and
  "All (incl. history)" keep today's **period-grain rows** — Job B triage semantics are untouched.
  History stays reachable through the workspace timeline (the precondition the prior reviews set).
- Terminology shift in copy only: the UI says **"period"** for a Membership record inside a member
  context; the domain word Membership is unchanged in code, routes, and the global list.
- Six sections need **zero** new reads. Two need **additive, read-only query capabilities**
  (member-scoped timeline; member-scoped notifications) — the same honest fork the prior review's
  §7 raised; §8 presents Plan A (recommended) and a strict Plan B fallback.

---

## 1. UX Specification

### 1.1 The operating principles

1. **One member, one screen, whole operational truth.** The receptionist selects a member once and
   can answer every desk question — is she covered, until when, does she owe money, is something
   frozen, who trains her, what do I do next — without a second search or a module hop.
2. **The member owns one membership story, not N membership records.** Immutability is an
   accounting fact, not a UX concept. Records appear as *periods* of one continuous relationship.
3. **Contextualize for the member; preserve for the gym** (prior review's generalized rule).
   Nothing in this spec removes or demotes a global triage view.
4. **Compose, never re-derive.** Every value shown is produced by an existing module's public read
   (or a declared additive read) with its own permission gate. The workspace adds no business
   interpretation of its own.
5. **Progressive disclosure by urgency** (v1.2 §6 operational-first): money and next-action first,
   identity and audit last. On mobile the same DOM order stacks top-to-bottom.

### 1.2 The workspace layout model

**Anchor components (all catalogued):** `MemberProfileHeader` (with-tabs variant — catalog §5) as
the identity + action header, docking `Tabs` (catalog §2, URL-synced). Sections group into **4 tabs**
(≤6 per catalog rule):

| Tab | Sections | Rationale |
|---|---|---|
| **Overview** (default) | Overview strip · Current Membership · Billing Summary · Operational Actions | The desk view — answers 90% of walk-up questions with zero clicks |
| **History** | Membership Timeline · Payment History | The "explain this member's past" view |
| **Notifications** | Notifications | Owner-only in MVP (TD-3); tab hidden without `notifications.read` |
| **Profile** | Trainer · Contact · Details · Member Lifecycle (archive/reactivate) | Low-frequency identity/admin data |

Tabs are **deep-linkable** (`/members/[id]?tab=history`) and keyboard-complete per the catalog's
WAI-ARIA contract. A tab whose *every* section is permission-hidden does not render at all. Below
`md`, tabs use the catalog `scrollable` variant (never two rows); the tab list sits under the
header, sticky with it.

> Why tabs and not one long page: with all 8 sections stacked, the mobile page exceeds ~6 viewports
> for a tenured member (measured against the current membership detail, which is ~4.5 viewports with
> half this content — the problem v1.2/AP-5 existed to fix). Tabs keep the Overview tab within
> ~2 viewports at 375px. Catalog Tabs' own usage line names exactly this page.

### 1.3 Section specifications

Every section renders inside the existing bordered `Section` card idiom (`SectionHeader` semantics,
`h2` headings). Per-section permission = the owning module's existing key; a missing permission
hides the section silently (exactly the shipped behavior on both detail pages today).

#### S1 — Overview (strip, not a card)
Directly under the header; always present with `members.read`.
- `MemberStatusBadge` (member ACTIVE/ARCHIVED — members module).
- The **standing chips** exactly as shipped (`MembershipStandingChips` over
  `getMemberMembershipStanding`): Active / Frozen / Scheduled / No live membership.
- **Owed chip** (`payments.read`): from `getMemberOutstandingBalance` — `MetricValue` currency +
  warning `*-text` token + icon when > 0; absent when 0 (absence of a warning is the calm state;
  the Billing section still shows the explicit "Paid in full" confirmation).
- One line of meta: trainer name · member since (`<time>`).
This strip is the "eyes lift from the queue, answer in one second" surface.

#### S2 — Current Membership
The member's **operational now**. Contents when a live period exists (derived status ACTIVE or
FROZEN — INV-12 guarantees at most one):
- `MembershipCard` (catalog §6, `current` variant, brand left-bar): plan name (snapshot),
  `MembershipStatusBadge` (+ expiring-soon), period start → effective end (inclusive, `<time>`,
  mono), remaining-days label (existing `remainingDaysLabel`), snapshot price (`MetricValue`).
- While FROZEN: the shipped freeze facts — planned days, projected end **labeled "estimate"**
  (display-only projection, never authoritative — FRZ-2/INV-18 wording reused verbatim).
- If a SCHEDULED period also exists: a nested **"Next period"** row (compact `MembershipCard`):
  plan · starts `<time>` · price. This kills the "two unrelated rows" feeling at the source — the
  scheduled record is presented as *the continuation*, not a sibling.
- **Open full record →** link to `/memberships/[id]` (the immutable contract page stays the
  canonical home of the full lifecycle surface; the workspace never duplicates it wholesale).
- Empty state (no live period): `EmptyState` with the most recent terminal period summarized
  ("Last period ended <date> — Expired") + the primary **Sell membership** action
  (`memberships.create`). The empty state must answer "so what do I do?" — never a bare "none".

#### S3 — Billing Summary
Gated by `payments.read`; scoped to the **current period** (payments are always against one
membership snapshot — INV-20; there is no member-level "account balance" in the domain and this
spec must not invent one).
- Reuse `PaymentSummary` (price / paid / remaining / standing badge) over
  `loadMembershipBilling(currentMembershipId)` — the identical component + read the membership
  detail ships. Behavior is *relocated*, not re-implemented.
- `RecordPaymentForm` (`payments.record`) with the shipped PAID-retirement rule (quiet
  "Paid in full — no balance due" confirmation once standing is PAID; the form returns if a void
  re-derives standing).
- If a **scheduled** period exists and carries its own balance: a second, clearly-labeled summary
  block "Next period billing" (same components, that membership's id). Collecting renewal payment
  at sell-time is the desk's most common flow; hiding it behind the membership page would undo the
  workspace's purpose.
- If no live/scheduled period: section hidden (nothing ownable to bill against); the Timeline's
  period entries link to historical billing.

#### S4 — Payment History
Gated by `payments.read`. **History tab.**
- MVP scope: `PaymentHistory` (with void, `payments.void`) for the **current + scheduled periods**,
  under period subheadings ("Current period — Gold Monthly, started 2026-06-01").
- Older periods: reached through their Timeline entry → `/memberships/[id]` → Payment history
  (already shipped). A consolidated cross-period member ledger is a **flagged enhancement**
  (§5 D-3), not MVP — it needs a new member-grain payments read and its absence costs one click
  only for archival questions.

#### S5 — Membership Timeline *(the centerpiece — see §2 for the full model)*
Gated by `memberships.read`. **History tab** (and the Current Membership card shows the last
transition inline, e.g. "Renewed from Silver Monthly on 2026-05-30", so the Overview tab carries a
one-line echo of the story).

#### S6 — Notifications
Gated by `notifications.read` (Owner-only until TD-3 is revisited — the tab simply doesn't exist
for others; that is a permission fact this spec respects, not changes).
- This member's alerts (expiry warnings today), newest first, reusing `NotificationItem` with the
  existing Unread → Read → Dismissed affordances (same actions, same server actions).
- Global queue and TopBar badge unchanged.

#### S7 — Trainer
**Profile tab.** Exactly the shipped section: `AssignTrainerForm` with `assignments.manage`,
read-only name with `assignments.read`. Also surfaced read-only in the header meta
(`AssignedTrainerBadge` semantics). No behavior change.

#### S8 — Operational Actions
Not one card but a **placement rule** — actions live where the operator's eye already is:
- **Header primary action** (context-aware per catalog MemberProfileHeader): *Sell membership* when
  no live period; *Renew* deep-link when the current period is expiring/expired (`memberships.renew`
  reaches the existing controls on the membership page); *Record payment* becomes the visually
  primary affordance inside Billing when remaining > 0.
- **Current Membership card** hosts the lifecycle entry point: **Manage period →**
  `/memberships/[id]` where the shipped `MembershipLifecycleControls` (renew/upgrade/freeze/cancel,
  permission- and status-gated) remain canonical. **Rationale:** those controls mutate a specific
  immutable contract; keeping one canonical mutation surface avoids drift and honors "reuse the
  blessed one" (prior review Phase 2 wording). Embedding them in the workspace is a **later,
  reversible enhancement** (§5 D-2) once the workspace is proven.
- **Member lifecycle** (archive/reactivate + edit): Profile tab, unchanged behavior including the
  archive policy guard (ARC-3/INV-11).
- **Mobile:** the `StickyMobileActionBar` carries the header primary + Edit, exactly the shipped
  pattern (v1.2 §12.3).

### 1.4 States, a11y, responsive (gate criteria)

- **Empty/edge states:** every section defines one (S2's is specified above; S4/S5 with no history:
  "No past periods yet"; S6 with none: "No alerts for this member"). No section ever renders a bare
  empty card.
- **Permission-partial views** are first-class: a receptionist with only `members.read` +
  `memberships.read` sees Overview (minus owed chip), Current Membership, Timeline, Trainer
  (read-only), Profile — a coherent page, not a Swiss cheese. Verified per persona in tests.
- **A11y:** one `h1` (member name, in MemberProfileHeader); tabs = full WAI-ARIA pattern; every
  status via badge (icon + label + `*-text`, never color alone); dates in `<time>`; money via
  `MetricValue`; timeline is an ordered list (`<ol>`). Axe at 375 + 1280 + dark on the workspace
  with each tab active.
- **Responsive:** one DOM order (§5.11); Overview tab ≤ ~2 viewports at 375px; 44px targets
  (v1.2 §5.4); tabs scrollable variant below `md`.

---

## 2. The Membership Timeline — one coherent history over immutable records

### 2.1 The reframe

The domain truth: renewals/upgrades create **new immutable Membership records** chained by
`predecessorMembershipId` with an `origin` (NEW / RENEWAL / UPGRADE / DOWNGRADE); freeze/resume are
events *within* a record (`MembershipFreeze` rows); cancel stamps `cancelledAt`; expiration is
**derived** from `effectiveEndDate` (no stored event); a scheduled record has
`scheduledEffectiveFrom` and later `activatedAt`. None of that changes.

The presentation reframe: the timeline's unit is the **period**, and the connective tissue between
periods is the **transition**. The operator reads *"her Gold membership, renewed twice, frozen once
for 12 days, currently active until Aug 30"* — never *"she has 4 memberships"*.

### 2.2 Structure (newest first)

```
(top)   ┌ NEXT PERIOD (only if scheduled exists)
        │  ◇ Gold Monthly — Scheduled · starts 2026-09-01 · E£1,200
        │
        ╞═ transition: “Renewal — sold 2026-07-28” (UpgradeIndicator on plan change)
        │
        ┌ CURRENT PERIOD (emphasized: brand left accent-bar)
        │  ● Gold Monthly — Active · 2026-06-01 → 2026-08-30 (incl.) · 58 days left
        │  │   events inside the period, oldest→newest:
        │  │   · Frozen 2026-06-20
        │  │   · Resumed 2026-07-02 — frozen 12 days; end date extended
        │  └  [Open full record →]
        │
        ╞═ transition: “Upgraded — Silver Monthly → Gold Monthly” (UpgradeIndicator)
        │
        ┌ PAST PERIOD (muted, `historical` MembershipCard treatment)
        │  ○ Silver Monthly — Expired · 2026-03-01 → 2026-05-31 (incl.)
        │
        ╞═ gap marker: “— no coverage for 21 days —” (muted, explicit)
        │
        ┌ PAST PERIOD
        │  ○ Silver Monthly — Cancelled 2026-02-08 · started 2026-01-15
(bottom)└  ◦ “Joined the gym — 2026-01-10” (terminus node, from Member.joinedOn)
```

### 2.3 Presentation rules (each maps to a lifecycle fact)

| Lifecycle fact (unchanged) | Timeline presentation |
|---|---|
| Renewal = new record, `origin=RENEWAL`, chained by predecessor | **Transition node between periods**, labeled "Renewal", dated by the new record's `createdAt`. The chain is drawn as one continuous rail — visually *the same membership continuing* |
| Upgrade/Downgrade = new record, `origin=UPGRADE/DOWNGRADE` | Transition node with `UpgradeIndicator` (catalog §6): "Silver Monthly → Gold Monthly". Direction in text + icon, never color alone |
| Scheduled record (`scheduledEffectiveFrom`, then `activatedAt`) | Before activation: **"Next period"** at the top, visually queued (dashed connector — future). After activation: its "Activated — became the live period" event renders inside the period |
| Freeze / Resume (`MembershipFreeze` rows) | **Nested events inside their period** — a freeze never looks like a new membership. Open freeze (no `actualEnd`): "Frozen since <date> · planned <n> days · projected end <date> (estimate)". Resume: "frozen N days; end date extended" (existing copy) |
| Cancel (`cancelledAt`) | Terminal event in the period + the period's status becomes Cancelled (danger badge, distinct icon per catalog). The rail **ends** below it unless a later period exists |
| Expiration (derived, no stored event) | **Not an event row** — a period *boundary*: the period renders "Expired" state with its end date. Copy says "Ended (expired) 2026-05-31" — honest about it being a date crossing, not an action |
| Gap between consecutive periods (prev `effectiveEndDate` + 1 < next start) | Explicit muted **gap marker** with day count. Gaps are operational truth (lapsed member) and hiding them would misrepresent continuity |
| Chain start | Terminus node "Joined the gym" (`Member.joinedOn`) grounds the story in the relationship, not the first contract |

### 2.4 Why this reads as one history

- **One vertical rail** connects everything; records are segments *on* the rail, not cards floating
  in a list.
- **Origin-labeled transitions** carry the causality ("this period exists because that one was
  renewed") that the flat Memberships list can never show.
- **Freeze/resume stay inside their period**, ending the current confusion where a frozen
  membership row looks like a different thing than the membership it pauses.
- **Periods are numbered in copy** ("Period 3 of 3") for phone conversations, and the current one
  is visually emphasized (accent-bar) so the eye lands on *now* first.
- Payments are deliberately **absent** from this timeline (catalog: "don't conflate with
  PaymentSummary"); each period entry links to its record where its ledger lives.
- Density: default shows the **latest 5 periods**, older behind "Show older periods" progressive
  disclosure (compact variant). Long-tenured members must not push the History tab into a scroll pit.

---

## 3. Information Architecture

### 3.1 Route & nav map (no route changes, no nav changes)

```
/members                     Members list — THE primary operational entry (Job A)
/members/[memberId]          MEMBER WORKSPACE (this spec) — tabs via ?tab=
/members/[memberId]/edit     unchanged
/memberships                 Memberships list — RETAINED, reframed as triage (Job B; §4)
/memberships/[membershipId]  Membership record — RETAINED as the canonical immutable-contract
                             + lifecycle-mutation surface; header link becomes “View member ←”
/memberships/new             unchanged (Sell — reached from workspace, FAB, list)
Dashboard / Notifications / Reports   unchanged (global triage layer)
```

- **Primary path to a membership becomes member-first:** Members → workspace → period. Dashboard
  and report deep-links keep landing on `/memberships/[id]` — correct for triage ("this expiring
  record"), and that page links back to the member.
- **`/members` vs `/memberships` overlap resolves by role, not deletion:** `/members` = people
  (workspace entry); `/memberships` = contract periods (triage). Subtitles will say exactly that.
- The shipped "View memberships" name-search link on the member page (`/memberships?q=<name>`) is
  **retired** — the Timeline replaces it with an exact, non-fragile view (name search was the
  fragility the prior review §7 flagged).

### 3.2 Entity language

| Context | Word |
|---|---|
| Inside the workspace | **period** ("Current period", "Past periods", "Next period") |
| Global list, reports, dashboard | **membership** (unchanged) |
| Code, domain, routes | **Membership** (unchanged — presentation-only vocabulary) |

The two words coexist deliberately: the operator learns "a membership is one period of the member's
history" — which is precisely the domain model.

---

## 4. Memberships list redesign

### 4.1 The evaluation asked for

*Replace multiple rows per member with a single operational row?* The prior review rejected a
**blanket** collapse — but its two decisive objections were (a) history had no other home, and
(b) a mid-renewal member's two live rows are both real. This spec builds the home (Timeline), and
the "Next" chip representation preserves (b). Re-evaluated honestly against Job B:

| Triage question (Job B) | Period-grain (today) | One-row-per-member |
|---|---|---|
| "Who is expiring soon?" | ✓ | ✓ (current period drives the row) |
| "All frozen right now?" | ✓ | ✓ (frozen member = one row) |
| "Who has a renewal queued?" | ✓ (2 rows per such member) | ✓ **better** — one row, Next chip |
| "Show me past periods" (history audit) | ✓ via status filter | needs period grain **retained behind filters** |
| "How many live contract periods?" (count semantics) | row count = periods | row count = members — **semantics change, must be labeled** |

### 4.2 Verdict: **hybrid — collapse the default view, keep period grain behind filters**

- **Default (`Current` / LIVE):** **one row per member.** Row = the representative current period
  (precedence below) + a **"Next: <plan> · starts <date>"** chip when a scheduled period exists.
  Row click → **Member Workspace** (the member is now the operational object); a secondary
  action per row opens the period record directly (preserves the power-user path).
- **Any explicit status filter** (Active / Frozen / Scheduled / Expired / Cancelled) **and
  "All (incl. history)":** today's **period-grain rows, unchanged**, row click → period record.
  Triage and audit semantics are byte-identical to what shipped.
- **Representative-period precedence** (the rule the prior review said must be a product decision —
  proposed here for ratification): **ACTIVE > FROZEN > SCHEDULED**. INV-12 (≤1 active, ≤1
  scheduled) plus FROZEN-pauses-ACTIVE means this is total and unambiguous for live rows; under
  LIVE no terminal fallback is ever needed (terminal-only members simply have no row, exactly as
  Option A already behaves). It also matches the standing-chips order already shipped — one rule,
  two surfaces, no contradiction.
- **Counts relabel:** default header count reads "N members with current memberships"; filtered
  views keep "N memberships". The pagination range label follows the active grain.
- Columns (default view): Member · Plan (current) · Status badge · Ends (incl.) · Remaining ·
  Next chip · Owed indicator (only if `payments.read`; from the outstanding read) — the desk scan
  in one line. Mobile card variant mirrors it (AP-1 pattern already shipped).

**Why not collapse everywhere:** a Frozen filter that answered with member-rows would hide *which
period* is frozen (the operational object of the question); and history audit is inherently
period-grain. **Why collapse the default:** the default view's job is "the current book of
business" — a member-grain scan — and the noise the original proposal complained about ("Ahmed ×4")
was terminal noise (already fixed by LIVE) plus mid-renewal doubles (fixed by the Next chip).

### 4.3 Honesty about the change surface

True per-member collapse **cannot be done purely client-side**: page-boundary grouping breaks
(a member's active + scheduled rows can straddle a DB page). It requires the LIVE branch of the
existing read to group by member (or a sibling read-only projection). That is the **same
read-model envelope** as the accepted Option A change (a `where`/projection adjustment in
`listMemberships`, zero mutation/invariant/permission impact) — but it *is* a service-file edit,
so it goes to the §8 fork, not assumed.

---

## 5. Data Composition Plan

Grain: RSC page composes public module reads in parallel (`Promise.all`), exactly as
`memberships/[membershipId]/page.tsx` does today. Per-tab reads load only for the active tab
(URL-driven server render — no client data fetching, no new pattern).

### 5.1 Reads that exist today (no change of any kind)

| Section | Public read (module) | Permission |
|---|---|---|
| S1 Overview — member + status | `loadMember` (members) | `members.read` |
| S1 Overview — standing chips | `getMemberMembershipStanding` (memberships) | `memberships.read` |
| S1 Overview — owed chip | `getMemberOutstandingBalance` (payments) | `payments.read` |
| S3/S4 Billing + history (per period) | `loadMembershipBilling(membershipId)` (payments) | `payments.read` |
| S7 Trainer | `loadMember` + `loadAssignableTrainers` (members) | `assignments.*` |
| S8 Actions | existing links/controls; `loadSellablePlans` where already used | existing keys |
| List (filtered views) | `listMemberships` (memberships) | `memberships.read` |

### 5.2 Additive, read-only needs (the §8 fork — flagged, not assumed)

| # | Need | Serves | Shape (proposed) | Nature |
|---|---|---|---|---|
| A-1 | **Member-scoped membership history with lifecycle events** | S2 Current Membership · S5 Timeline | New public read `getMemberMembershipTimeline(principal, memberId)` → ordered periods (MembershipRow fields + `origin`, `predecessorMembershipId`, `scheduledEffectiveFrom`, `cancelledAt`, freeze rows) — a member-grain composition of the **existing** `deriveRow`/`buildTimeline` logic, read-only, `memberships.read`-gated, gym-scoped | New query function; zero new derivation logic |
| A-2 | **Member-scoped notifications** | S6 | Additive optional `memberId` filter on `listNotifications` (schema already carries `Notification.memberId`) | Param on existing read |
| A-3 | **LIVE one-row-per-member projection** | §4 list default | LIVE branch of `listMemberships` groups to representative period + attaches the scheduled sibling (or a sibling read `listCurrentMemberships`) | Projection change, same envelope as shipped Option A |

All three: no mutation, no invariant, no permission, no schema change; P0 tenant-isolation +
permission tests mandatory on each (the `memberId` params are the classic cross-tenant probe
surface — a foreign `memberId` must return empty/404, proven by test).

### 5.3 Deliberately NOT built (flagged decisions)

- **D-1 Member-level consolidated payment ledger** (cross-period S4): needs a new payments read;
  deferred — per-period access via Timeline costs one click and zero new money-presentation risk.
- **D-2 Embedding `MembershipLifecycleControls` in the workspace:** deferred; the record page stays
  the single mutation surface until the workspace is accepted (drift + double-maintenance risk,
  and freeze/cancel confirmations were just UX-hardened there).
- **D-3 Derived member-grain search/sort on the collapsed list** (e.g. sort by remaining days
  across members): only if triage users ask; adds projection complexity.

### 5.4 Performance notes

- Overview tab = 3 small parallel reads + billing (bounded); History tab = A-1 (one query with
  `include: freezes`, bounded by periods-per-member — real-world ≤ dozens) + billing history for
  current/scheduled only. No unbounded fan-out; no N+1 (A-1 is one member-scoped query, **not**
  `loadMembership` per period).
- The collapsed LIVE list must keep DB-level pagination correct (group-by before page slice —
  acknowledged as the hard part of A-3 and the reason it can't be UI-only).

---

## 6. Screen wireframe descriptions

### 6.1 Member Workspace — desktop ≥lg (Overview tab)

```
┌─ PageContainer ─────────────────────────────────────────────────────────────┐
│ MemberProfileHeader                                                         │
│ ┌────┐  Sara Adel  [ACTIVE] [Active membership] [Owed E£400 ⚠]              │
│ │ SA │  Trainer: Omar · Member since 2026-01-10        [Sell/Renew] [Edit ▾]│
│ └────┘                                                                      │
│ ─ Tabs: ▌Overview▐  History   Notifications   Profile ──────────────────────│
│                                                                             │
│ ┌─ Current Membership ────────────────┐ ┌─ Billing Summary ───────────────┐ │
│ │ ▌Gold Monthly        [ACTIVE]       │ │ Price      E£1,200              │ │
│ │ ▌2026-06-01 → 2026-08-30 (incl.)    │ │ Paid       E£800                │ │
│ │ ▌58 days left · E£1,200             │ │ Remaining  E£400  [PARTIAL]     │ │
│ │ ▌Renewed from Silver on 2026-05-30  │ │ ┌─ Record payment ────────────┐ │ │
│ │ ▌ Next: Gold M · starts 2026-09-01  │ │ │ amount [____] [Record]      │ │ │
│ │ ▌            [Manage period →]      │ │ └─────────────────────────────┘ │ │
│ └─────────────────────────────────────┘ └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```
The eye path: identity → chips (covered? owed?) → money → next action. Two cards only — the
Overview tab is deliberately small.

### 6.2 Member Workspace — History tab

```
│ ─ Tabs:  Overview  ▌History▐  Notifications   Profile ─────────────────────
│ ┌─ Membership Timeline ────────────────┐ ┌─ Payment History ──────────────┐
│ │  ◇ Next — Gold M · starts 09-01      │ │ Current period (Gold Monthly)  │
│ │  ╞═ Renewal · sold 07-28             │ │  07-01  E£500   cash    [Void] │
│ │  ▌● Gold M — ACTIVE  06-01→08-30     │ │  06-01  E£300   card    [Void] │
│ │  ▌   · Frozen 06-20                  │ │ Next period (Gold Monthly)     │
│ │  ▌   · Resumed 07-02 (12d, extended) │ │  (no payments yet)             │
│ │  ▌   [Open full record →]            │ │ Older periods: open a period   │
│ │  ╞═ Upgraded · Silver → Gold         │ │ in the timeline for its        │
│ │  ○ Silver M — EXPIRED 03-01→05-31    │ │ receipts.                      │
│ │  — no coverage · 21 days —           │ └────────────────────────────────┘
│ │  ○ Silver M — CANCELLED 02-08        │
│ │  ◦ Joined the gym · 2026-01-10       │
│ │        [Show older periods]          │
│ └──────────────────────────────────────┘
```

### 6.3 Member Workspace — mobile 375px (Overview tab)

```
┌───────────────────────────────┐
│ ☰  Sara Adel            🔔 SA │  TopBar
│ Sara Adel                     │  h1 + badges wrap
│ [ACTIVE] [Active membership]  │
│ [Owed E£400 ⚠]                │
│ ‹ ▌Overview▐ History  Notif… ›│  scrollable Tabs
│ ┌─ Current Membership ──────┐ │
│ │ (as desktop, stacked)     │ │
│ └───────────────────────────┘ │
│ ┌─ Billing Summary ─────────┐ │
│ │ (summary + record form)   │ │
│ └───────────────────────────┘ │
│ ┌───────────────────────────┐ │
│ │ [Edit]  [Record payment ▸]│ │  StickyMobileActionBar (thumb zone)
└─┴───────────────────────────┴─┘
```
Same DOM order as desktop; 44px targets; ≥16px inputs (shipped v1.2 rules apply unchanged).

### 6.4 Memberships list — default (collapsed) vs filtered

```
DEFAULT “Current” (one row per member)          FILTER “Frozen” (period grain, as today)
┌ Member      Plan     Status   Ends    Next ┐  ┌ Member    Plan    Status  Ends      ┐
│ Sara Adel   Gold M   ACTIVE   08-30   09-01│  │ Ali Hassan Silver  FROZEN  07-15     │
│ Ali Hassan  Silver   FROZEN   07-15    —   │  │ Mona Samir Gold    FROZEN  08-02     │
│ Mona Samir  Gold Y   ACTIVE*  07-09    —   │  └──────────────────────────────────────┘
└  * expiring-soon badge                     ┘  rows → /memberships/[id]  (unchanged)
   rows → /members/[id] (workspace)
   “N members with current memberships”
```

---

## 7. Risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | **Billing UI in two places drifts** (workspace S3/S4 vs membership page) | High | Only module-owned components (`PaymentSummary`, `PaymentHistory`, `RecordPaymentForm`) render money in both — zero forked markup; PAID-retirement rule lives in one place (component or shared helper), asserted by one test run against both pages |
| R2 | **Count/row semantics change on the default list** confuses existing users & tests ("20 rows" ≠ 20 periods) | Medium | Explicit count copy ("N members…"), subtitle rewrite, release note; e2e updated in the same change; filtered views untouched |
| R3 | **A-1/A-2/A-3 classified as "service changes"** under this task's strict wording | Decision risk | §8 fork — nothing built until ruled; Plan B degraded scope pre-specified |
| R4 | **Tenant leakage via new `memberId` params** (the one *dangerous* part of an otherwise cosmetic project) | Critical if mishandled | P0 isolation tests are the acceptance gate for A-1/A-2 (foreign id → empty/404); same pattern as every shipped per-member read |
| R5 | **Timeline misreads lifecycle** (e.g. showing projected-end as authoritative, expiration as an "event") | High (trust) | §2.3 mapping table is the implementation contract; copy reviewed against `state-machines.md`/FRZ rules; estimate labels mandatory |
| R6 | **Workspace page weight** (8 sections, tenured member) | Medium | Tabs + per-tab server reads; timeline progressive disclosure (latest 5 periods); no unbounded queries (§5.4) |
| R7 | **Two mutation surfaces temptation** — future slices embedding lifecycle controls "for convenience" | Medium | D-2 explicitly defers it; constitution "one obvious way" cited in the feature doc |
| R8 | **e2e churn**: adaptive.spec asserts membership-detail section order & member-page standing strip; shell/axe suites | Low | Migration phases each re-run the full gate; assertions updated in the same commit as the UI they pin |
| R9 | **Operator retraining** (memberships list rows now open the member by default) | Low | Secondary per-row action preserves direct period access; triage filters unchanged; one-line "What changed" note |
| R10 | **Terminology split** ("period" vs "membership") leaks into code/domain | Low | Copy-level only, enforced in review; glossary note added (docs updated same change) |

---

## 8. The decision fork (constitution §13 — nothing proceeds past this without a ruling)

This task's constraint list says **"Do NOT change: … Services"**. The prior review's §7 asked the
same question and this spec inherits it. The three additive needs (§5.2) touch service *files* but
are **read-only projections/params composing already-authorized logic** — the exact envelope under
which the human approved Option A (the shipped LIVE filter **was** a `service.ts` edit).

- **Plan A (recommended):** treat A-1, A-2, A-3 as read-model work (allowed). Full spec as written.
- **Plan B (strict — zero service-file edits):** workspace ships with S1, S3 (current period found
  via `getMemberMembershipStanding`… **no** — finding the current membership *id* itself requires a
  member-scoped query that doesn't exist publicly). Honest Plan B is therefore: S1, S7, S8 only +
  the existing name-search link for history; **no Timeline, no per-member Billing, no list
  collapse.** That is a header refresh, not a workspace. Stated plainly so the choice is real.

**Also for ratification (product decisions surfaced, not assumed):**
1. Representative-period precedence ACTIVE > FROZEN > SCHEDULED (§4.2).
2. Default-list collapse itself (§4 hybrid) — it supersedes the prior review's blanket rejection
   *because* the Timeline now exists; if rejected, everything else in this spec still stands.
3. Tabs as the workspace container (§1.2) vs one long stacked page.
4. "Period" vocabulary (§3.2).

---

## 9. Migration strategy from the current UI

Phases are independently shippable, each ends at the full gate (type-check · lint+fitness · build ·
unit · integration · e2e+axe at 375/1280/dark) with docs updated in the same change set. Order =
value ÷ risk. No feature flags (single-gym MVP; each phase is complete and acceptable on its own).
No URL breaks anywhere: every existing route and deep link keeps working through all phases.

**Phase W0 — Rulings.** §8 Plan A/B + the four ratifications. *(blocks everything)*

**Phase W1 — Workspace shell (no new reads).**
Convert `/members/[memberId]` to MemberProfileHeader + Tabs (Overview/Profile only at this point).
Move shipped sections into their tabs unchanged (standing strip → S1; trainer/lifecycle/contact →
Profile). Implements catalogued Tabs/MemberProfileHeader/MemberInfoPanel components (catalog
conformance, not invention). *Risk: low. Value: the frame exists; nothing regresses.*
Migration notes: adaptive.spec member-page assertions updated; axe re-run per tab.

**Phase W2 — Current Membership + Timeline (needs A-1).**
Add S2 + S5, History tab appears. Retire the `?q=<name>` "View memberships" link (replaced by the
Timeline). P0 isolation tests on A-1 ship in the same commit. *This is the phase where the "many
unrelated memberships" feeling dies.*

**Phase W3 — Billing + Payment History in context (no new reads).**
S3 + S4 over `loadMembershipBilling` for the current/scheduled ids resolved by A-1 (or W2's read).
R1 mitigation (shared components only) is the review checklist for this phase.

**Phase W4 — Memberships list hybrid collapse (needs A-3).**
Default LIVE → one row per member (+ Next chip, workspace row-link, count relabel); filtered views
untouched. Update list e2e; release note for operators (R9).

**Phase W5 — Contextual Notifications (needs A-2; Owner-only value until TD-3).**
S6 + Notifications tab. Lowest urgency — schedule last deliberately.

**Rollback:** each phase is a self-contained presentation slice over additive reads; reverting a
phase's commit restores the prior UI with no data or domain consequence.

---

*Stop. This is the report — no code was written. Implementation begins only after the §8 rulings
and phase acceptance, per the migration order above.*
