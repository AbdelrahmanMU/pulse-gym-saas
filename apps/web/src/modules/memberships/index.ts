/**
 * Memberships module — public entry (constitution §2). Other contexts import the module **only**
 * through this index (the `no-cross-context` fitness rule allows a module's public `index`, never
 * its internals). The dashboard read model composes `getMembershipOverview`; the notifications
 * generation service composes `getExpiryCandidates`; the reports read models compose
 * `getMembershipOverview` (counts), `getExpiringReport`, and `listMemberships` (filtered list);
 * the Member archive policy composes `getMemberMembershipStanding` (ARC-3 / INV-11).
 */
export {
  getMembershipOverview,
  getExpiryCandidates,
  getExpiringReport,
  getMemberMembershipStanding,
  listMemberships,
  type MembershipOverview,
  type OverviewRow,
  type ExpiryCandidate,
  type ExpiringReport,
  type MemberMembershipStanding,
  type MembershipRow,
  type MembershipListResult,
} from "./service";
export { MembershipListParamsSchema, type MembershipListParams } from "./validation";
