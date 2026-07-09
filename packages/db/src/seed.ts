import { CAPABILITIES, PERMISSIONS, ROLES } from "@pulse/auth";
import { hashPassword } from "@pulse/auth/password";
import { prisma } from "./client.js";

/**
 * Foundational seed (T-11; DDS §16 / initial-migration-specification §13).
 *
 * A pure **materializer** of the authorization catalog: the capabilities,
 * permissions, and role→permission matrix are defined once in `@pulse/auth`
 * (the sole authorization home — authorization-architecture.md) and written to the
 * tables here (a fact lives in exactly one place; no key is hand-listed twice).
 * Idempotent — safe to re-run (upsert by natural key; fixed UUIDs for the key-less
 * singletons). Authorization is permission-based: roles are only bundles of
 * permissions.
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

// The capability / permission / role catalog (CAPABILITIES, PERMISSIONS, ROLES) is
// the single source defined in `@pulse/auth` and imported above — never re-listed
// here. This file only writes it to the database.

// ── Bootstrap tenant singletons (no natural key → fixed UUID v7 for idempotency) ─
const GYM_ID = "01920000-0000-7000-8000-000000000001";
const BRANCH_ID = "01920000-0000-7000-8000-000000000002";
// The reserved system-actor User: never logs in (is_active=false, unusable hash);
// the honest created_by/recorded_by attribution for system-originated writes.
const SYSTEM_ACTOR_EMAIL = "system-actor@pulse.internal";
const OWNER_EMAIL = "owner@pulse.local";

// The bootstrap Owner's initial password — **seed-scoped only** (read here, never
// added to the app's required env schema). Documented dev default in `.env.example`;
// override via the root `.env` for a real bootstrap. Never logged.
const OWNER_INITIAL_PASSWORD = process.env.OWNER_INITIAL_PASSWORD ?? "ChangeMe!Owner1";

// The bootstrap Owner's phone — the pilot's primary sign-in identifier (one field,
// phone OR email). Seed-scoped like the password; set once, then preserved on
// re-runs (an owner-edited phone is never churned back to the default).
const OWNER_PHONE = process.env.OWNER_PHONE ?? "01000000000";

// A usable scrypt hash starts with this scheme prefix; the Session-2 placeholders
// (`!set-in-session-3-t19`, `!system-actor-no-login`) do not and are non-loginable.
const USABLE_HASH_PREFIX = "scrypt$";

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

  // 5. Bootstrap Owner User (real staff). Sets a real scrypt credential (T-19) the
  //    first time (when the stored hash is still the Session-2 placeholder), then
  //    leaves it untouched on re-runs — so idempotency holds despite scrypt's random
  //    salt (re-hashing every run would churn the value).
  const ownerExisting = await prisma.user.findUnique({ where: { email: OWNER_EMAIL } });
  const ownerHash = ownerExisting?.passwordHash.startsWith(USABLE_HASH_PREFIX)
    ? ownerExisting.passwordHash
    : await hashPassword(OWNER_INITIAL_PASSWORD);
  const owner = await prisma.user.upsert({
    where: { email: OWNER_EMAIL },
    update: { passwordHash: ownerHash, phone: ownerExisting?.phone ?? OWNER_PHONE },
    create: {
      email: OWNER_EMAIL,
      displayName: "Gym Owner",
      phone: OWNER_PHONE,
      passwordHash: ownerHash,
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
