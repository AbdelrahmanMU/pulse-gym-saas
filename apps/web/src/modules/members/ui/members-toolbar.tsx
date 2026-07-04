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
import type { TrainerOption } from "../service";

/**
 * Members list toolbar (Catalog §DataTableToolbar/§FilterBar, minimal). Search + status +
 * optional trainer filter, all driven through the URL query (shareable, back-button
 * correct) — the RSC list page reads them. Any filter change resets to page 1. The trainer
 * filter renders only when the actor can read assignments (options provided). Catalogued
 * components + tokens only.
 */
export function MembersToolbar({
  query,
  status,
  trainer,
  trainerOptions,
  canCreate,
}: {
  query: string;
  status: string;
  trainer: string;
  /** Active-staff options for the trainer filter; empty hides the filter. */
  trainerOptions: TrainerOption[];
  canCreate: boolean;
}) {
  const t = useTranslations("members");
  const tActions = useTranslations("actions");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(query);

  const STATUS_OPTIONS: SelectOption[] = [
    { value: "ACTIVE", label: t("filterActive") },
    { value: "ARCHIVED", label: t("filterArchived") },
    { value: "ALL", label: t("filterAllStatuses") },
  ];

  function navigate(next: URLSearchParams): void {
    next.delete("page"); // any filter/search change returns to the first page
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function setParam(key: string, value: string, clearWhen: string): void {
    const next = new URLSearchParams(params.toString());
    if (value === clearWhen) next.delete(key);
    else next.set(key, value);
    navigate(next);
  }

  function onSearch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setParam("q", q.trim(), "");
  }

  const trainerSelectOptions: SelectOption[] = [
    { value: "ALL", label: t("filterAnyTrainer") },
    { value: "UNASSIGNED", label: t("filterNoTrainer") },
    ...trainerOptions.map((opt) => ({ value: opt.gymUserId, label: opt.name })),
  ];

  // The same catalogued controls serve both presentations (AP-3 adaptive-parity):
  // inline in the toolbar ≥md, inside the FilterSheet <md.
  const filters = (
    <>
      <SelectInput
        aria-label={t("filterStatusAria")}
        options={STATUS_OPTIONS}
        value={status}
        onChange={(e) => setParam("status", e.target.value, "ACTIVE")}
        className="md:w-40"
      />
      {trainerOptions.length > 0 ? (
        <SelectInput
          aria-label={t("filterTrainerAria")}
          options={trainerSelectOptions}
          value={trainer}
          onChange={(e) => setParam("trainer", e.target.value, "ALL")}
          className="md:w-48"
        />
      ) : null}
    </>
  );
  const activeCount = (status !== "ACTIVE" ? 1 : 0) + (trainer !== "ALL" ? 1 : 0);

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
          <Button type="submit" variant="secondary" size="md" aria-label={t("searchButton")}>
            <Search aria-hidden className="size-4" />
          </Button>
        </form>

        {/* <md: filters live in the bottom sheet (AP-3); ≥md: inline, unchanged. */}
        <FilterSheet activeCount={activeCount}>{filters}</FilterSheet>
        <div className="hidden items-center gap-2 md:flex">{filters}</div>
      </div>

      {canCreate ? (
        // ≥md only — on mobile the CreationFAB relocates this single primary (AP-6).
        <Button asChild className="max-md:hidden">
          <Link href="/members/new">
            <Plus aria-hidden className="size-4" />
            {tActions("addMember")}
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
