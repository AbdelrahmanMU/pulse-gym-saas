/**
 * Members module — public entry (constitution §2). Other contexts import the module **only**
 * through this index (the `no-cross-context` fitness rule allows a module's public `index`, never
 * its internals). The dashboard read model composes `listRecentMembers` from here; the staff module
 * composes `unassignAllForTrainer` to clear a suspended trainer's assignments (INV-36).
 */
export { listRecentMembers, unassignAllForTrainer, type RecentMemberRow } from "./service";
