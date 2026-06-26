import { prisma } from "./client.js";

/**
 * Foundational seed (T-11; DDS §16 / initial-migration-specification §13).
 *
 * Loads the IAM reference data and bootstrap tenant exactly as the governance
 * docs specify, and is **idempotent** — safe to re-run (upsert by natural key;
 * fixed UUIDs for the key-less singletons). Authorization is permission-based:
 * roles are only bundles of permissions (authorization-architecture.md).
 *
 * Seeded roles: Owner + Trainer (assignable) and Front Desk + Manager +
 * Accountant (dormant, is_assignable=false). **Receptionist and Branch Manager
 * are intentionally NOT seeded** — the canonical authz matrix (authorization-
 * architecture.md §6) defines no permission set for them; they are strategic
 * definitions, not seed data, until their matrix is approved. Recorded as
 * ADR-028 (decision-log.md). No permission mapping is invented here.
 */

const log = (message: string): void => {
  process.stdout.write(`${message}\n`);
};

// ── Capabilities (authorization-architecture §3 / §13) ───────────────────────
const CAPABILITIES: { key: string; name: string; responsibleContext: string }[] = [
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
// Future-marked keys (payments.refund, notifications.send, reports.export,
// branches.*) ARE seeded: they are in the §4 stable key set and the Owner role
// "→ every permission" requires them (append-only; keys never renamed — INV-7).
const PERMISSIONS: { key: string; capabilityKey: string; description: string }[] = [
  { key: "members.read", capabilityKey: "member_management", description: "View members" },
  { key: "members.create", capabilityKey: "member_management", description: "Create members" },
  { key: "members.update", capabilityKey: "member_management", description: "Update members" },
  { key: "members.archive", capabilityKey: "member_management", description: "Archive members" },
  {
    key: "members.reactivate",
    capabilityKey: "member_management",
    description: "Reactivate members",
  },
  { key: "notes.read", capabilityKey: "member_notes", description: "View member notes" },
  { key: "notes.create", capabilityKey: "member_notes", description: "Create member notes" },
  { key: "notes.update", capabilityKey: "member_notes", description: "Update member notes" },
  { key: "notes.delete", capabilityKey: "member_notes", description: "Delete member notes" },
  {
    key: "assignments.read",
    capabilityKey: "trainer_assignment",
    description: "View trainer assignments",
  },
  {
    key: "assignments.manage",
    capabilityKey: "trainer_assignment",
    description: "Manage trainer assignments",
  },
  { key: "plans.read", capabilityKey: "plan_management", description: "View plans" },
  { key: "plans.create", capabilityKey: "plan_management", description: "Create plans" },
  { key: "plans.update", capabilityKey: "plan_management", description: "Update plans" },
  { key: "plans.deactivate", capabilityKey: "plan_management", description: "Deactivate plans" },
  {
    key: "memberships.read",
    capabilityKey: "membership_management",
    description: "View memberships",
  },
  {
    key: "memberships.create",
    capabilityKey: "membership_management",
    description: "Create memberships",
  },
  {
    key: "memberships.renew",
    capabilityKey: "membership_management",
    description: "Renew memberships",
  },
  {
    key: "memberships.upgrade",
    capabilityKey: "membership_management",
    description: "Upgrade memberships",
  },
  {
    key: "memberships.freeze",
    capabilityKey: "membership_management",
    description: "Freeze memberships",
  },
  {
    key: "memberships.cancel",
    capabilityKey: "membership_management",
    description: "Cancel memberships",
  },
  { key: "payments.read", capabilityKey: "payment_management", description: "View payments" },
  { key: "payments.record", capabilityKey: "payment_management", description: "Record a payment" },
  { key: "payments.void", capabilityKey: "payment_management", description: "Void a payment" },
  {
    key: "payments.refund",
    capabilityKey: "payment_management",
    description: "Refund a payment (future)",
  },
  { key: "notifications.read", capabilityKey: "notifications", description: "View notifications" },
  {
    key: "notifications.manage",
    capabilityKey: "notifications",
    description: "Manage notifications",
  },
  {
    key: "notifications.send",
    capabilityKey: "notifications",
    description: "Send notifications (future)",
  },
  { key: "dashboard.view", capabilityKey: "dashboard", description: "View the dashboard" },
  { key: "reports.view", capabilityKey: "reporting", description: "View reports" },
  { key: "reports.export", capabilityKey: "reporting", description: "Export reports (future)" },
  { key: "settings.view", capabilityKey: "settings", description: "View settings" },
  { key: "settings.manage", capabilityKey: "settings", description: "Manage settings" },
  { key: "staff.read", capabilityKey: "staff_access", description: "View staff" },
  { key: "staff.invite", capabilityKey: "staff_access", description: "Invite staff" },
  { key: "staff.manage", capabilityKey: "staff_access", description: "Manage staff" },
  { key: "roles.manage", capabilityKey: "staff_access", description: "Manage roles" },
  {
    key: "branches.read",
    capabilityKey: "branch_management",
    description: "View branches (future)",
  },
  {
    key: "branches.manage",
    capabilityKey: "branch_management",
    description: "Manage branches (future)",
  },
  { key: "gym.manage", capabilityKey: "tenant_gym", description: "Manage gym settings" },
];

const ALL_PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

// ── Role → permission mappings (authorization-architecture §6 matrix / §7) ────
// Owner holds every permission. Trainer/Front Desk/Manager/Accountant hold
// exactly the `●` cells in §6 (deny-by-default for the rest).
const TRAINER = [
  "members.read",
  "notes.read",
  "notes.create",
  "notes.update",
  "assignments.read",
  "plans.read",
  "memberships.read",
];

const FRONT_DESK = [
  "members.read",
  "members.create",
  "members.update",
  "notes.read",
  "notes.create",
  "assignments.read",
  "assignments.manage",
  "plans.read",
  "memberships.read",
  "memberships.create",
  "memberships.renew",
  "memberships.upgrade",
  "memberships.freeze",
  "payments.read",
  "payments.record",
  "dashboard.view",
];

const MANAGER = [
  "members.read",
  "members.create",
  "members.update",
  "members.archive",
  "members.reactivate",
  "notes.read",
  "notes.create",
  "notes.update",
  "notes.delete",
  "assignments.read",
  "assignments.manage",
  "plans.read",
  "plans.create",
  "plans.update",
  "plans.deactivate",
  "memberships.read",
  "memberships.create",
  "memberships.renew",
  "memberships.upgrade",
  "memberships.freeze",
  "memberships.cancel",
  "payments.read",
  "payments.record",
  "payments.void",
  "payments.refund",
  "dashboard.view",
  "reports.view",
  "staff.read",
  "branches.read",
  "branches.manage",
];

const ACCOUNTANT = [
  "members.read",
  "plans.read",
  "memberships.read",
  "payments.read",
  "payments.record",
  "payments.void",
  "payments.refund",
  "dashboard.view",
  "reports.view",
];

const ROLES: {
  key: string;
  name: string;
  isAssignable: boolean;
  permissionKeys: string[];
}[] = [
  { key: "owner", name: "Owner", isAssignable: true, permissionKeys: ALL_PERMISSION_KEYS },
  { key: "trainer", name: "Trainer", isAssignable: true, permissionKeys: TRAINER },
  { key: "front_desk", name: "Front Desk", isAssignable: false, permissionKeys: FRONT_DESK },
  { key: "manager", name: "Manager", isAssignable: false, permissionKeys: MANAGER },
  { key: "accountant", name: "Accountant", isAssignable: false, permissionKeys: ACCOUNTANT },
];

// ── Bootstrap tenant singletons (no natural key → fixed UUID v7 for idempotency) ─
const GYM_ID = "01920000-0000-7000-8000-000000000001";
const BRANCH_ID = "01920000-0000-7000-8000-000000000002";
// The reserved system-actor User: never logs in (is_active=false, unusable hash);
// the honest created_by/recorded_by attribution for system-originated writes.
const SYSTEM_ACTOR_EMAIL = "system-actor@pulse.internal";
const OWNER_EMAIL = "owner@pulse.local";

async function seed(): Promise<void> {
  log("Seeding PULSE foundation data…");

  // 1. Capabilities
  const capabilityIdByKey = new Map<string, string>();
  for (const cap of CAPABILITIES) {
    const row = await prisma.capability.upsert({
      where: { key: cap.key },
      update: { name: cap.name, responsibleContext: cap.responsibleContext },
      create: cap,
    });
    capabilityIdByKey.set(cap.key, row.id);
  }
  log(`  capabilities: ${CAPABILITIES.length}`);

  // 2. Permissions
  const permissionIdByKey = new Map<string, string>();
  for (const perm of PERMISSIONS) {
    const capabilityId = capabilityIdByKey.get(perm.capabilityKey);
    if (!capabilityId) throw new Error(`Unknown capability for permission ${perm.key}`);
    const row = await prisma.permission.upsert({
      where: { key: perm.key },
      // description (label) may change; the key never does (INV-7).
      update: { description: perm.description, capabilityId },
      create: { key: perm.key, description: perm.description, capabilityId },
    });
    permissionIdByKey.set(perm.key, row.id);
  }
  log(`  permissions: ${PERMISSIONS.length}`);

  // 3. Roles (platform-scoped: gym_id = NULL) + their permission mappings.
  for (const role of ROLES) {
    const existing = await prisma.role.findFirst({ where: { key: role.key, gymId: null } });
    const row = existing
      ? await prisma.role.update({
          where: { id: existing.id },
          data: { name: role.name, isSystem: true, isAssignable: role.isAssignable },
        })
      : await prisma.role.create({
          data: { key: role.key, name: role.name, isSystem: true, isAssignable: role.isAssignable },
        });

    for (const permKey of role.permissionKeys) {
      const permissionId = permissionIdByKey.get(permKey);
      if (!permissionId)
        throw new Error(`Role ${role.key} references unknown permission ${permKey}`);
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: row.id, permissionId } },
        update: {},
        create: { roleId: row.id, permissionId },
      });
    }
    log(
      `  role ${role.key}: ${role.permissionKeys.length} permissions (assignable=${role.isAssignable})`,
    );
  }

  // 4. Reserved system-actor User (non-login).
  const systemActor = await prisma.user.upsert({
    where: { email: SYSTEM_ACTOR_EMAIL },
    update: {},
    create: {
      email: SYSTEM_ACTOR_EMAIL,
      displayName: "System Actor",
      // Unusable hash: not a valid credential hash, so it can never authenticate.
      passwordHash: "!system-actor-no-login",
      isActive: false,
    },
  });

  // 5. Bootstrap Owner User (real staff). A real credential hash is set when
  //    authentication lands in Session 3 (T-19); the placeholder cannot log in.
  const owner = await prisma.user.upsert({
    where: { email: OWNER_EMAIL },
    update: {},
    create: {
      email: OWNER_EMAIL,
      displayName: "Gym Owner",
      passwordHash: "!set-in-session-3-t19",
      isActive: true,
    },
  });

  // 6. One Gym + default Branch.
  const gym = await prisma.gym.upsert({
    where: { id: GYM_ID },
    update: {},
    create: {
      id: GYM_ID,
      name: "PULSE HQ",
      defaultCurrency: "USD",
      timeZone: "UTC",
    },
  });
  await prisma.branch.upsert({
    where: { id: BRANCH_ID },
    update: {},
    create: { id: BRANCH_ID, gymId: gym.id, name: "Main Branch" },
  });

  // 7. Owner GymUser (links the Owner User to the Gym via the Owner role).
  const ownerRole = await prisma.role.findFirst({ where: { key: "owner", gymId: null } });
  if (!ownerRole) throw new Error("Owner role missing — seed order error");
  await prisma.gymUser.upsert({
    where: { gymId_userId: { gymId: gym.id, userId: owner.id } },
    update: { roleId: ownerRole.id },
    create: { gymId: gym.id, userId: owner.id, roleId: ownerRole.id, createdById: systemActor.id },
  });

  log("Seed complete.");
}

seed()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    process.exitCode = 1;
    process.stderr.write(`Seed failed: ${String(error)}\n`);
    await prisma.$disconnect();
  });
