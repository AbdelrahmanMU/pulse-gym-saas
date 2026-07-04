"use client";

import { useTranslations } from "next-intl";
import { ErrorState } from "@/components/pulse/error-state";
import { Button } from "@/components/pulse/button";

/**
 * Auth-segment error boundary (Sprint 1.6). Mirrors the `(app)` boundary (T-17): calm,
 * internal-detail-free copy with the correlation reference (`error.digest`) folded into
 * the description; `reset()` re-runs the failed render. Full server-side context is
 * logged once by `instrumentation.ts` `onRequestError` — never here (client; no Pino,
 * no console).
 */
export default function AuthSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("auth");
  const reference = error.digest ?? "unavailable";

  return (
    <ErrorState
      title={t("errorTitle")}
      description={t("errorDescription", { reference })}
      action={<Button onClick={reset}>{t("tryAgain")}</Button>}
    />
  );
}
