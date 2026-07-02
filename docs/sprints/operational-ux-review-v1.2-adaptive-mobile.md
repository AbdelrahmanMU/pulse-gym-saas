# Operational UX Review — v1.2 Adaptive Mobile Implementation Sprint

**Date:** 2026-07-02 · **Branch:** `feat/platform-foundation` · **Author:** Claude Terminal
**Role framing:** Product Designer / Gym Operations Expert first, React developer second.

> **What this is.** The review-led gate for the v1.2 Adaptive implementation slice. The *design*
> authority already exists and is committed (`5c68fe4`): `design-system-v1.2.md` (AP-1..8, §5
> Mobile Interaction Guidelines, §6 operational-first doctrine), catalog §12, and the six
> `docs/design/v1.2-adaptive/` reports. **This document does not re-design** — it reviews every
> implemented screen *as built today* against that authority, measures the operator cost of the
> current presentation, and binds every code change in this sprint to a specific finding.
> Per-screen mobile hierarchy contracts live in `adaptive-design-report.md`; this review cites
> them (reference, never duplicate) and adds what that docs-first pass could not: findings from
> the actual built screens, journey tap-counts, and acceptance criteria.
>
> **Scope guardrails honored:** no business-rule / schema / domain / permission / service /
> engine / architecture change. Adaptive boundary = `md`. Adopted patterns only (AdaptiveBottomSheet,
> scoped CreationFAB, StickyMobileActionBar); Bottom-tab bar and swipe actions stay **deferred** —
> not re-litigated. Implementation subset = the before-Beta DD items (design-debt-report):
> DD-1, DD-2, DD-3, DD-4, DD-5 (filters), DD-8 (urgent slice), DD-9 (member + membership detail),
> DD-10, DD-11.

---

## 0. The two mental models (review lens)

Every screen below is judged against the two operator jobs the product serves:

- **Job A — the receptionist:** *"the member standing in front of me."* Find the member, see
  status/balance/remaining days instantly, take the next action (renew / record payment / freeze /
  register) one-handed, phone in hand, member waiting.
- **Job B — the owner:** *"what needs my attention today?"* Expiring, expired, unpaid — then act.

This is the same pair the Member-Centric Workspace review
(`product-architecture-review-member-centric-workspace.md`) reasoned about (its Job A / Job B).
That review's verdict (MODIFY — build a member workspace as the primary receptionist surface,
keep global lists as triage) is **awaiting a human Phase-0 ruling** and is **not** implemented
here. This sprint is reconciled with it, not a substitute for it: everything below improves the
*existing* surfaces' mobile ergonomics and stays valid whether or not the workspace lands
(§14 records the one dependency).

## 1. Measurement conventions

- **Tap** = one intentional touch (typing a search string = 1 "type" plus its taps to focus;
  native `<select>` open + option = 2 taps). Drawer navigation = 2 taps (open drawer, tap item).
- **Scroll** counted in approximate 667px viewport-heights (390×844 reference device) on seeded
  realistic data (20-row page, 6-section membership detail).
- **Thumb zone** = bottom ⅓ of viewport (v1.2 §3). "Out of reach" = top ⅓ one-handed.
- Where a proposal **adds** a tap, it is stated honestly and justified by reach/clarity/scroll
  gains — no "looks cleaner" claims.

---

# Part I — Per-screen review

Screens are reviewed individually. Contracts cited from `adaptive-design-report.md` (ADR-§n).

## S-1 Landing (`/`)

- **Current workflow.** Public marketing page (Sprint 1.6); signed-in staff are redirected to
  `/dashboard`. One CTA path to sign-in.
- **Operational problems.** None — it is not an operational surface. Its only operator job is
  "get me to sign-in fast."
- **Mobile problems.** None found: catalog composition, responsive, CTA above the fold
  (verified in Sprint 1.6 e2e).
- **Proposed adaptive hierarchy.** No change. Not in the before-Beta DD subset.
- **Implementation.** None (out of scope; no finding).
- **Accessibility.** Already passes the Sprint 1.6 gate; included in the DD-10 axe sweep.
- **Acceptance criteria.** Axe-clean at 375px and 1280px (DD-10 sweep). No visual change.

## S-2 Sign-in (`/sign-in`)

