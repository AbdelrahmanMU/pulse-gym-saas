"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { setLocaleAction } from "@/i18n/actions";

/**
 * LanguageSwitcher — a segmented toggle between the shipped locales. Language names are shown
 * as **endonyms** (each in its own script — never translated, an i18n convention), so the labels
 * are locale-independent. Selecting writes the `pulse-locale` cookie via {@link setLocaleAction}
 * then `router.refresh()`, so the current route re-renders in the new locale with the URL and
 * session preserved (no navigation, no routing). Composed from tokens only; the active option
 * carries a raised surface (weight + surface, never colour alone).
 */
const OPTIONS = [
  { value: "ar", label: "العربية" },
  { value: "en", label: "English" },
] as const;

export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function select(value: (typeof OPTIONS)[number]["value"]) {
    if (value === locale) return;
    startTransition(async () => {
      await setLocaleAction(value);
      router.refresh();
    });
  }

  return (
    <div
      role="group"
      aria-label="Language"
      className={cn("inline-flex gap-1 rounded-md border border-border bg-surface p-1", className)}
    >
      {OPTIONS.map((o) => {
        const active = o.value === locale;
        return (
          <button
            key={o.value}
            type="button"
            lang={o.value}
            onClick={() => select(o.value)}
            aria-pressed={active}
            disabled={pending}
            className={cn(
              "rounded-sm px-4 py-2 text-body-sm font-medium transition-colors ease-standard disabled:opacity-70",
              active
                ? "bg-surface-raised text-foreground"
                : "text-muted-foreground hover:bg-surface-raised",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
