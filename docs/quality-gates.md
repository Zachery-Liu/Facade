# GitHub Quality Gates

Facade treats `main` as the releasable branch. Feature work should start from `main` on a dedicated branch and be merged through a Pull Request; do not push feature changes directly to `main`. **Until the GitHub Ruleset is actually enabled, this is a repository convention rather than a GitHub-enforced rule.**

The repository's GitHub Actions provide the following checks:

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

## Enable the `main` Ruleset

A GitHub Ruleset is a repository setting and cannot be enabled by an ordinary git commit. The import template is versioned at [`../.github/rulesets/main-quality-gate.json`](../.github/rulesets/main-quality-gate.json). After pushing the branch, opening a PR, and allowing every workflow to run at least once, a repository administrator should configure GitHub as follows:

1. Open **Settings → Rules → Rulesets → New ruleset → Import a ruleset** and select `.github/rulesets/main-quality-gate.json`.
2. Name it `main quality gate`, target the `main` branch, and set its status to **Active**.
3. The template enables **Require a pull request before merging**, requires conversation resolution, permits squash merge only, and blocks deletion and force pushes. The approval count is `0`, which is appropriate for a solo maintainer; increase it to `1` when collaborators are added.
4. Enable **Require status checks to pass** and require the branch to be up to date, then select all eight checks listed above from the names GitHub actually displays. Use the names produced by the first workflow run rather than typing status-check names manually.
5. The template enables **Block force pushes**. Repository owner `Zachery-Liu` may bypass only through a Pull Request for emergency recovery; routine changes should still go through the normal PR flow.

Do not configure required status checks before the workflows have run at least once. GitHub only lists check names that have appeared recently.

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

[简体中文](./quality-gates.zh-CN.md)