- **Current workflow.** Email + password → Sign in → `/dashboard`. 3 taps + 2 typed fields.
- **Operational problems.** None — flow is minimal and correct.
- **Mobile problems.** **DD-2:** inputs render at `text-body` (14px) → iOS Safari focus-zooms on
  every field, disorienting the first interaction of every shift. That is the whole finding.
- **Proposed adaptive hierarchy.** Unchanged layout; inputs render ≥16px below `md`
  (`--control-font-mobile`, v1.2 §5.10).
- **Implementation.** Token-level: DD-2 fix lands in the shared input primitives (TextInput /
  SelectInput / TextArea / CurrencyInput), which this form composes — zero screen code.
- **Accessibility.** No regression risk (font-size increase only); axe at both viewports.
- **Acceptance criteria.** Focusing email/password at 375px triggers no iOS zoom (input
  computed font-size ≥ 16px); form still passes axe; desktop rendering unchanged (14px).

## S-3 Dashboard (`/dashboard`) — ADR-§1

- **Current workflow (Job B).** KPIGrid of 7 StatCards in *source* order: Active · Expiring
  Soon · Expired · Frozen · Scheduled · Revenue Today · Revenue Month → then 4 operational
  panels (Expiring / Expired / Outstanding / Recent) → rows deep-link to membership/member
  detail. Quick actions (Add member / Sell membership / Record payment) sit in the PageHeader.
- **Operational problems.** The order answers "how big is my gym?" before "what needs my
  attention today?" — the **vanity count (Active) leads; the urgent counts (Expiring/Expired)
  follow.** On desktop all 7 cards share one glance so the cost is small; the panels are correct
  already (urgent lists before Recent).
- **Mobile problems.** The KPIGrid stacks 4→2→1, so on a phone the owner scrolls **past Active
  before seeing Expiring/Expired**, and past ~2 viewport-heights of KPI cards before the first
  actionable list row. Quick actions in the PageHeader are at the very top — out of thumb reach —
  and scroll away immediately.
- **Proposed adaptive hierarchy (DD-8, urgent slice — AP-2).** Reorder the KPI *source* order to
  operational-first: **Expiring Soon · Expired · Active · Frozen · Scheduled · Revenue Today ·
  Revenue Month.** One DOM order serves both presentations (v1.2 §5.11 preserves DOM/reading
  order); desktop's glance is unharmed — the urgent pair simply leads the grid. Panels keep
  their existing (already-correct) order. Full feed re-ordering (lists interleaved with KPIs)
  stays after-Beta per DD-8.
- **Implementation.** Reorder `StatCard`s in `modules/dashboard/ui/kpi-cards.tsx`. No read-model
  change. No FAB (not a create-list screen — §5.2); quick actions stay in the header (they are
  links into flows whose forms get sticky bars).
- **Accessibility.** Reading order = DOM order = new operational order, identical on both
  presentations. Axe at both viewports (DD-10).
- **Acceptance criteria.** At 375px the first two KPI cards are Expiring Soon and Expired;
  desktop shows the same order; axe-clean both viewports; no read-model diff.

## S-4 Members list (`/members`) — ADR-§2

- **Current workflow (Job A entry).** Toolbar (search field + submit, status select, trainer
  select, inline "Add member" primary) → DataTable (Name · Status · Contact@p2 · Trainer@p3 ·
  Joined@p3) → pagination. Row tap = name link → profile.
- **Operational problems.** Solid on desktop. The table gives the receptionist name + status +
  contact in one scan; search is URL-driven and shareable.
- **Mobile problems.**
  1. **DD-1:** below `sm` the table drops to Name + Status only and horizontal-scrolls as
     backstop — contact/trainer/joined are invisible; a table row is a ~44px sliver of the
     screen's information capacity.
  2. **DD-3:** "Add member" is a toolbar button at the top — out of thumb reach, scrolled away
     when the receptionist reaches the bottom of page 1 to confirm no duplicate exists (the
     precise moment they need it).
  3. **DD-5:** two `<select>`s + search consume ~3 stacked rows (~180px) of the first viewport
     before the first member row.
