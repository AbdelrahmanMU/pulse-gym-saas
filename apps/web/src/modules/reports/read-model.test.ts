import { describe, expect, it } from "vitest";
import { PERMISSION_KEYS } from "@pulse/auth";
import type { AuthenticatedPrincipal } from "@pulse/types";
import type { MembershipListParams } from "@/modules/memberships";
import { AuthorizationError } from "@/lib/errors";
import {
  getExpiringReportData,
  getMembershipReportData,
  getOutstandingReportData,
  getRevenueReportData,
} from "./read-model";

/**
 * Authorization P0 for Reports (constitution §6). Every report read model authorizes `reports.view`
 * **before** any Prisma access, so the deny path is pure (no DB): a principal lacking `reports.view` is
 * refused. Authorized composition (Owner/Manager/Accountant → domain reads) needs the DB and is
 * verified via the composed engines' own tests (deriveRow / summarizeLedger / sumRevenueInRange).
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

const listParams: MembershipListParams = { status: "ALL", page: 1 };

describe("reports read models — authorization (deny-by-default)", () => {
  const nobody = principalWith([]);

  it("refuses every report without reports.view", async () => {
    await expect(getRevenueReportData(nobody, null)).rejects.toBeInstanceOf(AuthorizationError);
    await expect(getMembershipReportData(nobody, listParams)).rejects.toBeInstanceOf(
      AuthorizationError,
    );
    await expect(getOutstandingReportData(nobody)).rejects.toBeInstanceOf(AuthorizationError);
    await expect(getExpiringReportData(nobody)).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("still refuses a domain-read holder that lacks reports.view (reports.view is required)", async () => {
    const domainOnly = principalWith([
      PERMISSION_KEYS.MEMBERSHIPS_READ,
      PERMISSION_KEYS.PAYMENTS_READ,
    ]);
    await expect(getOutstandingReportData(domainOnly)).rejects.toBeInstanceOf(AuthorizationError);
    await expect(getRevenueReportData(domainOnly, null)).rejects.toBeInstanceOf(AuthorizationError);
  });
});
