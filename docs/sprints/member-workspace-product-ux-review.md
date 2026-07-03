# Member Workspace — Product UX Architecture Review (pre-implementation challenge)

**Date:** 2026-07-03 · **Type:** Product UX review — no code, no service changes, presentation only.
**Reviews:** `member-workspace-ux-specification.md` (2026-07-03, "the spec") under the standing
constraints (domain/lifecycle/payments/notifications/permissions **frozen**).
**Posture:** adversarial by instruction. Where the challenge lands, this review **overturns the
spec** and says so plainly. Where the spec survives, the reasons are re-argued from scratch, not
cited. The spec document remains as the composition/data groundwork; **this review supersedes it on
every point marked ⟲ OVERTURNED**. On acceptance, the spec is revised to match (one fact, one home).

---

## 0. TL;DR — what this review changes

| # | Spec decision | Verdict | Replacement |
|---|---|---|---|
| 1 | Tabs (Overview/History/Notifications/Profile) | ⟲ **OVERTURNED** | **Hybrid workspace**: one page, always-visible answer strip + operational core, collapsed summary sections below (§1) |
| 2 | Timeline as display-only rail; period detail lives on `/memberships/[id]` | ⟲ **OVERTURNED** (bounded) | **Expandable period cards** on the rail; expansion composes existing reads in place (§2) |
| 3 | Periods-not-events · expiration = boundary · freeze nested | ✅ **REAFFIRMED** — with sharper arguments (§3) |
| 4 | One row per member, precedence ACTIVE>FROZEN>SCHEDULED + conditional Next chip | ⟲ **AMENDED** | **Two-slot row: Current + Next always shown**; the precedence rule dissolves (§4) |
| 5 | "Period" as user-facing vocabulary; tabs named History/Profile; "Billing"; "Outstanding" | ⟲ **OVERTURNED** | Operator vocabulary: Current/Next/Past **membership**, "Payments", "Owes", "Member info", "Alerts" (§5) |
| 6 | Overview = chips scattered across header + strip | ⟲ **AMENDED** | A fixed 3-line **Answer Strip** with a computed single primary action (§6) |
| 7 | D-2: lifecycle actions stay on the record page only | ⟲ **OVERTURNED** | Current-period actions inline (same module components, second mount point); historical stays view-only (§7) |
| 8–9 | One DOM order, adaptive reflow | ✅ REAFFIRMED — hybrid strengthens both mobile and desktop (§8–9) |
| 10 | (not covered by spec) | **NEW** | Zone model + growth budget so future features add collapsed cards, never tabs (§10) |
| — | Data plan (A-1/A-2/A-3 fork), P0 isolation gates, no payments-as-rail-events, gap markers, list period-grain behind filters | ✅ **SURVIVES UNCHANGED** |

The user's instinct in the brief — *"a receptionist doesn't think 'I need History', they think
'I need Ahmed'"* — is correct, and the spec's tab architecture failed it. The spec optimized a
scroll metric; the operator needs **visibility**. Everything below follows from that correction.

---

## 1. REVIEW #1 — Workspace container: Tabs vs Long Page vs Hybrid

### 1.1 Comparison matrix

