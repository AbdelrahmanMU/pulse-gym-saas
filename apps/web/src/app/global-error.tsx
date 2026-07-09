"use client";

import { ErrorState } from "@/components/pulse/error-state";
import { Button } from "@/components/pulse/button";
// The global boundary renders OUTSIDE the root layout, so it must bring the token
// pipeline itself (the layout's `next/font` variables are absent here — the base layer
// falls back to system-ui, acceptable for this catastrophic-only fallback).
import "./globals.css";

/**
 * Root error boundary (T-17). Catches errors thrown by the root layout itself — the only
 * boundary that must render its own `<html>`/`<body>`. Same calm, safe treatment as the
 * segment boundary; full context is logged server-side by `instrumentation.ts`.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const reference = error.digest ?? "unavailable";

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-dvh items-center justify-center bg-background px-4 text-foreground">
          <ErrorState
            title="Something went wrong"
            description={`The application failed to load. If it keeps happening, contact support with reference ${reference}.`}
            action={<Button onClick={reset}>Try again</Button>}
            className="w-full max-w-md"
          />
        </div>
      </body>
    </html>
  );
}
