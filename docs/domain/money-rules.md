# Money Rules
### PULSE Gym SaaS · Domain Documentation · Financial Governance

| | |
|---|---|
| **Status** | ✅ Authoritative — the single source of truth for money behavior |
| **References** | `business-rules.md` (PAY-*, PLN-*), `immutable-history.md`, `time-rules.md`, `business-invariants.md`, ADR-009 |

> Money is the part of the system where a small inconsistency becomes a real-world dispute. These rules make money **exact, attributable, immutable, and derived from facts** — and they pre-decide the future financial features so they can be added without redesign.

---

## 1. Currency
- Each **gym** has a **default currency** (a setting). All of a gym's plans, memberships, and payments use it in MVP.
- Every monetary amount **carries its currency** explicitly; an amount without a currency is invalid.
- **Multi-currency per gym** is out of scope for MVP (future: settlement currency vs display currency).

## 2. Precision
- Money is stored and computed **exactly** — as **integer minor units** (e.g., cents) or an exact **decimal**, **never** as a floating-point number (ADR-009).
- All arithmetic (sums, balances, revenue) is performed in exact units; conversion to a display string happens only at presentation.

## 3. Rounding
- **No rounding occurs in stored amounts.** Amounts are exact at the minor-unit level.
- Any display rounding (e.g., for a summary) is **presentation-only** and never written back.
- Future percentage-based features (discounts, tax, proration) must define their **rounding rule per currency** (e.g., round half-up to the minor unit) **before** they are implemented — rounding is a decision, never an accident.

## 4. Amount Due
- A membership's **amount due** equals its **captured (snapshot) plan price** at sale (MSH-2). It is **immutable** for that period.
- Renewal/upgrade create new periods with their own captured amounts due.

## 5. Outstanding Balance
- **Outstanding Balance = amount due − sum of non-voided payments** recorded against that membership.
- Computed by recomputation over immutable payment records (never stored as mutable truth — `immutable-history.md` H-5).
- **Zero or negative** balance means nothing is owed. A negative balance (overpayment) is surfaced for correction; MVP does not auto-refund.
- **Scheduled-membership obligation timing (decided — ADR-025):** a **Scheduled** membership (from a deferred upgrade/early renewal) carries its captured amount due, but that obligation becomes part of the member's **current Outstanding Balance and revenue/outstanding dashboards only when it activates** (Scheduled → Active). Before activation it is a *committed future obligation* that **may be pre-paid voluntarily** (a payment may be recorded against it; revenue counts when received), but its unpaid remainder does **not** inflate current Outstanding Balance or current dashboards. *Rationale:* current financials reflect the live period; the deferred-effective model is honored; archive is already gated by the existence of any Scheduled membership (ARC-3), so this creates no archive loophole.

## 6. Partial Payments
- A membership may receive **multiple payments** over time. Each is its own immutable record attributed to that one membership (PAY-6).
- The membership's **payment standing** is derived: **Pending** (nothing received) → **Partially Paid** (`0 < received < due`) → **Paid** (`received ≥ due`).
- **Payment standing never controls access** (MSH-6); access is governed solely by membership status.

## 7. Discounts (future — pre-decided shape)
- A discount, when introduced, **adjusts the amount due of a specific membership at creation** and is **captured immutably** like any other term — it never retroactively changes a past period.
- Discounts are recorded as part of the membership's captured terms (with their reason), so revenue and balance remain reproducible.
- **Not in MVP**; this shape ensures it's additive later.

## 8. Revenue Recognition
- **Revenue = sum of non-voided payments, attributed to the period in which the money was received** (gym time zone — `time-rules.md`). This is **cash-basis** recognition.
- **Pending/outstanding amounts are not revenue.** **Voided amounts are removed** from revenue.
- Revenue is **reproducible** for any past period from immutable records (`immutable-history.md`).
- Future option: accrual-basis recognition (recognize over the membership term) — additive, gym-selectable.

## 9. Future Refund Strategy
- A refund will be modeled as a **recorded reversal** (a negative/void-linked record), **never** as an edit or deletion of the original payment (`immutable-history.md`).
- Refunds reduce revenue in the period of the refund (cash-basis) and are fully attributable to the membership.
- **Not in MVP** (MVP corrects via Void only).

## 10. Future Tax Strategy
- Tax will be a **separate, explicitly captured component** of an amount (tax-exclusive base + tax line), with a **per-jurisdiction rate and rounding rule** decided before implementation.
- Historical tax on past memberships is **immutable**; rate changes apply only to future memberships.
- **Not in MVP** (amounts are tax-inclusive/agnostic).

## 11. Future Coupon Strategy
- A coupon is a **named, validity-bounded discount** applied at membership creation, captured immutably on the resulting membership (with the coupon code/reason).
- Coupons never alter past periods and never create orphan money.
- **Not in MVP.**

## 12. Future Credit Strategy
- Account **credit** (e.g., from goodwill or overpayment) will be modeled as a **member-scoped, recorded balance of immutable credit entries**, consumable against future amounts due — always attributable, never an orphan.
- Applying credit is a recorded event; it never edits history.
- **Not in MVP.**

## 13. Business Invariants (money)
- **M-1** — Every monetary amount carries a currency; amounts are exact (integer minor units / decimal), never floats.
- **M-2** — Every payment belongs to exactly one membership (PAY-6); no orphan money.
- **M-3** — Payments are immutable; correction is by Void only (`immutable-history.md`).
- **M-4** — A membership's amount due is its captured price and is immutable for that period.
- **M-5** — Outstanding Balance and payment standing are **derived** from immutable records, never stored as mutable truth.
- **M-6** — Revenue excludes Pending and Voided amounts and is reproducible for any past period.
- **M-7** — Payment standing never affects access (access is membership-status-only).
- **M-8** — Plan price changes affect only future memberships; past amounts due never change (PLN-3).
- **M-9** — A Scheduled membership's amount due enters current Outstanding Balance/dashboards only on activation; it may be pre-paid before then (ADR-025).

*(These feed `business-invariants.md`.)*
