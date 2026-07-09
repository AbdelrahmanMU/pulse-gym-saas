-- CreateEnum
CREATE TYPE "DurationUnit" AS ENUM ('DAY', 'WEEK', 'MONTH');

-- CreateEnum
CREATE TYPE "MembershipOrigin" AS ENUM ('NEW', 'RENEWAL', 'UPGRADE', 'DOWNGRADE');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'FROZEN', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FreezeStatus" AS ENUM ('ACTIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "PaymentEntryType" AS ENUM ('PAYMENT', 'VOID');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CARD_MANUAL', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentStanding" AS ENUM ('PENDING', 'PARTIALLY_PAID', 'PAID');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('MEMBERSHIP_EXPIRING_SOON', 'MEMBERSHIP_EXPIRED');

-- CreateEnum
CREATE TYPE "NotificationState" AS ENUM ('UNREAD', 'READ', 'DISMISSED');

-- CreateEnum
CREATE TYPE "GymUserStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateTable
CREATE TABLE "gyms" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "default_currency" CHAR(3) NOT NULL,
    "time_zone" TEXT NOT NULL,
    "expiring_soon_window_days" INTEGER NOT NULL DEFAULT 7,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "grace_period_days" INTEGER NOT NULL DEFAULT 0,
    "archived_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "gyms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" UUID NOT NULL,
    "gym_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" JSONB,
    "contact_phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "archived_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "phone" TEXT,
    "avatar_url" TEXT,
    "last_login_at" TIMESTAMPTZ,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deactivated_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gym_users" (
    "id" UUID NOT NULL,
    "gym_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "status" "GymUserStatus" NOT NULL DEFAULT 'ACTIVE',
    "revoked_at" TIMESTAMPTZ,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "gym_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_system" BOOLEAN NOT NULL,
    "is_assignable" BOOLEAN NOT NULL,
    "gym_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "capability_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capabilities" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "responsible_context" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "capabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" UUID NOT NULL,
    "gym_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "phone" TEXT,
    "email" TEXT,
    "date_of_birth" DATE,
    "gender" TEXT,
    "notes_summary" TEXT,
    "joined_on" DATE,
    "archived_at" TIMESTAMPTZ,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_notes" (
    "id" UUID NOT NULL,
    "gym_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "author_user_id" UUID NOT NULL,
    "category" TEXT,
    "archived_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "member_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trainer_assignments" (
    "id" UUID NOT NULL,
    "gym_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "trainer_gym_user_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" UUID NOT NULL,
    "unassigned_at" TIMESTAMPTZ,

    CONSTRAINT "trainer_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL,
    "gym_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "price" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "duration_value" INTEGER NOT NULL,
    "duration_unit" "DurationUnit" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "tier" TEXT,
    "archived_at" TIMESTAMPTZ,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" UUID NOT NULL,
    "gym_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "source_plan_id" UUID NOT NULL,
    "snapshot_plan_name" TEXT NOT NULL,
    "snapshot_price" BIGINT NOT NULL,
    "snapshot_currency" CHAR(3) NOT NULL,
    "snapshot_duration_value" INTEGER NOT NULL,
    "snapshot_duration_unit" "DurationUnit" NOT NULL,
    "origin" "MembershipOrigin" NOT NULL,
    "predecessor_membership_id" UUID,
    "start_date" DATE NOT NULL,
    "original_end_date" DATE NOT NULL,
    "scheduled_effective_from" DATE,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activated_at" TIMESTAMPTZ,
    "cancelled_at" TIMESTAMPTZ,
    "cancelled_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "cached_status" "MembershipStatus" NOT NULL,
    "cached_effective_end_date" DATE NOT NULL,
    "cached_total_frozen_days" INTEGER NOT NULL DEFAULT 0,
    "cached_is_expiring_soon" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_freezes" (
    "id" UUID NOT NULL,
    "gym_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "freeze_start" DATE NOT NULL,
    "planned_end" DATE,
    "actual_end" DATE,
    "status" "FreezeStatus" NOT NULL DEFAULT 'ACTIVE',
    "frozen_days" INTEGER NOT NULL DEFAULT 0,
    "created_by" UUID NOT NULL,
    "ended_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_freezes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "gym_id" UUID NOT NULL,
    "branch_id" UUID,
    "membership_id" UUID NOT NULL,
    "entry_type" "PaymentEntryType" NOT NULL,
    "amount" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "received_at" TIMESTAMPTZ NOT NULL,
    "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recorded_by" UUID NOT NULL,
    "voids_payment_id" UUID,
    "reference" TEXT,
    "note" TEXT,
    "void_reason" TEXT,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "gym_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "member_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "dedupe_key" TEXT NOT NULL,
    "state" "NotificationState" NOT NULL DEFAULT 'UNREAD',
    "generated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message" TEXT NOT NULL,
    "read_at" TIMESTAMPTZ,
    "read_by" UUID,
    "dismissed_at" TIMESTAMPTZ,
    "dismissed_by" UUID,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "gym_id" UUID NOT NULL,
    "branch_id" UUID,
    "action" TEXT NOT NULL,
    "actor_user_id" UUID,
    "target_type" TEXT NOT NULL,
    "target_id" UUID,
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "correlation_id" TEXT NOT NULL,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "gym_users_gym_id_status_idx" ON "gym_users"("gym_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "gym_users_gym_id_user_id_key" ON "gym_users"("gym_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_gym_id_key_key" ON "roles"("gym_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");

-- CreateIndex
CREATE UNIQUE INDEX "capabilities_key_key" ON "capabilities"("key");

-- CreateIndex
CREATE INDEX "role_permissions_role_id_idx" ON "role_permissions"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_key" ON "role_permissions"("role_id", "permission_id");

-- CreateIndex
CREATE INDEX "members_gym_id_status_full_name_idx" ON "members"("gym_id", "status", "full_name");

-- CreateIndex
CREATE INDEX "members_gym_id_branch_id_idx" ON "members"("gym_id", "branch_id");

-- CreateIndex
CREATE INDEX "member_notes_member_id_created_at_idx" ON "member_notes"("member_id", "created_at");

-- CreateIndex
CREATE INDEX "plans_gym_id_is_active_idx" ON "plans"("gym_id", "is_active");

-- CreateIndex
CREATE INDEX "memberships_gym_id_member_id_idx" ON "memberships"("gym_id", "member_id");

-- CreateIndex
CREATE INDEX "memberships_member_id_cached_status_idx" ON "memberships"("member_id", "cached_status");

-- CreateIndex
CREATE INDEX "memberships_gym_id_cached_status_cached_effective_end_date_idx" ON "memberships"("gym_id", "cached_status", "cached_effective_end_date");

-- CreateIndex
CREATE INDEX "memberships_gym_id_source_plan_id_idx" ON "memberships"("gym_id", "source_plan_id");

-- CreateIndex
CREATE INDEX "memberships_predecessor_membership_id_idx" ON "memberships"("predecessor_membership_id");

-- CreateIndex
CREATE INDEX "memberships_gym_id_created_at_idx" ON "memberships"("gym_id", "created_at");

-- CreateIndex
CREATE INDEX "membership_freezes_gym_id_status_idx" ON "membership_freezes"("gym_id", "status");

-- CreateIndex
CREATE INDEX "payments_gym_id_membership_id_idx" ON "payments"("gym_id", "membership_id");

-- CreateIndex
CREATE INDEX "payments_gym_id_received_at_idx" ON "payments"("gym_id", "received_at");

-- CreateIndex
CREATE INDEX "payments_gym_id_entry_type_received_at_idx" ON "payments"("gym_id", "entry_type", "received_at");

-- CreateIndex
CREATE UNIQUE INDEX "payments_voids_payment_id_key" ON "payments"("voids_payment_id");

-- CreateIndex
CREATE INDEX "notifications_gym_id_state_idx" ON "notifications"("gym_id", "state");

-- CreateIndex
CREATE INDEX "notifications_gym_id_membership_id_idx" ON "notifications"("gym_id", "membership_id");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_gym_id_dedupe_key_key" ON "notifications"("gym_id", "dedupe_key");

-- CreateIndex
CREATE INDEX "audit_logs_gym_id_occurred_at_idx" ON "audit_logs"("gym_id", "occurred_at");

-- CreateIndex
CREATE INDEX "audit_logs_gym_id_target_type_target_id_idx" ON "audit_logs"("gym_id", "target_type", "target_id");

-- CreateIndex
CREATE INDEX "audit_logs_gym_id_actor_user_id_occurred_at_idx" ON "audit_logs"("gym_id", "actor_user_id", "occurred_at");

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gym_users" ADD CONSTRAINT "gym_users_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gym_users" ADD CONSTRAINT "gym_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gym_users" ADD CONSTRAINT "gym_users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gym_users" ADD CONSTRAINT "gym_users_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_capability_id_fkey" FOREIGN KEY ("capability_id") REFERENCES "capabilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_notes" ADD CONSTRAINT "member_notes_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_notes" ADD CONSTRAINT "member_notes_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_notes" ADD CONSTRAINT "member_notes_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_assignments" ADD CONSTRAINT "trainer_assignments_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_assignments" ADD CONSTRAINT "trainer_assignments_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_assignments" ADD CONSTRAINT "trainer_assignments_trainer_gym_user_id_fkey" FOREIGN KEY ("trainer_gym_user_id") REFERENCES "gym_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_assignments" ADD CONSTRAINT "trainer_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_source_plan_id_fkey" FOREIGN KEY ("source_plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_predecessor_membership_id_fkey" FOREIGN KEY ("predecessor_membership_id") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_freezes" ADD CONSTRAINT "membership_freezes_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_freezes" ADD CONSTRAINT "membership_freezes_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_freezes" ADD CONSTRAINT "membership_freezes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_freezes" ADD CONSTRAINT "membership_freezes_ended_by_fkey" FOREIGN KEY ("ended_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_voids_payment_id_fkey" FOREIGN KEY ("voids_payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_read_by_fkey" FOREIGN KEY ("read_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_dismissed_by_fkey" FOREIGN KEY ("dismissed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- HAND-AUTHORED SQL TAIL (constructs Prisma cannot express).
-- Verbatim from /docs/database/initial-migration-specification.md (§2,5,6,7,8,11),
-- in the documented order (§10). Do not re-decide anything here.
-- ─────────────────────────────────────────────────────────────────────────────

-- §2 · Required PostgreSQL extensions (must precede dependent indexes/constraints).
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- §5 · Partial UNIQUE indexes & partial indexes (predicate-scoped — `WHERE`).
-- P-1  Platform roles (gym_id IS NULL) must have unique keys; the composite
--      UNIQUE(gym_id,key) does NOT cover this (NULLs are distinct).  DDS §4
CREATE UNIQUE INDEX roles_platform_key_key
  ON roles (key) WHERE gym_id IS NULL;

-- P-2/P-3  INV-3: contact unique within a gym, among NON-archived members only,
--          so a recycled phone/email is reusable after the prior holder archives.
CREATE UNIQUE INDEX members_gym_phone_active_key
  ON members (gym_id, phone) WHERE phone IS NOT NULL AND archived_at IS NULL;
CREATE UNIQUE INDEX members_gym_email_active_key
  ON members (gym_id, email) WHERE email IS NOT NULL AND archived_at IS NULL;

-- P-4  INV-35: at most one open (current) trainer assignment per member.
CREATE UNIQUE INDEX trainer_assignments_one_open_per_member_key
  ON trainer_assignments (member_id) WHERE unassigned_at IS NULL;

-- P-5  §4: a trainer's current assignees (accelerator), open rows only.
CREATE INDEX trainer_assignments_trainer_open_idx
  ON trainer_assignments (trainer_gym_user_id) WHERE unassigned_at IS NULL;

-- P-6  §2.14/FRZ: at most one ACTIVE freeze per membership.
CREATE UNIQUE INDEX membership_freezes_one_active_per_membership_key
  ON membership_freezes (membership_id) WHERE status = 'ACTIVE';

-- §6 · GiST exclusion constraint — non-overlap backstop (INV-13). Needs btree_gist.
-- INV-13 / T-5: active membership periods never overlap for the same member.
ALTER TABLE memberships
  ADD CONSTRAINT memberships_no_overlap_excl
  EXCLUDE USING gist (
    member_id WITH =,
    daterange(start_date, original_end_date, '[]') WITH &&
  ) WHERE (cancelled_at IS NULL);

-- §7 · CHECK constraints (single-row invariants).
ALTER TABLE members            ADD CONSTRAINT members_contact_present_chk
  CHECK (phone IS NOT NULL OR email IS NOT NULL);
ALTER TABLE payments           ADD CONSTRAINT payments_amount_positive_chk
  CHECK (amount > 0);
ALTER TABLE plans              ADD CONSTRAINT plans_price_duration_chk
  CHECK (price >= 0 AND duration_value > 0);
ALTER TABLE gyms               ADD CONSTRAINT gyms_windows_nonneg_chk
  CHECK (expiring_soon_window_days >= 0 AND grace_period_days >= 0);
ALTER TABLE membership_freezes ADD CONSTRAINT freezes_frozen_days_nonneg_chk
  CHECK (frozen_days >= 0);

-- §8 · GIN trigram search index (fast partial member search). Needs pg_trgm.
CREATE INDEX members_full_name_trgm_idx
  ON members USING gin (full_name gin_trgm_ops);

-- §11 · Database comments (the non-obvious write-path carve-outs).
COMMENT ON COLUMN memberships.cached_status IS
  'DERIVED cache (DDS §1.6). NOT authoritative; do NOT add a partial-unique on it for INV-12.';
COMMENT ON CONSTRAINT memberships_no_overlap_excl ON memberships IS
  'INV-13 static backstop on immutable dates; write-path is authoritative for freeze/clock cases.';
COMMENT ON COLUMN payments.amount IS
  'MoneyMinorUnits, positive magnitude; effect determined by entry_type (PAYMENT/VOID). Append-only.';
COMMENT ON TABLE audit_logs IS 'Append-only, write-once (INV-39). No UPDATE/DELETE.';