- **Proposed adaptive hierarchy.** `< md`: **card list** (AP-1) — card order per ADR-§2:
  P0 MemberStatusBadge → P1 name (link) · trainer → P2 phone/email · joined. Search stays inline
  (it *is* Job A's primary act — burying it in a sheet would add a tap to the hottest path);
  the two selects move to a **filter bottom sheet** with an active-count trigger (AP-3);
  **CreationFAB** "Add member" (AP-6), inline primary hidden `< md`.
  *(ADR-§2's card P0 also names an "outstanding flag" — `MemberRow` does not carry outstanding
  today and adding it is a service change, out of this sprint's constraints; recorded in §14.)*
- **Implementation.** DataTable card mode (opt-in `renderCard`) in `members-table.tsx`;
  `MembersToolbar` gets the responsive filter-sheet split; page adds FAB; list bottom-pads for
  the FAB (§5.2).
- **Accessibility.** Card list = labeled `<ul>` retaining the table's caption as accessible
  name; card reading order = P0→P1→P2; FAB is a real link with accessible name, ≥44px; filter
  sheet inherits the overlay gate (focus trap, Esc, focus return). Adaptive parity: every table
  fact appears on the card; every filter reachable in the sheet.
- **Acceptance criteria.** At 375px: no horizontal scroll; each member renders as a card showing
  status, name, trainer, contact, joined; FAB visible and tappable, hidden at ≥768px; filter
  sheet opens/closes with focus return and applies the same URL params; desktop table pixel-
  identical to today; axe-clean both viewports.

## S-5 Member Details (`/members/[memberId]`) — ADR-§3

- **Current workflow (Job A core).** PageHeader (name + actions: **Sell membership** primary
  when member ACTIVE + actor may create; Edit secondary) → status badge + trainer line →
  2-col grid: Contact · Details (DOB/gender/joined) · Responsible trainer (assign form) ·
  Lifecycle (archive/reactivate).
- **Operational problems (both presentations).** **The screen answers "who is this member?" but
  not "what do I do for them?"** It shows **no membership status, no remaining days, no
  outstanding balance** — the receptionist's three P0 facts (v1.2 §6 canonical example). To
  answer "can they train today?" the operator must leave for `/memberships`, search the same
  name again, and open the membership — the exact gap the Member-Centric Workspace review
  documented. Its full resolution (membership list + billing on the member surface) awaits the
  human ruling; **what this sprint can do without any service change** is compose the
  *already-public* `getMemberMembershipStanding` (memberships module public index — the same
  read the archive policy composes) into a P0 standing strip.
- **Mobile problems.** Primary actions live in the PageHeader — top of screen, out of thumb
  reach (DD-3). Section order is source order: Contact (P2) renders **before** Lifecycle and
  trainer concerns. DOB/gender (P2 metadata) sit above the archive control. Inputs (assign
  trainer select) zoom on focus (DD-2).
- **Proposed adaptive hierarchy (DD-9).**
  - **P0 (new, composition-only):** a membership-standing strip under the header — member
    status badge (exists) + "Active membership" / "Frozen membership" / "Scheduled membership" /
    "No live membership" chips derived from the public standing read, each cue linking to the
    memberships list filtered to this member's name (existing `?q=` URL contract — no new API).
  - **Section DOM order becomes operational-first (both presentations, one DOM):** Responsible
    trainer · Lifecycle → Contact → Details. (Trainer is P1; Contact P2; DOB/gender P2.)
  - **StickyMobileActionBar (detail variant)** `< md`: primary **Sell membership** (when
    eligible), secondary **Edit**. Archive stays where it is — destructive actions never gain
    the thumb zone (§5.1).
- **Implementation.** Page-level composition + section reorder + sticky bar; no module service
  touched; standing read is permission-gated exactly as today (strip renders only with
  `memberships.read`).
- **Accessibility.** Standing chips are text+icon (never color alone); sticky bar buttons
  labeled, ≥44px, focus order after content; DOM order = reading order on both presentations.
- **Acceptance criteria.** At 375px the first viewport answers: member status, membership
  standing, next action (bar pinned in thumb zone); desktop keeps inline header actions
  (bar is `< md` only); no new permission surface; axe-clean both viewports.

## S-6 Memberships list (`/memberships`) — ADR-§5

- **Current workflow.** Toolbar (search by member + status select defaulting to the LIVE
  projection + inline "Sell membership") → DataTable (Member · Plan@p2 · Status · Ends@p2 ·
  Price) → pagination.
- **Operational problems.** Desktop is sound (the LIVE default just landed from the previous
  review). `remainingDays` is derived in the row but **not shown** — the operator reads a raw
  end date and does date arithmetic mentally.
- **Mobile problems.** Same trio as S-4: below `sm` the table shows Member + Status + Price —
  **the plan and end date vanish**, which are exactly what a renewal conversation needs (DD-1);
  "Sell membership" out of thumb reach (DD-3); toolbar eats the first viewport (DD-5).
- **Proposed adaptive hierarchy.** Card list (AP-1), order per ADR-§5: **P0** status badge ·
  remaining days (already in `MembershipRow` — displayed via the existing `remainingDaysLabel`
  format, no service change) → **P1** member name (link) · plan · ends date → **P2** price
  snapshot. Filter sheet for status; search stays inline; **CreationFAB** "Sell membership".
  *(ADR-§5's card P0 also names outstanding — not in `MembershipRow`; service change; §14.)*
- **Implementation.** `renderCard` in `memberships-table.tsx`; toolbar split; FAB on page.
- **Accessibility.** As S-4; remaining-days is text (mono-tabular where numeric), the badge
  carries icon+label.
- **Acceptance criteria.** At 375px each row shows status, remaining days, member, plan, end
  date, price with no horizontal scroll; FAB present `< md` only; filter sheet parity; desktop
  unchanged; axe-clean both viewports.

## S-7 Membership Details (`/memberships/[membershipId]`) — ADR-§6

- **Current workflow (Job A action hub).** Header (member name / plan / "View member") →
  status badge + remaining-days line → 2-col grid in source order: **Plan snapshot · Period ·
  Lifecycle timeline · Actions (renew/upgrade/freeze/resume/cancel) · Billing (summary + record
  payment) · Payment history.**
- **Operational problems.** The two things an operator opens this screen to do — **collect
  money and renew/freeze** — render **last**. On desktop the 2-col grid keeps them one glance
  away (acceptable); the *reading* order is still money-last, which also mis-serves the §6
  doctrine on desktop.
- **Mobile problems.** The stack is ~5–6 viewport-heights; Billing is ~4 viewports deep. The
  receptionist scrolls past a plan snapshot, six period dates, and the full audit timeline to
  reach "Record payment" (DD-9 — the flagship instance). Amount input zooms on focus (DD-2).
- **Proposed adaptive hierarchy (DD-9, the operational core).** Reorder the **DOM/source**
  order to the §6 tiers — one order, both presentations (§5.11):
  1. **Billing** (outstanding balance/standing + record-payment form) — P0 money;
  2. **Actions** (lifecycle controls) — the "next action" (prompt principle 3);
  3. **Period** (dates, remaining/frozen context) — P1;
  4. **Plan snapshot** — P1;
  5. **Payment history** — P2;
  6. **Lifecycle timeline** — P2 audit.
  Desktop's 2-col grid auto-places the same order (Billing+Actions become the top row — a
  deliberate, doctrine-compliant desktop improvement, not a sacrifice: identical data, identical
  density, money-first). Status + remaining-days strip stays at top (P0, already correct).
  No sticky bar here in this slice: this screen's "primary" is context-dependent (pay vs renew
  vs resume), and with Billing/Actions moved into the first 1.5 viewports the bar would
  duplicate reachable controls (§5.3 holds one primary; picking one would demote the others).
  Record-payment stays an inline form (its sheet form is the after-Beta remainder of DD-5).
- **Implementation.** Section reorder in the page component only.
- **Accessibility.** Reading order = new DOM order on both presentations; nothing else moves.
- **Acceptance criteria.** At 375px, Billing (with outstanding + record form when permitted)
  is the first section after the status strip and Actions the second; desktop shows the same
  order in 2 columns; every section still renders exactly its current content; axe-clean.

## S-8 Plans list (`/plans`) — ADR-§4

- **Current workflow.** Toolbar (search + status select + inline "New plan") → DataTable
  (name, price, duration, status) → pagination. Low-frequency owner surface.
- **Operational problems.** None material on desktop.
- **Mobile problems.** DD-1/DD-3/DD-5 as S-4, at lower operational frequency (plans change
  rarely; the sell flow reads plans from a select, not this list).
- **Proposed adaptive hierarchy.** Card list per ADR-§4: **P0** price (MetricValue) ·
  active/archived status → **P1** name (link) · duration → P2 description/created. Filter
  sheet; **CreationFAB** "New plan".
- **Implementation.** `renderCard` in plans table; toolbar split; FAB.
- **Accessibility / acceptance.** As S-4, with price rendered mono-tabular currency.

## S-9 Plan Details (`/plans/[planId]` + edit)

- **Current workflow.** Read view (snapshot facts, archive/reactivate control) + edit form.
- **Operational problems.** None found — short page, one screen of content.
- **Mobile problems.** Form inputs zoom (DD-2); form submit at content end is *near* the thumb
  zone already on this short form, but consistency says all forms behave alike (DD-3).
- **Proposed adaptive hierarchy.** No reorder needed (content already status→facts→controls,
  fits ~1.5 viewports). Forms gain the sticky action bar via the shared FormLayout enhancement.
- **Implementation.** None screen-specific — inherits DD-2 (inputs) and DD-3 (FormLayout).
- **Acceptance criteria.** Edit form: action row pinned in thumb zone at 375px, inline at
  desktop; inputs ≥16px mobile; axe-clean.

## S-10 Payments (billing sections on membership detail) — ADR-§6, DD-11

- **Current workflow.** No standalone payments route (by design — the ledger hangs off the
  membership). But the sidebar still shows a muted, non-navigating **"Payments" placeholder**.
- **Operational problems (DD-11 = RC TD-15).** The placeholder tells staff a shipped capability
  is "not built yet" — an IA lie that costs trust and one wasted tap-attempt per new staff
  member. Payments *are* shipped (record/void/history on membership detail).
- **Mobile problems.** Covered under S-7 (order) and DD-2 (amount input).
- **Proposed adaptive hierarchy.** **Remove the placeholder nav item.** The billing surface's
  mobile order is S-7's contract. (A real payments *list* route is a future feature decision —
  not invented here.)
