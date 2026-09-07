# Fix GitHub quality gate execution

## Goal

Make the already-pushed quality-gate implementation execute successfully on GitHub, enforce the measured coverage baseline consistently, and avoid claiming that unverified GitHub settings or checks are complete.

## What we know

- All five CI jobs fail in `actions/setup-node@v7` before `corepack enable`, because `cache: pnpm` tries to locate `pnpm` before Corepack activates it.
- `vitest.config.ts` uses thresholds 63/41/44/63 while repository documentation specifies the measured 69/84/68/69 baseline.
- CodeQL has passed. Dependency Review only appears on a pull request to `main` and has not yet run.
- `main` currently has no active GitHub Ruleset or branch protection; this requires repository-admin configuration outside a git commit.

## Requirements

- Make all CI jobs bootstrap the repository's pinned pnpm version before any pnpm cache lookup, without adding an unnecessary setup action.
- Set Vitest thresholds to statements 69, branches 84, functions 68, and lines 69; run coverage locally to prove the baseline passes.
- Correct quality-gate documentation and Trellis records to distinguish local implementation from externally verified GitHub state.
- Do not assert that Dependency Review or a main Ruleset has passed/been enabled until GitHub has actually run or configured them.
- Preserve the existing least-privilege workflow permissions.

## Acceptance Criteria

- [ ] GitHub CI reaches `pnpm install --frozen-lockfile` and all five jobs execute their intended commands.
- [x] `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, and `pnpm coverage` pass with the 69/84/68/69 thresholds.
- [ ] A PR to `main` is created or updated so Dependency Review can run and its status can be inspected.
- [x] Documentation clearly states that enabling the `main` Ruleset happens only after all required checks appear and pass.
- [x] Task records do not mark GitHub-only verification complete until it is observed.

## Out of Scope

- Changing product code or coverage tests merely to inflate metrics.
- Bypassing GitHub protections, creating credentials, or force-pushing existing branches.

## Technical Approach

Use the simplest reliable bootstrap: remove `cache: pnpm` from `actions/setup-node`, then run `corepack enable` before the frozen install. This avoids the initialization dependency cycle and still uses the version pinned in `package.json`.

## Technical Notes

- Base branch: `feat/quality-gates` at `5b6f0fd`.
- Repair branch: `feat/quality-gates` (the existing unmerged pull-request branch).
- GitHub Actions evidence supplied by the user is the authoritative current execution result.
