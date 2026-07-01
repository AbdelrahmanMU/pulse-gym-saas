/**
 * Payments module — public entry (constitution §2). Other contexts import the module **only**
 * through this index (the `no-cross-context` fitness rule allows a module's public `index`, never
 * its internals). The dashboard read model composes revenue + outstanding balances from here.
 */
export {
  getRevenueSummary,
  getOutstandingBalances,
  type RevenueSummary,
  type OutstandingBalanceRow,
  type OutstandingBalances,
} from "./service";
