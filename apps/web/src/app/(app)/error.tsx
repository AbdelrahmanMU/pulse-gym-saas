"use client";

import { ErrorState } from "@/components/pulse/error-state";
import { Button } from "@/components/pulse/button";

/**
 * Authenticated-segment error boundary (T-17). Catches **unexpected** render/data errors
 * (expected outcomes are handled in place: unauthenticated → redirect; 403 → the inline
 * Forbidden `ErrorState`). Renders the Catalog `ErrorState` inside the shell `<main>`
 * with a calm, internal-detail-free message + the correlation reference (`error.digest`)
 * folded into the description (decision D-4.4). Full server-side context is logged once by
 * `instrumentation.ts` `onRequestError` — never here (this is the client; no Pino, no
 * console). `reset()` re-runs the failed render (recovery path).
 */
export default function AppSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const reference = error.digest ?? "unavailable";

  return (
    <div className="px-4 py-16 md:px-8">
      <ErrorState
        title="Something went wrong"
        description={`An unexpected error interrupted this page. If it keeps happening, contact support with reference ${reference}.`}
        action={<Button onClick={reset}>Try again</Button>}
      />
    </div>
  );
}
