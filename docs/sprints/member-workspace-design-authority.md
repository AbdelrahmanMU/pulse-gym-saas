# Member Workspace — UX Design Authority (FINAL, pre-implementation)

**Date:** 2026-07-03 · **Status:** Definitive build authority for the Member Workspace presentation
layer, pending human sign-off. **No code in this task.**
**Supersession chain:** this document > `member-workspace-product-ux-review.md` (2026-07-03) >
`member-workspace-ux-specification.md` (2026-07-03). Where this document is silent, the review
governs; where both are silent, the spec's data-composition plan governs (A-1/A-2/A-3 fork and P0
tenant-isolation gates remain exactly as written there).
**Frozen domain (restated):** immutable Memberships; renewal creates a new Membership; ledger-based
payments; event-based notifications; permissions unchanged; services unchanged. Presentation only.

**Accepted decisions (challenged only where a serious operational problem appeared — §0):**
no tabs · single workspace · membership timeline · expandable membership cards · Current + Next
instead of precedence · period-based timeline · freeze nested · expiration = boundary ·
cancellation = event · payments inside each membership card · "Alerts".

---

## 0. Final-pass challenge results (what this document changes)

| # | Prior design (review doc) | Final ruling | Why |
|---|---|---|---|
| 0.1 | Separate "Payments" section in Zone 2 | **Removed — merged into the membership cards** | Follows the accepted decision; also kills the last remaining duplication (money appeared in a card *and* a section). Consequence handled: the strip's *Record payment* primary auto-expands the current card and anchors to its Payments panel (§6.4) |
| 0.2 | Rail always draws a Next slot | **Next slot is conditional** (§5): shown when a scheduled membership exists **or** the renewal question is live (current expiring-soon/expired). Calm mid-term members show no slot | "No renewal queued" on a member with 8 healthy months left is noise pretending to be signal. The *list* keeps its permanent two-slot columns (scanning across members is a different job) — no accepted decision is violated |
| 0.3 | Strip "Owes" + card money treated as one number | **Two distinct facts, visually separated** (§3.2, §8.2) | The shipped outstanding definition **excludes not-yet-started scheduled memberships**. The strip says what is owed *now*; an unpaid renewal is tagged on the Next card itself ("unpaid"). Conflating them would misstate money — the one unforgivable sin |
| 0.4 | Sticky behavior unspecified | **One-sticky rule** (§3.4): mobile = the bottom action bar only; the strip itself is not sticky; desktop = nothing sticky | Every sticky element permanently taxes the smallest screens; the strip's answers are needed at *arrival*, its action is needed *always* — so the action alone persists (in the thumb bar) |
| 0.5 | Timeline numbering "Period 3 of 3" | **Dropped from headers; muted "3rd membership" meta inside expanded view only** | "Period" vocabulary is dead; numbering in collapsed headers is clutter that answers no desk question |

Everything else survived this pass. Each deliverable below still opens by trying to break its own
design; where it held, the reason is stated.

---

## D1 — Information Architecture (final page, top to bottom)

```
1  ANSWER STRIP            who · coverage · money · ONE action        (always visible on arrival)
2  MEMBERSHIP              the rail — THE page body:
                             [Next slot — conditional]
                             [Current membership card — EXPANDED, contains its payments + actions]
                             [transition connectors]
                             [Past membership cards — COLLAPSED]
                             [gap markers] · [Joined terminus]
3  ALERTS                  folded summary card (owner-only until TD-3 changes)
4  MEMBER INFO             folded summary card: trainer · contact · details · member lifecycle
```

**Why this order, and why it beats the brief's example order**
(Answer Strip ↓ Primary Actions ↓ Current Membership ↓ Current Billing ↓ Timeline ↓ Alerts ↓ Info):

- The example order contains **three sections this design deletes as redundant**: "Primary Actions"
  (there is exactly ONE computed primary, and it lives inside the strip — a separate actions band
  is a junk drawer by v2), "Current Membership" and "Current Billing" (both *are* the rail's first
  expanded card — separating them re-creates the split the tab teardown fixed).
- Severity order = scan order: identity/coverage/money (3-second answers) → the operational object
  (the membership story, where all work happens) → transient signals (alerts) → reference data
  (member info). Frequency of use decays monotonically down the page; nothing frequently needed
  sits below anything rarely needed.
