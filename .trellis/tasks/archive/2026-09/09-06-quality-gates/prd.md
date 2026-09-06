# Add GitHub quality gates

## Goal

Create repository-owned GitHub Actions quality gates so every pull request can be evaluated by deterministic build, test, coverage, security, and dependency checks before it reaches `main`.

## Requirements

- Add a CI workflow that runs `pnpm install --frozen-lockfile`, then exposes separate required-check candidates for typecheck, lint, test, and build.
- Add a Vitest V8 coverage command and enforce thresholds derived from the first measured baseline; upload the report as a workflow artifact.
- Add CodeQL analysis for JavaScript/TypeScript and GitHub Actions workflows.
- Add Dependency Review for pull requests, configured to fail when introduced dependencies have high or critical vulnerabilities.
- Document the required GitHub `main` ruleset and its check names. Apply it through GitHub only after the workflows have produced check runs; attempt this automatically if authenticated administrative GitHub access is available.
- Keep all workflows least-privileged and avoid secrets.

## Acceptance Criteria

- [x] `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, and `pnpm coverage` pass locally.
- [x] CI exposes independent `typecheck`, `lint`, `test`, `build`, and `coverage` jobs on pull requests.
- [x] Coverage produces a text summary, Cobertura report, and HTML report; configured thresholds pass at the measured baseline.
- [x] CodeQL scans JavaScript/TypeScript and GitHub Actions.
- [x] Dependency Review runs only on pull requests and fails for newly introduced high or critical vulnerabilities.
- [x] Documentation lists the exact checks to require in the `main` ruleset and prevents direct feature work on `main`.

## Out of Scope

- Requiring a numeric GitHub Code Quality coverage ruleset feature.
- Adding third-party SaaS quality tools.
- Changing existing product code except where a coverage configuration requires test setup.

## Technical Notes

- Base branch: `main` at `d1a81de`.
- The existing T02 feature branch has an unmerged CI workflow; this task recreates the quality-gate implementation independently from `main` and does not use its dirty worktree state.
- Required GitHub configuration is external state and depends on repository-admin credentials.
