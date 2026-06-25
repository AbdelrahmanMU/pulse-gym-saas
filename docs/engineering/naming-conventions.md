# Naming Conventions
### PULSE Gym SaaS · Engineering Governance

| | |
|---|---|
| **Status** | ✅ Authoritative |
| **References** | ADR (modules, entities), `code-style-guide.md`, `database-standards.md`, `api-standards.md` |

> **Why strict naming:** Naming is the AI's single biggest accuracy lever. If names are predictable, Claude can *guess the right identifier* instead of searching for it — fewer tokens, fewer errors, less drift. Every rule below makes names guessable and boring on purpose.

---

## Guiding rule
**A name should be predictable from its purpose.** Given "create a member," the function is `createMember`, the schema `memberSchema`, the component `MemberForm`, the route `/members`. If you can't guess it, the convention has failed — fix the name, not the guess.

---

| Thing | Convention | Example | Why |
|---|---|---|---|
| **Files (code)** | kebab-case | `member-service.ts`, `create-member.ts` | OS-safe, diff-friendly, consistent |
| **Files (React component)** | PascalCase matching the component | `MemberForm.tsx` | File ↔ component map is 1:1 |
| **Folders** | kebab-case, singular module name | `modules/member-notes/` | Matches ADR module names |
| **Components** | PascalCase, noun/noun-phrase | `MemberCard`, `MembershipTimeline` | Match Component Catalog names exactly |
| **Hooks** | camelCase, `use` prefix | `useMemberSearch`, `useToast` | React convention; signals a hook |
| **Services / logic fns** | camelCase verb-first | `createMembership`, `renewMembership` | Action is obvious at call site |
| **Query functions** | camelCase, `get`/`list`/`find` | `getMember`, `listMembers` | Reads are visibly reads |
| **Utilities** | camelCase verb/noun | `formatCurrency`, `toGymTimezone` | Pure helper, clear intent |
| **DB tables** | snake_case, **plural** | `members`, `member_notes`, `gym_users` | SQL convention; plural = a set of rows |
| **DB columns** | snake_case | `gym_id`, `created_at`, `payment_status` | SQL convention |
| **Prisma models** | PascalCase, **singular**; map to plural table | `model Member { @@map("members") }` | Model = one record; table = the set |
| **Prisma fields** | camelCase; map to snake_case column | `gymId @map("gym_id")` | TS idiom in code, SQL idiom in DB |
| **Enums (type)** | PascalCase singular | `MembershipStatus`, `UserRole` | Type naming |
| **Enum values** | UPPER_SNAKE_CASE | `ACTIVE`, `EXPIRING_SOON`, `OWNER` | Readable in DB and code; stable identifiers |
| **Constants** | UPPER_SNAKE_CASE | `MAX_PAGE_SIZE`, `DEFAULT_CURRENCY` | Signals immutability |
| **Functions** | camelCase verb-first | `recordPayment`, `assignTrainer` | Verb = it does something |
| **Variables** | camelCase, descriptive | `activeMembership`, `unpaidCount` | No abbreviations/`tmp`/`x` |
| **Booleans** | `is/has/can/should` prefix | `isActive`, `hasUnpaid`, `canRenew` | Reads as a predicate |
| **Types** | PascalCase | `MemberSummary`, `RenewMembershipInput` | Distinct from values |
| **Interfaces** | PascalCase, **no `I` prefix** | `PaymentProviderConfig`, `NotificationChannel` | `I`-prefix is noise; reserve interfaces for genuinely extensible contracts (ADR rejects needless layers — no repositories) |
| **Zod schemas** | camelCase, `Schema` suffix | `memberSchema`, `renewMembershipSchema` | Pairs with inferred type |
| **Inferred input types** | PascalCase, `Input`/`Payload` suffix | `CreateMemberInput` | Clear it's a validated boundary type |
| **Events / audit actions** | `domain.action` lowercase dotted, past tense | `membership.renewed`, `payment.recorded` | Stable, greppable, log-friendly |
| **Routes (URL)** | kebab-case, plural resource | `/members`, `/memberships/:id/renew` | REST convention (`api-standards.md`) |
| **Route Handler files** | per Next.js (`route.ts`) | `app/api/webhooks/route.ts` | Framework convention |
| **Env variables** | UPPER_SNAKE_CASE, prefixed | `DATABASE_URL`, `AUTH_SECRET` | Convention; `NEXT_PUBLIC_` only if truly public |

---

## Cross-cutting rules
1. **Domain language is fixed and shared** (from ADR/PRD): `Gym`, `Branch`, `User`, `GymUser`, `Member`, `MemberNote`, `Plan`, `Membership`, `Payment`, `Notification`. Never coin a synonym (no `Client`/`Customer` for `Member`, no `Subscription` for `Membership`). *Why:* one vocabulary across DB, code, UI, and tests prevents translation bugs.
2. **No abbreviations** except universally understood ones (`id`, `url`, `db`). *Why:* `mbr`/`sub`/`pmt` are unguessable.
3. **Singular vs plural is meaningful:** model/type singular, collection/table/route plural. *Why:* the form tells you whether it's one or many.
4. **Names match across layers:** the `Member` model ↔ `members` table ↔ `/members` route ↔ `MemberCard` ↔ `memberSchema`. *Why:* one mental model end-to-end.
5. **Never silently rename a public name** (exported function, route, column, enum value). It's a breaking change requiring approval + migration. *Why:* downstream code/data depends on it.