- **Implementation.** Delete the placeholder entry in `app/(app)/layout.tsx` `buildNavGroups`.
- **Accessibility.** One less `aria-disabled` decoy in the primary nav.
- **Acceptance criteria.** No "Payments" item in rail or drawer; nav e2e still green.

## S-11 Notifications (`/notifications`) — ADR-§7

- **Current workflow (Job B).** TopBar bell (badge = unread count) → full-page list, unread
  grouped first, All/Unread URL filter, per-row read/dismiss, mark-all-read.
- **Operational problems.** None material — the list already leads with the alert type +
  member + effective end date (its P0), and rows link to the membership.
- **Mobile problems.** Already a single-column list — no table pathology. Row action buttons
  (read/dismiss) are right-aligned small targets; they meet 44px via control tokens (verified
  Epic-7). The bell → NotificationCenter *sheet* (ADR-§7) is an AP-4 unification listed
  **after-Beta** in DD-5 — the bell currently deep-links to this page, which is honest and
  cheap (1 tap, no overlay needed).
- **Proposed adaptive hierarchy.** No before-Beta change beyond the DD-10 axe sweep. TD-18's
  future "resume due" cue has a natural home here + dashboard (recorded §14, not built —
  awaiting ruling).
- **Acceptance criteria.** Axe-clean at both viewports; no functional change.

