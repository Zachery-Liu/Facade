# GitHub Quality Gates

[简体中文](./quality-gates.zh-CN.md)

Facade treats `main` as the releasable branch. Feature work should start from `main` on a dedicated branch and be merged through a Pull Request; do not push feature changes directly to `main`.

The repository's `main quality gate` GitHub Ruleset is **active** and enforced on `refs/heads/main`. The repository's GitHub Actions provide the following required checks:

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

## Coverage baseline

`pnpm coverage` uses Vitest's V8 provider and produces terminal output, Cobertura XML, a JSON summary, and an HTML report. The current minimum thresholds are:

| Metric | Minimum |
| --- | ---: |
| Statements | 69% |
| Branches | 84% |
| Functions | 68% |
| Lines | 69% |

These thresholds are an anti-regression baseline, not an arbitrary long-term target. Any PR that raises a threshold must include enough tests in the same PR to satisfy the new baseline.

## Current `main` Ruleset

The active `main quality gate` Ruleset enforces the following repository policy:

- Pull Requests are required before merging into `main`.
- Review conversations must be resolved before merge.
- The required approval count is `0`, which is appropriate while the repository has a solo maintainer; increase it when regular collaborators are added.
- Linear history is required and the repository permits squash merge only.
- Branch deletion and non-fast-forward updates, including force pushes, are blocked.
- Required status checks use the eight check names listed above and must pass against an up-to-date branch.
- Repository owner `Zachery-Liu` may bypass the Ruleset only through a Pull Request, for exceptional recovery cases rather than routine development.

The intended Ruleset configuration is versioned at [`../.github/rulesets/main-quality-gate.json`](../.github/rulesets/main-quality-gate.json). If the live repository settings are changed intentionally, update the versioned template and this document in the same change so the repository does not drift from its documented policy.

## Restore or recreate the Ruleset

The Ruleset is already active. The following procedure is only for rebuilding it after deletion, repository migration, or accidental configuration loss:

1. Open **Settings → Rules → Rulesets → New ruleset → Import a ruleset** and select `.github/rulesets/main-quality-gate.json`.
2. Confirm the imported Ruleset is named `main quality gate`, targets `main`, and has status **Active**.
3. Verify Pull Request enforcement, conversation resolution, linear history, squash-only merging, deletion protection, and non-fast-forward protection.
4. Verify all eight required status checks listed above are present and that the strict up-to-date policy is enabled.
5. Verify the owner bypass remains limited to Pull Requests.

If GitHub does not offer a required check name during reconstruction, run the corresponding workflow once and then select the exact check name produced by GitHub.

## Local equivalent checks

Before opening a Pull Request, run:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm coverage
```

CodeQL and Dependency Review run on GitHub for Pull Requests. They do not read project secrets, and each workflow requests only the minimum permissions required for its task.
