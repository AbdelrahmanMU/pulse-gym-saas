"use client";

import { type Ref, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Bell, Languages, LogOut, Menu } from "lucide-react";
import { setLocaleAction } from "@/i18n/actions";
import { Avatar } from "./avatar";
import { ActionMenu } from "./action-menu";
import { NotificationBadge } from "./notification-badge";
import { Button } from "@/components/ui/button";

/**
 * PULSE TopBar (Catalog §1) — the page header bar: mobile-nav toggle (left, <lg only),
 * a title slot, the notifications bell (with unread NotificationBadge), and the user identity
 * menu (right). Global SearchBar and BranchContextChip remain deferred (refinement R-2). The
 * bell is shown only when `notificationCount` is provided (the actor can read notifications).
 * Height is `--topbar-h`; it sticks to the top with a bottom hairline. `<header>` is the page's
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
  /** Unread notification count for the bell badge; `null`/omitted hides the bell (no read access). */
  notificationCount?: number | null;
  /** Server action that ends the session (passed from the server layout). */
  signOut: () => void;
}

export function TopBar({
  title,
  onMenuClick,
  menuButtonRef,
  user,
  notificationCount,
  signOut,
}: TopBarProps) {
  const t = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [localeSwitchPending, startLocaleSwitch] = useTransition();
  const count = notificationCount ?? 0;
  const bellLabel = count > 0 ? t("notificationsUnread", { count }) : t("notifications");
  // Quick language switch: endonym of the *other* locale (language names are never translated).
  const otherLocale = locale === "ar" ? "en" : "ar";
  const otherLabel = locale === "ar" ? "English" : "العربية";
  const switchLocale = () =>
    startLocaleSwitch(async () => {
      await setLocaleAction(otherLocale);
      router.refresh();
    });
  return (
    <header className="sticky top-0 z-(--z-sticky) flex h-(--topbar-h) items-center gap-3 border-b border-border bg-surface px-4 md:px-8">
      <Button
        ref={menuButtonRef}
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label={t("openNav")}
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

      {notificationCount != null ? (
        <NotificationBadge count={count}>
          <Button asChild variant="ghost" size="icon" aria-label={bellLabel}>
            <Link href="/notifications">
              <Bell aria-hidden />
            </Link>
          </Button>
        </NotificationBadge>
      ) : null}

      <ActionMenu
        trigger={
          // While the quick language switch refreshes the tree, the menu is closed —
          // the dimmed, busy trigger is the pending feedback (same recipe as
          // LanguageSwitcher: disabled + reduced opacity, no spinner).
          <Button
            variant="ghost"
            size="md"
            className="gap-2 px-2 disabled:opacity-70"
            aria-label={t("userMenu")}
            aria-busy={localeSwitchPending}
            disabled={localeSwitchPending}
          >
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
        items={[
          { label: otherLabel, icon: <Languages aria-hidden />, onSelect: switchLocale },
          { label: t("signOut"), icon: <LogOut aria-hidden />, onSelect: signOut },
        ]}
      />
    </header>
  );
}
