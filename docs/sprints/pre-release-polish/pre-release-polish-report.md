# Pre-Release Product Polish Sprint — Report

**Branch:** `feat/platform-foundation` (not merged/tagged) · **Date:** 2026-07-05 · **Mode:** Fast Delivery
**Scope:** presentation/operational polish only — no new business logic, no schema, no architecture, no authority changes.

> Commits this sprint (each isolated for revertability):
> - `d43c234` — remove Record Payment from Dashboard Quick Actions (Task 4)
> - `fc61c12` — in-app language switcher (Task 2)
> - `8a01665` — Notifications mobile card layout (Task 3)
> - _this doc_ — deliverables + evidence

---

## 1. Implementation Summary

| Task | Outcome |
|---|---|
| **1 · Currency consistency** | **Audited — code already compliant.** All money renders through `MetricValue` / `currencySymbol` → `formatMinorCurrency(value, currency, locale)`, which emits the Authority marks (ج.م / ر.س / د.إ / د.ك / د.أ) under `ar`. **No hardcoded `$` / `E£` / `USD` literals in any UI component.** No code change. One honest caveat below. |
| **2 · Language switcher** | **Implemented.** Cookie-based `ar ⇄ en` switch — segmented control on the profile page (حسابي) + a quick toggle in the user menu. No i18n routing. Empirically verified. |
| **3 · Notifications mobile** | **Refined.** Fixed the message-squeeze; stacked layout on mobile with a thumb-friendly action row. Token-only, no redesign. |
| **4 · Dashboard Quick Actions** | **Done.** Removed "Record Payment"; no replacement (justified §3). |
| **5 · Dashboard mobile** | **Reviewed.** Already calm/spacious; Task 4 decluttered the header. No structural change made — see §6 for the honest rationale. |
| **6 · Visual consistency** | **Walked through** dashboard, notifications, members, memberships, member/new form, plans, staff, reports, settings at 375px. App is consistent (catalog-built); the one genuine mobile defect (Notifications) is fixed. Two documented non-code caveats. |

**Verification gate:**

| Check | Result |
|---|---|
| TypeScript | ✅ clean |
| ESLint | ✅ clean |
| Architecture Fitness | ✅ (in the 200-test unit suite: `architecture.test.ts` + `lint-rules.test.ts`) |
| Production build | ✅ (`/sign-in` etc. now `ƒ` dynamic — the documented, expected effect of the locale cookie read) |
| Unit | ✅ **200 / 200** |
| Integration (docker postgres) | ✅ **107 / 107** |
| e2e (`next dev`, en-pinned, `retries:1`) | ✅ **34 pass**; the remaining nav-timing flakes are **environmental, not regressions** — see note |
| Accessibility / RTL | prior sprint's **0/44** ar-RTL axe matrix still holds; the two touched surfaces (Notifications, profile Language) render `dir=rtl` clean; the switcher was verified in both directions |

> **e2e flake note (honest).** The full suite shows 34 passing and 1–5 flaky/failing across runs, all on `toHaveURL` **navigation-timing** assertions in `onboarding.spec.ts` and three `adaptive.spec.ts` cases — **none of which this sprint touched** (I changed Notifications, Quick Actions, and the locale seam). Root cause is environmental: on a cold `next dev` in this **offline sandbox**, each page SSR waits out **four Google-Fonts fetch timeouts (~3s each)** before falling back, so first renders take **5.8–6.2s** (`GET /onboarding/gym 200 in 5863ms`) and exceed the tests' 5s assertion timeout. Clearing `.next` (to break a Windows file-lock) wiped `next/font`'s cache, amplifying it. The pages return **200 with correct content**; `next build` self-hosts fonts (build passed) so **production/pilot is unaffected**. This matches the pattern documented last sprint. The locale change is confirmed safe by the 34 green tests (all English-pinned → cookie-first correctly falls through to `env=en`).

---

## 2. Visual Polish Report (every UI change)

