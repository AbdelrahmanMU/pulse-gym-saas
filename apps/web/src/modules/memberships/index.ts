/**
 * Memberships module — public entry (constitution §2). Other contexts import the module **only**
 * through this index (the `no-cross-context` fitness rule allows a module's public `index`, never
 * its internals). The dashboard read model composes `getMembershipOverview`; the notifications
 * generation service composes `getExpiryCandidates`.
 */
export {
  getMembershipOverview,
  getExpiryCandidates,
  type MembershipOverview,
  type OverviewRow,
  type ExpiryCandidate,
} from "./service";
