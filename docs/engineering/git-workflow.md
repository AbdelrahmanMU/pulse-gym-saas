# Git Workflow
### PULSE Gym SaaS · Engineering Governance

| | |
|---|---|
| **Status** | ✅ Authoritative |
| **References** | `development-workflow.md`, `feature-template.md` |

> **Why a strict git process:** Git history is the project's long-term memory and the human's primary audit surface. Clean branches, atomic commits, and small PRs let a human reviewer (the bottleneck) accept AI work quickly and let anyone reconstruct *why* a change happened months later.

---

## Branch Naming
Pattern: `<type>/<module>-<short-description>` (kebab-case).

| Type | Use | Example |
|---|---|---|
| `feat/` | New feature/slice | `feat/memberships-renewal` |
| `fix/` | Bug fix | `fix/payments-decimal-rounding` |
| `chore/` | Tooling, deps, config | `chore/update-prisma` |
| `docs/` | Docs only | `docs/api-standards` |
| `refactor/` | Behavior-preserving change | `refactor/members-query-split` |
| `test/` | Tests only | `test/membership-invariants` |

- **One branch per feature slice**, cut from the up-to-date default branch. *Why:* isolates work, keeps PRs small.
- **Never commit to the default branch directly.** *Why:* the human gates merge; main stays releasable.
- **Short-lived branches** (hours–days). *Why:* long branches drift and create painful merges.

## Commit Naming
**Conventional Commits:** `<type>(<scope>): <subject>` — imperative, ≤ ~72 chars.

```
feat(memberships): add early-renewal date preservation
fix(payments): store amounts as integer minor units
test(memberships): cover frozen-period extension
```

- **Types:** `feat, fix, chore, docs, refactor, test, perf, build`.
- **Scope = module** (per ADR). *Why:* greppable history by feature area.
- **One logical change per commit;** atomic and self-contained. *Why:* reviewable, revertable, bisectable.
- **Body explains *why*** for non-trivial changes; reference the feature doc/PRD item.
- **Footer:** end commit messages with the required co-author trailer.
- **Never** mix unrelated changes, never commit secrets, never commit failing code with a passing message.

## Pull Request Rules
- **One PR per feature slice;** keep diffs small (target < ~400 lines changed). *Why:* small PRs get reviewed faster and more accurately.
- **PR description = filled `feature-template` checklist + DoD**, plus the self-review note and what was tested. *Why:* the reviewer sees intent, verification, and scope at a glance.
- **All checks green** (type-check, lint, tests) before requesting review. *Why:* don't spend human attention on machine-catchable issues.
- **PRs must be self-reviewed** (workflow stage 5) and, for non-trivial work, `advisor`-checked first.
- **No PR merges itself** — explicit human approval required (the human owns acceptance).
- **Draft PRs** are fine for early feedback; mark ready only when DoD is met.

## Merge Rules
- **Squash-merge** to the default branch; final squash message follows Conventional Commits. *Why:* one clean commit per feature keeps history legible.
- **Merge requires:** human approval + green checks + DoD satisfied + docs updated in the same PR.
- **Delete the branch on merge.** *Why:* hygiene.
- **Never force-push shared branches;** never bypass hooks/checks (`--no-verify`) unless the human explicitly asks.

## Release Rules
- **Releases are tagged** from the default branch; each release maps to a set of merged PRs.
- **Changelog updated per release** (grouped by `feat/fix/...`). *Why:* traceability of what shipped.
- **Deploy per ADR** (Docker Compose). A release is reproducible from its tag.
- **Hotfixes** branch `fix/`, fast-track review, then tag a patch release.

## Versioning Strategy
**Semantic Versioning** `MAJOR.MINOR.PATCH` for the application:
- **MAJOR** — breaking API/schema/contract changes (coordinated, human-approved).
- **MINOR** — backward-compatible features.
- **PATCH** — backward-compatible fixes.

- **Pre-1.0 (MVP):** `0.MINOR.PATCH`; MINOR for features, PATCH for fixes. *Why:* signals pre-stable API while staying disciplined.
- **Design System** versions independently (PULSE v1.1) — don't conflate with app version.
- **Database migrations** are forward-only and versioned by Prisma; a schema-breaking change implies at least a MINOR (pre-1.0) / MAJOR (post-1.0) app bump.
