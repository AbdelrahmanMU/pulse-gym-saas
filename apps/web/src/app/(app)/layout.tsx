import type { ReactNode } from "react";
import { ClipboardList, CreditCard, LayoutDashboard, Settings, Users } from "lucide-react";
import { requireSession } from "@/lib/auth/guard";
import { AppShell } from "@/components/pulse/app-shell";
import type { NavGroupDef } from "@/components/pulse/nav";
import { signOutAction } from "./actions";

/**
 * Authenticated segment layout (T-07/T-08). Stays a **Server Component**: it enforces an
 * authenticated, gym-scoped session at the boundary (`requireSession()` redirects to
 * `/sign-in`) and passes the domain principal + the sign-out server action as props into
 * the client {@link AppShell}. Session enforcement never moves client-side.
 *
 * Nav is **placeholder/structural only** (refinement R-2): only Dashboard routes today;
 * Members/Memberships/Payments/Settings are inert until their feature slices exist.
 */
const NAV_GROUPS: NavGroupDef[] = [
  { items: [{ href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard aria-hidden /> }] },
  {
    label: "Manage",
    items: [
      { href: "/members", label: "Members", icon: <Users aria-hidden />, placeholder: true },
      {
        href: "/memberships",
        label: "Memberships",
        icon: <ClipboardList aria-hidden />,
        placeholder: true,
      },
      { href: "/payments", label: "Payments", icon: <CreditCard aria-hidden />, placeholder: true },
    ],
  },
  {
    label: "Settings",
    items: [
      { href: "/settings", label: "Settings", icon: <Settings aria-hidden />, placeholder: true },
    ],
  },
];

export default async function AppLayout({ children }: { children: ReactNode }) {
  const principal = await requireSession();

  return (
    <AppShell
      user={{ displayName: principal.displayName, email: principal.email }}
      navGroups={NAV_GROUPS}
      signOut={signOutAction}
    >
      {children}
    </AppShell>
  );
}
