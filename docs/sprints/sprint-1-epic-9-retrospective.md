# Sprint 1 · Epic 9 — User & Staff Management — Retrospective

## What went well
- **Conform-don't-invent paid off.** The prompt sketched a 4-state lifecycle, but the model defines
  `ACTIVE/REVOKED`. Reading the schema + domain docs first (before any code) surfaced the mismatch
  immediately; the prompt's own tiebreaker ("follow the documented model") resolved it without a
  STOP. Delivering 2 honest states beats inventing an enum + migration + ADR the human didn't ask
  for.
- **Maximal reuse.** Zero new catalog components, zero new permissions, zero schema change. The
  slice reused the whole pipeline (authorize/validate/scope/assertSameGym), `hashPassword`, the
  DataTable/FormField/SelectInput catalog, and — crucially — the **existing login gate** (suspend
  blocks sign-in for free because the resolver already filters `status == ACTIVE`).
- **Cross-module composition is now routine.** The INV-36 revoke side (TD-5) fell out cleanly as a
  members public function composed through the public index — the same pattern established by the
  dashboard (Epic 6) and the archive guard (Slice 1).
- **The advisor caught the one thing self-tests couldn't:** whether `lastLoginAt` in the shared
  resolver would record login-time vs request-time. Verifying `auth.config.ts` (authorize-only, no
  jwt re-resolution) before wiring turned an assumption into a checked fact.

## What was tricky / decisions
- **Vocabulary vs. prompt.** The schema status is `REVOKED`; the prompt says "Suspend." Resolved by
  keeping `REVOKED` in the data/code and mapping it to the display label **"Suspended"** in the
  format layer (like membership status labels) — honoring the prompt's verb without coining a data
  synonym.
- **Surfacing an irreversible side effect.** Suspend is reversible but clearing assignments is not.
  Rather than hide it, the suspend control states it — a small UX honesty that prevents a silent
  "why did my trainer lose their roster?" surprise.
- **Last login: field existed, writer didn't.** The right move was neither "pretend it works" nor
  "just document the gap" — it was to verify the auth flow and wire the write in the one correct
  place, making the display real.

## Carryover / future
- **Lifecycle richness** (Pending invite-accept + a distinct terminal Archive) → an enum + migration
  + ADR + (for Pending) email/invite infrastructure. The biggest deliberate deferral.
- **Password reset / first-login change** → needs a `mustChangePassword` field + a reset flow (no
  email infra in MVP).
- **Last-active-owner quorum** protection (beyond self-guard).
- **INV-36 clear atomicity** (single transaction with the status flip) if contention ever matters.
- **TD-7** — extend e2e axe to the staff (and other newer) module pages.

## Gate
type-check · lint + all fitness · format · build 5/5 · **178 unit** · **94 integration** (+18 staff)
— all green, re-run after the final change.
