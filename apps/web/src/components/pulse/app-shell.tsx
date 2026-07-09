"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";
import { TopBar, type TopBarUser } from "./topbar";
import type { NavGroupDef } from "./nav";

/**
 * PULSE AppShell (Catalog §1) — the root authenticated frame. Composes Sidebar + TopBar +
 * a content `<main>`, and owns the responsive layout: a **persistent rail ≥lg**, an
 * **off-canvas drawer <lg** (the nav never disappears — audit fix). It is the client
 * boundary; the server layout enforces the session and passes the principal + the
 * sign-out server action as props (enforcement never moves client-side — plan §T-08.5).
 *
 * Landmarks: skip-link (first focusable) → `<header>` (banner, in TopBar) → `<nav>`
 * (primary, in Sidebar) → `<main id="main-content">`. The drawer (Radix Dialog) supplies
 * the focus trap, Esc-close, scrim, and focus-return-to-trigger.
 */
export interface AppShellProps {
  user: TopBarUser;
  navGroups: readonly NavGroupDef[];
  /** Unread notification count for the TopBar bell; `null` hides the bell (no read access). */
  notificationCount?: number | null;
  /** Sign-out server action, threaded from the server layout. */
  signOut: () => void;
  children: ReactNode;
}

export function AppShell({ user, navGroups, notificationCount, signOut, children }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const t = useTranslations("common");

  // Navigating from a drawer NavItem closes the drawer.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <a href="#main-content" className="skip-link">
        {t("skipToContent")}
      </a>

      {/* Persistent rail (≥lg). Hidden from the a11y tree below lg (drawer takes over). */}
      <div className="fixed inset-y-0 start-0 hidden w-(--sidebar-w) lg:block">
        <Sidebar groups={navGroups} />
      </div>

      {/* Off-canvas drawer (<lg). Returns focus to the toggle on close — we open it
          programmatically (no Radix Trigger), so focus return is wired explicitly. */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          className="lg:hidden"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            menuButtonRef.current?.focus();
          }}
        >
          <SheetTitle className="sr-only">{t("navigation")}</SheetTitle>
          <Sidebar groups={navGroups} />
        </SheetContent>
      </Sheet>

      {/* Content column — offset by the rail width on desktop. */}
      <div className="flex min-h-dvh flex-col lg:ps-(--sidebar-w)">
        <TopBar
          menuButtonRef={menuButtonRef}
          onMenuClick={() => setDrawerOpen(true)}
          user={user}
          notificationCount={notificationCount}
          signOut={signOut}
        />
        <main id="main-content" className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
