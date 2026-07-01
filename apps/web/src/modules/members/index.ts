/**
 * Members module — public entry (constitution §2). Other contexts import the module **only**
 * through this index (the `no-cross-context` fitness rule allows a module's public `index`, never
 * its internals). The dashboard read model composes `listRecentMembers` from here.
 */
export { listRecentMembers, type RecentMemberRow } from "./service";
