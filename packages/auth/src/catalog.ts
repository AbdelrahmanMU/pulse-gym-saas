import { ALL_PERMISSION_KEYS, PERMISSION_KEYS as K, type PermissionKey } from "./keys.js";

/**
 * The canonical authorization **catalog** — capabilities, permissions, and the
 * role→permission matrix — as data (authorization-architecture.md §3/§4/§6/§7).
 *
 * `@pulse/auth` is the sole home of this definition; the database seed (T-11) is a
 * pure *materializer* that writes this catalog to the tables (it no longer hand-
 * lists keys — a fact lives in exactly one place). Every permission is referenced
 * through the `PERMISSION_KEYS` constants, never a raw literal.
 *
 * Append-only: add a key + map it to the roles that should hold it; never rename or
 * remove an existing key (INV-7). Future-marked permissions (payments.refund,
 * notifications.send, reports.export, branches.*) ARE in the catalog — they are in
 * the §4 stable set and Owner ("→ every permission") requires them.
 */

export interface CapabilityDef {
  readonly key: string;
  readonly name: string;
  readonly responsibleContext: string;
}

export interface PermissionDef {
  readonly key: PermissionKey;
  readonly capabilityKey: string;
  readonly description: string;
}

export interface RoleDef {
  readonly key: string;
  readonly name: string;
  readonly isAssignable: boolean;
  readonly permissionKeys: readonly PermissionKey[];
}

// ── Capabilities (authorization-architecture §3 / §13) ───────────────────────
export const CAPABILITIES: readonly CapabilityDef[] = [
  { key: "member_management", name: "Member Management", responsibleContext: "Member Management" },
  { key: "member_notes", name: "Member Notes", responsibleContext: "Member Management" },
  {
    key: "trainer_assignment",
    name: "Trainer Assignment",
    responsibleContext: "Member Management",
  },
  { key: "plan_management", name: "Plan Management", responsibleContext: "Plan Catalog" },
  {
    key: "membership_management",
    name: "Membership Management",
    responsibleContext: "Membership Lifecycle",
  },
  {
    key: "payment_management",
    name: "Payment Management",
    responsibleContext: "Billing & Payments",
  },
  { key: "notifications", name: "Notifications", responsibleContext: "Notifications" },
  { key: "dashboard", name: "Dashboard", responsibleContext: "Reporting & Dashboard" },
  { key: "reporting", name: "Reporting", responsibleContext: "Reporting & Dashboard" },
  { key: "settings", name: "Settings", responsibleContext: "IAM" },
  { key: "staff_access", name: "Staff & Access", responsibleContext: "IAM" },
  { key: "branch_management", name: "Branch Management", responsibleContext: "IAM" },
  { key: "tenant_gym", name: "Tenant/Gym", responsibleContext: "IAM" },
];

// ── Permissions (authorization-architecture §4) — key → {capability, label} ───
export const PERMISSIONS: readonly PermissionDef[] = [
  { key: K.MEMBERS_READ, capabilityKey: "member_management", description: "View members" },
  { key: K.MEMBERS_CREATE, capabilityKey: "member_management", description: "Create members" },
  { key: K.MEMBERS_UPDATE, capabilityKey: "member_management", description: "Update members" },
  { key: K.MEMBERS_ARCHIVE, capabilityKey: "member_management", description: "Archive members" },
  {
    key: K.MEMBERS_REACTIVATE,
    capabilityKey: "member_management",
    description: "Reactivate members",
  },
  { key: K.NOTES_READ, capabilityKey: "member_notes", description: "View member notes" },
  { key: K.NOTES_CREATE, capabilityKey: "member_notes", description: "Create member notes" },
  { key: K.NOTES_UPDATE, capabilityKey: "member_notes", description: "Update member notes" },
  { key: K.NOTES_DELETE, capabilityKey: "member_notes", description: "Delete member notes" },
  {
    key: K.ASSIGNMENTS_READ,
    capabilityKey: "trainer_assignment",
    description: "View trainer assignments",
  },
  {
    key: K.ASSIGNMENTS_MANAGE,
    capabilityKey: "trainer_assignment",
    description: "Manage trainer assignments",
  },
  { key: K.PLANS_READ, capabilityKey: "plan_management", description: "View plans" },
  { key: K.PLANS_CREATE, capabilityKey: "plan_management", description: "Create plans" },
  { key: K.PLANS_UPDATE, capabilityKey: "plan_management", description: "Update plans" },
  { key: K.PLANS_DEACTIVATE, capabilityKey: "plan_management", description: "Deactivate plans" },
  {
    key: K.MEMBERSHIPS_READ,
    capabilityKey: "membership_management",
    description: "View memberships",
  },
  {
    key: K.MEMBERSHIPS_CREATE,
    capabilityKey: "membership_management",
    description: "Create memberships",
  },
  {
    key: K.MEMBERSHIPS_RENEW,
    capabilityKey: "membership_management",
    description: "Renew memberships",
  },
  {
    key: K.MEMBERSHIPS_UPGRADE,
    capabilityKey: "membership_management",
    description: "Upgrade memberships",
  },
  {
    key: K.MEMBERSHIPS_FREEZE,
    capabilityKey: "membership_management",
    description: "Freeze memberships",
  },
  {
    key: K.MEMBERSHIPS_CANCEL,
    capabilityKey: "membership_management",
    description: "Cancel memberships",
  },
  { key: K.PAYMENTS_READ, capabilityKey: "payment_management", description: "View payments" },
  { key: K.PAYMENTS_RECORD, capabilityKey: "payment_management", description: "Record a payment" },
  { key: K.PAYMENTS_VOID, capabilityKey: "payment_management", description: "Void a payment" },
  {
    key: K.PAYMENTS_REFUND,
    capabilityKey: "payment_management",
    description: "Refund a payment (future)",
  },
  { key: K.NOTIFICATIONS_READ, capabilityKey: "notifications", description: "View notifications" },
  {
    key: K.NOTIFICATIONS_MANAGE,
    capabilityKey: "notifications",
    description: "Manage notifications",
  },
  {
    key: K.NOTIFICATIONS_SEND,
    capabilityKey: "notifications",
    description: "Send notifications (future)",
  },
  { key: K.DASHBOARD_VIEW, capabilityKey: "dashboard", description: "View the dashboard" },
  { key: K.REPORTS_VIEW, capabilityKey: "reporting", description: "View reports" },
  { key: K.REPORTS_EXPORT, capabilityKey: "reporting", description: "Export reports (future)" },
  { key: K.SETTINGS_VIEW, capabilityKey: "settings", description: "View settings" },
  { key: K.SETTINGS_MANAGE, capabilityKey: "settings", description: "Manage settings" },
  { key: K.STAFF_READ, capabilityKey: "staff_access", description: "View staff" },
  { key: K.STAFF_INVITE, capabilityKey: "staff_access", description: "Invite staff" },
  { key: K.STAFF_MANAGE, capabilityKey: "staff_access", description: "Manage staff" },
  { key: K.ROLES_MANAGE, capabilityKey: "staff_access", description: "Manage roles" },
  {
    key: K.BRANCHES_READ,
    capabilityKey: "branch_management",
    description: "View branches (future)",
  },
  {
    key: K.BRANCHES_MANAGE,
    capabilityKey: "branch_management",
    description: "Manage branches (future)",
  },
  { key: K.GYM_MANAGE, capabilityKey: "tenant_gym", description: "Manage gym settings" },
];

