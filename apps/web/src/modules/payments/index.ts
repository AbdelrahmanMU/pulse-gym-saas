/**
 * Payments module — public entry (constitution §2). Other contexts import the module **only**
 * through this index (the `no-cross-context` fitness rule allows a module's public `index`, never
 * its internals). The dashboard read model composes revenue + outstanding balances from here; the
 * reports read models compose `getRevenueReport` and `getOutstandingBalanceReport`; the Member
 * archive policy composes `getMemberOutstandingBalance` (ARC-3 / INV-11).
 */
export {
  getRevenueSummary,
  getOutstandingBalances,
  getMemberOutstandingBalance,
  getRevenueReport,
  getOutstandingBalanceReport,
  type RevenueSummary,
  type OutstandingBalanceRow,
  type OutstandingBalances,
  type MemberOutstandingBalance,
  type RevenueReport,
  type OutstandingReportRow,
  type OutstandingReport,
} from "./service";
