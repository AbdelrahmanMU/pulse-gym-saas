# Sprint 1 · Epic 1 — Gym Initialization

### Technical Specification · PULSE Gym SaaS

| | |
|---|---|
| **Status** | ✅ **APPROVED + IMPLEMENTED (2026-06-30).** Approved with the decisions in the amendment block below (which resolve OQ-1…OQ-4); implemented and verified — see `sprint-1-epic-1-verification-report.md`. |
| **Sprint / Epic** | Sprint 1 · Epic 1 (the first business Epic, on the frozen `v1.0.0-sprint-0` platform). |
| **Owning context** | **IAM / Tenant** (`bounded-contexts.md`; capabilities `tenant_gym`, `settings`, `branch_management`, `staff_access` resolve to IAM). First feature slice → lands under `apps/web/src/modules/**`. |
| **Spec format** | The project **Spec Kit** (`feature-template.md` §1–§13 + `definition-of-ready.md`), presented in the section order the Epic brief requested. Every feature-template dimension (tenancy, permissions, validation, testing, DoD) is covered. |
| **Authoritative sources (cited, never restated)** | PRD §1–§6; `business-rules.md` (GYM-1…4, BRN-1…3, PRM-1/PRM-3); `money-rules.md` §1; `time-rules.md` §1/T-1/T-2; `authorization-architecture.md` §4/§6; `@pulse/auth` permission catalog; `database-design-specification.md` §2.1–§2.4 + `schema.prisma`; PULSE Component Catalog v1.1; `api-standards.md`; `error-handling.md`; `testing-standards.md`. |
| **Scope guard** | No new architecture, no schema migration, no new permission key, no new UI component, no business rule invented. Where a rule is missing or the brief conflicts with the docs, an **Open Question** is raised (§0) — never guessed. |

> **Reconciliation note (read first).** The Epic brief lists "Create Gym" and "Create First Branch." The authoritative docs are explicit that, in the MVP, the gym **and** its first branch are **created at setup (seeded)**, not via a self-serve UI: PRD §6.3 ("Single gym — one seeded tenant; no self-serve tenant signup UI yet"), PRD §6.2 (multi-gym onboarding UI deferred), **GYM-4** ("The MVP operates one gym with one branch, **created at setup**"), **BRN-1** ("MVP: a single default branch"). Sprint 0's seed already writes the placeholder singletons (`gyms`: "PULSE HQ"/USD/UTC; `branches`: "Main Branch"; owner `users` row "Gym Owner"). Therefore **Epic 1 = *initialize/configure* the seeded tenant** — replace placeholder values with the real gym's identity, settings, first-branch details, and owner profile. This faithfully "establishes the first real tenant" without a forbidden second gym, a Phase-2 signup flow, or editing the frozen Sprint-0 seed. **This interpretation is carried through the whole spec; OQ-1 asks the human to confirm it.**

---

## 0a. Approved decisions & amendments (2026-06-30) — supersede the draft where they conflict

The human approved the spec with these decisions; they **resolve all four Open Questions** and amend the noted sections. The implementation follows these (verification report §1).