// ── Role → permission mappings (authorization-architecture §6 matrix / §7) ────
// Owner holds every permission. The rest hold exactly the `●` cells in §6
// (deny-by-default for everything else).
const TRAINER: readonly PermissionKey[] = [
  K.MEMBERS_READ,
  K.NOTES_READ,
  K.NOTES_CREATE,
  K.NOTES_UPDATE,
  K.ASSIGNMENTS_READ,
  K.PLANS_READ,
  K.MEMBERSHIPS_READ,
];

const FRONT_DESK: readonly PermissionKey[] = [
  K.MEMBERS_READ,
  K.MEMBERS_CREATE,
  K.MEMBERS_UPDATE,
  K.NOTES_READ,
  K.NOTES_CREATE,
  K.ASSIGNMENTS_READ,
  K.ASSIGNMENTS_MANAGE,
  K.PLANS_READ,
  K.MEMBERSHIPS_READ,
  K.MEMBERSHIPS_CREATE,
  K.MEMBERSHIPS_RENEW,
  K.MEMBERSHIPS_UPGRADE,
  K.MEMBERSHIPS_FREEZE,
  K.PAYMENTS_READ,
  K.PAYMENTS_RECORD,
  K.DASHBOARD_VIEW,
];

const MANAGER: readonly PermissionKey[] = [
  K.MEMBERS_READ,
  K.MEMBERS_CREATE,
  K.MEMBERS_UPDATE,
  K.MEMBERS_ARCHIVE,
  K.MEMBERS_REACTIVATE,
  K.NOTES_READ,
  K.NOTES_CREATE,
  K.NOTES_UPDATE,
  K.NOTES_DELETE,
  K.ASSIGNMENTS_READ,
  K.ASSIGNMENTS_MANAGE,
  K.PLANS_READ,
  K.PLANS_CREATE,
  K.PLANS_UPDATE,
  K.PLANS_DEACTIVATE,
  K.MEMBERSHIPS_READ,
  K.MEMBERSHIPS_CREATE,
  K.MEMBERSHIPS_RENEW,
  K.MEMBERSHIPS_UPGRADE,
  K.MEMBERSHIPS_FREEZE,
  K.MEMBERSHIPS_CANCEL,
  K.PAYMENTS_READ,
  K.PAYMENTS_RECORD,
  K.PAYMENTS_VOID,
  K.PAYMENTS_REFUND,
  K.DASHBOARD_VIEW,
  K.REPORTS_VIEW,
  K.STAFF_READ,
  K.BRANCHES_READ,
  K.BRANCHES_MANAGE,
];

const ACCOUNTANT: readonly PermissionKey[] = [
  K.MEMBERS_READ,
  K.PLANS_READ,
  K.MEMBERSHIPS_READ,
  K.PAYMENTS_READ,
  K.PAYMENTS_RECORD,
  K.PAYMENTS_VOID,
  K.PAYMENTS_REFUND,
  K.DASHBOARD_VIEW,
  K.REPORTS_VIEW,
];

/**
 * Seeded roles: Owner + Trainer are assignable in MVP; Front Desk + Manager +
 * Accountant are **dormant** (`isAssignable=false`). Receptionist and Branch
 * Manager are intentionally absent — no canonical permission matrix exists for
 * them (ADR-028; strategic definitions, not seed data).
 */
export const ROLES: readonly RoleDef[] = [
  { key: "owner", name: "Owner", isAssignable: true, permissionKeys: ALL_PERMISSION_KEYS },
  { key: "trainer", name: "Trainer", isAssignable: true, permissionKeys: TRAINER },
  { key: "front_desk", name: "Front Desk", isAssignable: false, permissionKeys: FRONT_DESK },
  { key: "manager", name: "Manager", isAssignable: false, permissionKeys: MANAGER },
  { key: "accountant", name: "Accountant", isAssignable: false, permissionKeys: ACCOUNTANT },
];
