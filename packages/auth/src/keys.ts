/**
 * Permission keys — the stable, immutable identifiers (authorization-architecture.md
 * §4/§5; INV-7). This file is the **single source** of every permission key in the
 * system; all business/gate code references these constants, never a raw string
 * literal (the T-27 hardcoded-permission guard enforces this and is scoped OFF for
 * *this* file only — it legitimately *defines* the keys).
 *
 * Keys are append-only and **never renamed or repurposed** — renaming silently
 * revokes access. Human-readable labels live in the catalog and may change; the key
 * may not.
 */
export const PERMISSION_KEYS = {
  MEMBERS_READ: "members.read",
  MEMBERS_CREATE: "members.create",
  MEMBERS_UPDATE: "members.update",
  MEMBERS_ARCHIVE: "members.archive",
  MEMBERS_REACTIVATE: "members.reactivate",

  NOTES_READ: "notes.read",
  NOTES_CREATE: "notes.create",
  NOTES_UPDATE: "notes.update",
  NOTES_DELETE: "notes.delete",

  ASSIGNMENTS_READ: "assignments.read",
  ASSIGNMENTS_MANAGE: "assignments.manage",

  PLANS_READ: "plans.read",
  PLANS_CREATE: "plans.create",
  PLANS_UPDATE: "plans.update",
  PLANS_DEACTIVATE: "plans.deactivate",

  MEMBERSHIPS_READ: "memberships.read",
  MEMBERSHIPS_CREATE: "memberships.create",
  MEMBERSHIPS_RENEW: "memberships.renew",
  MEMBERSHIPS_UPGRADE: "memberships.upgrade",
  MEMBERSHIPS_FREEZE: "memberships.freeze",
  MEMBERSHIPS_CANCEL: "memberships.cancel",

  PAYMENTS_READ: "payments.read",
  PAYMENTS_RECORD: "payments.record",
  PAYMENTS_VOID: "payments.void",
  PAYMENTS_REFUND: "payments.refund",

  NOTIFICATIONS_READ: "notifications.read",
  NOTIFICATIONS_MANAGE: "notifications.manage",
  NOTIFICATIONS_SEND: "notifications.send",

  DASHBOARD_VIEW: "dashboard.view",

  REPORTS_VIEW: "reports.view",
  REPORTS_EXPORT: "reports.export",

  SETTINGS_VIEW: "settings.view",
  SETTINGS_MANAGE: "settings.manage",

  STAFF_READ: "staff.read",
  STAFF_INVITE: "staff.invite",
  STAFF_MANAGE: "staff.manage",
  ROLES_MANAGE: "roles.manage",

  BRANCHES_READ: "branches.read",
  BRANCHES_MANAGE: "branches.manage",

  GYM_MANAGE: "gym.manage",
} as const;

/** A valid, known permission key — the union of every value in `PERMISSION_KEYS`. */
export type PermissionKey = (typeof PERMISSION_KEYS)[keyof typeof PERMISSION_KEYS];

/** Every permission key as a readonly array (catalog/derivation/test convenience). */
export const ALL_PERMISSION_KEYS: readonly PermissionKey[] = Object.values(PERMISSION_KEYS);
