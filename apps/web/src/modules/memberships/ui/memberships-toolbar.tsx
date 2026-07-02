"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { TextInput } from "@/components/pulse/text-input";
import { SelectInput, type SelectOption } from "@/components/pulse/select-input";
import { Button } from "@/components/pulse/button";

/**
 * Memberships list toolbar (Catalog §DataTableToolbar, minimal). Search by member name + a
 * status filter, driven through the URL query (shareable, back-button correct) — the RSC list
 * page reads them. Any change resets to page 1. Catalogued components + tokens only.
 */
// `LIVE` (the default) is the current-periods projection; `ALL` reveals terminal history. Both
// map to read-model projections in the list query — never to a stored value (see validation.ts).
const STATUS_OPTIONS: SelectOption[] = [
  { value: "LIVE", label: "Current" },
  { value: "ACTIVE", label: "Active" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "FROZEN", label: "Frozen" },
  { value: "EXPIRED", label: "Expired" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "ALL", label: "All (incl. history)" },
];

export function MembershipsToolbar({
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

  function onSearch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const next = new URLSearchParams(params.toString());
    if (q.trim()) next.set("q", q.trim());
    else next.delete("q");
    navigate(next);
  }

  function onStatus(value: string): void {
    const next = new URLSearchParams(params.toString());
    // LIVE is the default projection → represented by the absence of a status param (clean URL).
    if (value === "LIVE") next.delete("status");
    else next.set("status", value);
    navigate(next);
  }

  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={onSearch} className="flex items-center gap-2" role="search">
          <TextInput
            type="search"
            aria-label="Search memberships by member name"
            placeholder="Search by member…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="sm:w-64"
          />
          <Button type="submit" variant="secondary" aria-label="Search">
            <Search aria-hidden className="size-4" />
          </Button>
        </form>
        <SelectInput
          aria-label="Filter by status"
          options={STATUS_OPTIONS}
          value={status}
          onChange={(e) => onStatus(e.target.value)}
          className="sm:w-44"
        />
      </div>

      {canCreate ? (
        <Button asChild>
          <Link href="/memberships/new">
            <Plus aria-hidden className="size-4" />
            Sell membership
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