1. **Dashboard Quick Actions** — removed the third button ("Record Payment"), leaving the two entity-creation shortcuts (Add member · Sell membership). Cleaner header, especially on mobile. (`quick-actions.tsx`, `dashboard/page.tsx`)
2. **Notifications — mobile row layout** — the Mark-read / Dismiss controls no longer sit *beside* the message squeezing it into a ~5-line column; on mobile the message renders full-width, then the actions as a row below. Side-by-side layout restored at `sm+`. (`notification-item.tsx`)
3. **Notifications — mobile section padding** — `p-6` → `p-4 sm:p-6` for more content width on a phone. (`notification-list.tsx`)
4. **Language switcher (new)** — a segmented `العربية / English` control (endonym labels, active state via raised surface + weight, never colour-only) on the profile settings page, in a titled "Language" card consistent with the form sections. (`language-switcher.tsx`, `settings/profile/page.tsx`)
5. **User-menu language toggle (new)** — a quick "switch to the other language" item (with a Languages icon) above Sign out. (`topbar.tsx`)

All changes use catalog components + design tokens only. No new tokens, no DOM restructures beyond responsive stacking, no copy invented outside the frozen Arabic Authority (the two new strings — `settings.language` «اللغة», `settings.languageHelp` «يُطبَّق على حسابك على هذا الجهاز.» — follow its tone laws; catalog parity held at **592/592**).

---

## 3. Dashboard Review — why removing "Record Payment" improves the workflow

**Quick Actions are entity-creation shortcuts.** "Add member" and "Sell membership" each start a flow that *creates a new thing* from nothing — there is no prerequisite context, so a global dashboard shortcut is the right entry point.

**Recording a payment is contextual, not global.** A payment is always *against an existing membership* — you cannot record one without first choosing which membership is being paid. The old dashboard button linked to `/memberships` (an unfiltered list), so the receptionist's real next step was still "find the membership, open it, then record." The shortcut saved nothing and implied a global "take a payment" flow that does not (and by the domain model should not) exist.

**The real flow already lives where the context is:** the Membership detail and the Member Workspace Billing sections (Epic-5), reached from the member/membership the payment belongs to. Removing the dashboard button removes a false affordance and a moment of operational confusion (two "primary" money-ish actions competing on one screen), and points staff at the one correct, context-carrying path. No replacement was added — no stronger operational need surfaced, and adding another button would re-introduce the noise we just removed.

---

## 4. Notifications Review — refinements made

**Problem (mobile, 375px):** the row was `flex justify-between` with the Mark-read / Dismiss buttons beside the message. The action column ate ~40% of the width, so the alert text ("اشتراك QA Rail G Gap ينتهي في 12 يوليو 2026") wrapped into ~5 stacked lines and was hard to read — the opposite of a calm, scannable queue.

**Refinements (within the existing design language — no redesign):**
- **Hierarchy / rhythm** — on mobile the card now stacks: badge row (type + unread) → full-width message on one/two lines → the muted date · "view membership" line → a thumb-friendly action row. At `sm+` the original side-by-side layout is untouched.
- **Spacing** — `gap-3` between stacked blocks on mobile; section padding `p-4` on mobile (`p-6` on `sm+`) for more usable width.
- **Date hierarchy** — the generated date + "view" link now sit on their own quiet line (no longer competing with the squeezed message).
- **Actions** — moved below the message as a row, so the tap targets are wide and reachable, not crammed to the edge.
- **Badges** — left as catalogued `StatusBadge` (`size="sm"`, tone token + icon): the type badge already carries calm, correct urgency; shrinking or restyling them would be a design change beyond polish, so they were not touched.

Result: the message is readable at a glance; the queue reads calm and operational. (Before/after: `assets/notifications-mobile-before.png` → `assets/notifications-mobile-after.png`.)

---

## 5. Localization Completion

**Currency consistency — confirmed.** There are **no hardcoded currency symbols in the UI**. Every money value flows through `MetricValue` → `formatMinorCurrency`, which under `ar` renders the Authority presentation (mark after the amount, Latin digits, `,` thousands, whole amounts without decimals). The settings currency picker shows the **ISO code** — which is the Authority's own rule (D9: "the settings picker shows code + Arabic name"; we show the code, the locale-neutral part — see the residual note in §6).