Scale: ●●● strong · ●● adequate · ● weak. Judged for THIS product (desk operator, interrupt-driven,
one member at a time; owner reading a member's story end-to-end).

| Criterion | A — Tabs | B — Single long page | C — Hybrid (answer strip + core + collapsed sections) |
|---|---|---|---|
| Receptionist workflow (interrupt-driven, "is he covered / does he owe / act") | ● answers split across tabs; History/money partially hidden | ●●● all visible | ●●● all *operational* info visible; only archival detail folded |
| Owner workflow (read the whole story) | ● story cut into 4 views | ●●● continuous | ●●● continuous; folds open on demand |
| Mobile (375, one thumb) | ● tab bar at top = reach cost; scrollable tabs hide off-screen tabs | ● 6+ viewport scroll for tenured members | ●●● thumb-scroll only; folds cap depth (~2.5 viewports) |
| Desktop (1280) | ● one tab's content rattles in a huge viewport | ●● good, some scroll | ●●● 2-col grid puts nearly everything above the fold |
| Navigation cost | ● every cross-question = tab switch; back-and-forth for "did he pay for the period that just ended?" | ●●● zero | ●●● zero for operational questions; one tap to unfold archival ones |
| Scroll cost | ●●● minimal per tab | ● worst case unbounded | ●● bounded by folds + "show older" |
| Cognitive load | ●● low per view, but **navigation memory** ("which tab had payments?") | ●● high density | ●●● fixed spatial map: same order every member, muscle memory forms |
| Discoverability | ● inactive-tab content is invisible; the catalog's own Tabs entry warns against hiding critical content behind tabs | ●●● everything announces itself | ●●● folded sections show **summary lines**, so content advertises itself while folded |
| Operational speed (taps+seconds to the §6 answers) | ● 3s questions OK; anything historical = +1 nav | ●● scroll hunting | ●●● 3s questions at top; everything else ≤1 interaction |

### 1.2 The decisive arguments

1. **The interrupt test.** A receptionist is mid-task on Ahmed when the phone rings about Mona. With
   tabs, returning to Ahmed means recalling *which tab* held the half-finished thought. With one
   spatial page, position = memory. Interrupt-driven desks want **spatial stability, not view
   switching** — this is the strongest practical argument and tabs fail it outright.
2. **The reference products the brief invokes agree.** Stripe's customer page, Shopify's customer
   page, Linear's issue view: all are **single scrollable workspaces with sectioned cards and a
   summary column** — none tabs the core record. Tabs appear in those products only for *peer
   datasets* (Stripe's Payments vs Disputes lists), never to fragment one entity's operational view.
3. **The spec's own patch betrayed the flaw.** It added a "renewed from Silver…" echo line to
   Overview because the story lived in another tab — a patch for self-inflicted information
   splitting. Same flaw: Billing summary (Overview tab) severed from Payment history (History tab)
   — one money story, cut in half.
4. **Tabs don't even scale** (see §10): 8 future features cannot become 8 more tabs (catalog caps 6);
   collapsed summary cards absorb growth indefinitely.
5. What Option B gets wrong alone: a 3-year member's full ledger + timeline unfolded is a scroll
   pit on mobile. The fix is **folding with informative summaries**, not tabs.

### 1.3 Verdict — **Option C, Hybrid. The tab architecture is withdrawn.**

The page model (full structure in §6 and wireframes §12):

```
ZONE 1 — ANSWER STRIP        always visible, never grows (identity · coverage · money · 1 action)
ZONE 2 — OPERATIONAL CORE    Membership rail (current card expanded) · Payments (current period)
ZONE 3 — FOLDED SECTIONS     Past memberships (in the rail, collapsed) · Alerts · Member info
```

- Folded ≠ hidden: every folded section header carries a **summary line** ("Past memberships — 3 ·
  member since Jan 2026", "Alerts — 1 unread"). Nothing critical is ever invisible; only *detail*
  is deferred. This answers the discoverability objection that kills tabs.
- Deep links use **anchors** (`#payments`, `#membership-history`), not `?tab=` state. Simpler URLs,
  no "which view am I in" state to reason about, browser-native jump behavior.
- A thin **jump strip** (anchor links) may ride under the answer strip on long pages — a
  convenience, not a navigation requirement; the page works without touching it.

---

## 2. REVIEW #2 — Timeline periods as expandable operational cards

### 2.1 Evaluation

The proposal: each period on the rail expands **in place** to status, freeze/resume history,
billing, payments, outstanding, notes, actions. Is it superior to the spec's display-rail +
"Open full record →" hop?

**Yes — decisively — with three bounds.** The argument for: the operator's historical questions are
*per-period* ("did he pay for the spring membership?", "how long was that freeze?"). The spec made
every such question a page navigation (workspace → record page → find section → Back, losing
scroll position). Expansion answers in place, keeps context, and the data cost is honest: expanding
a period composes **existing public reads** (`loadMembershipBilling(membershipId)` is already
per-period) on demand — no new read shape, no eager fan-out for members with 20 periods.

**Bound 1 — No "Notes" in the period card.** The domain vocabulary has `MemberNote` — a **member**-
level concept — and no period-level note exists. Putting Notes inside a period card would
presentation-invent a domain concept (period-scoped notes) that the frozen model doesn't have.
Notes, when built, are a member-zone section. *(The brief's example list included Notes; this is
the one item refused, with this reason.)*

**Bound 2 — Actions only on the live cards.** Expanded historical periods show facts (period,
freeze history, ledger — including Void where permitted, since voiding a mis-entry on a past period
is legitimate ledger correction). Renew/Freeze/Cancel appear **only** on the current card and
Cancel-before-start only on the Next card — states where the domain permits them. A historical card
with an "Actions" area of disabled buttons would be noise; it gets none.

**Bound 3 — The rail stays lifecycle-only.** Payments appear *inside an expanded card's panel* —
they never become **events on the rail** (§3). "Where money lives" ≠ "what the rail narrates".

### 2.2 The structural consequence (improvement the spec missed)

Once the current period is an expandable card on the rail, the spec's **separate "Current
Membership" section is redundant** — it duplicated the rail's head. Collapse them:

> **There is ONE membership surface: the rail.** Order: Next (if queued) → **Current (expanded by
> default, carrying billing + actions)** → Past (collapsed, expandable). The Answer Strip carries
> the one-line summary; the rail carries everything else.

This kills the S2/S5 duplication, kills the History-tab split, and makes the page read exactly like
the mental model: *the member, their money, their one membership story.*

The `/memberships/[membershipId]` record page **remains** — canonical, unchanged, still the
deep-link target from dashboard/reports (Job B). The workspace no longer *needs* it for any desk
task; it persists as the contract-of-record view, not a workflow stop.

---

## 3. REVIEW #3 — Timeline semantics: events vs periods, per representation

Re-argued from zero, not carried over.

**Periods or events as the primary unit?** The operator's questions are *coverage* questions
("was she covered in Feb?", "when does he end?") — answered by **spans**, not by replaying an event
log. An event-primary timeline (audit style) is the accountant/debugging view and already exists
per-record on the membership page. **Verdict: operational periods primary; events nested within
their period.** An event-only stream would also make one membership's lifetime (created → frozen →
resumed → expired) read as four disconnected happenings — the exact "many unrelated things" feeling
this project exists to kill.

| Representation | Ruling | The challenge, answered |
|---|---|---|
| **Renewal** | Transition **connector between periods** ("Renewed — sold Jul 28") | Could renewal be an event inside the old period? No — it creates a *new* record (frozen domain fact); drawing it as the bridge is the only representation that is both true and continuous. The connector is the continuity device: same rail, new segment |
| **Upgrade / Downgrade** | Transition connector + direction ("Upgraded · Silver → Gold", UpgradeIndicator semantics — text + icon, never color alone) | Direction must be explicit; "changed plan" hides the sales-relevant fact |
| **Freeze / Resume** | **Nested inside their period** — reaffirmed | The strongest case for promotion to rail-level: "the freeze is operationally loud." Answered without breaking the model: the *current* period card shows FROZEN status + freeze facts prominently, and the Answer Strip carries it. Promotion to rail-level would make a pause look like a lifecycle boundary — teaching operators that freezing ends a membership, which is precisely false (it *extends* it). Historical freezes: muted rows inside their period with day count and "end extended" |
| **Expiration** | **Boundary, not event** — reaffirmed | Test: an event row implies an actor and a moment ("who expired it? can I undo it?"). Expiry is a date crossing with neither. Render as the period's end cap: "Ended (expired) · Mar 31". The lapsed-member *urgency* is not the rail's job — the Answer Strip screams "No current membership — lapsed 21 days" at the top; the rail stays a faithful record |
| **Cancellation** | Dated terminal **event inside the period** + the period renders Cancelled (distinct badge) + rail visibly stops below it unless a later period exists | Unlike expiry, cancellation has an actor and a timestamp — it has earned an event row. The severed rail is honest: the story was cut, not completed |
| **Scheduled → Activated** | Queued segment above Current with dashed connector ("starts Sep 1"); on activation, an "Activated — became the live period" event inside it | Dashed = future is a standard, learnable encoding; the queued period must sit **on the rail** (it's the next chapter), not in a side-box (which re-creates "separate membership" feeling) |
| **Coverage gap** | Explicit muted marker between periods ("no coverage · 21 days") | Hiding gaps would make lapses invisible and falsify continuity; a gap is operational truth about the *relationship* |
| **Chain start** | "Joined the gym · Jan 10" terminus | Grounds the rail in the relationship, not the first contract |

---

## 4. REVIEW #4 — Membership list: the two-slot row

**Challenge accepted and the spec's rule dissolves.** The spec's precedence rule
(ACTIVE > FROZEN > SCHEDULED) existed only because the row had **one slot** and something had to
win it. Model the row on the domain instead: INV-12 guarantees at most one live period
(ACTIVE-or-FROZEN — FROZEN is a paused ACTIVE, they cannot coexist) and at most one SCHEDULED.
So every member's operational state is exactly two slots:

> **Current** (Active | Frozen | none) · **Next** (Scheduled | none)

**Verdict: always show both columns.** Not a conditional chip — dedicated columns, "—" when empty.

- **"Can it become clearer?" — yes, and this is the clarity:** no representative-row rule to learn,
  no arbitrariness to ratify. The row *is* the member's coverage, not "a chosen membership".
- **Absence becomes information.** A permanent Next column makes "expiring soon **and no renewal
  queued**" leap out of the default view — the single most valuable renewal-pipeline signal the
  gym has, and today's period-grain list cannot show it at all. (A "Next = —" quick filter is a
  natural follow-up; noted, not required for v1.)
- **Would users lose information?** Enumerated: active+scheduled → one row, both visible ✓ ·
  frozen+scheduled → both visible ✓ · scheduled-only (pre-start signup) → Current "No coverage",
  Next filled ✓ (honest: they are not covered *today*) · terminal-only → no row under the default
  Current view (unchanged Option A behavior; they live in Members and behind history filters) ✓.
  Nothing representable is lost; the two slots are exhaustive *by frozen invariant*.
- **Would operators misunderstand renewals?** The opposite of today. Currently a renewal
  materializes as a *second row* — the exact "he has two memberships?" confusion on record. The
  two-slot row teaches the true model at a glance: one coverage now, one queued next.
- Row click → workspace; a per-row secondary action still opens the period record directly
  (triage power-path preserved). Explicit status filters and "All (incl. history)" keep today's
  **period-grain rows untouched** — Frozen-filter triage still answers *which period* is frozen.
  Count labels follow grain ("N members with current memberships" vs "N memberships") — this
  wording is load-bearing, not cosmetic.
- Columns (default view): Member · Current (plan + status badge + ends/remaining) · **Next** ·
  Owes (with `payments.read`). Mobile card mirrors: line 1 member, line 2 Current, line 3 Next/Owes.

---

## 5. REVIEW #5 — Operational vocabulary (localization source language)

Principle: the label is what a gym owner says across the desk, out loud. Second principle: this
English becomes the localization source — every term must survive translation as **one unambiguous
noun** (primary target: Arabic, where اشتراك "subscription/membership" is THE trade word and
vague terms like "period/فترة" go ambiguous).

| Current/spec term | Ruling | Replacement + reason |
|---|---|---|
| **"Period"** (spec's coinage) | ⟲ **WITHDRAWN — the spec was wrong** | Operators never say "period"; they say "his old membership", "renew his membership". Use **Current membership / Next membership / Past memberships**. Continuity is the *rail's* job (connectors, one line), not vocabulary's. One noun everywhere also keeps localization 1:1 |
| "History" (tab) | Gone with tabs | Rail section: **"Past memberships"** — count in the fold header |
| "Profile" (tab) | ⟲ Replace | **"Member info"** — "profile" is social-media register; desk says "his info". (Staff "My Profile" in nav: out of scope here) |
| "Membership" | ✅ Keep | The trade word. Never "subscription" AND "membership" mixed — pick membership, always |
| "Renewal / Renew" | ✅ Keep | Exactly what operators say |
| "Billing" | ⟲ Replace | **"Payments"** as the section title — desk says "payments/money"; "billing" is invoice-SaaS register. Merges the spec's split Billing-Summary + Payment-History into ONE Payments block (summary → record form → history), which §1 required anyway |
| "Outstanding" | ⟲ Replace in operational UI | **"Owes E£400"** on strips/rows/chips; "Remaining" inside the payment summary (already shipped). The **report** may keep "Outstanding balances" (owner/accounting register is its audience) — flag, owner's call |
| "Notifications" (member section) | ⟲ Replace | **"Alerts"** — these are expiry warnings, and "notifications" collides with the phone-notification concept. Global nav item stays "Notifications" for now; renaming it is a separate small decision, not smuggled in here |
| "Freeze / Resume" | ✅ Keep | Gym-universal |
| "Sell membership" | ✅ Keep | Gyms literally say sell |
| "Record payment" | ✅ Keep (weak preference) | "Take payment" is the spoken phrase, but the system *records* money already taken (no processing). Honesty wins; revisit with the localizer |
| "Archive" (member) | Flag only | "Archive" is filing-cabinet register; operators say "deactivate". Domain enum stays ARCHIVED regardless (label-only question). Low priority, owner's call |
| "Timeline", "Operational Actions", "Workspace" | Never user-facing | Internal names. The page is just the member's name; the rail needs no title beyond "Membership" |

---

## 6. REVIEW #6 — Information hierarchy: the 3-second Answer Strip

The spec scattered the five answers across header chips + meta + two cards. ⟲ Replaced by a fixed
**Answer Strip** — three lines + one button, identical order for every member, so the operator's
eye learns a fixed scan path:

```
1  WHO        Sara Adel                        [ACTIVE member badge]
              Trainer Omar · since Jan 2026    (identity, smallest type)
2  COVERAGE   Gold Monthly · ACTIVE · ends Aug 30 — 58 days left
              (largest line; status badge; variants: FROZEN — resumes ~Sep 4 (est.) ·
               Next queued: starts Sep 1 · NO CURRENT MEMBERSHIP — lapsed 21 days)
3  MONEY      Owes E£400 of E£1,200  [warning tone]   |   Paid in full ✓ [quiet]
4  DO NEXT    ONE contextual primary button (computed, precedence below)
```

**Primary-action precedence** (first match wins; presentation logic only, every target is an
existing permission-gated capability):

1. Money owed on a live/next membership → **Record payment**
2. No current membership (lapsed/new) → **Sell membership**
3. Frozen → **Resume**  *(member standing in front of you + frozen = they're back)*
4. Current expiring-soon & no Next queued → **Renew**
5. Otherwise → no primary (calm state is a real state; do not invent a button)

Reading order = severity: money and coverage-gaps paint the strip's tone (via `*-text` tokens +
icon + label — never color alone). Everything below the strip is Zone 2/3 (§1.3). The five
questions in the brief are answered by lines 1, 2, 4→(button), 3, 2 respectively — all inside the
strip, zero interaction, both breakpoints.

---

## 7. REVIEW #7 — Actions

- **Grouped?** Not into an "Actions" section — grouped **by their object**: coverage actions live
  on the membership cards (Renew/Freeze/Resume/Cancel on Current; Cancel-before-start on Next),
  money actions inside Payments (Record; Void per history row), member-admin (Edit / Assign trainer
  / Archive) in Member info. An abstract Actions panel divorces verbs from context and grows into a
  junk drawer.
- **⟲ D-2 REVERSED — lifecycle actions come inline.** The spec kept Renew/Freeze/Cancel exclusively
  on the record page; the walkthroughs (§8) show that hop gutting the workspace's core promise
  (renew = the #1 desk task, and the spec made it a navigation). The drift objection that motivated
  D-2 is answered by the same rule that already governs Payments: **one module-owned component,
  mounted twice** (`MembershipLifecycleControls` — exactly how `PaymentSummary`/`RecordPaymentForm`
  already ship on two pages). One implementation, one test suite, two mount points — that is reuse,
  not duplication.
- **Dangerous actions separated?** Yes, two-tier: **Cancel** (terminal, member-visible consequence)
  and **Archive** are never primary-styled, sit behind the card's overflow menu, and keep their
  existing confirmation flows. **Void** stays where it is (per-row in history + confirm) — it's
  ledger correction, appropriately quiet. Freeze is *not* dangerous (reversible by design) and
  stays a visible secondary on the current card. Separation rule: **reversible = visible;
  terminal = one deliberate step away.**
- **Always visible / follow scroll?** The Answer Strip's single primary: on mobile it also anchors
  the shipped `StickyMobileActionBar` (thumb zone, already the v1.2 pattern). On desktop, no sticky
  chrome — the hybrid page at 1280 puts the strip + core above the fold; sticky headers would spend
  permanent pixels to save a scroll that rarely happens. Secondary actions never float.

---

## 8. REVIEW #8 — Mobile walkthrough (receptionist, iPhone, continuous service)

Walked as taps-from-app-open, against the **hybrid** design:

| Job | Path | Count | Notes / residual pain |
|---|---|---|---|
| Find member | Members → search (name **or phone** — already shipped in the member search) → tap | type + 2 taps | Phone search matters: members say their number, not their spelling. ✓ exists |
| Renew | Workspace → strip primary **Renew** (case 4) or current-card Renew → confirm sheet | 2–3 taps | Was 4+ taps and two page loads in the spec (hop to record page). The D-2 reversal is *the* mobile win |
| Take payment | Strip primary **Record payment** (owed member) → amount (16px input, no zoom) → confirm | 3 taps + amount | Sheet, not navigation; thumb-zone per shipped v1.2 patterns |
| Freeze | Current card → Freeze → days → confirm | 3 taps + input | Correctly *not* a strip primary (rare vs renew/pay); on the card = visible without crowding the strip |
| Resume | Frozen member → strip primary **Resume** → confirm | 2 taps | The frozen-member-walks-in moment is exactly when they're at the desk — precedence rule 3 earns its slot |
| Check alerts | Folded **Alerts** card ("1 unread") → tap to unfold | 1 tap | Owner-only (TD-3, frozen) — receptionists don't see it; stated, not hidden |
| Serve the next customer | Back → Members (search retained in URL state) | 1 tap | A "recent members" quick-switch would help busy desks — **future candidate, not v1** (§13 discipline) |

**Simplification found:** every desk job is now ≤3 taps + one input, and none *requires* leaving
the workspace. The folded sections keep first-paint light on mobile; the strip answers before any
scroll. Residual honest pain: dense timelines on 375px will truncate plan names (existing truncate
+ `<time>` patterns apply); expanding a past membership mid-list shifts scroll (expand-in-place
must anchor the tapped card to viewport top — noted for the eventual implementation spec).

---

## 9. REVIEW #9 — Desktop walkthrough

- **Would tabs be better on desktop?** No — *worse*: 1280px showing one tab's content is mostly
  empty paper. The hybrid page on desktop becomes a **2-column workspace**: left = membership rail
  (current expanded); right = Payments, Alerts, Member info. Answer Strip full-width on top.
  Everything the desk needs sits above the fold; the historical rail is the only thing that scrolls.
  This is the Stripe/Shopify customer-page shape, and it's the shape because it works.
- **Same information presented differently?** Yes — and only *geometrically*: same DOM order, same
  sections; mobile stacks + folds, desktop spreads into columns with folds mostly open (space is
  free). This is the project's existing adaptive-parity doctrine (one DOM order, reflow — §5.11)
  applied, not a new rule. What desktop must **not** do is show *more kinds* of information — that
  would fork the operator's mental model between devices and break the parity doctrine.
- Efficiency check (owner at desk PC): member question answered without scroll; renewal pipeline =
  Memberships list two-slot view; cross-member money = Owed column + Outstanding report. No tab
  ever needed.

---

## 10. REVIEW #10 — Future scalability (attendance, check-ins, measurements, photos, medical notes, tasks, documents, contracts)

**The tab architecture would have died here** — 4 tabs + 8 features ≠ 12 tabs (catalog caps 6, and
rightly). The hybrid absorbs growth by **zone contract**:

| Zone | Growth rule | Future features land as |
|---|---|---|
| 1 — Answer Strip | **Frozen at 3 lines + 1 button.** New facts compete for existing lines, never add lines | Check-in state joins line 1 ("Checked in 9:12 ✓") — at most |
| 2 — Operational core | Membership rail + Payments only. **Closed set** | Nothing. Core is core |
| 3 — Folded sections | Each feature = **one folded card with a one-line summary**; unfold shows the summary view; anything richer graduates to a **sub-page** linked from the card | "Attendance — 14 visits this month ›" · "Measurements — last taken May 3 ›" · "Documents — 2 ›" |

- The graduation rule keeps the workspace a **hub of summaries** rather than a warehouse: the
  workspace answers "what's the state?", sub-pages answer "show me everything". That's the Linear
  pattern (issue page links out to full views) and it scales indefinitely.
- Medical notes: lands in Zone 3 **member-scoped** (consistent with §2's MemberNote reasoning) with
  its own permission gate when designed — the zone model already accommodates permission-hidden
  cards (today's Alerts behaves identically).
- Photos/documents/contracts: folded cards with counts; heavyweight viewers are sub-pages by the
  graduation rule (never inline-render a contract PDF into the workspace).
- Crowding guard, quantified: Zone 3 holds N folded single-line cards — at 8 features that is ~8
  collapsed rows ≈ one mobile viewport *total* when all folded. The page stays scannable at every
  future size. Tabs, lists-of-subpages, or a "More" menu are all worse at 3 features and
  catastrophically worse at 8.

---

## 11. REVIEW #11 — Brutal findings against the (previous) proposal

Weaknesses found in the spec this review was asked to attack — stated without softening:

1. **Tabs contradicted the product's own thesis.** The workspace exists because operators think in
   members, then the spec made them think in tabs. Self-defeating; withdrawn.
2. **The story was split across tabs** (Current in Overview, its history in History; money summary
   in Overview, its ledger in History) — then patched with an echo line. A patch is evidence of a
   wrong cut.
3. **"Period" was designer vocabulary** projected onto operators who already have a word.
   Withdrawn.
4. **The precedence rule ratified an artifact.** One-slot thinking created a fake product decision;
   the two-slot row makes it vanish. The best decision is the one you delete.
5. **D-2 protected an abstraction at the operator's expense** — "one mutation surface" was already
   satisfied at the *component* level (the payments components mount twice today); refusing the
   second mount point for lifecycle controls just added taps to the #1 desk task.
6. **A top-level Notifications tab for an Owner-only, usually-empty section** — a wasted
   architectural slot; now one folded card.
7. **`?tab=` deep links** created UI state where anchors suffice.
8. **The scroll math that justified tabs ignored folding** — comparing tabs to a fully-expanded
   page was a strawman of Option B.

What survives the attack (and why it should): the **composition discipline** (public reads only,
per-section permission gates, parallel RSC loads), the **A-1/A-2/A-3 read-fork honesty and P0
tenant-isolation gates** (still the only genuinely dangerous surface), the **timeline semantics**
(§3 — reaffirmed under fire), **period-grain triage behind filters**, **gap markers**, and the
**no-payments-on-the-rail** rule. The data plan needs one addition: A-1's period payload should
include a per-period `paidInFull` boolean-grade summary for collapsed card headers (still
read-only composition; noted for the revised spec).

---

## 12. Recommended final architecture + wireframes

**Name:** Hybrid Member Workspace (v2). One page, three zones, one rail, two-slot list.

### 12.1 Mobile (375) — default state

```
┌───────────────────────────────────┐
│ ☰  ← Members                 🔔 SA│
│ Sara Adel                [ACTIVE] │  Z1 WHO
│ Trainer Omar · since Jan 2026     │
│ Gold Monthly · ACTIVE             │  Z1 COVERAGE (largest)
│ ends Aug 30 — 58 days left        │
│ ⚠ Owes E£400 of E£1,200           │  Z1 MONEY
├───────────────────────────────────┤
│ MEMBERSHIP                        │  Z2 — the rail
│ ┌ Next — Gold M · starts Sep 1 ▸ ┐│   (queued, dashed, collapsed)
│ ╞ Renewed · sold Jul 28           │
│ ┌ CURRENT — Gold Monthly [ACTIVE]┐│   expanded by default
│ │ Jun 1 → Aug 30 · 58 days left  ││
│ │ · Frozen Jun 20 → Resumed Jul 2││
│ │   (12 days — end extended)     ││
│ │ Paid E£800 / E£1,200           ││   money summary inside card
│ │ [Renew] [Freeze]          [⋯] ││   ⋯ = Cancel (confirm)
│ └────────────────────────────────┘│
│ ╞ Upgraded · Silver → Gold        │
│ ▸ Past — Silver M · Mar–May ·     │   collapsed, expandable
│         Expired · Paid ✓          │
│ — no coverage · 21 days —         │
│ ▸ Past — Silver M · Cancelled Feb8│
│ ◦ Joined · Jan 10                 │
├───────────────────────────────────┤
│ PAYMENTS — current membership     │  Z2
│ Owes E£400 · [amount] [Record]    │
│ Jul 1 · E£500 · cash        [Void]│
├───────────────────────────────────┤
│ ▸ Alerts — 1 unread               │  Z3 folded cards
│ ▸ Member info — phone, email, DOB │
├───────────────────────────────────┤
│ [Edit]        [ Record payment ▶ ]│  sticky thumb bar = strip primary
└───────────────────────────────────┘
```

### 12.2 Desktop (1280)

```
┌ Answer Strip ────────────────────────────────────────────────────────────┐
│ SA · Sara Adel [ACTIVE] · Trainer Omar          Gold Monthly · ACTIVE ·  │
│ since Jan 2026                                  ends Aug 30 · 58 days    │
│ ⚠ Owes E£400 of E£1,200                          [ Record payment ]      │
├───────────────────────────────┬──────────────────────────────────────────┤
│ MEMBERSHIP (rail, left col)   │ PAYMENTS — current membership            │
│  Next … / CURRENT (expanded,  │  summary · record form · history         │
│  actions) / transitions /     ├──────────────────────────────────────────┤
│  past (collapsed) / gaps /    │ ALERTS — 1 unread            (unfolded)  │
│  joined                       ├──────────────────────────────────────────┤
│                               │ MEMBER INFO — contact · details ·        │
│                               │ trainer · lifecycle (archive)            │
└───────────────────────────────┴──────────────────────────────────────────┘
```

### 12.3 Memberships list (default two-slot view)

```
Member       Current                              Next                 Owes
Sara Adel    Gold M · ACTIVE · ends Aug 30 (58d)  Gold M · Sep 1       E£400
Ali Hassan   Silver M · FROZEN · resumes ~Jul 15  —                    —
Mona Samir   Gold Y · ACTIVE ⚠ ends Jul 9 (6d)    —                    —      ← renewal gap, visible
Omar Adly    No coverage                          Gold M · Aug 1       E£1,200
“12 members with current memberships” · filters unchanged → period-grain rows
```

### 12.4 Information hierarchy (normative order)

Z1 who → coverage → money → do-next · Z2 membership rail → payments · Z3 alerts → member info.
Mobile = that exact stack; desktop = Z1 full-width, Z2 rail left, Z2 payments + Z3 right. One DOM
order serves both (§5.11 doctrine).

---

## 13. Implementation recommendations & the do-NOT list

### Recommendations (for the post-acceptance implementation spec — not started now)

1. **Rulings needed (supersedes the spec's §8 list):** (a) the A-1/A-2/A-3 read-only fork —
   unchanged and still blocking; (b) ratify Hybrid-over-Tabs; (c) ratify the two-slot list;
   (d) ratify the vocabulary table (§5) — it's the localization source; (e) the D-2 reversal
   (inline lifecycle controls on the current card).
2. **Catalog first.** The hybrid needs two components the catalog lacks: a **folded/expandable
   section-summary card** (Disclosure-style) and the **Answer Strip**. Per constitution these are
   catalog additions requiring approval **before** any build — request them explicitly; do not
   compose bespoke approximations. (Tabs stays in the catalog for legitimate peer-dataset uses;
   it just isn't this page.) `MembershipCard` gains an `expandable` variant — a catalog edit, same
   gate.
3. **Phasing (revised W-series):** W0 rulings → W1 Answer Strip + zone shell on the existing reads
   (already valuable: the 3-second answers ship with zero new queries) → W2 the rail with
   expandable cards (A-1 + P0 isolation tests) → W3 Payments zone + inline lifecycle mount →
   W4 two-slot list (A-3) → W5 Alerts card (A-2). Each phase full-gate + axe at 375/1280/dark;
   expand/collapse and the strip's computed primary get explicit e2e.
4. **Copy freeze before W1:** §5 vocabulary locked first — it touches every phase and is the
   localization source; renaming mid-stream doubles translation review.
5. Keep the record page (`/memberships/[id]`) untouched through all phases; revisit its role only
   after the workspace has lived a full renewal cycle in production.

### Do **NOT** implement

- ❌ Tabs on the workspace (withdrawn — and don't reintroduce them later "for scale"; §10 is the
  scaling answer).
- ❌ Period-level Notes (domain has member-level MemberNote only; §2 Bound 1).
- ❌ Lifecycle actions on historical/expired cards — view-only, no disabled-button rows.
- ❌ Payments as events on the rail (money lives in cards' panels + Payments zone).
- ❌ A member-level "account balance" abstraction (money is per-membership snapshot — INV-20;
  "Owes" aggregates for *display* via the existing outstanding read, never as a new concept).
- ❌ A standalone record-payment screen detached from a membership (re-confirmed from the prior
  review).
- ❌ Removing/demoting the global triage lists or the Notifications queue (Job B — settled, twice).
- ❌ Desktop-only extra data (parity doctrine: same information, different geometry).
- ❌ Sticky desktop action headers, recent-members switcher, Next-column quick-filter — real ideas,
  not v1; park them.
- ❌ Any service/domain/permission change beyond the ruled A-1/A-2/A-3 read fork.

---

*Review complete. Nothing was implemented; no code, no React, no service changes. The next step is
human rulings on §13.1 — after that, the spec document is revised to match this review and the
W-series proceeds.*