## S-12 Reports (`/reports` + 4 sub-reports) — ADR-§8

- **Current workflow (Job B, owner-only).** Hub of 4 link cards → each report: StatCards
  (headline) → breakdown DataTable; revenue adds a custom-range form.
- **Operational problems.** None on desktop; headline-first already matches §6.
- **Mobile problems.** Report breakdown tables horizontal-scroll / drop columns (DD-1 names
  report tables explicitly); the revenue range form inputs zoom (DD-2).
- **Proposed adaptive hierarchy.** StatCards already stack headline-first. Enable DataTable
  card mode on the report tables using the **derived** (no-`renderCard`) card — label/value
  pairs from the visible columns; the headline metric stays a StatCard above. Range form
  inherits DD-2/DD-3. The custom-range → bottom-sheet form is after-Beta (DD-5 remainder).
- **Implementation.** `cardMode` flag on the report tables (derived cards — no bespoke card
  code); nothing else.
- **Accessibility / acceptance.** Cards readable at 375px with no horizontal scroll; totals
  row/empty states unchanged; axe-clean both viewports.

## S-13 Staff (`/staff` + detail + new/edit) — ADR-§9

- **Current workflow.** Owner-only slice: list (name, role, status, last login) + search/
  filters + "Add staff"; detail with suspend/reactivate/role controls; create/edit forms with
  temp-password flow.
- **Operational problems.** None on desktop (Epic-9 fresh).
- **Mobile problems.** DD-1/DD-3/DD-5 as the other lists; suspend (destructive) must not gain
  default thumb placement (§5.1) — its current confirm-step placement is compliant.
