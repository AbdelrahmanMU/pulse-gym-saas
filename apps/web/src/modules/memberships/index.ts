/**
 * Memberships module — public entry (constitution §2). Other contexts import the module **only**
 * through this index (the `no-cross-context` fitness rule allows a module's public `index`, never
 * its internals). The dashboard read model composes `getMembershipOverview` from here.
 */
export { getMembershipOverview, type MembershipOverview, type OverviewRow } from "./service";