- Two folded cards at the bottom, not four sections: alerts and member info both have "summary in
  the header, detail on demand" shapes. Nothing else on the page folds at section level — the page
  has exactly one folding *system* (the rail's past cards + the two bottom cards), so operators
  learn one gesture.

---

## D2/D4 — The rail and its cards, field-by-field (centerpiece)

### D2.1 Rail anatomy (top → bottom)

```
[Next slot]                conditional (§D5)
╞═ transition connector    only between two REAL cards (never above the Next slot)
[CURRENT CARD]             expanded by default; accent-bar left edge (3px brand)
╞═ transition connector    "Upgraded · Silver → Gold" / "Renewed · sold Jul 28"
[PAST CARD]                collapsed; muted
— gap marker —             "No membership · 21 days" (muted, centered, no card chrome)
[PAST CARD]                collapsed
◦ terminus                 "Joined the gym · Jan 10, 2026"
[Show older]               appears when > 5 past cards; loads the rest (progressive disclosure)
```

The rail is a single `<ol>` (chronology is semantic, not decorative). Newest at top. The **current
card is the only card expanded on arrival** — arriving at a member and seeing their live state open
is the whole point; arriving to a wall of expanded history is archaeology.

### D2.2 Collapsed card header (one line — the ONLY collapsed form)

```
▸  Gold Monthly   Jun 1 → Aug 30   [EXPIRED]   Paid ✓
▸  Silver Monthly Jan 15 → (cut)   [CANCELLED] Owes E£200
```

| Slot | Content | Source | Rules |
|---|---|---|---|
| Disclosure | chevron ▸/▾ | — | Whole header row is the tap target (≥44px) |
| Plan | snapshot plan name | A-1 row | Truncates; never the live plan |
| Coverage | `start → effective end` as `<time>`, mono | A-1 row | Cancelled: `start → cancelled <date>` |
| Status | `MembershipStatusBadge` | derived, A-1 | Icon + label, never color alone |
| Money | `Paid ✓` · `Owes E£N` · nothing if payments unreadable | A-1 per-row paid summary (see spec data plan + review §11 addition) | The ONE money fact allowed in a collapsed header |

Nothing else in collapsed headers — no price, no freeze count, no trainer. Collapsed = "identify
and decide whether to open."

### D2.3 Expanded card — panel order and every field

Panels in fixed order (same DOM both breakpoints). Panels render only if they have content — an
empty panel never renders a placeholder.

**Panel 1 · Coverage** (always)
- Dates: `Started Jun 1, 2026` · `Ends Aug 30, 2026 (last day included)` — the inclusive-end
  wording is mandatory (operators must never guess whether the end day is covered).
- `58 days left` (live derived; only on the current card).
- While frozen: `Frozen since Jun 20 · planned 14 days · projected end Sep 13 (estimate)` — the
  word **estimate** is non-negotiable copy (FRZ-2: real extension is finalized on resume).
- Price snapshot: `E£1,200 · 3 months` (MetricValue currency + duration).
- Muted meta line: `3rd membership · sold by <name>`— only if A-1 carries it; otherwise omit.

**Panel 2 · Freezes** (only if the card has any freeze history)
- One row per freeze, oldest first: `Frozen Jun 20 → resumed Jul 2 · 12 days · end extended 12 days`.
- An open freeze renders as Panel 1's frozen state *plus* a row here: `Frozen Jun 20 · ongoing`.

**Panel 3 · Payments** (requires `payments.read`; loaded lazily on expand via
`loadMembershipBilling(membershipId)` — the existing public read)
- Summary line: `Paid E£800 of E£1,200 · Owes E£400` + `PaymentStandingBadge`. Overpaid renders
  `Paid E£1,300 of E£1,200 (E£100 over)` — informational, never an error.
- Ledger rows (chronological, running total available on demand/tooltip):
  `Jul 1 · E£500 · cash · by Omar` + per-row `[Void]` (requires `payments.void`, keeps its existing
  confirm + reason). A voided row stays visible, struck through, with `voided: <reason>` — the
  ledger never hides its corrections.
- Record form (requires `payments.record`; **current and next cards only**, and only while standing
  ≠ PAID): amount + method + optional note + `[Record payment]`. Includes the **quick-fill chip**
  `[E£400 — all owed]` that fills (not submits) the amount — walkthrough finding W-3 (§D15).
- When standing = PAID: the shipped quiet line `✓ Paid in full — no balance due` (form retired;
  returns automatically if a void re-derives standing).

**Panel 4 · Actions** (live cards only — **never** rendered on expired/cancelled cards, not even
disabled)
- Current card: `[Renew]` `[Freeze]` (or `[Resume]` while frozen) + overflow `⋯ → Cancel membership…`.
- Next card: overflow `⋯ → Cancel before start…` only.
- All existing permission gates and confirms apply unchanged (§D6).

### D2.4 Transition connectors (between cards, on the rail line)

| Origin of the newer card | Connector copy | Extra |
|---|---|---|
| RENEWAL | `Renewed · sold Jul 28` | — |
| UPGRADE | `Upgraded · Silver Monthly → Gold Monthly` | UpgradeIndicator semantics (direction in text + icon) |
| DOWNGRADE | `Changed to a smaller plan · Gold → Silver` | Avoids the judgmental "downgrade" at the desk; direction still explicit |
| NEW (no predecessor) | *(no connector — a gap marker or the terminus sits below)* | |

### D2.5 Card states (visual grammar)

| Card | Chrome |
|---|---|
| Current | Expanded; 3px brand accent-bar; full-strength text |
| Next (queued) | **Dashed border**, collapsed by default (§D5); expanded shows Panels 1/3/4 (no freezes possible) |
| Past — expired | Collapsed; muted (existing `historical` treatment); expands to Panels 1/2/3 |
| Past — cancelled | Same as expired + the rail line **visibly stops** under it (severed rail segment) with the dated event row `Cancelled Feb 8 by <name>` inside Panel 1 |
| Expiration | **Never an event row** — the end cap of the card: status badge + end date. No actor is implied because none exists |

---

## D3 — Answer Strip (complete design)

### D3.1 Contents — exactly four lines, frozen

```
L1  IDENTITY   Sara Adel  [ACTIVE member]          ·  Trainer Omar · since Jan 2026
L2  COVERAGE   Gold Monthly · ACTIVE · ends Aug 30 — 58 days left
L3  MONEY      ⚠ Owes E£400        |        ✓ Paid up
L4  ACTION     [ Record payment ]   (exactly one, computed — §D6.2; line absent in calm state)
```

- **L1** — name is the page `<h1>`; member badge (ACTIVE/ARCHIVED); trainer name (display only —
  assignment lives in Member info) and tenure, smallest type. Overflow `⋯` menu at line end:
  `Edit member` (+ nothing else in v1).
- **L2** — the largest line on the page. Grammar: `<plan> · <STATUS> · <boundary phrase>`.
  Boundary phrases per state are frozen in §D10. Status via badge (icon + label + tone token).
- **L3** — from the member-outstanding read: `⚠ Owes E£400` (warning tone) or `✓ Paid up` (quiet
  success). **Scope note (0.3):** this is money owed *now* (current definition excludes unstarted
  scheduled); an unpaid renewal shows on the Next slot instead (`unpaid` tag). Without
  `payments.read`, L3 is absent (not blank — absent).
- **L4** — one primary button, computed (§D6.2). In the calm state there is **no** button; calm is
  a designed state, not an absence.

**One line vs two:** L1 wraps its trainer/tenure segment to a second line below 360px; L2 never
wraps (it truncates the plan name first — status and boundary always survive); L3/L4 never wrap.

### D3.2 What must NEVER enter the strip (permanent exclusions)
Lists of any kind · payment ledger rows · alerts content (even a count) · secondary/destructive
actions · trainer *editing* · scheduled-membership detail (the rail owns it) · anything requiring
scroll within the strip. The strip has a **hard budget: 3 facts + 1 action**. Future features
compete for existing lines (§D13); the budget never grows.

### D3.3 Behavior while scrolling (the one-sticky rule)
- **Mobile:** the strip scrolls away naturally. Its L4 action also lives in the sticky bottom
  action bar (shipped `StickyMobileActionBar`, safe-area padded), so *the action* is permanent
  while *the answers* are read-at-arrival. No sticky header — vertical pixels at 375px are the
  scarcest resource in the product.
- **Desktop:** nothing sticks. With the two-column layout (§D12) the strip + current card fit above
  the fold; sticky chrome would spend permanent pixels to save a scroll that rarely happens.
- The strip is **not** a component with modes; it is the same markup at both breakpoints, reflowed.

---

## D5 — Current + Next coexistence

### D5.1 When a scheduled membership exists
The Next slot renders **above** the current card (the future sits above the present on a
newest-first rail), collapsed:

```
┌╌ NEXT ╌ Gold Monthly · starts Sep 1 · unpaid E£1,200 ╌╌ ▸ ┐
```
- Dashed border (future = not yet solid); one line; expandable like any card (Panels 1/3/4).
- **Prominence rule: never louder than the current card.** The member standing at the desk is
  covered by *current*; next is a queued fact. Dashed + collapsed + no accent-bar achieves this.
- `unpaid E£N` tag only when its own billing has remaining > 0 (and `payments.read`) — this is
  where renewal money appears (strip L3 deliberately excludes it — 0.3).
- On activation day it becomes the current card (rail re-derives; no ceremony, no animation debt).

### D5.2 When there is NO scheduled membership
- Current healthy (not expiring-soon): **no slot at all.** A permanent "No renewal queued" on every
  calm member trains operators to ignore the slot — absence-blindness is the exact failure the
  brief warns about ("understand without reading"), and it is *caused* by crying wolf.
- Current **expiring-soon or expired**: the renewal question is now live — the slot appears as a
  warning-toned line, making absence preattentive exactly when absence matters:
  ```
  ┌╌ NO RENEWAL QUEUED — current ends in 6 days   [Renew] ╌┐
  ```
  (warning `*-text` + icon; inline `Renew` = the same action as the strip primary when precedence
  selects it).
- No membership at all: the rail opens with the empty state (§D10 row 1) — the Next slot concept
  doesn't apply.

**"Should operators understand 'no renewal' without reading?" — Yes, and they do:** on the *list*,
the permanent Next column ("—") answers it across members; on the *workspace*, the warning slot
answers it exactly when it's actionable. Two surfaces, two jobs, one mental model.

---

## D6 — Actions (complete operational behavior)

### D6.1 Action inventory (every action, its home, its tier)

| Action | Permission | Home | Tier & style | Confirm |
|---|---|---|---|---|
| Record payment | `payments.record` | Current/Next card Panel 3; strip L4 when precedence selects it | Primary | None (form submit; void is the undo) |
| Renew | `memberships.renew` | Current card Panel 4; strip L4 / Next-warning slot when selected | Primary/secondary | Confirm sheet: plan + snapshot price + "starts when the current membership ends" |
| Freeze | `memberships.freeze` | Current card Panel 4 | Secondary (reversible = visible) | Days input (quick-picks 7/14/30 + free entry) |
| Resume | `memberships.freeze` (same capability) | Replaces Freeze while frozen; strip L4 while frozen | Primary while frozen | Confirm: "Frozen 12 days so far — the end date extends by the days actually frozen." (never promises the projected date) |
| Cancel membership | `memberships.cancel` | Current card `⋯` overflow | Destructive — one deliberate step away, never a visible button | Existing ConfirmationDialog, destructive styling |
| Cancel before start | `memberships.cancel` | Next card `⋯` overflow | Destructive | Same |
| Void payment | `payments.void` | Ledger row | Destructive-quiet (per-row) | Existing confirm + required reason |
| Assign/replace trainer | `assignments.manage` | Member info panel | Tertiary | None (select + save) |
| Edit member | `members.update` | Member info header + strip L1 overflow | Tertiary | — |
| Archive / Reactivate member | `members.archive`/`reactivate` | Member info panel | Destructive tier | Existing flow incl. policy guard (blocked while live/owed — surface the policy message verbatim) |
| Sell membership | `memberships.create` | Strip L4 when selected; rail empty state | Primary | Existing sell flow |

**Rules:** dangerous ≡ terminal (Cancel, Archive, Void) → never primary-styled, always behind one
deliberate step, always confirmed. Reversible (Freeze/Resume/Assign) → visible where their object
is. An action invalid for the state is **absent**, never disabled (a disabled button asks the
operator to diagnose the UI).

### D6.2 The computed strip primary (precedence, first match wins)

1. Money owed **now** (L3 warning) → **Record payment**
2. No live membership (new/lapsed/cancelled-out) → **Sell membership**
3. Frozen → **Resume**
4. Current expiring-soon AND no next queued → **Renew**
5. Otherwise → *no button* (calm)

Selecting the primary **scrolls/anchors to its home and opens it**: Record payment expands the
current card's Panel 3 and focuses the amount field; Renew opens the confirm sheet; Resume opens
its confirm. The strip never hosts its own forms.

### D6.3 Scroll behavior
Mobile: strip primary mirrored in the sticky bottom bar (plus `Edit` as the bar's secondary — the
two shipped slots, unchanged). Desktop: no floating/sticky actions.

---

## D7 — Alerts placement

**Ruling: own folded section (position 3). Not inside the rail. Not merged into the page top.**

- *Not on the rail:* the rail is the permanent operational **record**; alerts are transient
  **signals** *about* rail facts (expiring/expired). Mixing them would duplicate what the card
  status already shows and pollute history with ephemera that gets dismissed.
- *Not at the top:* the strip already answers the alert's content (an expiring member's L2 says so
  with more precision than the alert). Alerts at the top would be the third statement of the same
  fact on one screen.
