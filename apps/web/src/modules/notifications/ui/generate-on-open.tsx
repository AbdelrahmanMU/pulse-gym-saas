"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { generateNotificationsAction } from "../actions";

/**
 * The MVP generation trigger (Sprint-1 Epic-7). A render-nothing client component that fires the
 * idempotent {@link generateNotificationsAction} **once on mount** — keeping the write out of RSC
 * rendering (constitution: no writes during render). The action revalidates `/notifications`; the
 * explicit `router.refresh()` then re-runs this route's read model so freshly generated alerts show
 * without a manual reload. The read path itself never generates. This trigger is deliberately thin
 * and replaceable: a scheduled job could drive the same service later without touching the UI.
 */
export function GenerateOnOpen() {
  const router = useRouter();
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    void generateNotificationsAction().then(() => router.refresh());
  }, [router]);
  return null;
}
