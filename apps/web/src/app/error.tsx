"use client";

import { ErrorState } from "@/components/pulse/error-state";
import { Button } from "@/components/pulse/button";

/**
 * Root-segment error boundary (Sprint 1.6). Covers the public landing (`/`) — the only
 * route without a nearer boundary (`(app)`/`(auth)` own theirs). Same contract as those
 * boundaries (T-17): calm copy + correlation reference; `reset()` re-runs the render;
 * server-side context is logged once by `instrumentation.ts` — never here.
 */
export default function RootSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const reference = error.digest ?? "unavailable";

  return (
    <div className="mx-auto w-full max-w-(--breakpoint-sm) px-4 py-16 md:px-8">
      <ErrorState
        title="Something went wrong"
        description={`An unexpected error interrupted this page. If it keeps happening, contact support with reference ${reference}.`}
        action={<Button onClick={reset}>Try again</Button>}
      />
    </div>
  );
}