- The folded header carries the only always-visible part: `Alerts — 1 unread` (unread count from
  the member-scoped read, A-2). Unfolded: newest-first alert rows (message · `<time>` · state) with
  the existing Unread → Read → Dismissed affordances, verbatim from the global queue's components.
- Empty + read access: `Alerts — none`. Without `notifications.read` (everyone but Owner today,
  TD-3): the section **does not render**. The global Notifications queue and TopBar badge are
  untouched.

---

## D8 — Payments (challenged once more)

- **Does "Billing Summary" remain independent? NO.** Deleted as a page-level section (0.1). Money
  has exactly two homes on this page: the strip's L3 (aggregate owed now — one number, no detail)
  and each membership card's Panel 3 (that membership's full money story). "Billing" as a word is
  dead (§D14).
- **Should payment history live inside membership cards? YES — solely.** Every payment belongs to
  exactly one membership (frozen domain fact); presenting the ledger inside its membership makes
  the money story and the coverage story the same story. This is the design's core simplification
  and it held under challenge.
- **Should there be a global (member-level, cross-membership) payment history? NOT on this page,
  not in v1.** The flat all-payments-of-this-member view answers accounting questions
  ("what did she pay us in total this year?"), not desk questions; it belongs to the Reports layer
  if ever needed (D-1 stays deferred). What v1 *does* guarantee: every historical payment is
  reachable in ≤2 taps (expand the right card — headers show date ranges precisely so "the March
  payment" is findable without opening three cards).
- **Cleanest operational experience, end-state:** owed member walks in → strip shows
  `⚠ Owes E£400` + `[Record payment]` → tap → current card's Panel 3 opens with amount focused +
  quick-fill chip → record → strip L3 re-renders `✓ Paid up`, primary recomputes (likely to
  nothing — calm). One surface, no navigation, ledger untouched semantics.

---

## D9 — Member Information (bottom section)

**Ruling: folded by default on mobile; open by default on desktop (space is free, and the fold
header line is identical either way).**

```
▸ MEMBER INFO — 010-1234-5678 · Trainer Omar                    [Edit member]
   (unfolded:)
   Trainer     [Omar ▾ assign/replace]        (assignments.manage; read-only name otherwise)
   Contact     Phone 010-1234-5678 · Email —
   Details     Born 1994-05-02 · Female · Joined Jan 10, 2026
   Membership of the gym   [ACTIVE member] · Archive member…   (destructive tier, policy-guarded)
```

- The fold header **is** the summary: primary phone + trainer — the two info facts a desk actually
  dials/needs. (Phone in the header is a deliberate upgrade: "call him about the renewal" without
  unfolding.)
- Trainer display also sits in strip L1; trainer *management* only here. No duplication of forms.
- **Notes:** not in v1 (no shipped notes feature). When MemberNote ships it becomes a sibling
  folded card (§D13), NOT a row in Member info — notes grow unboundedly, info doesn't.
- Why folded at all: nothing here changes within a visit; it is reference data. The two facts that
  *are* operational (phone, trainer) were promoted into the header — that is the fold-header
  design rule working as intended.

---

## D10 — Operational states (complete matrix, frozen copy)

| State | Strip L2 (coverage) | Strip L3 (money) | Strip L4 (action) | Rail |
|---|---|---|---|---|
| Never had a membership | `No membership yet` (muted) | absent or `✓ Paid up` | **Sell membership** | Empty state card: "No memberships yet." + `[Sell membership]` · terminus below |
| Lapsed (last one expired) | `NO MEMBERSHIP — ended Mar 31 (21 days ago)` (danger text) | per balance | **Sell membership** | Gap-to-now marker above the last expired card: `No membership · 21 days and counting` |
| Last one cancelled | `NO MEMBERSHIP — cancelled Feb 8` (danger) | per balance (cancelled leftovers are written off by the shipped definition — L3 reflects that automatically) | **Sell membership** | Severed rail under the cancelled card |
| Active, paid, not expiring | `Gold Monthly · ACTIVE · ends Aug 30 — 58 days left` | `✓ Paid up` | *(none — calm)* | Current expanded, quiet |
| Active, owes | same L2 | `⚠ Owes E£400` | **Record payment** | Current card Panel 3 shows the same figure |
| Active, expiring, next queued | `…ends Jul 9 — 6 days left` + expiring badge | per balance | per precedence (money first, else none) | Next slot (dashed) present |
| Active, expiring, **no** next | same L2 | per balance | **Renew** (unless money owed outranks) | Warning slot: `NO RENEWAL QUEUED — ends in 6 days [Renew]` |
| Frozen | `Gold Monthly · FROZEN since Jun 20 · resumes ~Jul 4 (estimate)` | per balance | **Resume** (unless owed outranks — money first) | Current card frozen chrome + freeze facts |
| Scheduled only (starts soon) | `Starts Sep 1 · Gold Monthly · SCHEDULED` (info tone — they are NOT covered today; copy must not pretend otherwise) | `✓ Paid up` or absent; renewal-unpaid shows on the card | *(none)* or **Record payment** if its billing owes and precedence adopts it — **exception:** scheduled-unpaid DOES trigger the primary even though L3 excludes it (the desk moment is "new signup pays now"); the button's target is the scheduled card's panel | Only the Next-style card, rendered as the rail head |
| Overpaid | normal L2 | `✓ Paid up` | *(calm)* | Panel 3 shows `(E£100 over)` informational |
| Fully paid + healthy + far from expiry | THE calm state | `✓ Paid up` | none | — |
| No alerts / no read access | — | — | — | Alerts section shows `— none` / section absent |

(The scheduled-unpaid exception in row 9 is deliberate and now part of the precedence spec — it
refines D6.2 rule 1 to: *money owed now* **or** *unpaid scheduled membership* → Record payment,
anchored to whichever card owes.)

---

## D11 — Mobile experience (one-thumb pass, 375×800, safe areas)

- **Arrival:** strip fully visible without scroll (4 lines ≈ 170px incl. padding) + current card
  header + Panel 1 within the first viewport. The 3-second answers require **zero** gestures.
- **Reach:** all *committing* actions live in the bottom sticky bar (strip-primary mirror + Edit)
  inside the thumb zone, safe-area padded (`--safe-bottom`, shipped). In-page buttons (card
  actions, quick-fill chip) are mid-screen — acceptable because they follow a deliberate scroll,
  i.e., the thumb is already there. Nothing interactive hides in the top corners.
- **Tap targets:** every row that acts (card headers, fold headers, ledger Void, alert rows) ≥44px
  with ≥8px separation (v1.2 §5.4 — the drawer review already enforced this pattern; reuse it).
- **Expansion mechanics (the one new gesture):** tapping a collapsed card header expands it and
  **anchors the header to just below the top edge** — the card must not "run away" downward as it
  grows, and the operator must not lose which card opened. Collapsing restores position. Exactly
  one past card auto-collapses? **No** — multiple cards may be open (comparing two periods is a
  real desk task, e.g., "did he pay last time?"); memory cost is bounded by lazy panel loads.
- **Scroll inventory (tenured member, all folded):** strip → current card (~1.2 viewports with
  payments open) → 3–5 collapsed past headers (~30px each) → 2 fold headers → bar. Total ≈ 2.2–2.5
  viewports. Nothing repeats; nothing requires horizontal scroll; ledger rows wrap, tables never
  appear on mobile (cards only — AP-1 doctrine).
- **Keyboard:** amount field is ≥16px (no iOS zoom — shipped rule); the sticky bar yields to the
  keyboard (standard behavior), quick-fill chip sits above the field so it's visible mid-entry.
- **Interrupt recovery:** everything is scroll-positional; no state is lost by locking the phone or
  switching members and coming back (expansion state is per-visit, default state is predictable:
  current open, rest closed).

---

## D12 — Desktop experience (1280+, not a stretched phone)

```
┌ ANSWER STRIP ─ full width ─ L1 left · L2 center-left · L3+L4 right-aligned ┐
├──────────────────────────────────────┬─────────────────────────────────────┤
│ MEMBERSHIP (rail)          ~ 7/12    │ ALERTS (open if any unread)  ~ 5/12 │
│ next slot / current expanded /       ├─────────────────────────────────────┤
│ transitions / past collapsed /       │ MEMBER INFO (open by default)       │
│ gaps / terminus                      │ trainer · contact · details ·       │
│                                      │ archive                             │
└──────────────────────────────────────┴─────────────────────────────────────┘
```

- **Width is spent on parallelism, not size:** the rail keeps a readable measure (~640–720px);
  the right column absorbs the folded sections so *everything* is visible without any unfold —
  the desktop premium is "no gestures at all," not bigger cards.
- The strip compresses to two visual rows (L1+L2 left, L3+L4 right) — same DOM, CSS reflow; the
  mental model (who/coverage/money/action) is identical, which is the parity doctrine's point.
- Hover affordances (ledger running-total tooltip, connector timestamps) are enhancements only —
  every fact reachable by hover is also present in expanded content (no hover-only information).
- Same single-column DOM order as mobile (strip → rail → alerts → info); the two-column placement
  is grid presentation. Keyboard/tab order therefore matches the mobile reading order exactly.

---

## D13 — Future growth (where every future module lands)

Zone contract (frozen): **strip budget never grows** (3 facts + 1 action) · **rail is closed**
(membership story only) · **new modules = folded summary cards** between Alerts and Member info ·
**a card that outgrows one summary view graduates to a sub-page** linked from its header.

| Future module | Lands as | Header summary (the always-visible line) | Graduates? |
|---|---|---|---|
| Check-ins | Strip L1 gains at most a `Checked in 9:12 ✓` chip **(competes within L1's budget)** + folded card | `Check-ins — today 9:12 · 14 this month` | Sub-page for full log |
| Attendance | Folded card (may merge with check-ins — one concept at the desk) | `Attendance — 14 visits this month` | Yes |
| Measurements | Folded card | `Measurements — last taken May 3` | Yes (charts live on the sub-page, never inline) |
| Progress photos | Folded card | `Photos — 6 · latest May 3` | Yes (gallery = sub-page; never inline-render media walls) |
| Medical notes | Folded card, own permission gate, **collapsed even on desktop** (sensitivity) | `Medical notes — 2` | Yes |
| Member notes (MemberNote) | Folded card | `Notes — 3 · latest “owes shoes” Jun 2` | Yes |
| Tasks | Folded card; a *due* task may compete for strip L4 through the precedence list (list may grow; button count may not) | `Tasks — 1 due today` | Yes |
| Documents / Contracts | One folded card ("Documents") | `Documents — 2 · contract signed Jan 10` | Yes (viewer = sub-page) |

Worst case, all eight shipped and folded: eight ~30px header lines ≈ a third of one mobile
viewport. The page's shape is invariant for years; only the folded stack grows, linearly and
legibly. (This is the argument that buried tabs: 8 modules would have needed 12 tabs.)

---

## D14 — Operational vocabulary (FROZEN — localization source of truth)

Register rule: words a gym owner says across the desk, out loud. One noun per concept. English
below is the source language for the Localization Sprint.

### Section titles
| Label | Where |
|---|---|
| *(member's name)* | Page title (h1) — the page needs no other name |
| `Membership` | The rail's section heading |
| `Next` / `Past memberships` | Rail slot label / collapsed group implied by card order (no separate heading needed; "Past memberships — N" may caption the first collapsed card group) |
| `Alerts` | Folded section |
| `Member info` | Folded section |

### Buttons & actions (imperative, verb-first)
`Sell membership` · `Renew` · `Freeze` · `Resume` · `Record payment` · `Void…` ·
`Cancel membership…` · `Cancel before start…` · `Assign trainer` / `Replace trainer` ·
`Edit member` · `Archive member…` / `Reactivate member` · `Show older` · quick-fill chip:
`E£<N> — all owed`. (Trailing `…` = opens a confirm; frozen convention.)

### Statuses (badges — unchanged domain states, frozen labels)
`ACTIVE` · `FROZEN` · `SCHEDULED` · `EXPIRED` · `CANCELLED` — plus member badges `ACTIVE member` /
`ARCHIVED member`, expiring flag `Expiring soon`, standing `Paid` / `Partly paid` / `Unpaid`
(replaces "Partially paid/Pending" **in labels only** — enum names untouched).

### Money phrases
`Owes E£400` · `✓ Paid up` (strip) · `Paid E£800 of E£1,200` · `✓ Paid in full — no balance due`
(card) · `(E£100 over)` · `unpaid E£1,200` (Next tag). **Banned:** Billing, Outstanding, Balance
due, Invoice.

### Coverage phrases
`ends Aug 30 — 58 days left` · `(last day included)` · `starts Sep 1` · `Frozen since Jun 20 ·
resumes ~Jul 4 (estimate)` · `end extended 12 days` · `No membership · 21 days` (gap) ·
`NO RENEWAL QUEUED — ends in 6 days` · `Joined the gym · Jan 10, 2026` · connector verbs
`Renewed / Upgraded / Changed to a smaller plan / Cancelled`.

### Empty / calm states
`No memberships yet.` · `Alerts — none` · `No trainer assigned` · calm strip = no L4 button.

### Banned words (user-facing, everywhere on this surface)
`Period` · `Billing` · `Outstanding` · `Profile` · `History` (as a title) · `Notification`
(member context) · `Lifecycle` · `Snapshot` · `Ledger` · `Record` (as a noun) · `Entity/ID`
(ids never render) · `Downgrade` (use "smaller plan").

---

## D15 — Final product walkthrough (one receptionist day)

Legend: 👍 effortless · ✋ hesitation found → fix applied to this authority.

1. **Search member** — Members list → type name *or phone* (shipped) → tap row. 👍 2 taps + typing.
   ✋ **W-1:** after serving, returning to a *filtered* list keeps stale context for the next
   customer. Fix: none needed in the page — browser back restores search state, and clearing is
   one tap; a "recent members" switcher stays parked (§13-do-not of the review).
2. **Renew** — arrival: strip L2 `ends Jul 9 — 6 days left`, warning slot `NO RENEWAL QUEUED` with
   `[Renew]`, and strip L4 = Renew (precedence 4). Tap → confirm sheet: plan, snapshot price,
   "starts when the current membership ends" → confirm. Next slot materializes (dashed,
   `unpaid E£1,200`). 👍 2 taps. ✋ **W-2:** operator wonders "same plan or new plan?" — fix:
   confirm sheet names the plan in the button itself: `[Renew — Gold Monthly, E£1,200]`; a
   different plan = the Upgrade path on the card (unchanged), and the sheet says so in one muted
   line: `Different plan? Use Change plan on the membership card.`
3. **Take payment** — strip L4 recomputed → `Record payment` (scheduled-unpaid rule, §D10 row 9)
   → auto-scroll to the Next card's Panel 3, amount focused. ✋ **W-3:** typing `1200` is friction
   + typo risk → fix (already folded into D2.3): quick-fill chip `E£1,200 — all owed`, tap, method
   `cash` preselected as most-common, `[Record payment]`. Strip re-renders. 👍 3 taps total.
4. **Freeze** (different member, going away 2 weeks) — current card Panel 4 `[Freeze]` → ✋ **W-4:**
   blank days field = "how long?" hesitation → fix (folded into D6.1): quick-picks `7 · 14 · 30`
   + free entry. Tap 14 → confirm. Strip flips to FROZEN state, L4 = Resume. 👍
5. **Resume** (member returns early) — strip L4 `[Resume]` → confirm states the honest rule:
   `Frozen 9 days so far — the end date extends by the days actually frozen.` → confirm → strip
   back to ACTIVE with the extended end date. 👍 2 taps. (The confirm never shows the projected
   date as a promise — estimate discipline held end-to-end.)
6. **Check alerts** — Owner sees `Alerts — 1 unread`, unfolds, reads, `Mark read`. 👍 ✋ **W-5:**
   the receptionist persona sees no Alerts section at all (TD-3 permission fact). Stated
   honestly: not a design gap; a permission decision that predates this page. No UI workaround
   (inventing a peek would violate the frozen permission model).
7. **Edit trainer** — Member info header (phone + trainer visible without unfolding) → unfold →
   `Replace trainer` select → save → toast + strip L1 updates. 👍 3 taps.
8. **Finish** — back to Members. Day simulated twice more against §D10 states (lapsed member →
   Sell path 👍; owed-and-frozen member → money-first precedence puts `Record payment` before
   `Resume`, correct: collect before reactivating 👍).

**Residual hesitation count after fixes: zero within this page's authority.** W-1 and W-5 are
adjacent-surface facts, documented, not silently patched.

---

## Closing — what implementation receives

This document + the surviving data plan (spec §5: A-1/A-2/A-3 fork, P0 tenant-isolation gates) +
the review's phasing (W0 rulings → W1 strip+shell → W2 rail → W3 payments/actions inline → W4
two-slot list → W5 alerts) constitute the full build input. Catalog additions required before W1:
**Answer Strip**, **folded section card (Disclosure)**, **MembershipCard `expandable` variant**,
and the **rail connector/gap primitives** — each a catalog change needing approval per the
constitution. Vocabulary (§D14) freezes with this document's acceptance and feeds the Localization
Sprint unchanged.

*Stop. No code, no services, no implementation. Awaiting sign-off on: (a) this authority,
(b) the A-1/A-2/A-3 read fork, (c) the catalog additions, (d) the §D14 vocabulary freeze.*