- **Proposed adaptive hierarchy.** Card list per ADR-§9: **P0** Active/Revoked status · role →
  **P1** name (link) → **P2** last login · email. Filter sheet; **CreationFAB** "Add staff".
  Forms inherit sticky bar + 16px inputs.
- **Implementation.** `renderCard` in staff table; toolbar split; FAB.
- **Acceptance criteria.** As S-4; suspend flow unchanged.

## S-14 Settings (`/settings/gym`, `/settings/branch`, `/settings/profile`) — ADR-§10/11

- **Current workflow.** Multi-field forms (FormLayout), save at end.
- **Operational problems.** None — infrequent surfaces.
- **Mobile problems.** DD-2 (zoom) and DD-3 (on the taller gym form the save button needs a
  scroll-hunt; the header holds no duplicate).
- **Proposed adaptive hierarchy.** Stacked FormSections (already) + **sticky form action bar**
  `< md` + 16px inputs. No FAB (never on settings — §5.2).
- **Implementation.** Inherited entirely from the FormLayout enhancement + input tokens.
- **Acceptance criteria.** Save/Cancel pinned in thumb zone at 375px on every settings form;
  desktop action row unchanged; axe-clean.

## S-15 Onboarding (gym → branch → profile → complete) — ADR-§11

- **Current workflow.** Focused-shell wizard, one form per step, e2e-verified responsive.
- **Operational problems.** None.
- **Mobile problems.** DD-2; step Continue button at content end (short forms — near thumb
  zone already, same consistency argument as S-9).
- **Proposed adaptive hierarchy.** Inherit sticky bar (form variant) + 16px inputs. No FAB.
- **Acceptance criteria.** Wizard completes end-to-end at 375px with pinned step actions;
  existing onboarding e2e stays green.

## S-16 Error states (route error boundaries, Forbidden, not-found)

- **Current workflow.** Catalog ErrorState (calm copy + recovery action), inline Forbidden
  per page, in-shell not-found (Sprint 1.5).
- **Operational / mobile problems.** None found: single-column, one action, reachable.
  Recovery action sits mid-screen — acceptable (rare surface; pinning an error action would
  give a destructive-adjacent control permanent thumb residence for no frequency gain).
- **Proposed change.** None. Verified in the DD-10 sweep (`/ui-states` page).
- **Acceptance criteria.** `/ui-states` axe-clean at both viewports (existing e2e already
  covers the error boundary).

## S-17 Loading states (route `loading.tsx`, skeletons)

- **Current workflow.** Route-group `loading.tsx` + Skeleton shimmer (reduced-motion-safe).
- **Mobile problems.** None — skeletons are full-width blocks; shimmer honors reduced motion.
- **Proposed change.** None. Card-mode lists reuse the same loading surface (route-level).
- **Acceptance criteria.** No new loading pattern introduced; reduced-motion behavior intact.

## S-18 Empty states (EmptyState / NoResultsState)

- **Current workflow.** Per-list EmptyState with icon + title + description + (permission-
  gated) CTA; filter-aware "no match" variant (LIVE-projection copy landed last session).
