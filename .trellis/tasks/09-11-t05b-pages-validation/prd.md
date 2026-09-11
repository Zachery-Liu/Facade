# Validate T05b real GitHub Pages flows

## Goal

Validate the two T05a Pages publishing integrations against a real, disposable
GitHub repository, then preserve reproducible evidence of the resulting Pages
deployments and any failures.

## What I already know

* T05a provides separate standalone-release and chained-release-CI workflow
  templates on the parent branch `feat/t05-action-workflows`.
* T05b requires real validation of both publication paths, a project subpath,
  complete output, failed-build recovery, and concurrent refresh behavior.
* This worktree is now on `feat/t05b-pages-validation`, stacked on the T05a
  fix commit `aed1460`.
* The validation repository is `https://github.com/Zachery-Liu/Facade-demo`.
  It is public, currently empty, and the authenticated user has Admin access.
* GitHub CLI 2.100.0 is installed and authenticated with `repo` and `workflow`
  scopes. The repository has Actions enabled and does not yet have a Pages site.

## Requirements

* Use a disposable, user-authorized public GitHub test repository with GitHub
  Pages configured for GitHub Actions.
* Validate the standalone `release.published` / manual-refresh template and
  the existing-release-CI chained template after every Release asset upload.
* Verify the deployed project-subpath page and the complete output set:
  `index.html`, `manifest.json`, `install.md`, and `llms.txt`.
* Prove that a failed build does not replace the prior successfully deployed
  Pages site.
* Trigger overlapping refreshes and verify the later refresh wins while the
  earlier workflow is canceled by the shared concurrency group.
* Exclude tag pushes from the standalone workflow's `push` trigger: a skipped
  tag-push workflow still acquires workflow-level concurrency and can otherwise
  cancel the valid `release.published` run for the same Release.
* Record workflow run URLs, commit/release identifiers, deployed Pages URL,
  timestamps, and observed HTTP results in task research/evidence files.

## Acceptance Criteria

* [ ] Both real release entry points successfully deploy the selected Release.
* [ ] The Pages project subpath resolves all four generated public outputs.
* [ ] A deliberate build failure leaves the previous deployment reachable and
      unchanged.
* [ ] A superseding refresh cancels the earlier run and the final deployed site
      corresponds to the newer refresh.
* [ ] Publishing a Release does not let its tag push cancel the corresponding
      `release.published` Pages refresh.
* [ ] Evidence records enough immutable identifiers for a maintainer to repeat
      and audit each result.

## Definition of Done

* Real-run evidence is recorded, including failures and recovery observations.
* Any discovered product or workflow defect is fixed with regression coverage.
* Lint, typecheck, tests, build, and coverage pass for any repository changes.
* If the external repository/API access is unavailable, the task remains
  explicitly pending rather than claiming acceptance.

## Out of Scope

* Replacing T05a's workflow templates without a defect observed in a real run.
* v0.1's wider three-repository and independent-user acceptance (T11b).
* Publishing a Marketplace Action or a stable Action version.

## Technical Notes

* Product requirements: `docs/implementation_plan.md` T05b and
  `docs/facade_product_plan.md` section 12.
* T05a contract: `.trellis/spec/backend/action-pages-contracts.md`.
* External target: `Zachery-Liu/Facade-demo`; authorization has been verified.
* Initial evidence: the `v1.0.0` release's `release.published` run
  `34550086989` was canceled by a skipped tag-push run, proving the trigger
  defect before the fix.
