# Product Architecture Review — The Member-Centric Workspace

**Date:** 2026-07-02
**Branch:** `feat/platform-foundation`
**Type:** Product / operational-workflow review — **not** an implementation task. No code changes in
this document; deliverable is a report + (on acceptance) a roadmap only.
**Scope constraint (honored):** evaluates the *daily operational workflow* only. Does **not** redesign
the domain, database, permissions, business logic, services, or lifecycle. Where the recommendation
would touch a service surface, that is surfaced as an explicit human decision (§7), not assumed.
**Continuity:** this is the natural home of the deferred **Option B** from
`operational-ux-review-memberships-projection-and-billing.md` (Proposal 1).

---

## 0. TL;DR

**Recommendation: MODIFY — accept the *direction*, bound the *scope*.**

Adopt the Member-Centric Workspace as the **primary receptionist surface**: enrich the thin
`/members/[memberId]` page into a sectioned operational workspace (Overview · Current Membership ·
Timeline · Billing · Payment History · Notifications · Trainer · Actions). This is the right model
and — critically — it **generalizes a pattern the codebase has already blessed**, rather than
inventing a new architecture.

**But do not demote or delete the global lists.** Memberships, Payments-as-outstanding,
Notifications, and Reports each serve a *second* operational job — cross-member triage — that a
per-member workspace cannot serve. The literal proposal ("Memberships becomes secondary", "Payments
becomes contextual", "Notifications becomes contextual") reads as a teardown of those triage views.
That teardown is rejected. The workspace **adds** the missing member-centric surface; the global
lists **stay** and are reframed as triage.

That is why the verdict is MODIFY and not a blanket ACCEPT: ACCEPT would sanction removing views the
business needs at open-of-day.

---

## 1. The framing that decides every question: two operational jobs, not one

The proposal is right that a receptionist thinks in members — but only for **one of the two jobs** the
product actually does:

| Job | Who / when | Mental model | Served by |
|---|---|---|---|
| **A. "The member in front of me"** | Receptionist, someone at the desk: what's Ahmed's status, take his payment, freeze him | **Member-centric** | *Nothing coherent today* — the member page is thin |
| **B. "Scan across all members"** | Owner/manager at open-of-day: who's expiring, who's frozen, who owes money, today's revenue | **List / triage-centric** | Memberships list, Notifications, Reports, Dashboard |

The proposal nails Job A and the product genuinely fails it today (see §2). The risk in the proposal
is that, taken literally, it dismantles Job B by pulling everything *into* the member. You cannot
answer "who owes me money?" from inside one member's page. **The two jobs coexist; the workspace is
Job A; the global lists are Job B.** Every question below is answered against this split — which is
why the verdicts differ per question instead of one blanket yes.

---

## 2. Evidence: the workspace is mostly *additive composition*, not re-architecture

Two findings from the current codebase are the backbone of this recommendation.

### Finding 1 — The membership detail page is *already* a cross-module workspace

`app/(app)/memberships/[membershipId]/page.tsx` today composes **four modules** on one screen through
their public surfaces:

- **memberships** — plan snapshot, derived status, period, **lifecycle timeline**, lifecycle **Actions**
- **payments** — **Billing** summary, **Payment history**, Record-payment (public `loadMembershipBilling`)
- plan formatting, trainer (read-only)

This is *already* a member-adjacent operational workspace — just anchored on the **membership** rather
than the **member**. The proposal therefore asks us to **lift a blessed, shipped composition pattern
up one level** (membership → member). That is the opposite of speculative architecture; it is
pattern-conformance (CLAUDE.md §1: "one obvious way").

### Finding 2 — The member page is thin/greenfield, and the per-member reads largely exist

`app/(app)/members/[memberId]/page.tsx` renders **only** Contact / Details / Responsible trainer /
Lifecycle. No memberships, no billing, no payment history, no freeze history, no notifications. So the
workspace is **new surface added to a thin page** — not a risky re-wiring of working screens.

And the read models to fill it **already exist as public module functions** (verified in each
module's `index.ts` / `queries.ts`):

| Workspace section | Existing public read | Gap |
|---|---|---|
| Overview (status) | `loadMember` → `MemberDetail`; `getMemberMembershipStanding`; `getMemberOutstandingBalance` | none — all per-member already |
| Current Membership | `getMemberMembershipStanding` (memberships) | thin; may want a small per-member current-period read |
| Membership Timeline (all periods incl. freeze history) | `listMemberships` (memberships) | **filters by name-search `q` + status only — no `memberId` param** (see §7) |
| Billing / Payment History | `loadMembershipBilling` (per membership) | exists at membership grain; workspace links out or composes per current membership |
| Notifications (contextual) | `listNotifications` (gym-global) | **no per-member filter today** (see §7); schema *does* support it — `Notification.memberId` + `membershipId` exist |
| Trainer | `AssignTrainerForm` already on the page | none |
| Actions (Sell / Renew / Freeze / …) | existing controls, permission-gated | none |

**Net:** the workspace is ~80% composition of functions that already ship, plus a small number of
**additive, read-only** query params (§7). No new domain concept, no lifecycle change, no permission
change.

---

## 3. The six questions, answered individually

### Q1 — Does this better match real gym workflows? **YES.**
Job A is a real, frequent, currently-unserved workflow. A person is physically at the desk; the
receptionist needs *that member's* whole operational state in one place. Today they cannot get it —
membership lives on `/memberships/[id]`, the member page shows none of it, and there is no path from a
member to their billing without knowing the membership. This is the single clearest UX gap in the
product.

### Q2 — Does it reduce navigation? **YES, materially — for Job A.**
Today, "take Ahmed's payment" is: Members → search Ahmed → *(dead end: no memberships shown)* →
Memberships → search Ahmed again → open membership → Billing. The workspace collapses that to:
Members → Ahmed → Billing section. It removes a second search and a module hop. (It does **not**
reduce navigation for Job B, nor should it try to.)

### Q3 — Does it improve receptionist efficiency? **YES.**
Fewer hops, one search instead of two, and — importantly — it eliminates the **cross-reference error**
risk of matching the right Ahmed twice across two lists. Everything scopes to one selected member.

### Q4 — Should Memberships become a *secondary* workflow rather than a primary destination? **MODIFY — reframe, don't demote out of nav.**
- **Accept:** for Job A, the membership is *reached through the member*. The member becomes the primary
  entry; the member's memberships are a section within the workspace. This also resolves the existing
  **`/members` vs `/memberships` overlap** (both are member-oriented lists today) — the prior review
  flagged this duplication directly.
- **Reject the literal reading** if "secondary" means removing the Memberships list from primary nav.
  The list is the home of Job B triage ("show me all Frozen / Scheduled / expiring periods across the
  gym"). Keep it in nav; **reframe it as an operational triage view** (it already defaults to the LIVE
  current-periods projection shipped as Option A) rather than the primary way to reach a single
  membership. Verdict: **member = primary path to a membership; Memberships list = retained triage.**

### Q5 — Should Payments become contextual to the member rather than a standalone daily screen? **ACCEPT (contextual) + MODIFY (keep a global outstanding view).**
- This is *mostly formalizing what already is*: there is **no standalone Payments screen today** — it's
  a nav **placeholder** (TD-15). Billing already lives contextually under membership detail. So
  "Payments becomes contextual" is largely already true; the workspace makes it member-contextual,
  which is better.
- **But** Job B still needs "who owes me money across all members?" — that is
  `getOutstandingBalances` / the Outstanding **Report**, which already exists. So: **retire the empty
  `/payments` placeholder** (resolve TD-15), route the "Payments" nav intent to the **Outstanding**
  view (a triage list), and keep *recording* payments contextual (member/membership). Do **not** build
  a standalone "record a payment" daily screen divorced from a membership — payments are always against
  a membership snapshot (INV-20).

### Q6 — Should Notifications become contextual while preserving global views? **ACCEPT as worded — this is the balanced case.**
- **Feasible:** `Notification` carries both `memberId` and `membershipId` (schema verified), so a
  per-member notifications section is a straightforward filtered read (§7 gap: `listNotifications` has
  no per-member filter *yet*).
- **Add** a contextual "Notifications" section to the workspace (this member's expiry alerts).
- **Preserve** the global Notifications list — it is the owner's daily triage queue (Unread → Read →
  Dismissed) and the TopBar unread badge. The question's own wording ("while still preserving global
  operational views") is exactly right, and it **generalizes to Q4 and Q5**: contextualize *for the
  member*, preserve *for the gym*.
- **Caveat:** Notifications are **Owner-only in MVP (TD-3)**. So the contextual section only appears for
  principals with `notifications.read` — a receptionist may not see it yet. That's a permission fact to
  respect, not change; it slightly lowers the near-term value of Q6 but doesn't alter the design.

---

## 4. Overall verdict: **MODIFY**

| Dimension | Verdict |
|---|---|
| Member-Centric Workspace as the primary **receptionist** surface (Job A) | **ACCEPT** |
| Enrich thin `/members/[id]` into sectioned workspace via existing composition | **ACCEPT** |
| Demote/remove global **Memberships** list | **REJECT** — retain as triage (Job B) |
| Make **Payments** member-contextual | **ACCEPT** (largely already true) |
| Remove a global **outstanding** view | **REJECT** — retain (Outstanding report/list) |
| Add **contextual** notifications + **preserve** global queue | **ACCEPT** |

**One sentence:** *Build the member workspace as the primary member-in-front-of-me surface; keep every
global list as the scan-across-members triage layer.*

---

## 5. Why this is safe against the constitution

- **§1 / §2 (simplicity, feature-sliced, compose via public functions):** the workspace composes
  existing module `index.ts` / `queries.ts` reads exactly as the membership detail page already does —
  no new pattern, no module-internal reach, no new abstraction.
- **§7 / ADR (tenancy, snapshots):** every read is already `gymId`-scoped and permission-gated in its
  module; the workspace changes *presentation and information architecture*, not data access.
- **No lifecycle / money / permission change.** Status stays derived live; billing stays against the
  membership snapshot; sections render **by permission** (a receptionist without `payments.read` sees
  no Billing section, etc.), reusing the exact gating already on both detail pages.

---

## 6. What this review does **not** endorse

- ❌ Collapsing the Memberships list to one-row-per-member *as global nav* (the prior review's Option B
  collapse) — the list stays a full triage view. The **per-member** timeline (all of one member's
  periods, including freeze history) is what moves into the workspace.
- ❌ A standalone "record payment" daily screen detached from a membership.
- ❌ Removing the global Notifications queue or the TopBar badge.
- ❌ Any change to domain, schema, permissions, services' *business logic*, or lifecycle.

---

## 7. The honest fork the human must rule on (constitution §13)

The scope constraint says **"do NOT change services."** The prior UX review operated under the looser
"read model + UI only." The workspace needs reads that don't cleanly exist today:

1. **Memberships-by-member.** `listMemberships` filters by name-search `q` + status + page — there is
   **no `memberId` param**. Filtering a member's own periods by name-matching their own name is
   fragile. The clean path is an **additive, read-only `memberId` filter** on the existing query.
2. **Notifications-by-member.** `listNotifications` is gym-global with an Unread/Read/Dismissed filter;
   Q6's contextual section needs an **additive `memberId` filter** (schema supports it).
3. *(Optional)* a small **per-member "current membership" read** if `getMemberMembershipStanding`
   proves too thin for the Overview/Current-Membership sections.

**These are additive, read-only query parameters that compose existing authorized logic — no business
rule, invariant, mutation, or permission changes.** I am treating them as within the "read model + UI"
envelope the prior review used. **But if you consider adding a query param a "service change" under
this review's stricter wording, that is your call to make** — flag it and I will either (a) proceed
under the read-model envelope, or (b) narrow the workspace to only what today's exact function
signatures return (a weaker Timeline/Notifications section). I will not silently classify past this.

**One item to verify before building the contextual-notifications section:** confirmed feasible —
`Notification.memberId` and `Notification.membershipId` both exist. No blocker.

---

## 8. Implementation roadmap (ONLY — do not implement without acceptance)

Named **Option B** for continuity with the prior review. Ordered by value; each phase is independently
shippable and independently acceptable.

**Phase 0 — Decision gate (human).** Rule on §7 (are additive read-only query params in-scope?). Rule
on the ACCEPT/MODIFY framing. No code until this is answered.

**Phase 1 — Member Workspace shell + Overview (highest value, lowest risk).**
- Convert `/members/[memberId]` from a flat two-column grid into a **sectioned/tabbed workspace**
  (catalog components only; if a tab/section container is missing from the catalog: STOP and request
  it — do not build bespoke).
- **Overview** section composed from existing per-member reads: `MemberStatusBadge`,
  `getMemberMembershipStanding`, `getMemberOutstandingBalance`. Trainer + Lifecycle + Contact/Details
  move into sections unchanged.
- Everything permission-gated exactly as today. No new reads required.

**Phase 2 — Current Membership + Membership Timeline.**
- Add a **`memberId` filter to `listMemberships`** (§7 item 1) → render the member's periods
  (Active/Scheduled/Frozen + terminal history), reusing the existing status badges and the freeze
  details already surfaced on membership detail.
- **Current Membership** section deep-links to `/memberships/[id]` for the full lifecycle Actions
  surface (don't duplicate the Actions controls — link to the blessed one).

**Phase 3 — Billing + Payment History (contextual).**
- Compose `loadMembershipBilling` for the member's current membership into a **Billing** + **Payment
  History** section (reuse `PaymentSummary` / `PaymentHistory`, permission-gated by `payments.read` /
  `payments.void`, Record gated by `payments.record`). Behavior identical to membership detail —
  purely relocated/duplicated presentation.

**Phase 4 — Contextual Notifications.**
- Add a **`memberId` filter to `listNotifications`** (§7 item 2) → this-member's alerts section, gated
  by `notifications.read` (Owner-only per TD-3 — will be empty/hidden for others until TD-3 is
  revisited).

**Phase 5 — Reframe the global layer (nav / IA only).**
- **Memberships** list: keep in nav; adjust copy/positioning to read as a **triage** view (it already
  defaults to LIVE current-periods). No query change.
- **Payments** placeholder: **resolve TD-15** — either point the nav entry at the **Outstanding**
  triage view (`getOutstandingBalances` already exists) or remove the placeholder. Do not ship an
  empty placeholder into Beta.
- Confirm `/members` remains the entry list into the workspace; retire the `/members` vs `/memberships`
  conceptual overlap in copy.

**Explicitly out of roadmap scope:** any domain/schema/permission/lifecycle change; a standalone
payment screen; global-list removal. Each phase carries the standard DoD (P0 tenancy/permission tests
on any new read param — tenant isolation on the `memberId` filter is mandatory; a11y gate; responsive;
docs updated in the same change).

---

## 9. Summary

| Question | Verdict |
|---|---|
| Q1 Better matches gym workflows | **YES** |
| Q2 Reduces navigation (Job A) | **YES** |
| Q3 Improves receptionist efficiency | **YES** |
| Q4 Memberships → secondary | **MODIFY** — member is primary path; list retained as triage |
| Q5 Payments → contextual | **ACCEPT** + retain global outstanding view (resolve TD-15) |
| Q6 Notifications → contextual + preserve global | **ACCEPT** (feasible; Owner-only per TD-3) |
| **Overall** | **MODIFY — accept the member workspace, preserve global triage** |

**Stop after this report. No implementation until Phase 0 is ruled on by the human.**