- **Mobile problems.** One interaction: on empty create-list screens the EmptyState CTA and
  the new FAB would both offer "create" — §5.2 explicitly allows this (FAB "is not the only
  path"; `extended` FAB variant exists for first-run). Keep both: the CTA teaches, the FAB
  is muscle memory. No change needed.
- **Acceptance criteria.** Empty lists at 375px show EmptyState + FAB without overlap (list
  bottom padding); axe-clean.

---

# Part II — User journeys (mobile, 390×844, one-handed)

Baseline = current build; proposed = after this sprint's DD subset. Typing excluded from tap
counts (stated separately). "dw" = drawer navigation (2 taps: open + item).

| # | Journey (start → done) | Current taps | Current scroll/reach pain | Proposed taps | What changed |
|---|---|---|---|---|---|
| J-1 | **Search member** (dashboard → profile): dw → Members → focus search → type → submit → tap result | **6** | Result rows are name+status slivers; contact hidden (DD-1) | **6** | Taps equal; the *result* now shows status/trainer/contact on the card — the frequent "read their state" sub-journey ends here instead of costing +1 nav into the profile. Zero horizontal scroll. |
| J-2 | **Register member** (members list → saved): Add (top) → 5+ fields → submit (bottom) | **7** + fields | "Add member" out of thumb reach at top; every field iOS-zooms (DD-2); submit needs end-of-form scroll | **7** | FAB puts entry in thumb zone (reach ↑); zero focus-zoom; sticky bar keeps Submit/Cancel visible for the entire form (scroll-to-submit eliminated). |
| J-3 | **Sell membership** (member profile → sold): header "Sell" → plan select ×2 → submit | **4** | Primary in top header — thumb stretch; selects zoom | **4** | Same taps; primary now in sticky detail bar (thumb zone); 16px selects; membership standing visible *before* selling (S-5 strip prevents double-selling to an already-active member — an error-avoidance gain no tap count shows). |
| J-4 | **Renew membership** (memberships list → renewed): search member (2+type) → open row (1) → scroll ~4 viewports to Actions → Renew (1) | **4** + ~4 viewports scroll | Actions render second-to-last (S-7) | **4** + ~1 viewport | Reorder puts Actions second; scroll cost ~-75%. |
| J-5 | **Freeze membership** (detail → frozen): scroll to Actions → days field → Freeze | **3** + ~4 viewports | As J-4 + number field zooms | **3** + ~1 viewport | Scroll ~-75%; numeric keypad at 16px. |
| J-6 | **Resume membership** (detail → resumed): scroll to Actions → Resume | **2** + ~4 viewports | As J-4 | **2** + ~1 viewport | Scroll ~-75%. (TD-18 "resume due" cue would remove the *finding* cost too — awaiting ruling, §14.) |
| J-7 | **Record payment** (detail → recorded): scroll ~4½ viewports to Billing → amount → method? → submit | **3–5** + ~4½ viewports | Money form is the *deepest* content on the screen; amount zooms | **3–5** + ~0 viewports | Billing is now the first section — visible in the first 1.5 viewports; amount = 16px numeric-decimal keypad. The highest-frequency money action loses its entire scroll cost. |
| J-8 | **Assign trainer** (member profile): scroll past Contact/Details → select → Assign | **3** + ~1.5 viewports | Trainer section below P2 metadata | **3** + ~0.5 viewport | Trainer section now precedes Contact/Details. |
| J-9 | **View reports** (dashboard → revenue): dw → Reports → Revenue card | **4** | Breakdown tables h-scroll on phone | **4** | Tables render as cards — every column readable, no h-scroll. |
| J-10 | **Handle notifications** (anywhere → cleared): bell (1) → row read/dismiss (1/row) | **2+n** | Already sound | **2+n** | No change (deliberate — after-Beta sheet adds nothing here; bell deep-link is 1 tap). |
| J-11 | **Manage staff** (dw → staff → suspend): dw → Staff → open person → suspend + confirm | **6** | List table slivers; Add staff top-right | **6** | Cards + FAB + sticky forms; suspend keeps its confirm step (never thumb-default). |
| J-12 | **Gym setup** (first-run wizard) | 3 steps × (fields + Continue) | Fields zoom; Continue below fold on gym step | same | 16px inputs; pinned step actions; completes one-handed. |

**Journey summary.** This sprint's honest wins are **not** tap-count wins (the flows were
already lean — 2–7 taps): they are **scroll elimination on the money/lifecycle paths**
(J-4..J-8: ~4 viewports → ≤1), **zero focus-zoom on all 12 journeys**, **thumb-zone primaries
everywhere** (FAB ×4, sticky bars on all forms + member detail), **full information parity on
list rows** (no horizontal scroll anywhere), and **one navigation decoy removed**. Filter
changes cost +1 tap on mobile (sheet trigger) in exchange for ~180px of reclaimed first
viewport and thumb-reachable controls — stated per §1, an accepted trade the catalog already
made (AP-3).

# Part III — Success metrics (per dimension)

- **Tap reduction:** neutral on all 12 journeys (0 added to any primary path; +1 only on the
  optional filter-change sub-path, traded for viewport + reach).
- **Scroll reduction:** membership-detail actions/money: ~4–4.5 viewports → ≤1 (J-4..J-7);
  member profile trainer/lifecycle: ~1.5 → ~0.5 (J-8); dashboard urgent KPIs: 1–2 → 0 (S-3);
  list first-row visibility: ~180px reclaimed (S-4/6/8/13).
