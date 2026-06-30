import type { ReactNode } from "react";
import {
  Building2,
  CircleUser,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  MapPin,
  Tags,
  Users,
} from "lucide-react";
import { hasPermission, PERMISSION_KEYS } from "@pulse/auth";
import type { AuthenticatedPrincipal } from "@pulse/types";
import { requireSession } from "@/lib/auth/guard";
import { AppShell } from "@/components/pulse/app-shell";
import type { NavGroupDef, NavItemDef } from "@/components/pulse/nav";
import { signOutAction } from "./actions";

/**
 * Authenticated segment layout (T-07/T-08). Stays a **Server Component**: it enforces an
 * authenticated, gym-scoped session at the boundary (`requireSession()` redirects to
 * `/sign-in`) and passes the domain principal + the sign-out server action as props into
 * the client {@link AppShell}. Session enforcement never moves client-side.
 *
 * Nav: Dashboard + the real, permission-gated **Members** (Epic-2), **Plans** (Epic-3), and
 * **Memberships** (Epic-4) entries and the **Settings** group (Epic-1 — Gym / Branch / My
 * Profile). Payments remains a placeholder until its feature slice exists. Items are shown
 * **by permission** (never by role).
 */
function buildNavGroups(principal: AuthenticatedPrincipal): NavGroupDef[] {
  const manageItems: NavItemDef[] = [];
  if (hasPermission(principal.permissions, PERMISSION_KEYS.MEMBERS_READ)) {
    manageItems.push({ href: "/members", label: "Members", icon: <Users aria-hidden /> });
  }
  if (hasPermission(principal.permissions, PERMISSION_KEYS.PLANS_READ)) {
    manageItems.push({ href: "/plans", label: "Plans", icon: <Tags aria-hidden /> });
  }
  if (hasPermission(principal.permissions, PERMISSION_KEYS.MEMBERSHIPS_READ)) {
    manageItems.push({
      href: "/memberships",
      label: "Memberships",
      icon: <ClipboardList aria-hidden />,
    });
  }
  manageItems.push({
    href: "/payments",
    label: "Payments",
    icon: <CreditCard aria-hidden />,
    placeholder: true,
  });

  const settingsItems: NavItemDef[] = [];
  if (hasPermission(principal.permissions, PERMISSION_KEYS.GYM_VIEW)) {
    settingsItems.push({ href: "/settings/gym", label: "Gym", icon: <Building2 aria-hidden /> });
  }
  if (hasPermission(principal.permissions, PERMISSION_KEYS.BRANCHES_READ)) {
    settingsItems.push({ href: "/settings/branch", label: "Branch", icon: <MapPin aria-hidden /> });
  }
  settingsItems.push({
    href: "/settings/profile",
    label: "My Profile",
    icon: <CircleUser aria-hidden />,
  });

  return [
    { items: [{ href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard aria-hidden /> }] },
    { label: "Manage", items: manageItems },
    { label: "Settings", items: settingsItems },
  ];
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const principal = await requireSession();

  return (
    <AppShell
      user={{ displayName: principal.displayName, email: principal.email }}
      navGroups={buildNavGroups(principal)}
      signOut={signOutAction}
    >
      {children}
    </AppShell>
  );
}
