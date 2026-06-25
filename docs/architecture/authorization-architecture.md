# Authorization Architecture
### PULSE Gym SaaS · Architecture Governance · **Canonical authorization reference**

| | |
|---|---|
| **Status** | ✅ Authoritative — supersedes the role-based authorization in ADR §8 and all `PRM-*` rules |
| **Decision** | The system is **permission-based**, not role-based. See `decision-log.md` ADR-013. |
| **References** | ADR (tenancy), `business-rules.md` (PRM — now reinterpreted here), `domain-model.md` (Role/GymUser), `monorepo-strategy.md` |

> **This document overrides any earlier statement that authorization is "role-based" or "Owner-only / Trainer-only."** Those documents describe the *intended access*, but the *mechanism* is defined here and is permission-driven. Where they conflict, this file wins (see `project-readiness-report.md` for the exact amendments required).

---

## 1. Permission-Based Architecture (the core decision)
Authorization is decided by **permissions**, never by role names. Every protected action checks *"does this actor hold permission `X`?"* — never *"is this actor an Owner?"*.

- A **Permission** is a stable, named right to perform one kind of action (e.g., `payments.record`).
- A **Capability** is a named business grouping of related permissions (e.g., *Payment Management*).
- A **Role** is **only a named bundle of permissions** — a convenience label, with **no behavioral meaning** in code.
- An **actor** (a `GymUser`) holds a set of permissions, derived from their assigned role(s)/capabilities, scoped to their gym (and later, branch).

**Why:** Roles change, multiply, and vary per gym; permissions are stable facts about *what an action requires*. Binding logic to permissions means new roles (Front Desk, Manager, Accountant…) activate with **zero code change** — you grant existing permissions to a new bundle. This is the single most important safeguard against future AI drift in access control.

## 2. Role Philosophy
- Roles exist for **human convenience and assignment**, not for decision-making.
- A role is **data**, not logic: "Owner" is a row that maps to a permission set, editable without touching code.
- **No business rule, query, or screen may branch on a role name.** They branch on permissions only.
- Renaming, adding, or removing a role must never require a code change — only a change to the role→permission mapping (data/seed/migration).

## 3. Capability Model
Permissions belong to **Capabilities**; roles receive capabilities (and thus their permissions). Authorization always evaluates the *permission*, but capabilities are how humans reason about and assign access.

| Capability | Contains (permissions) |
|---|---|
| **Member Management** | `members.read`, `members.create`, `members.update`, `members.archive`, `members.reactivate` |
| **Member Notes** | `notes.read`, `notes.create`, `notes.update`, `notes.delete` |
| **Trainer Assignment** | `assignments.read`, `assignments.manage` |
| **Plan Management** | `plans.read`, `plans.create`, `plans.update`, `plans.deactivate` |
| **Membership Management** | `memberships.read`, `memberships.create`, `memberships.renew`, `memberships.upgrade`, `memberships.freeze`, `memberships.cancel` |
| **Payment Management** | `payments.read`, `payments.record`, `payments.void`, `payments.refund` *(refund future)* |
| **Notifications** | `notifications.read`, `notifications.manage`, `notifications.send` *(send/external future)* |
| **Dashboard** | `dashboard.view` |
| **Reporting** | `reports.view`, `reports.export` *(export future)* |
| **Settings** | `settings.view`, `settings.manage` |
| **Staff & Access** | `staff.read`, `staff.invite`, `staff.manage`, `roles.manage` |
| **Branch Management** *(future)* | `branches.read`, `branches.manage` |
| **Tenant/Gym** | `gym.manage` |

## 4. Permission Keys (the stable identifiers)
The complete MVP-relevant key set (additions are append-only; **keys are never renamed or repurposed**):

```
members.read  members.create  members.update  members.archive  members.reactivate
notes.read  notes.create  notes.update  notes.delete
assignments.read  assignments.manage
plans.read  plans.create  plans.update  plans.deactivate
memberships.read  memberships.create  memberships.renew  memberships.upgrade  memberships.freeze  memberships.cancel
payments.read  payments.record  payments.void  payments.refund
notifications.read  notifications.manage  notifications.send
dashboard.view
reports.view  reports.export
settings.view  settings.manage
staff.read  staff.invite  staff.manage  roles.manage
branches.read  branches.manage
gym.manage
```

