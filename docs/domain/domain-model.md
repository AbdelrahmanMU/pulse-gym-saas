# Domain Model
### PULSE Gym SaaS · Domain Documentation

| | |
|---|---|
| **Status** | ✅ Authoritative — business entities and their relationships |
| **Layer** | Business concepts only. **No data fields, storage, or implementation.** "Required/Optional Data" means *business information the concept must/may carry*, not columns. |
| **References** | `business-rules.md` (rules), PRD, ADR §7–8 (tenancy/roles) |

> This describes **what each business concept *is*, what it *does*, and how concepts *relate*** — the shared mental model every future feature must respect. Relationships are stated in business terms ("a gym *has many* members"), never as keys or tables.

---

## Conceptual map (business relationships)
- A **Gym** *has many* **Branches**, **Members**, **Plans**, **Memberships**, **Payments**, **Notifications**, and *grants access to* **Users** through **GymUser**.
- A **User** *may belong to many* **Gyms** (each via a **GymUser** carrying a **Role**).
- A **Member** *belongs to one* **Gym** (and a home **Branch**), *may be assigned to one* **Trainer**, *has many* **MemberNotes**, *has many* **Memberships** over time (*at most one active*), and *has many* **Payments**.
- A **Membership** *is sold from one* **Plan** (terms snapshotted), *belongs to one* **Member**, and *has many* **Payments** across its life (sale, renewals).
- A **Notification** *concerns* a **Member**/**Membership** and *is seen by* the gym's staff.

---

## Gym
- **Purpose** — The business tenant; the top-level owner of everything.
- **Responsibilities** — Hold business-wide settings (currency, time zone, expiring-soon window); guarantee isolation from other gyms.
- **Relationships** — Has many branches, members, plans, memberships, payments, notifications; grants access to users via GymUser.
- **Ownership** — Owns all other business concepts. Owned by no one above it (in MVP).
- **Lifecycle** — Created at onboarding → operating → (future) suspended/closed.
- **Business Constraints** — Every business concept belongs to exactly one gym; nothing is shared across gyms (GYM-3).
- **Required Data** — Gym name; currency; time zone.
- **Optional Data** — Branding, contact details, business hours.
- **Future Expansion** — Subscription/billing for the SaaS itself; many gyms; franchise grouping.

## Branch
- **Purpose** — A physical location within a gym.
- **Responsibilities** — Localize where members train and where memberships/payments arise.
- **Relationships** — Belongs to one gym; is the home location of members; associated with memberships/payments.
- **Ownership** — Owned by its gym.
- **Lifecycle** — Created (a default branch at gym setup) → operating → (future) closed.
- **Business Constraints** — Always within one gym; never the tenant boundary itself (BRN-2).
- **Required Data** — Branch name; owning gym.
- **Optional Data** — Address, contact, hours.
- **Future Expansion** — Multi-branch operations, member transfers, per-branch reporting and staffing.

## User
- **Purpose** — A person who can sign in and operate the system (an Owner or a Trainer).
- **Responsibilities** — Represent a human identity that may act in one or more gyms.
- **Relationships** — May belong to many gyms, each through a GymUser carrying a Role. *A User is distinct from a Member* — staff are Users; customers are Members.
- **Ownership** — The identity is global to the platform; its *access* is granted per gym via GymUser.
- **Lifecycle** — Invited/created → active → deactivated.
- **Business Constraints** — Acts only within gyms they belong to (OWN-3, PRM-1).
- **Required Data** — Identity and sign-in credentials; display name.
- **Optional Data** — Contact details, profile.
- **Future Expansion** — Multiple roles, multi-gym switching, self-service profile.

## GymUser
- **Purpose** — The **membership-of-staff** link: it is what makes a User part of a specific Gym with a specific Role.
- **Responsibilities** — Bind one User to one Gym and state their Role there.
- **Relationships** — Connects exactly one User and one Gym; carries one Role.
- **Ownership** — Belongs to its gym; references a (global) user.
- **Lifecycle** — Granted → active → revoked.
- **Business Constraints** — One per (user, gym) pair; revoking it ends that person's access to that gym. It is the **multi-gym enabler** (one user, many GymUser).
- **Required Data** — The user, the gym, the role.
- **Optional Data** — Date granted, who granted it.
- **Future Expansion** — Branch-scoped roles, finer permissions, invitation status.

## Role
- **Purpose** — **A named bundle of permissions** — a convenience for assigning access. A role carries **no behavioral meaning**; business logic depends on permissions/capabilities, never on a role name (`authorization-architecture.md`).
- **Responsibilities** — Group permissions so staff can be granted access in one step. It *names* a permission set; it does not *decide* anything.
- **Relationships** — Held by a GymUser; maps to a set of **Permissions** (grouped by **Capabilities**).
- **Ownership** — Owned by the IAM context as reference data (mappings are data, editable without code).
- **Lifecycle** — Defined → (dormant ⇄ assignable) → mapped to permissions. New roles are new bundles, not new behavior.
- **Business Constraints** — MVP **assignable** roles are **Owner** and **Trainer**; **Front Desk, Receptionist, Manager, Accountant, Branch Manager** exist as **dormant** bundles (defined + migration-ready, never assigned/shown in MVP). Each role *is* exactly its permission set.
- **Required Data** — Role name and its mapped permission set; assignable/dormant flag.
- **Optional Data** — Description.
- **Future Expansion** — Activating dormant bundles (Front Desk/Manager/Accountant/etc.) and gym-custom roles (decision-log ADR-014/ADR-024).

## Member
- **Purpose** — A customer of the gym; the subject of memberships, payments, notes, notifications.
- **Responsibilities** — Carry the person's identity and their relationship to the gym over time.
- **Relationships** — Belongs to one gym and a home branch; may be assigned to one trainer; has many notes, many memberships (≤1 active), many payments.
- **Ownership** — Owned by its gym.
- **Lifecycle** — Registered → active → (archived ⇄ reactivated). Never erased while history exists (MBR-5).
- **Business Constraints** — Name + at least one contact (MBR-2); contact unique within gym (MBR-3); at most one active membership (MBR-4).
- **Required Data** — Name; at least one contact method; owning gym.
- **Optional Data** — Additional contact, date of birth, gender, notes, assigned trainer, join date.
- **Future Expansion** — Self-service portal, photos, household/family links, marketing consent.

## MemberNote
- **Purpose** — A note recorded about a member (coaching observations, context).
- **Responsibilities** — Capture qualitative information staff need.
- **Relationships** — Belongs to one member (and thus one gym); authored by a staff user.
- **Ownership** — Owned by its gym; attached to its member.
- **Lifecycle** — Created → (edited) → retained with the member; removed only with the member's history rules.
- **Business Constraints** — Always tied to a member; visible per gym; Trainers and Owners may read/write (TRN-2).
- **Required Data** — The member; the note content; the author.
- **Optional Data** — Category/tag, timestamp context.
- **Future Expansion** — Note types (medical, goals), visibility levels, attachments.

## Trainer Assignment
- **Purpose** — The relationship designating which trainer coaches a member.
- **Responsibilities** — Record the current coaching relationship and let it change over time.
- **Relationships** — Links one member to one trainer within a gym.
- **Ownership** — Owned by its gym.
- **Lifecycle** — Assigned → reassigned/unassigned. Cleared/reassigned if the trainer leaves (ASN-3).
- **Business Constraints** — Informational, not a permission boundary (ASN-2); a member may have none; MVP allows one trainer (TRN-3, OQ-6).
- **Required Data** — The member; the trainer.
- **Optional Data** — Date assigned, assigning user.
- **Future Expansion** — Multiple trainers, specialities, assignment history.

## Plan
- **Purpose** — A sellable offering defining price and duration of access.
- **Responsibilities** — Provide standardized terms from which memberships are sold.
- **Relationships** — Belongs to one gym; referenced by memberships (whose terms are snapshotted from it).
- **Ownership** — Owned by its gym; managed by actors holding the plan-management permissions (the Owner bundle in MVP — PRM-2).
- **Lifecycle** — Created → active (sellable) ⇄ inactive (retired). Retired, never destroyed once sold (PLN-4).
- **Business Constraints** — Edits affect only future memberships (PLN-3); inactive plans aren't sold to new memberships.
- **Required Data** — Name; price; currency; duration.
- **Optional Data** — Description, tier/category, active flag.
- **Future Expansion** — Tiers, add-ons, class packs, promotions, scheduled pricing.

## Membership
- **Purpose** — A member's right of access for a defined period, sold from a plan.
- **Responsibilities** — Track the period, the captured terms, the lifecycle status, and payment status.
- **Relationships** — Belongs to one member; sold from one plan (terms snapshotted); has many payments across its life; subject of expiry notifications.
- **Ownership** — Owned by its gym; attached to its member.
- **Lifecycle** — Active → Frozen ⇄ Active → Expired (or Cancelled). Renewal continues into a new period; Upgrade changes the plan. (See `state-machines.md`.)
- **Business Constraints** — ≤1 active per member (MBR-4); terms snapshotted (MSH-2); end derived from duration, extendable by freeze; cannot be renewed if cancelled (REN-4).
- **Required Data** — The member; the captured plan terms (name, price, duration); start date; end date; status; payment status.
- **Optional Data** — Notes, freeze record, the change history (renewals/upgrades/freezes).
- **Future Expansion** — Auto-renewal, scheduled start, multiple concurrent memberships, contracts.

## Payment
- **Purpose** — A record of money received against a membership.
- **Responsibilities** — Capture amount, currency, and date of money received; support correction.
- **Relationships** — Belongs to one membership (and thus member/gym); contributes to revenue.
- **Ownership** — Owned by its gym; recorded by the Owner (PRM-2).
- **Lifecycle** — Recorded → (voided/corrected). Never silently deleted (PAY-4).
- **Business Constraints** — Amount/currency captured at record time (PAY-2); only Paid counts as revenue (PAY-3); exact money handling (PAY-5); no card processing in MVP (PAY-1).
- **Required Data** — The membership; amount; currency; date; paid/void status.
- **Optional Data** — Method (cash/transfer/etc.), reference/note, who recorded it.
- **Future Expansion** — Online processing, receipts, refunds, partial/installment payments, non-membership income.

## Notification
- **Purpose** — An in-app alert prompting staff to act (renewals, expiries).
- **Responsibilities** — Surface time-sensitive business moments to the gym's staff.
- **Relationships** — Concerns a member/membership; visible to the gym's staff.
- **Ownership** — Owned by its gym.
- **Lifecycle** — Generated → Unread → Read → Dismissed (NTF-4).
- **Business Constraints** — In-app only (NTF-1); non-duplicating (NTF-3); generated at least daily for expiring/expired (NTF-2); not generated for frozen memberships (FRZ-3).
- **Required Data** — The gym; the subject (member/membership); the type; the state.
- **Optional Data** — Message text, generated time, who read/dismissed it.
- **Future Expansion** — Channels (email/SMS), per-user assignment, more event types, re-notify cadence.

---

## Open Questions (model-level)
- **OQ-M1 → RESOLVED.** "Trainer Assignment" is modeled as a **relationship** (carries history, supports future multiplicity); one trainer per member in MVP.
- **OQ-M2 → RESOLVED.** A **Payment references exactly one Membership** (PAY-6 invariant). Capturing the specific triggering event (sale/renewal/upgrade) on the payment is a future enrichment, not required for MVP attribution.
- **OQ-M3 — Branch on every record vs. inherited from member?** *Why:* multi-branch reporting accuracy. *Recommendation:* attribute branch at the member level in MVP; attach to memberships/payments when multi-branch activates. (Relates to BRN-1.)
