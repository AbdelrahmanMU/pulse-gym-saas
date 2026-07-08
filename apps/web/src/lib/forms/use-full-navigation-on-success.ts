"use client";

import { useEffect } from "react";

/**
 * After a form action succeeds, leave via a **full-document navigation**
 * (`window.location.assign`) instead of letting Next re-render the page in place.
 *
 * Why this exists (Performance Recovery sprint): in production builds, a server action
 * whose response re-renders the current route in place — via `revalidatePath`, or via a
 * `redirect()` back to the same page — intermittently suspends React's pending form
 * transition forever: the submit button sticks on its pending label and the UI never
 * updates. The failure is a data/timing-sensitive race (reproduced on Next 15.5 and
 * 16.2; never in dev). Two primitives measured 100% reliable across every build:
 * plain action results (no revalidation → no in-place re-render) and full-document
 * navigations. This hook composes them: the action returns a plain result, and the
 * client then hard-navigates, which re-renders the target from the server AND resets
 * the client router cache — so the fresh view and subsequent navigations are correct
 * without `revalidatePath`.
 *
 * Use it in every form whose success would otherwise re-render the page it sits on.
 * Error results are unaffected: they render inline (`FormFeedback`) without navigation.
 */
export function useFullNavigationOnSuccess<S extends { status: string }>(
  state: S,
  target: (state: S) => string,
): void {
  useEffect(() => {
    if (state.status === "success") window.location.assign(target(state));
  }, [state, target]);
}
