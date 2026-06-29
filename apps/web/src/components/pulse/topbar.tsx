"use client";

import type { Ref } from "react";
import { LogOut, Menu } from "lucide-react";
import { Avatar } from "./avatar";
import { ActionMenu } from "./action-menu";
import { Button } from "@/components/ui/button";

/**
 * PULSE TopBar (Catalog §1) — the page header bar: mobile-nav toggle (left, <lg only),
 * a title slot, and the user identity menu (right). Global SearchBar, BranchContextChip,
 * and NotificationBadge are deferred (refinement R-2 — no data/feature yet). Height is
 * `--topbar-h`; it sticks to the top with a bottom hairline. `<header>` is the page's
 * single banner landmark.
 */
export interface TopBarUser {
  displayName: string;
  email: string;
}

export interface TopBarProps {
  title?: string;
  onMenuClick: () => void;
  /** Ref to the mobile-nav toggle so the drawer can return focus to it on close. */
  menuButtonRef?: Ref<HTMLButtonElement>;
  user: TopBarUser;
  /** Server action that ends the session (passed from the server layout). */
  signOut: () => void;
}

export function TopBar({ title, onMenuClick, menuButtonRef, user, signOut }: TopBarProps) {
  return (
    <header className="sticky top-0 z-(--z-sticky) flex h-(--topbar-h) items-center gap-3 border-b border-border bg-surface px-4 md:px-8">
      <Button
        ref={menuButtonRef}
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label="Open navigation"
        onClick={onMenuClick}
      >
        <Menu aria-hidden />
      </Button>

      <div className="min-w-0 flex-1">
        {title ? (
          <span className="truncate font-display text-h3 font-semibold text-foreground">
            {title}
          </span>
        ) : null}
      </div>

      <ActionMenu
        trigger={
          <Button variant="ghost" size="md" className="gap-2 px-2" aria-label="User menu">
            <Avatar name={user.displayName} size="sm" />
            <span className="hidden max-w-40 truncate font-medium sm:inline">
              {user.displayName}
            </span>
          </Button>
        }
        header={
          <span className="flex flex-col">
            <span className="font-medium text-foreground">{user.displayName}</span>
            <span className="text-caption text-muted-foreground">{user.email}</span>
          </span>
        }
        items={[{ label: "Sign out", icon: <LogOut aria-hidden />, onSelect: signOut }]}
      />
    </header>
  );
}
