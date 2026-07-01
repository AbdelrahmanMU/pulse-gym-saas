"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { TextInput } from "@/components/pulse/text-input";
import { SelectInput, type SelectOption } from "@/components/pulse/select-input";
import { Button } from "@/components/pulse/button";

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

  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={onSearch} className="flex items-center gap-2" role="search">
          <TextInput
            type="search"
            aria-label="Search staff by name or email"
            placeholder="Search staff…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="sm:w-64"
          />
          <Button type="submit" variant="secondary" size="md" aria-label="Search">
            <Search aria-hidden className="size-4" />
          </Button>
        </form>

        <SelectInput
          aria-label="Filter by status"
          options={STATUS_OPTIONS}
          value={status}
          onChange={(e) => setParam("status", e.target.value, "ACTIVE")}
          className="sm:w-40"
        />
      </div>

      {canCreate ? (
        <Button asChild>
          <Link href="/staff/new">
            <Plus aria-hidden className="size-4" />
            Add staff
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