- **Navigation reduction:** 1 dead nav destination removed (S-10); member standing readable
  without the `/memberships` round-trip (S-5: saves 3 taps + search re-type on the "can they
  train today?" question).
- **Cognitive-load reduction:** every list row exposes all decision facts (no hidden-column
  recall); money/actions render before metadata on the two operational details (§6 order);
  urgent-before-vanity on the dashboard.
- **Thumb-reach improvement:** create actions ×4 screens (top-left/right → FAB), form
  submits ×9 forms (content-end → pinned bar), member-detail primary (header → pinned bar),
  filters (top selects → bottom sheet).
- **Operational speed:** the receptionist's three hottest flows (find member, record payment,
  renew) each lose their scroll/zoom friction; no flow gains a step.

# Part IV — Implementation plan (traceability)

Every change traces to a finding; nothing else ships.

| Change | Trace |
|---|---|
| Tokens `--safe-*`, `--fab-size/offset`, `--action-bar-h`, `--sheet-max-h/radius`, `--control-font-mobile`, `--z-fab` + `viewport-fit=cover` + registry update (design-tokens.md same change) | v1.2 §8, §5.8 (DD-4) |
| Input primitives → ≥16px `< md` (TextInput/SelectInput/TextArea/CurrencyInput) | DD-2 (S-2, S-5, S-7, S-9, S-12, S-14, S-15) |
| `ui/sheet.tsx` gains a bottom side; new catalog `AdaptiveBottomSheet` (filter variant used) | DD-5, catalog §12.1 (S-4/6/8/13) |
| New catalog `CreationFAB` + applied to Members/Memberships/Plans/Staff lists | DD-3, catalog §12.2 (S-4/6/8/13) |
| New catalog `StickyMobileActionBar`; FormLayout action row pins `< md`; member-detail detail-variant bar | DD-3, catalog §12.3 (S-5, S-9, S-14, S-15, J-2/3/12) |
| DataTable opt-in card mode (`renderCard` / derived cards) + cards for members/memberships/plans/staff + report tables | DD-1, catalog §12.4 / AP-1 (S-4/6/8/12/13) |
| Toolbar filter → bottom sheet split (search stays inline) ×4 toolbars | DD-5 / AP-3 (S-4/6/8/13) |
| Dashboard KPI order → Expiring · Expired first | DD-8 / AP-2 (S-3) |
| Membership detail section reorder (Billing → Actions → Period → Plan → History → Timeline) | DD-9 / AP-5 (S-7, J-4..J-7) |
| Member detail: standing strip (public-read composition) + section reorder + sticky bar | DD-9 / AP-5 (S-5, J-3, J-8) |
| Remove "Payments" nav placeholder | DD-11 = RC TD-15 (S-10) |
| e2e+axe extension: module pages + adaptive behaviors at 375/1280, dark included | DD-10 = RC TD-7 (all screens) |
| Dark StatCard eyebrow contrast fix (token-level, 4.47→≥4.5) | v1.1 §7 gate (known lead, S-3) |

**Explicitly not in this slice** (deferred per authority, or awaiting rulings — see §14):
ConfirmationDialog/Toast normalization (DD-6/7), full dashboard feed reorder (DD-8 remainder),
non-filter sheets — pickers/menus/record-payment/notification-center (DD-5 remainder), autofocus
(DD-12), density polish (DD-13), bottom tabs, swipe actions, member workspace, TD-18 cue,
outstanding-on-list-rows (service change).

# §14 Open items surfaced (not built, awaiting human rulings)

1. **Member-Centric Workspace (Phase-0 ruling pending).** This sprint's S-5 standing strip is
   the *composition-only* subset. The full P0 (remaining days + outstanding on the member
   surface, memberships/billing panels) needs the workspace decision (additive read param /
   member-scoped reads). The mobile IA built here does **not** depend on that ruling and leaves
   it a clean home (the strip grows into the workspace summary).
2. **TD-18 freeze auto-resume cue.** The dashboard operational feed + notifications list are
   the designed homes for a "resume due" cue; nothing built (decision note pending).
3. **Outstanding flag on list cards (ADR-§2/§5 P0).** Requires adding derived outstanding to
   `MemberRow`/`MembershipRow` (service change — outside this sprint's constraints). Recommend
   bundling with whichever of (1) lands first.

*Review complete. Implementation follows; verification (build · type · lint · fitness · tests ·
e2e+axe · screenshots · reports) gates the slice per design-system-v1.2 §9.*
