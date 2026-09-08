# GitHub Quality Gates

[简体中文](./quality-gates.zh-CN.md)

Facade treats `main` as the releasable branch. Feature work should start from `main` on a dedicated branch and be merged through a Pull Request; do not push feature changes directly to `main`.

## Pull request requirements

Before a Pull Request can be merged into `main`:

- the branch must be up to date with `main`;
- all required status checks must pass;
- all review conversations must be resolved;
- the Pull Request must be merged using squash merge.

The repository currently requires `0` approving reviews. This is intentional while Facade has a solo maintainer. It does **not** grant merge permission to contributors: only users who already have repository merge permission can merge a Pull Request.

GitHub's additional approval setting for unattributed Copilot Pull Requests is enabled. It currently has no effect because the required approval count is `0`.

## Local checks

Before opening a Pull Request, run:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm coverage
```

These commands are the local equivalents of the main CI checks. CodeQL and Dependency Review run on GitHub for Pull Requests.

## Required GitHub checks

The repository's GitHub Actions provide the following required checks:

| Workflow | Check | What failure means |
| --- | --- | --- |
| `CI` | `typecheck` | TypeScript type checking failed |
| `CI` | `lint` | ESLint reported an error or warning |
| `CI` | `test` | Vitest tests failed |
| `CI` | `build` | The production build failed |
| `CI` | `coverage` | Coverage fell below the current baseline |
| `CodeQL` | `Analyze (actions)` | Workflow security analysis found an issue |
| `CodeQL` | `Analyze (javascript-typescript)` | JavaScript/TypeScript security analysis found an issue |
| `Dependency review` | `dependency-review` | The PR introduces a dependency with a known high or critical vulnerability |

Each workflow requests only the permissions required for its task. CodeQL and Dependency Review do not read project secrets.

## Coverage baseline

`pnpm coverage` uses Vitest's V8 provider and produces terminal output, Cobertura XML, a JSON summary, and an HTML report. The current minimum thresholds are:

| Metric | Minimum |
| --- | ---: |
| Statements | 69% |
| Branches | 84% |
| Functions | 68% |
| Lines | 69% |

These thresholds are an anti-regression baseline, not an arbitrary long-term target. Any Pull Request that raises a threshold must include enough tests in the same Pull Request to satisfy the new baseline.

## Current `main` Ruleset

The active `main quality gate` GitHub Ruleset is enforced on `refs/heads/main` and applies the following repository policy:

- Pull Requests are required before merging into `main`.
- Review conversations must be resolved before merge.
- The required approval count is `0` while the repository has a solo maintainer; increase it when regular collaborators are added.
- GitHub's extra-approval setting for unattributed Copilot changes is enabled, but it has no effect while the required approval count is `0`.
- Linear history is required and the repository permits squash merge only.
- Branch deletion and non-fast-forward updates, including force pushes, are blocked.
- Required status checks use the eight check names listed above and must pass against an up-to-date branch.
- Repository owner `Zachery-Liu` may bypass the Ruleset only through a Pull Request, for exceptional recovery cases rather than routine development.

## Ruleset source of truth

The intended Ruleset configuration is versioned at [`../.github/rulesets/main-quality-gate.json`](../.github/rulesets/main-quality-gate.json).

The live GitHub Ruleset and the versioned JSON should describe the same policy. If the live repository settings are changed intentionally, update the JSON template and this document in the same Pull Request so the repository does not drift from its documented configuration.

## Restore or recreate the Ruleset

The Ruleset is already active. The following procedure is only for rebuilding it after deletion, repository migration, or accidental configuration loss:

1. Open **Settings → Rules → Rulesets → New ruleset → Import a ruleset** and select `.github/rulesets/main-quality-gate.json`.
2. Confirm the imported Ruleset is named `main quality gate`, targets `main`, and has status **Active**.
3. Verify Pull Request enforcement, conversation resolution, linear history, squash-only merging, deletion protection, and non-fast-forward protection.
4. Verify all eight required status checks listed above are present and that the strict up-to-date policy is enabled.
5. Verify the required approval count is `0` while Facade remains solo-maintained.
6. Verify the extra-approval setting for unattributed Copilot changes matches the versioned JSON.
7. Verify the owner bypass remains limited to Pull Requests.

If GitHub does not offer a required check name during reconstruction, run the corresponding workflow once and then select the exact check name produced by GitHub.
