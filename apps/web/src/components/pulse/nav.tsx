"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * PULSE NavGroup / NavItem (Catalog §2) — the Sidebar's navigation primitives. Active
 * state is derived from the current route (never two active at once); the active item
 * carries the **3px brand left accent-bar** (`--border-accent` + `--rail-fg-active`),
 * brand text, a raised rail surface, **and** `aria-current="page"` — meaning is never
 * color alone. Icons size to `--icon-md` (`size-5`). Built on the dark rail roles.
 */
export interface NavItemDef {
  href: string;
  label: string;
  icon?: ReactNode;
  /** Inert placeholder link (feature not built yet) — rendered muted, non-navigating. */
  placeholder?: boolean;
}

export interface NavGroupDef {
  label?: string;
  items: readonly NavItemDef[];
}

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavItem({ item, active }: { item: NavItemDef; active: boolean }) {
  const className = cn(
    // py-3 yields the 44px touch target required in the drawer (v1.2 §5.4); ≥lg the
    // persistent rail keeps its denser 36px rows (design review F2, 2026-07-02).
    "relative flex items-center gap-3 rounded-sm px-3 py-3 text-body transition-colors ease-standard lg:py-2",
    active ? "bg-rail-surface text-rail-fg-active" : "text-rail-fg hover:bg-rail-surface",
    item.placeholder && "opacity-(--opacity-muted)",
  );

  const inner = (
    <>
      {active ? (
        <span
          aria-hidden
          className="absolute top-1.5 bottom-1.5 left-0 w-(--border-accent) rounded-full bg-rail-fg-active"
        />
      ) : null}
      {item.icon ? <span className="[&_svg]:size-5 [&_svg]:shrink-0">{item.icon}</span> : null}
      <span className="truncate">{item.label}</span>
    </>
  );

  // Placeholder items are not navigable destinations yet (structural shell, R-2): render
  // as a disabled control that still reads correctly to assistive tech.
  if (item.placeholder) {
    return (
      <span className={className} aria-disabled="true">
        {inner}
      </span>
    );
  }

  return (
    <Link href={item.href} className={className} aria-current={active ? "page" : undefined}>
      {inner}
    </Link>
  );
}

/**
 * The grouped nav links. Not a landmark itself — the Sidebar wraps the brand block + these
 * groups in the single `<nav aria-label="Primary">` so all rail content is contained by a
 * landmark (axe `region`).
 */
export function NavGroups({ groups }: { groups: readonly NavGroupDef[] }) {
  const pathname = usePathname();
  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
      {/* gap-2 keeps ≥8px between adjacent touch targets in the drawer (v1.2 §5.4). */}
      {groups.map((group, i) => (
        <div key={group.label ?? `group-${i}`} className="flex flex-col gap-2 lg:gap-1">
          {group.label ? <p className="eyebrow px-3 pb-1 text-rail-fg">{group.label}</p> : null}
          {group.items.map((item) => (
            <NavItem
              key={item.href + item.label}
              item={item}
              active={!item.placeholder && isActive(pathname, item.href)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
