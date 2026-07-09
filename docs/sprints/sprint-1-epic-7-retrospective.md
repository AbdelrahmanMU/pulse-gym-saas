# Sprint 1 · Epic 7 — Notifications · Retrospective

1. **The generation trigger was the real fork, and surfacing it paid off.** No cron exists; naive
   "generate-on-read" would have violated the Epic-4 *no-write-in-RSC* rule **and** silently died once
   Next cached the route. Framing it as a human decision (Server Action vs button vs cron/ADR) landed a
   clean, replaceable `GenerateOnOpen` → service → revalidate flow instead of a latent bug.

2. **Derivation belongs in its home module — again.** The temptation was to re-derive expiry inside
   notifications. Instead memberships exposed `getExpiryCandidates` (neutral `event`) through its public
   `index`, exactly like Epic-6's dashboard composition. `pickExpiryEvent` stayed pure and testable; the
   `no-cross-context` fitness test proved the seam clean.

3. **Suppression-on-renewal collapsed to one elegant rule.** "Only a **tail** membership (no successor)
   alerts" satisfies FRZ-3, the renewed-no-longer-qualifies workflow, and chain-dedup at once — and it
   only works because it runs on the **full** `deriveMemberLifecycle`, not the light `deriveRow` (the
   advisor's catch; the freeze-extension test pins it).

4. **The unique dedupeKey does the heavy lifting.** Non-duplication (NTF-3), dismissed-not-resurrected
   (INV-34), and freeze-re-expiry-as-new-event all fall out of `{membership}:{type}:{end}` +
   `@@unique` + `skipDuplicates` — no bespoke idempotency code.

5. **Standing gap, honestly carried:** no live DB integration suite for the service (Epic-5 precedent).
   Tenancy/authz rest on shared, already-tested helpers; a future pass could exercise mark/dismiss 404 +
   re-run idempotency end-to-end. Also: only Owner holds the notifications permissions in MVP, so the
   whole feature is Owner-visible until more roles are activated.