## 5. Permission Naming Rules
1. **Format:** `<resource>.<action>`, all lowercase, dot-separated. Multi-word segments use no spaces (`reactivate`, not `re_activate` unless necessary).
2. **Resource is a domain noun** from the glossary (`members`, `memberships`, `payments`).
3. **Action is a verb** describing the right (`read`, `create`, `update`, `archive`, `record`, `void`, `manage`).
4. **`*.manage`** denotes broad control over a resource where granular splitting adds no value (`settings.manage`, `staff.manage`).
5. **Keys are stable forever.** A permission key is an identifier; it is never renamed (that would silently revoke access). Deprecate by ceasing to grant it, never by renaming.
6. **Human-readable labels are separate** ("Record a payment") and may change freely; **the key never changes.**
7. **No role name ever appears in a key.** `owner.anything` is forbidden.

## 6. Permission Matrix (capability/permission × role)
`●` = granted · `–` = not granted · **Front Desk is DORMANT in MVP** (defined, mapped, migrated — but never assigned, shown, or used; see §8).

| Permission | Owner | Trainer | Front Desk *(dormant)* | Manager *(future)* | Accountant *(future)* |
|---|:--:|:--:|:--:|:--:|:--:|
| members.read | ● | ● | ● | ● | ● |
| members.create | ● | – | ● | ● | – |
| members.update | ● | – | ● | ● | – |
| members.archive | ● | – | – | ● | – |
| members.reactivate | ● | – | – | ● | – |
| notes.read | ● | ● | ● | ● | – |
| notes.create | ● | ● | ● | ● | – |
| notes.update | ● | ● | – | ● | – |
| notes.delete | ● | – | – | ● | – |
| assignments.read | ● | ● | ● | ● | – |
| assignments.manage | ● | – | ● | ● | – |
| plans.read | ● | ● | ● | ● | ● |
| plans.create / update / deactivate | ● | – | – | ● | – |
| memberships.read | ● | ● | ● | ● | ● |
| memberships.create | ● | – | ● | ● | – |
| memberships.renew | ● | – | ● | ● | – |
| memberships.upgrade | ● | – | ● | ● | – |
| memberships.freeze | ● | – | ● | ● | – |
| memberships.cancel | ● | – | – | ● | – |
| payments.read | ● | – | ● | ● | ● |
| payments.record | ● | – | ● | ● | ● |
| payments.void | ● | – | – | ● | ● |
| payments.refund *(future)* | ● | – | – | ● | ● |
| dashboard.view | ● | – | ● | ● | ● |
| reports.view | ● | – | – | ● | ● |
| settings.view / manage | ● | – | – | – | – |
| staff.read | ● | – | – | ● | – |
| staff.invite / manage · roles.manage | ● | – | – | – | – |
| branches.* *(future)* | ● | – | – | ● *(scoped)* | – |
| gym.manage | ● | – | – | – | – |

*(Receptionist and Branch Manager are future bundles: Receptionist ⊆ Front Desk; Branch Manager = Manager scoped to a branch. Both are placeholders in strategy, not MVP.)*

