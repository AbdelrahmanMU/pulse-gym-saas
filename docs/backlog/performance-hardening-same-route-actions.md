# Deferred Slice — Performance Hardening: Same-Route Server Actions

| | |
| --- | --- |
| **Status** | **DEFERRED — intentionally not implemented** |
| **Priority** | Post-Pilot · Technical Debt · **Not a release blocker** |
| **Origin** | Performance Recovery sprint, 2026-07-08 (accepted; `088e648`) |
| **Authority** | ADR-029 (`docs/architecture/decision-log.md`) — the proven pattern this slice would extend |
| **Trigger to execute** | Production evidence only — see §4. Do **not** reopen otherwise. |

---

## 1. Background

The Performance Investigation (2026-07-08) found that in **production builds only** (`next build && next start`; never `next dev`), a server action whose **success response re-renders the current route in place** — `revalidatePath` of the page's own path, or a `redirect()` back to the same URL — can suspend React's pending form transition **forever**: the submit button sticks on its pending label, the response is received but never committed (fiber root left with `suspendedLanes` set and `pingedLanes = 0`), and occasionally the action POST self-aborts. The race is **data/timing-sensitive**: it reproduced across Next 15.5.19, 15.5.20, and 16.2.10, with and without `staleTimes`, and shapes that looked reliable became unreliable when payload timing shifted.

The membership lifecycle actions (renew / upgrade / freeze / resume / cancel) and the payment actions (record / void) were hit hardest — lifecycle actions hung essentially always, which was pilot-blocking. The Recovery sprint migrated all seven to the proven idiom: **the action returns a plain result (no `revalidatePath`, no `redirect`), and the form leaves via a full-document navigation on success** (`useFullNavigationOnSuccess`, `apps/web/src/lib/forms/use-full-navigation-on-success.ts`). Cross-page mutations (create/edit → a different route) kept their server `redirect()`, which never exhibited the race. Verified deterministic (18/18 scripted + 3/3 production e2e) and guarded by `apps/web/e2e/lifecycle.spec.ts`.

The remaining same-route actions below were **probed on the shipped production build and passed**. They were intentionally left on the older in-place pattern to keep the accepted release unchanged.

## 2. Current State — verified in-place actions (as of `088e648`)

Actions whose success revalidates the route the form/control sits on, without leaving it:

| Module | File | Actions | Route re-rendered in place |
| --- | --- | --- | --- |
| Notifications | `apps/web/src/modules/notifications/actions.ts` | `markReadAction`, `dismissAction`, `markAllReadAction` | `/notifications` |
| Notifications | same + `ui/generate-on-open.tsx` | `generateNotificationsAction` (imperative call + client `router.refresh()` — a different mechanic, but the same family) | `/notifications` |
| Staff | `apps/web/src/modules/staff/actions.ts` | `assignRoleAction`, `suspendStaffAction`, `reactivateStaffAction` | `/staff/[gymUserId]` (+ `/staff`) |
| Members | `apps/web/src/modules/members/actions.ts` | `archiveMemberAction`, `reactivateMemberAction`, `assignTrainerAction`, `unassignTrainerAction` | `/members/[memberId]` (+ `/members`, `/dashboard`) |
| Plans | `apps/web/src/modules/plans/actions.ts` | `archivePlanAction`, `restorePlanAction` | `/plans/[planId]` (+ `/plans`) |
| Gym/Settings | `apps/web/src/modules/gym/actions.ts` | `updateGymSettingsAction`, `updateBranchAction`, `updateProfileAction` | `/settings/gym`, `/settings/branch`, `/settings/profile` |

**Not affected (safe class — leave as-is):** every mutation that already ends in a `redirect()` to a *different* route: member create/edit, membership create, staff create/edit, plan create/edit, `finishOnboardingAction`, sign-in — plus the seven Recovery-migrated actions.

## 3. Risk Assessment

**Current Risk: LOW.**

- No production failure has ever been reproduced on any of the §2 actions — probes on the shipped production build passed (notifications mark-read resolved ~475 ms; gym settings save showed success feedback in ~145 ms).
- The full gate (unit, integration, e2e + axe) is green; the current implementation is **accepted for Pilot**.
- The concern is purely structural: these actions share the *transition shape* that failed elsewhere, and the failure was timing/data-sensitive there. Their pages render smaller/different payloads, which is plausibly why they don't trip the race today.

## 4. Future Trigger — execute this slice ONLY if one of these is observed

- A hanging transition in production (button stuck on its pending label);
- infinite pending UI after any §2 action;
- an aborted action POST (`net::ERR_ABORTED` on the form submission);
- a React transition deadlock (`suspendedLanes` set with `pingedLanes = 0`);
- any other same-route server-action instability.

…or the team explicitly requests the hardening sprint. **Otherwise, do not implement it**, and do not re-litigate the deferral.

## 5. Implementation Strategy (when triggered)

Do not re-derive anything — the solution is already proven and documented:

1. **ADR-029** (`docs/architecture/decision-log.md`) — the decision, the evidence, the alternatives that failed.
2. **Reference implementation** — `apps/web/src/modules/memberships/actions.ts` + `apps/web/src/modules/payments/actions.ts` (plain results, docblocks explain why) and `apps/web/src/modules/memberships/ui/membership-lifecycle-controls.tsx` (hook usage, host-composition constraint).
3. **The hook** — `useFullNavigationOnSuccess` in `apps/web/src/lib/forms/`; per form: action returns a plain result, hook navigates on success (same path for stay-here actions).

Per-module notes: the notifications actions return `void` today — they will need result-shaped returns; `markAllReadAction`/filtered views must preserve current `searchParams` in the navigation target; `generateNotificationsAction` + `router.refresh()` may stay as-is (imperative, proven) or be folded in for uniformity — decide then.

## 6. Acceptance Criteria

- Verified against a **production build only** (`next build && next start` — dev does not reproduce the failure class).
- Every §2 action completes normally: pending state entered and **left**, post-action UI visible, repeated across runs (the lifecycle suite used 5–6 consecutive runs on worst-case data).
- No infinite pending state, no aborted POSTs, error paths still render inline `FormFeedback` without navigation.
- Regression e2e added following `apps/web/e2e/lifecycle.spec.ts` (bounded settle assertions so a hang fails the test; anchor post-action assertions on post-reload content, never on transient DOM during the navigation), run at least once against a production server.
- Full gate green (tsc · lint · fitness · build · unit · integration · e2e + axe · RTL).

## 7. Priority

**Post-Pilot. Technical debt. Not a release blocker.** No user-visible issue exists today; this document exists so the knowledge survives until either production evidence appears or the team schedules the hardening deliberately.
