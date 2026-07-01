import { describe, expect, it } from "vitest";
import { PERMISSION_KEYS } from "@pulse/auth";
import type { AuthenticatedPrincipal } from "@pulse/types";
import { AuthorizationError } from "@/lib/errors";
import {
  dismissNotification,
  generateExpiryNotifications,
  getUnreadCount,
  listNotifications,
  markAllRead,
  markNotificationRead,
} from "./service";

/**
 * Authorization P0 for Notifications (constitution §6 — every guarded action has an authorization
 * test). Each entry point calls `authorize(...)` **before** any Prisma access, so the *deny* paths
 * are pure (no DB): a principal lacking the required permission is refused. These tests also pin the
 * **read ≠ manage** split (a reader may not transition state). The allow + 404-isolation paths need
 * the real DB and are deferred under the Epic-5 precedent (see the verification report).
 */
function principalWith(permissions: string[]): AuthenticatedPrincipal {
  return {
    userId: "u1",
    email: "a@b.c",
    displayName: "Test",
    gymId: "g1",
    branchId: "br1",
    gymUserId: "gu1",
    permissions,
  };
}

describe("notifications service — authorization (deny-by-default)", () => {
  const nobody = principalWith([]);

  it("refuses read/generate without notifications.read", async () => {
    await expect(generateExpiryNotifications(nobody)).rejects.toBeInstanceOf(AuthorizationError);
    await expect(listNotifications(nobody, "all")).rejects.toBeInstanceOf(AuthorizationError);
    await expect(getUnreadCount(nobody)).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("refuses state transitions without notifications.manage", async () => {
    await expect(markNotificationRead(nobody, "n1")).rejects.toBeInstanceOf(AuthorizationError);
    await expect(dismissNotification(nobody, "n1")).rejects.toBeInstanceOf(AuthorizationError);
    await expect(markAllRead(nobody)).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("read does not grant manage — a reader cannot transition state (read ≠ manage)", async () => {
    const reader = principalWith([PERMISSION_KEYS.NOTIFICATIONS_READ]);
    await expect(markNotificationRead(reader, "n1")).rejects.toBeInstanceOf(AuthorizationError);
    await expect(dismissNotification(reader, "n1")).rejects.toBeInstanceOf(AuthorizationError);
    await expect(markAllRead(reader)).rejects.toBeInstanceOf(AuthorizationError);
  });
});
