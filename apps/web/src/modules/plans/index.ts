/**
 * Plans module — public entry (constitution §2). Other contexts import the module **only**
 * through this index. The memberships rail composes `formatDuration` for snapshot-duration
 * copy ("E£1,200 · 3 months"); the membership detail page uses the same single formatter —
 * duration wording never forks.
 */
export { formatDuration } from "./format";