- **One honest caveat:** the *seeded demo gym's* `defaultCurrency` is **USD**, so demo money reads "USD 1,200" (the ISO-code fallback — the Authority defines marks only for its five target-market currencies EGP/SAR/AED/KWD/JOD, not USD). This is **operational config, not a code bug**: a real Egyptian pilot gym sets **EGP** during onboarding (the currency picker is on the first onboarding step) and every value then renders «1,200 ج.م». The seed was left as USD deliberately — the integration suite couples to it (`plans.test.ts`, `member-archive-guard.test.ts` assert/derive a 2-decimal USD seed gym), so flipping it is a DB-package + test change outside this presentation-only sprint.

**Language switch — works.** Verified empirically end-to-end (both directions, one soft switch):

| Check | ar → en | en → ar |
|---|---|---|
| `<html dir>` flips | rtl → **ltr** ✅ | ltr → **rtl** ✅ |
| translated content re-renders | «حسابي» → **"My profile"** ✅ | "My profile" → **«حسابي»** ✅ |
| current URL preserved | `/settings/profile` ✅ | `/settings/profile` ✅ |
| session survives | ✅ | ✅ |

Mechanism: `getUserLocale()` resolves **cookie-first** (`pulse-locale` → `PULSE_LOCALE` env → default `ar`); `setLocaleAction` writes the cookie; the client calls `router.refresh()`. Cookie-first is deliberate so the switcher wins, while the e2e (env=en, no cookie) and RTL scripts (env=ar, no cookie) resolve exactly as before — confirmed by the green e2e run. Evidence: `assets/settings-profile-language-ar.png`, `assets/settings-profile-language-en.png`.

---

## 6. Final Readiness Assessment

> **"Would you confidently ship this UI to a real gym owner today?"**
> **Yes — for an Egyptian pilot configured with EGP, with the documented items below understood.** The product is calm, clean, and operational in Arabic RTL; money, dates, and durations are locale-correct; the core daily flows (dashboard → expiring/outstanding → membership → payment) read well on a phone. Nothing below is a correctness or tenancy risk; they are cosmetic/operational and each is surfaced, not hidden.

**Remaining items (this sprint + carried from prior sprints):**

1. **Currency config (operational, not code)** — set the gym's currency to **EGP** at onboarding so money renders «ج.م»; the seed demo shows USD. _(This sprint.)_
2. **Native date inputs show `mm/dd/yyyy`** — the browser-native `<input type="date">` placeholder is UA-controlled, not app-localizable without a custom date-picker component (a catalog addition = out of a polish sprint). Low impact: entry only; all *displayed* dates are the Arabic month-name form. _(Pre-existing.)_
3. **Currency picker shows code only** — Authority D9 envisions "code + Arabic name"; we show the code (locale-neutral, correct but terser). A follow-up needs a currency-name map. _(Carried from the localization sprint.)_
4. **Three Tier-2 English residuals** — runtime-composed strings still fall back to English: the multi-reason archive-blocked sentence, the currency-composed amount error, the dynamic "Must be N characters or fewer". _(Carried; documented in the localization completion report.)_
5. **Authority follow-up** — the language switcher ships what Arabic Localization Authority **D13§4 deferred**; that clause is now stale. A versioned, human-approved amendment is recommended (not done here — the sprint froze the authority docs). _(This sprint.)_
6. **JWT-session suspend caveat (TD-10)** — a suspended staff member keeps an active session until the JWT expires (blocks new sign-ins only). _(Carried; not UI.)_

**Not shippable-blocking, explicitly:** no crowded pages were found that needed restructuring. The dashboard mobile is deliberately spacious (7 urgent-first KPI cards per v1.2 design authority + four operational lists); it was **not** compressed into a 2-column KPI grid because `text-metric` money values overflow at 375px — the calm 1-column band is the correct call, and removing the Record-Payment button already tightened the header. Manufacturing further dashboard churn would have risked regressions for no real gain.