## 7. Role Mapping (MVP)
- **Owner** → every permission (full authority within their gym).
- **Trainer** → `members.read`, `notes.read/create/update`, `assignments.read`, `plans.read`, `memberships.read`. (View-and-coach; no finance/config — matches the ADR's intent, now expressed as permissions.)
- **Front Desk** → defined per the matrix but **mapped and dormant** (not assigned to anyone in MVP).

**Resolves domain Open Question OQ-1:** MVP ships **Owner + Trainer**; front-desk operations are an **Owner** capability in MVP, and the **Front Desk** role is the pre-defined activation path — no redesign required later.

## 8. Future Role Activation Strategy
Activating a dormant role (e.g., Front Desk) requires **no code change**:
1. The role and its permission mapping already exist (documented here, seeded as dormant data, present in migrations — §9).
2. **Enable** the role (flip it from dormant to assignable).
3. **Assign** it to staff via `roles.manage`.
4. It immediately works because every gate already checks permissions, and Front Desk's permissions already exist.

*Why this is safe:* nothing in the app "knows" about Front Desk specifically; it only knows permissions. A new role is a new *bundle*, not new *behavior*.

## 9. Migration Strategy
- **Permissions and capabilities are seeded as reference data** from the first migration (stable keys).
- **Roles (including dormant Front Desk + future roles) are seeded with their permission mappings**, with a flag marking dormant/assignable. Dormant roles exist in data but are never assignable in MVP.
- **Granting a permission to a role** is a data change (seed/migration), never code.
- **Adding a new permission** is append-only: add the key + map it to the roles that should hold it; never rename/remove an existing key.
- **Adding a new role** = insert a role row + its permission mappings; optionally flip dormant→assignable.

## 10. Forbidden Authorization Patterns
These are **defects**, not style preferences:
- ❌ `if (role === 'OWNER')`, `switch(role)`, `role == Trainer`, or any branch on a role **name**.
- ❌ Hardcoding role names in business logic, queries, UI visibility, or tests.
- ❌ Inferring permission from role at the call site (e.g., "Owners can do anything" shortcuts).
- ❌ A permission key containing a role name.
- ❌ Gating only in the UI; the server must re-check the permission every time.
- ❌ Renaming/removing a permission key (silently revokes access).

## 11. Authorization Best Practices
- **Check a permission, scoped to the gym (and branch where relevant), on every protected action**, server-side, after authentication and tenancy. Order: *authenticated → in this gym/branch → holds permission*.
- **One permission per action**; compose, don't special-case.
- **Deny by default**: absence of a permission is a denial.
- **UI may *also* check permissions to hide controls** (UX), but this never replaces the server check.
- **Tests assert on permissions**, not roles (so role re-mappings don't break tests).
- **Audit** permission-gated sensitive actions (`logging-observability.md`).

## 12. Examples

**✅ Correct (permission-driven):**
> "Before recording a payment, verify the actor holds `payments.record` within this gym. If not, deny (treat as forbidden)."
>
> "Show the 'New Membership' control only if the actor holds `memberships.create`; the action itself re-checks `memberships.create` on the server."
>
> "A test asserts: an actor *without* `memberships.cancel` cannot cancel — regardless of what role they have."

**❌ Forbidden (role-driven):**
> "If the user's role is Owner, allow recording the payment." *(branches on role)*
>
> "`switch(role) { case 'TRAINER': … }`" *(role logic)*
>
> "Hide the cancel button for Trainers." *(role-based UI gating with no permission concept)*
>
> "Grant access because Owners can do everything." *(role shortcut bypassing the permission)*

---

## 13. Capability Ownership
Every capability has **exactly one owning business context** (the context responsible for the actions its permissions gate). Permissions belong to capabilities; capabilities belong to contexts. This makes "who is accountable for this access" unambiguous and ties authorization to `data-ownership.md`.

| Capability | Business Owner (role bundle) | Owned Permissions | Responsible Context | Consumers (may require it) | Forbidden Consumers |
|---|---|---|---|---|---|
| **Member Management** | Owner | `members.read/create/update/archive/reactivate` | Member Management | Member Mgmt UI/flows | Billing, Reporting, Notifications (read members, never gate by these) |
| **Member Notes** | Owner/Trainer | `notes.read/create/update/delete` | Member Management | Member/coaching flows | Billing, Reporting |
| **Trainer Assignment** | Owner | `assignments.read/manage` | Member Management | Member flows | Billing, Reporting |
| **Plan Management** | Owner | `plans.read/create/update/deactivate` | Plan Catalog | Plan flows; Membership reads `plans.read` | Billing, Notifications |
| **Membership Management** | Owner | `memberships.read/create/renew/upgrade/freeze/cancel` | Membership Lifecycle | Membership flows | **Billing (never gates membership writes)**, Reporting |
| **Payment Management** | Owner | `payments.read/record/void/refund*` | Billing & Payments | Billing flows | **Membership (never records money)**, Reporting writes |
| **Notifications** | Owner/Trainer | `notifications.read/manage/send*` | Notifications | Staff notification UI | Reporting |
| **Dashboard** | Owner | `dashboard.view` | Reporting & Dashboard | Dashboard view | any writer |
| **Reporting** | Owner | `reports.view/export*` | Reporting & Dashboard | Report views | any writer |
| **Settings** | Owner | `settings.view/manage` | IAM (gym settings) | Settings flows | feature modules |
| **Staff & Access** | Owner | `staff.read/invite/manage`, `roles.manage` | IAM | Staff admin | every non-IAM context |
| **Branch Management** *(future)* | Owner/Branch Manager | `branches.read/manage` | IAM | Branch admin | feature modules |
| **Tenant/Gym** | Owner | `gym.manage` | IAM | Gym admin | every non-IAM context |

\* future permission. **Ownership rule:** a capability's permissions are defined and granted only by its responsible context's governance; no other context invents or repurposes them (ties to INV-7, O-2). **Forbidden Consumers** names contexts that must never gate behavior on that capability because doing so would cross a boundary (e.g., Billing must never require `memberships.*` to mutate a membership — it cannot mutate one at all).

## Open Assumptions
- **A1** — Permissions are gym-scoped in MVP; **branch-scoped permissions** are a future extension (Branch Manager). The model supports it without redesign.
- **A2 → RESOLVED (ADR-024):** Roles are **platform-defined in MVP** (Owner/Trainer fixed mappings; dormant future bundles defined). **Gym-customizable roles** are a supported-but-future capability via `roles.manage`, requiring no redesign.
