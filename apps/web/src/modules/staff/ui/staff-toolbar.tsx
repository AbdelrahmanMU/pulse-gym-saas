"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { TextInput } from "@/components/pulse/text-input";
import { SelectInput, type SelectOption } from "@/components/pulse/select-input";
import { Button } from "@/components/pulse/button";
import { FilterSheet } from "@/components/pulse/filter-sheet";

/**
 * Staff list toolbar (Catalog §FilterBar, minimal). Search + status filter, driven through the URL
 * query (shareable, back-button correct) — the RSC list page reads them. Any change resets to page
 * 1. The "Add staff" action shows only with `staff.invite`. Catalogued components + tokens only.
 */
const STATUS_OPTIONS: SelectOption[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "REVOKED", label: "Suspended" },
  { value: "ALL", label: "All statuses" },
];

export function StaffToolbar({
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
  const [q, setQ] = useState(query);

  function navigate(next: URLSearchParams): void {
    next.delete("page");
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

  // The same catalogued control serves both presentations (AP-3 adaptive-parity):
  // inline in the toolbar ≥md, inside the FilterSheet <md.
  const statusFilter = (
    <SelectInput
      aria-label="Filter by status"
      options={STATUS_OPTIONS}
      value={status}
      onChange={(e) => setParam("status", e.target.value, "ACTIVE")}
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
            aria-label="Search staff by name or email"
            placeholder="Search staff…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="md:w-64"
          />
          <Button type="submit" variant="secondary" size="md" aria-label="Search">
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
          <Link href="/staff/new">
            <Plus aria-hidden className="size-4" />
            Add staff
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
