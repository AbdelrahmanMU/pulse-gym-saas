import type { ReactNode } from "react";
import {
  BarChart3,
  Bell,
  Building2,
  CircleUser,
  ClipboardList,
  LayoutDashboard,
  MapPin,
  Tags,
  Users,
  UserCog,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { hasPermission, PERMISSION_KEYS } from "@pulse/auth";
import type { AuthenticatedPrincipal } from "@pulse/types";
import { requireSession } from "@/lib/auth/guard";
import { loadUnreadCount } from "@/modules/notifications/queries";
import { AppShell } from "@/components/pulse/app-shell";
import type { NavGroupDef, NavItemDef } from "@/components/pulse/nav";
import { signOutAction } from "./actions";

/**
 * Authenticated segment layout (T-07/T-08). Stays a **Server Component**: it enforces an
 * authenticated, gym-scoped session at the boundary (`requireSession()` redirects to
 * `/sign-in`) and passes the domain principal + the sign-out server action as props into
 * the client {@link AppShell}. Session enforcement never moves client-side.
 *
 * Nav: Dashboard + a permission-gated **Notifications** (Epic-7) entry, the real **Members**
 * (Epic-2), **Plans** (Epic-3), and **Memberships** (Epic-4) entries, and the **Settings** group
 * (Epic-1 — Gym / Branch / My Profile). The TopBar bell shows the unread count. Items are shown
 * **by permission** (never by role).
 */
/** Translated nav labels (`nav` namespace), resolved once in the server layout. */
interface NavLabels {
  dashboard: string;
  notifications: string;
  reports: string;
  members: string;
  plans: string;
  memberships: string;
  gym: string;
  branch: string;
  staff: string;
  account: string;
  groupManage: string;
  groupSettings: string;
}

function buildNavGroups(principal: AuthenticatedPrincipal, t: NavLabels): NavGroupDef[] {
  const manageItems: NavItemDef[] = [];
  if (hasPermission(principal.permissions, PERMISSION_KEYS.MEMBERS_READ)) {
    manageItems.push({ href: "/members", label: t.members, icon: <Users aria-hidden /> });
  }
  if (hasPermission(principal.permissions, PERMISSION_KEYS.PLANS_READ)) {
    manageItems.push({ href: "/plans", label: t.plans, icon: <Tags aria-hidden /> });
  }
  if (hasPermission(principal.permissions, PERMISSION_KEYS.MEMBERSHIPS_READ)) {
    manageItems.push({
      href: "/memberships",
      label: t.memberships,
      icon: <ClipboardList aria-hidden />,
    });
  }
  // No "Payments" nav item: payments shipped as the membership detail's Billing sections
  // (Epic-5); a standalone payments route is a future feature. The old placeholder
  // misrepresented shipped work (RC TD-15 / design-debt DD-11) and was removed.

  const settingsItems: NavItemDef[] = [];
  if (hasPermission(principal.permissions, PERMISSION_KEYS.GYM_VIEW)) {
    settingsItems.push({ href: "/settings/gym", label: t.gym, icon: <Building2 aria-hidden /> });
  }
  if (hasPermission(principal.permissions, PERMISSION_KEYS.BRANCHES_READ)) {
    settingsItems.push({ href: "/settings/branch", label: t.branch, icon: <MapPin aria-hidden /> });
  }
  if (hasPermission(principal.permissions, PERMISSION_KEYS.STAFF_READ)) {
    settingsItems.push({ href: "/staff", label: t.staff, icon: <UserCog aria-hidden /> });
  }
  settingsItems.push({
    href: "/settings/profile",
    label: t.account,
    icon: <CircleUser aria-hidden />,
  });

  const topItems: NavItemDef[] = [
    { href: "/dashboard", label: t.dashboard, icon: <LayoutDashboard aria-hidden /> },
  ];
  if (hasPermission(principal.permissions, PERMISSION_KEYS.NOTIFICATIONS_READ)) {
    topItems.push({ href: "/notifications", label: t.notifications, icon: <Bell aria-hidden /> });
  }
  if (hasPermission(principal.permissions, PERMISSION_KEYS.REPORTS_VIEW)) {
    topItems.push({ href: "/reports", label: t.reports, icon: <BarChart3 aria-hidden /> });
  }

  return [
    { items: topItems },
    { label: t.groupManage, items: manageItems },
    { label: t.groupSettings, items: settingsItems },
  ];
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const principal = await requireSession();
  // Independent reads — fetch concurrently (Performance Recovery, Task 4).
  const [notificationCount, t] = await Promise.all([
    loadUnreadCount(principal),
    getTranslations("nav"),
  ]);
  const labels: NavLabels = {
    dashboard: t("dashboard"),
    notifications: t("notifications"),
    reports: t("reports"),
    members: t("members"),
    plans: t("plans"),
    memberships: t("memberships"),
    gym: t("gym"),
    branch: t("branch"),
    staff: t("staff"),
    account: t("account"),
    groupManage: t("groupManage"),
    groupSettings: t("groupSettings"),
  };

  return (
    <AppShell
      user={{ displayName: principal.displayName, email: principal.email }}
      navGroups={buildNavGroups(principal, labels)}
      notificationCount={notificationCount}
      signOut={signOutAction}
    >
      {children}
    </AppShell>
  );
}
