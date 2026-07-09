import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";

/**
 * PULSE Pagination (Catalog §Pagination) — the DataTable footer control. URL-param driven
 * (the page is a query param), so it is a pure Server Component: prev/next are real
 * `<Link>`s and the result is shareable/back-button-correct. At a boundary the control
 * renders as a disabled, non-navigable span (`aria-disabled`). Minimal prev/next + range
 * label; numbered pages are deferred until a story needs them. Tokens only.
 */
export interface PaginationProps {
  /** 1-based current page. */
  page: number;
  totalPages: number;
  /** Build the href for a target page, preserving the rest of the query string. */
  hrefForPage: (page: number) => string;
  /** Optional summary, e.g. "Showing 1–20 of 42". */
  rangeLabel?: string;
  className?: string;
}

const CONTROL = buttonVariants({ variant: "secondary", size: "sm" });

export async function Pagination({
  page,
  totalPages,
  hrefForPage,
  rangeLabel,
  className,
}: PaginationProps) {
  const t = await getTranslations("common");
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  // Chevrons point toward their target; under RTL the icons mirror automatically
  // (they sit in the document flow), so the logical prev/next order is preserved.
  return (
    <nav
      aria-label={t("pagination")}
      className={cn("flex items-center justify-between gap-4 pt-2", className)}
    >
      <p className="text-body-sm text-muted-foreground">{rangeLabel}</p>
      <div className="flex items-center gap-2">
        {hasPrev ? (
          <Link href={hrefForPage(page - 1)} className={CONTROL} rel="prev">
            <ChevronLeft aria-hidden className="size-4 rtl:-scale-x-100" />
            {t("previous")}
          </Link>
        ) : (
          <span className={cn(CONTROL, "opacity-(--opacity-disabled)")} aria-disabled>
            <ChevronLeft aria-hidden className="size-4 rtl:-scale-x-100" />
            {t("previous")}
          </span>
        )}
        {hasNext ? (
          <Link href={hrefForPage(page + 1)} className={CONTROL} rel="next">
            {t("next")}
            <ChevronRight aria-hidden className="size-4 rtl:-scale-x-100" />
          </Link>
        ) : (
          <span className={cn(CONTROL, "opacity-(--opacity-disabled)")} aria-disabled>
            {t("next")}
            <ChevronRight aria-hidden className="size-4 rtl:-scale-x-100" />
          </span>
        )}
      </div>
    </nav>
  );
}