1. **OQ-1 → Gym Setup & Configuration**, not creation. The seeded Gym/Branch/Owner are configured. (Confirms the draft's interpretation.)
2. **OQ-2 → Self-Ownership Rule** for Owner Profile (`CurrentUser.Id == TargetUser.Id`); **no new permission**.
3. **OQ-3 → Currency & timezone remain editable** in the MVP (immutability guard deferred to a later Epic).
4. **OQ-4 → Use only `gym.view` + `gym.manage`** for gym configuration. **Amends §5:** read = **`gym.view`** (not `settings.view`); write = `gym.manage`. `gym.view` is **added** to the `@pulse/auth` catalog (append-only, INV-7, human-approved).
5. **Onboarding experience** (amends §3/§6 "editable-pages-not-wizard"): a guided flow **Login → Gym Setup → Branch Setup → Owner Profile → Success → Dashboard**, ending in a **completion state** ("Your gym is ready"). Persisted via a new **`gym.setupCompletedAt`** column — **one additive, forward-only migration** (amends §7's "no migration": the completion state requires persistence; human-approved).

---

## 0. Open Questions — RESOLVED (see §0a)

> Per the brief's STOP rule. Each carries a **recommended default**; the spec is written on the recommendation so it is reviewable, but these are the human's call.

| # | Question | Why it's open | Recommended default |
|---|---|---|---|
| **OQ-1** | Confirm Epic 1 = **configure the seeded gym/branch**, not build a self-serve "create gym/branch" flow. | The brief says "Create"; the docs say "seeded at setup" (PRD §6.3, GYM-4, BRN-1). A genuine wording-vs-docs contradiction. | **Configure the seeded singletons** (per the docs). No tenant-signup and no add-branch UI in MVP. |
| **OQ-2** | How is **Owner Profile** editing authorized? The permission catalog (`@pulse/auth`, INV-7 append-only) defines **no `profile.*`/account permission**. | A real gap: §5 must "list every permission," but none exists for self-account edits, and inventing a key is a catalog redesign (forbidden here). | **Self-ownership check**, not a permission: `principal.userId === targetUser.id`. Generalizes to any staff editing their own identity. `User` is a **global** entity (not tenant-scoped), so this is scoped by `userId`, never `gymId`. If the human wants it permission-gated, that's a catalog change requiring approval. |
| **OQ-3** | Are `defaultCurrency` / `timeZone` **editable after** dependent financial/temporal records exist? | `money-rules.md` §1 ties all plans/memberships/payments to the gym currency; `time-rules.md` §1 makes tz authoritative — but neither doc states an immutability rule. | **For Epic 1: freely editable** (no plans/memberships/payments exist yet). A guard that locks/﻿warns on currency change once financial records exist is a **later-Epic** concern — flagged here, **not invented now**. |
| **OQ-4** | `gym.manage` vs `settings.manage` overlap (both Owner-only, both "manage … settings"). | The catalog defines both; §5 must assign one deterministically. | In MVP the **Gym entity is the only configuration resource**, governed by **`gym.manage`** (write) + **`settings.view`** (read). `settings.manage` is reserved for a future distinct settings resource. Confirm the boundary. |

---

## 1. Epic Objective

**Business value.** Turn the freshly-provisioned, placeholder tenant into a *correctly configured* real gym so that every subsequent Epic (Members, Plans, Memberships, Payments, Dashboard, Notifications) operates on accurate money, time, identity, and location data from day one. Concretely, the Owner can, on first sign-in and at any time after:

1. Set the gym's **identity & contact** (name, contact email/phone) — replacing "PULSE HQ".
2. Set the gym's **operational settings** — default **currency** (drives all future money — GYM-2, money-rules §1), **time zone** (drives "today"/expiry/reporting — GYM-2, time-rules §1), **expiring-soon window**, and **grace period**.
3. Configure the **first (default) branch** — name, address, contact phone, active state — replacing "Main Branch".
4. Maintain their own **Owner profile** — display name, phone, avatar.

This is the smallest slice that makes the platform *usable as a specific gym*. It introduces **zero** member-facing or billing capability. Owning module: a new IAM/Tenant feature slice under `apps/web/src/modules/**` (the project's first `modules/` slice — it exercises the Session-5 T-27 cross-context and platform-adapter fitness rules against real code for the first time).

---

## 2. Scope

### IN scope
- **Gym configuration** (single seeded gym): view + update `name`, `contactEmail`, `contactPhone`, `defaultCurrency`, `timeZone`, `expiringSoonWindowDays`, `gracePeriodDays`. *(Exactly the editable, non-audit, non-derived fields already on the `Gym` entity — DDS §2.1.)*
- **First/default branch configuration** (the single seeded branch): view + update `name`, `address`, `contactPhone`, `isActive`. *(BRN-1 single default branch.)*
- **Owner profile** (self): view + update `displayName`, `phone`, `avatarUrl` on the signed-in `User`.
- **Navigation wiring:** replace Session 4's inert "Manage" placeholders with real, permission-gated Settings nav items (Gym, Branch, My Profile).
- **Permission gating** of every action **by permission** (§5), tenancy-scoped, with inline-403 for the unauthorized and redirect for the unauthenticated (reusing the Session-3/4 perimeter).
- **P0 tenancy + invariant tests**, validation, accessibility, responsiveness, docs.

### OUT of scope (explicitly)
- ❌ **Members, Trainers, Plans, Memberships, Payments, Reports, Notifications** — later Epics (brief; PRD Epics B–G).
- ❌ **Self-serve gym/tenant signup or creation** (Phase 2 — PRD §6.2/§6.3, GYM-4). No `Gym` row is created by this Epic.
- ❌ **Creating additional branches / multi-branch management / transfers** (future — BRN-1/BRN-3). This Epic configures the one existing default branch only.
- ❌ **Staff invitation / additional users / role assignment** (`staff.invite`/`staff.manage`/`roles.manage` — a later IAM Epic).
- ❌ **Email change, password change/reset, MFA** — auth-perimeter/Phase-2 (Sprint 0 §2 OUT; the `lib/auth/**` perimeter is frozen). Owner profile is limited to non-credential personal fields.
- ❌ **Per-gym branding, business hours, per-branch time zone** — YAGNI-removed from the schema (GYM-2 future; `schema.prisma` MVP-ONLY note). Adding them would be a schema change → out of scope.
- ❌ **Any new permission key, UI component, dependency, or migration.**

---

## 3. User Stories (with acceptance criteria)

> Personas per PRD §1.3 (Gym Owner/Admin). All actions are **permission-gated and tenancy-scoped**; "the Owner" denotes the seeded staff principal who holds the listed permission, never a role-name check (PRM-3).

**Design decision (US-wide):** there is **no schema field tracking "setup complete"** and none may be added (frozen/out of scope). Therefore initialization is delivered as **persistent, re-editable Settings pages** (not a one-time gated wizard); the seeded placeholders are simply the initial field values. *(Surfaced because the word "initialization" otherwise implies a one-shot wizard with completion state that cannot exist here.)*

### US-1 — Configure gym identity & contact
*As the Owner, I want to set my gym's name and contact details so the system reflects my real business.*
- **AC-1.1** Given I hold `gym.manage`, when I open Gym settings, then the current values load (initially the seeded placeholders).
- **AC-1.2** Given a valid name (non-empty after trim), when I save, then the `Gym` row updates, a success Toast shows, and a reload shows the new values.
- **AC-1.3** Given an empty name, when I submit, then the form blocks with a field-level error and nothing persists.
- **AC-1.4** Given I lack `gym.manage`, when I attempt to view/save, then I see the inline-403 ErrorState and no write occurs (server re-checks).

### US-2 — Configure gym operational settings (currency, time zone, windows)
*As the Owner, I want to set currency, time zone, the expiring-soon window, and grace period so money and time are judged correctly.*
- **AC-2.1** Given I hold `gym.manage`, when I set `defaultCurrency` to a valid ISO-4217 code and `timeZone` to a valid IANA zone and save, then the `Gym` row updates and the values persist.
- **AC-2.2** Given `expiringSoonWindowDays` or `gracePeriodDays` < 0, when I submit, then validation blocks (mirrors the DB CHECK `>= 0`) and nothing persists.
- **AC-2.3** Given an unknown currency code or invalid time-zone identifier, when I submit, then validation blocks with a clear message.
- **AC-2.4** *(Forward-dependency, OQ-3)* In Epic 1, currency/time zone are editable without restriction (no financial/temporal records exist). *No guard is implemented for the post-financial-data case — deferred.*

### US-3 — Configure the first (default) branch
*As the Owner, I want to name and describe my main location so records attribute correctly.*
- **AC-3.1** Given I hold `branches.manage`, when I open Branch settings, then the seeded default branch loads.
- **AC-3.2** Given a valid name, when I save name/address/contactPhone/isActive, then the `Branch` row updates and persists.
- **AC-3.3** Given a `branchId` whose `gymId` ≠ my session gym, when a write is attempted, then it resolves to **404** (cross-tenant — `error-handling.md`; assertSameGym), never 403.
- **AC-3.4** Given I lack `branches.manage`, when I attempt to save, then inline-403 and no write.

### US-4 — Maintain my (Owner) profile
*As the signed-in Owner, I want to update my display name, phone, and avatar.*
- **AC-4.1** Given I am authenticated, when I open My Profile, then my `User` fields load.
- **AC-4.2** Given a valid display name, when I save, then my `User` row updates. **Session-coupling caveat:** the shell identity (TopBar/Sidebar name + Avatar) renders from the **JWT `principal`** (Session-3 strategy — same source as the documented permission-staleness), so it reflects the change **only after the session token is re-issued**. Implementation must trigger a NextAuth session `update()` on successful save; absent that, the new identity appears on next sign-in. *(The AC is "DB updated + shell reflects after session refresh," not "DB write alone updates the shell.")*
- **AC-4.3** Given a request targeting a `User` id ≠ my session principal, when a write is attempted, then it is rejected (ownership check; not found / forbidden per `error-handling.md`) — a user may edit **only** themselves.
- **AC-4.4** Email and password are **read-only / absent** here (Phase-2 auth scope); attempting to change them is not offered by the UI.

---

## 4. Business Rules (referenced — none invented)

> Per the brief: reference existing domain documentation; invent nothing. The rules below are **cited**, not restated. Gaps are in §0 (Open Questions).

| Ref | Rule (source) | Application in Epic 1 |
|---|---|---|
| **GYM-1/GYM-3** (`business-rules.md`) | A Gym owns and isolates all its data; complete cross-gym isolation. | Every read/write is scoped by session `gymId`; cross-gym branch access → 404. |
| **GYM-2** | A gym's settings are **currency, time zone, expiring-soon window**. | The settings surface (§US-2). Branding/business-hours stay future (YAGNI). |
| **GYM-4** | MVP = **one gym + one branch, created at setup**. | Epic configures the seeded singletons; no create flow (OQ-1). |
| **BRN-1/BRN-2/BRN-3** | One default branch in MVP; a branch is always a sub-scope of its gym. | Single-branch configuration; branch writes assert same-gym. |
| **money-rules.md §1** | Each gym has a **default currency** (ISO-4217); all money carries currency; multi-currency out of MVP. | Currency validation = ISO-4217; single gym currency. (Mutability guard = OQ-3.) |
| **time-rules.md §1 / T-1 / T-2** | Each gym has a configured **time zone** (IANA); "today"/expiry/periods judged in it; store UTC. | Time-zone validation = IANA identifier; the chosen tz drives later Epics. |
| **PRM-1** | Every action is checked **gym/branch scope first, then the required permission**. | The mutation pipeline ordering (§8). |
| **PRM-3** (+ constitution §8, `authorization-architecture.md` §10) | **No branching on a role name**, ever — authorize by permission. | §5; enforced by the T-27 fitness suite. |
| **Audit (DDS §2.17, INV-39)** | Sensitive actions are recorded in `audit_logs` (append-only). | Gym/branch/profile updates **may** emit an audit entry (ids, not bodies — `logging-observability.md`). *Scope note in §8.* |

**No new business rule (BR-*) is introduced by this Epic.** If review finds a needed rule absent, that is an Open Question, not an invention.

---

## 5. Permissions (permission-based only — `authorization-architecture.md`)

> Every permission below already exists in the `@pulse/auth` catalog (`keys.ts`/`catalog.ts`); **no key is added or renamed** (INV-7). Code references the `PERMISSION_KEYS` constants, never string literals (T-27 rule ⑤). Owner holds all permissions (catalog `ROLES`); the gates are written against the **permission**, never the Owner role (PRM-3).

| Action | Required permission | Key constant | Scope / tenancy |
|---|---|---|---|
| View gym settings (identity + operational) | **`gym.view`** | `GYM_VIEW` | Read `Gym` where `id = session.gymId`. *(Amended per §0a-4: `gym.view` added, append-only; `settings.*` not used for gym config.)* |
| Update gym settings (identity + operational) | **`gym.manage`** | `GYM_MANAGE` | Update `Gym` where `id = session.gymId`. |
| View the default branch | `branches.read` | `BRANCHES_READ` | Read `Branch` where `gymId = session.gymId`. |
| Update the default branch | `branches.manage` | `BRANCHES_MANAGE` | Update `Branch`; assert `branch.gymId === session.gymId` → else 404. |
| View own profile | **(authenticated self — no permission; OQ-2)** | — | `User` where `id = session.userId`. |
| Update own profile | **(authenticated self; ownership check `principal.userId === target.id`; OQ-2)** | — | Self only; `User` is global → scoped by `userId`, **not** `gymId`. |

- **Server-side enforcement** via the Session-3 `@pulse/auth` gate (`hasPermission(session, key)`); the UI also **hides** controls the principal can't use (`authorization-architecture.md` §"show the control only if…"), but the server **re-checks** every mutation (deny-by-default).
- **Denied → 403** (inline ErrorState); **cross-tenant → 404**; **unauthenticated → redirect** (reuse the `(app)` layout guard). No role-name conditional anywhere (grep/T-27-clean).

---

## 6. UI

> **Catalog-only, tokens-only** (constitution §3; Component Catalog Governance §A–F). Every component below is an **existing** Catalog component — **no net-new component is required**, so no STOP-and-request is triggered. All screens render inside the Session-4 **AppShell** (authenticated `(app)` group), use **PageContainer `narrow`** (forms ~640px) + **PageHeader**, and inherit Global Conventions §0 (focus ring, keyboard, reduced-motion, responsive nav, branch context).

**Navigation (shared):** a **NavGroup "Settings"** with **NavItem**s → *Gym*, *Branch*, *My Profile* (replacing Session 4's inert placeholders). Each NavItem renders only if the principal holds the gating permission (Gym/Branch); *My Profile* always renders for the authenticated user.

**Common states matrix (all three screens) — Catalog §0.7/§0.12:**
- **Loading:** `LoadingState` (`skeleton`) for the form region while current values fetch (`Skeleton` `text` rows).
- **Empty:** **N/A — the seeded singletons always exist** (gym, default branch, and the signed-in user are guaranteed); there is no empty list. *(Stated, not omitted.)*
- **Error (load):** `ErrorState` (`inline`/`with-retry`) on a failed fetch.
- **Error (validation):** `FormField` inline errors + a form-level `Alert` (`danger`) summary linking to the first invalid field.
- **Error (authorization):** inline **403 `ErrorState`** for a principal lacking the permission (reuses the Session-4 `/dashboard` pattern); unauthenticated → redirect.
- **Success:** `Toast` (`success`, "Settings saved") — per Catalog, simple saves use Toast, not SuccessState.
- **Destructive/consequential:** setting branch `isActive = false` (deactivate) uses **ConfirmationDialog** (Catalog §A — confirm before consequential changes). **Currency change:** in Epic 1 it is freely editable (no dependent financial records — OQ-3), so a confirm step is an *optional* light guard, **not** required here; the ConfirmationDialog becomes **mandatory** once the deferred "currency locked while financial records exist" guard lands (later Epic). *(Avoids contradicting OQ-3.)*
- **Responsive (§0.9):** single-column `FormLayout`; on `<md` the sticky action bar is full-width and nav collapses to the AppShell drawer. No content unreachable on mobile.
- **Accessibility (§0.3–0.6 + Design System v1.1 §7):** `FormField` label↔control association, visible required glyph **and** text, `aria-invalid`/`aria-describedby` on error, error summary focus management, 2px focus ring, full keyboard operability, zero axe violations in light **and** dark.

### Screen A — Gym Settings (`/settings/gym`)
- **Gate:** view `settings.view`; save `gym.manage`.
- **Layout:** PageHeader (title "Gym Settings", one primary **Button** "Save changes") → PageContainer `narrow` → **FormLayout** (`single-column`) with two **FormSection**s:
  - *Identity & Contact:* `FormField`→`TextInput` **name** (required); `FormField`→`TextInput` **contact email** (optional, email); `FormField`→`TextInput` **contact phone** (optional).
  - *Localization & Operations:* `FormField`→`SelectInput` **default currency** (ISO-4217 options); `FormField`→`SelectInput` **time zone** (IANA options, `searchable`); `FormField`→`TextInput`(numeric) **expiring-soon window (days)**; `FormField`→`TextInput`(numeric) **grace period (days)**. Numeric values render via **MetricValue** where displayed read-only.
- **States:** common matrix. Currency/tz selects show the current value as initial.

### Screen B — Branch Settings (`/settings/branch`)
- **Gate:** view `branches.read`; save `branches.manage`.
- **Layout:** PageHeader ("Branch") → FormLayout with FormSection "Default Branch": `TextInput` **name** (required); **address** via `FormField`→`TextArea` *or* grouped `TextInput`s (street/city/region/postal/country) mapped to the `Branch.address` JSON; `TextInput` **contact phone** (optional); `Checkbox` **active** (`isActive`). Deactivation → `ConfirmationDialog`.
- **Note:** no "add branch" affordance (single-branch MVP — BRN-1).

### Screen C — My Profile (`/settings/profile`)
- **Gate:** authenticated self (OQ-2).
- **Layout:** PageHeader ("My Profile") → FormLayout with FormSection "Personal": **Avatar** (preview) + `TextInput` **avatar URL**; `TextInput` **display name** (required); `TextInput` **phone** (optional). **Email shown read-only**; no password control (Phase-2 scope — §2 OUT).
- **States:** common matrix; on save, the shell identity (TopBar/Sidebar Avatar + name) updates.

---

## 7. Database Impact

> **Amended (§0a-5):** exactly **one additive, forward-only migration** — `gyms.setup_completed_at TIMESTAMPTZ NULL` (onboarding completion marker). No table/column dropped, no index change, no existing column altered. (The draft's "no migration" held until the onboarding completion state was added by decision; this is the minimal additive change to persist it.)

- **Existing entities involved (read + update only):**
  - **`Gym`** (DDS §2.1) — update `name`, `contactEmail`, `contactPhone`, `defaultCurrency`, `timeZone`, `expiringSoonWindowDays`, `gracePeriodDays`. `updatedAt` auto-maintained. *(All fields already exist.)*
  - **`Branch`** (DDS §2.2) — update `name`, `address` (Json), `contactPhone`, `isActive`. *(All exist.)*
  - **`User`** (DDS §2.3) — update `displayName`, `phone`, `avatarUrl` for the session principal. *(All exist.)*
  - **`AuditLog`** (DDS §2.17) — **append-only** insert for each successful gym/branch/profile update (if audit is enabled for these actions — see §8 scope note). No other table is written.
- **New migrations required:** **None.** Every required column already exists (verified against `schema.prisma`).
- **New indexes:** **None justified.** All operations are single-row by primary key / session scope; existing indexes (`gyms` PK, `branches` PK + `@@index([gymId, …])`, `users` PK/`email` unique) suffice. Adding any index would be an unjustified change.
- **Constraints honored (not changed):** DB CHECK `expiring_soon_window_days >= 0 AND grace_period_days >= 0` (schema raw-SQL tail) — mirrored in validation (§8). `default_currency` is `Char(3)`; `time_zone` is text (IANA). `users.email` uniqueness is untouched (email not editable here).
- **Tenancy/audit fields:** `Gym`/`Branch` carry `gymId` scoping already; `User` is intentionally global (no `gymId`) — the self-edit is `userId`-scoped (OQ-2). Soft-delete/snapshot rules: **N/A** — these are present-state configuration updates, not financial/historical records (no snapshot/immutability concern; `Gym`/`Branch`/`User` legitimately carry `updatedAt`).

---

## 8. API Surface

> **Server Actions** for mutations (ADR decision rule: a Server Action suffices for first-party form mutations — no public Route Handler needed); **server-component/loader queries** for reads. Every mutation follows the canonical pipeline (ADR / constitution §8): **authenticate → authorize (by permission) → validate (Zod) → scope (`gymId`/`userId`) → execute → revalidate**. All live in the new IAM/Tenant module (`apps/web/src/modules/**`); none import another context's internals (T-27 ③) and none call raw `Date.now()`/`randomUUID()` (T-27 platform-adapter rule — inject `IClock`/`IIdGenerator`).

### Queries (read)
| Query | Auth | Scope | Returns |
|---|---|---|---|
| `getGymSettings()` | `settings.view` | `Gym` `id = session.gymId` | gym config DTO (domain-shaped; no internal ids leaked beyond what the UI needs) |
| `getDefaultBranch()` | `branches.read` | `Branch` in `session.gymId` (the single branch) | branch DTO |
| `getMyProfile()` | authenticated self | `User` `id = session.userId` | profile DTO (no `passwordHash`) |

### Commands (mutations — Server Actions)
| Command | Auth | Validation (Zod) | Effect |
|---|---|---|---|
| `updateGymSettings(input)` | `gym.manage` | `GymSettingsSchema` | update the session gym; revalidate settings + shell |
| `updateDefaultBranch(input)` | `branches.manage` + `assertSameGym(branchId)` →404 | `BranchSchema` | update the branch; revalidate |
| `updateMyProfile(input)` | authenticated; ownership `principal.userId === session.userId` | `OwnProfileSchema` | update own `User`; revalidate shell identity |

### Validation (Zod at the trust boundary — `api-standards.md`; types derived via `z.infer`, never duplicated)
- **`GymSettingsSchema`:** `name` non-empty trimmed string; `contactEmail` optional `string().email()` or null; `contactPhone` optional string or null; `defaultCurrency` **ISO-4217** (exactly 3 uppercase letters, validated against a known ISO-4217 set — money-rules §1); `timeZone` **IANA** identifier (validated against `Intl.supportedValuesOf('timeZone')` — time-rules §1); `expiringSoonWindowDays` integer `>= 0`; `gracePeriodDays` integer `>= 0` (both mirror the DB CHECK).
- **`BranchSchema`:** `name` non-empty trimmed; `address` optional structured object `{ line1?, line2?, city?, region?, postalCode?, country? }` (maps to the `Branch.address` JSON — a *validation* shape, not a schema change); `contactPhone` optional; `isActive` boolean.
- **`OwnProfileSchema`:** `displayName` non-empty trimmed; `phone` optional; `avatarUrl` optional `string().url()`. **No `email`/`password` fields** (Phase-2 scope).
- **Field-length caps:** the DDS specifies no length caps for these text fields (`text` columns); the schemas enforce *presence/format* only and **do not invent** arbitrary maxima beyond pragmatic UI guards (noted as UX, not DB, limits).

**Audit scope note:** whether `updateGym*/Branch/Profile` write an `AuditLog` row is consistent with DDS §2.17/INV-39 (sensitive actions are auditable). Recommended: emit an audit entry (action e.g. `gym.updated`, ids-only metadata) on success; if the human prefers to defer audit wiring to a dedicated cross-cutting Epic, that is an Open Question — flag, don't assume. *(Listed here so it is a conscious decision, not an oversight.)*

---

## 9. Risks

**Technical**
- *Forward currency/tz semantics (OQ-3):* later Epics depend on these being stable once money/time records exist. *Mitigation:* document the forward dependency; a guard lands with the first financial Epic.
- *`Branch.address` JSON looseness:* a `Json` column accepts any shape. *Mitigation:* the Zod `BranchSchema` is the single enforced shape at the boundary.

**Business**
- *Misconfigured currency/time zone* silently corrupts all future money/expiry/reporting (GYM-2, money-rules §1, time-rules §1) — high blast radius. *Mitigation:* strict ISO-4217/IANA validation; clear labels; values shown back on save; (a confirm-on-currency-change step is deferred with the OQ-3 guard).

**UX**
- *"Initialization" read as a one-time wizard* when it is persistent editable settings. *Mitigation:* the §3 design decision + Settings nav placement; placeholder values are obviously editable.

**Security**
- *Privilege leak / role coupling.* *Mitigation:* permission-based gates only (PRM-3, T-27); server re-checks every mutation; deny-by-default.
- *Cross-tenant branch write.* *Mitigation:* `assertSameGym` → 404; P0 isolation test.
- *Editing another user's profile.* *Mitigation:* ownership check (`userId === session.userId`); `User` is global so **no** `gymId` is (incorrectly) used to scope it; P0 test for the cross-user attempt.
- *Auth perimeter.* Email/password untouched (frozen `lib/auth/**`; Phase-2). No change to the Session-3 perimeter.

**Performance**
- Negligible: all operations are single-row by PK/session scope; existing indexes suffice. No N+1, no list scans.

---

## 10. Acceptance Criteria (measurable)

1. **Functional:** AC-1.* … AC-4.* (§3) all pass against the seeded tenant.
2. **Persistence:** after each successful save, a fresh load (and a DB read in an integration test) reflects the new values; `updatedAt` advances.
3. **Authorization (by permission):** a principal **with** the permission succeeds; a principal **without** it is denied **403** (UI inline + server) — asserted on **permissions, not roles**. A grep/T-27 run finds **zero** role-name branches in the new module.
4. **Tenancy:** a branch update with a foreign `gymId` resolves to **404**; gym/branch reads are scoped to `session.gymId`; the profile update is rejected for any `userId ≠ session.userId`.
5. **Validation:** negative window/grace, unknown currency, invalid IANA tz, and empty required fields are each rejected at the boundary with a clear message; nothing persists.
6. **Accessibility:** axe = 0 violations on all three screens in light **and** dark; keyboard-only completion of each form; visible focus; error summary reachable (Design System v1.1 §7).
7. **Responsive:** each screen usable at 375 / 768 / 1280 (single-column reflow; drawer nav; full-width action bar).
8. **No-scope-creep:** no Members/Plans/Memberships/Payments/Reports/Notifications surface, no new permission key, no new component, no migration. `pnpm verify` green; full fitness suite green.

---

## 11. Definition of Done

Per `feature-template.md` §12–§13 + constitution §10 (cited, not restated). This Epic is **done** only when:
- One **vertical slice** in the correct owning module (IAM/Tenant under `apps/web/src/modules/**`); communicates with other modules only via public functions (no internals).
- **Mutation pipeline** followed for every command (authn → authz **by permission** → Zod validate → `gymId`/`userId` scope → execute → revalidate).
- **Tenancy correct:** `gymId` on every gym/branch query; cross-tenant → 404; `User` self-edit `userId`-scoped.
- **Catalog components only, tokens only** (no literals; token-compliance scan clean).
- **Zod validation** at every boundary; types `z.infer`-derived.
- **P0 tests green** — tenancy isolation + the invariants that apply here (permission-by-permission gating; CHECK-mirroring validation).
- **Accessibility gate** (Design System v1.1 §7) passed; **responsive** verified.
- **Self-review note** written; **`advisor`** consulted (non-trivial).
- **Docs updated in the same change set** (this spec → mark delivered; the Component Catalog/permission catalog **only if** something is touched — expected: nothing new).
- **No new dependency/abstraction/pattern/permission/component** without separate human approval.
- **Human-accepted at merge.** Less than this is not done.

---

## 12. Verification Strategy

> Per `testing-standards.md`. **P0 (tenancy + invariants) is mandatory and gates done.** Tests map to §10 ACs and run in the Session-5 CI gate.

**Unit (Vitest, DB-free)**
- Zod schemas: ISO-4217 currency accept/reject; IANA tz accept/reject; window/grace `>= 0`; required-field emptiness; profile URL/email shape; `BranchSchema.address` shape.
- Pure mapping/DTO functions (entity → view DTO; no `passwordHash` leak).
- Platform-adapter usage: command code uses injected `IClock`/`IIdGenerator` (no raw `Date.now()`/`randomUUID()`), exercised with fakes.

**Integration (Vitest + isolated test DB)**
- `updateGymSettings`: with `gym.manage` → persists; **without** it → denied (403/AuthorizationError) — asserted on the **permission**.
- `updateDefaultBranch`: same-gym → persists; **foreign gymId → 404** (P0 tenancy).
- `updateMyProfile`: self → persists; **other `userId` → rejected** (P0 ownership); confirms `User` is not gym-scoped.
- Reads scoped to `session.gymId`; persistence + `updatedAt` advance verified by direct DB read.

**End-to-end (Playwright + axe)**
- Owner signs in → edits Gym settings → success Toast → reload shows values.
- Owner edits Branch and My Profile; shell identity updates after profile save.
- A principal lacking the permission → inline-403 ErrorState (using a test principal/seed arrangement; **note:** the frozen Sprint-0 seed gives the Owner every permission — exercising the negative branch needs a non-Owner principal, which is itself a seed/fixture concern flagged for the test setup, consistent with Session-4 §8.9).
- Keyboard-only form completion; axe (light + dark) = 0 on all three screens; 375/768/1280 reflow.

**Architectural fitness (T-27, CI-blocking)**
- Zero role-name branches (rule ②); permission strings reference `@pulse/auth` constants (rule ⑤); the new `modules/**` slice imports no other context's internals (rule ③) and makes no raw time/id/Auth.js calls (platform-adapter rule + ⑥); no `@pulse/ui→@pulse/db`, no cycles.

**Accessibility verification**
- Automated axe (above) **plus** the Design System v1.1 §7 manual checklist on each form (label association, required indication beyond color, error summary + focus, contrast via `*-text`, reduced-motion, visible focus).

---

## 13. Dependencies & Reuse (no duplication, no new deps)

- **Reuses:** Session-3 auth/authz (`@pulse/auth` gate, `requireSession`, `assertSameGym`), Session-3 platform adapters (`IClock`/`IIdGenerator`/`ICurrentUser`), Session-2 logging/error taxonomy, Session-4 AppShell + Catalog form components + ErrorState/Toast, `@pulse/db` Prisma client, `@pulse/types`.
- **Permissions reused:** `settings.view`, `gym.manage`, `branches.read`, `branches.manage` (existing keys).
- **Components reused:** AppShell, PageHeader, PageContainer, NavGroup/NavItem, FormLayout, FormSection, FormField, TextInput, SelectInput, TextArea, Checkbox, Avatar, Button, Alert, Toast, ConfirmationDialog, ErrorState, LoadingState, Skeleton, MetricValue, Timestamp (all Catalog).
- **External libraries:** none new (all already approved in Sprint 0).
- **Upstream:** the frozen Sprint-0 platform. **Downstream:** every later Epic depends on the gym currency/time-zone set here.

---

> **STOP — awaiting approval.** This is a specification only; **no code, scaffold, migration, or component has been written.** Per the brief and `feature-template.md` Rule 1, implementation begins only after human approval — and after the §0 Open Questions (especially **OQ-1** framing and **OQ-2** profile authorization) are resolved.
