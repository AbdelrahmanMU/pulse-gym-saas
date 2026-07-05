"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Search } from "lucide-react";
import { TextInput } from "@/components/pulse/text-input";
import { SelectInput, type SelectOption } from "@/components/pulse/select-input";
import { Button } from "@/components/pulse/button";
import { FilterSheet } from "@/components/pulse/filter-sheet";

/**
 * Plans list toolbar (Catalog §DataTableToolbar/§FilterBar, minimal). Search + status
 * filter, driven through the URL query (shareable, back-button correct) — the RSC list page
 * reads them. Any change resets to page 1. Catalogued components + tokens only.
 */
export function PlansToolbar({
  query,
  status,
  canCreate,
}: {
  query: string;
  status: string;
  canCreate: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const t = useTranslations("plans");
  const ts = useTranslations("status");
  const ta = useTranslations("actions");
  const [q, setQ] = useState(query);

  const statusOptions: SelectOption[] = [
    { value: "ACTIVE", label: ts("planAvailable") },
    { value: "ARCHIVED", label: ts("planRetired") },
    { value: "ALL", label: t("filterAll") },
  ];

  function navigate(next: URLSearchParams): void {
    next.delete("page");
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function onSearch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const next = new URLSearchParams(params.toString());
    if (q.trim()) next.set("q", q.trim());
    else next.delete("q");
    navigate(next);
  }

  function onStatus(value: string): void {
    const next = new URLSearchParams(params.toString());
    if (value === "ACTIVE") next.delete("status");
    else next.set("status", value);
    navigate(next);
  }

  // The same catalogued control serves both presentations (AP-3 adaptive-parity):
  // inline in the toolbar ≥md, inside the FilterSheet <md.
  const statusFilter = (
    <SelectInput
      aria-label={t("filterStatusAria")}
      options={statusOptions}
      value={status}
      onChange={(e) => onStatus(e.target.value)}
      className="md:w-40"
    />
  );

  return (
    <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 items-center gap-2 md:gap-3">
        <form
          onSubmit={onSearch}
          className="flex flex-1 items-center gap-2 md:flex-none"
          role="search"
        >
          <TextInput
            type="search"
            aria-label={t("searchAria")}
            placeholder={t("searchPlaceholder")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="md:w-64"
          />
          <Button type="submit" variant="secondary" aria-label={t("searchButton")}>
            <Search aria-hidden className="size-4" />
          </Button>
        </form>
        {/* <md: filters live in the bottom sheet (AP-3); ≥md: inline, unchanged. */}
        <FilterSheet activeCount={status !== "ACTIVE" ? 1 : 0}>{statusFilter}</FilterSheet>
        <div className="hidden md:block">{statusFilter}</div>
      </div>

      {canCreate ? (
        // ≥md only — on mobile the CreationFAB relocates this single primary (AP-6).
        <Button asChild className="max-md:hidden">
          <Link href="/plans/new">
            <Plus aria-hidden className="size-4" />
            {ta("addPlan")}
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
