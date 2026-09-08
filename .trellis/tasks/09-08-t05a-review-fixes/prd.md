# T05a review contract fixes

## Goal

Correct verified contract gaps found during review of the unmerged T05a Action
and Pages integration while keeping the work on `feat/t05-action-workflows`.

## Requirements

* Remove metadata defaults that turn omitted `repository` and `token` inputs
  into implicit Action overrides. Preserve resolver precedence: explicit Action
  input, then environment, then YAML config where applicable.
* Add a CI drift check after `pnpm build` so a source change without the matching
  checked-in `action/dist/index.cjs` fails the build job.
* State explicitly in the standalone workflow that all assets must be uploaded
  before manual publication; automated release producers must use the chained
  workflow because a later asset upload cannot be predicted by freshness checks.
* Make config/branding pushes work for any repository default branch without a
  hard-coded branch name. Trigger matching path changes on branches, then gate the
  build job with `github.ref_name == github.event.repository.default_branch` for
  push events while continuing to allow release and manual events.
* Replace workflow string-presence tests with parsed, path-specific structural
  assertions for triggers, job conditions, dependencies, permissions,
  environments, checkout refs, action ordering, and inputs.
* Update the executable Action/Pages code-spec to match the corrected contracts.

## Acceptance Criteria

* [x] Omitting `repository` causes the Action adapter to pass no repository
      override, so config/environment fallback remains reachable.
* [x] Omitting `token` causes the adapter to use `GITHUB_TOKEN` through the shared
      environment resolver; templates continue passing `github.token` explicitly.
* [x] CI regenerates the Action and fails when the committed bundle differs.
* [x] The standalone workflow has no hard-coded branch filter and its build job
      runs for non-push events or only the actual default branch for push events.
* [x] Standalone documentation distinguishes pre-publication asset completeness
      from the bounded during-build freshness check.
* [x] Workflow tests parse YAML and assert values at their exact object paths.
* [x] Typecheck, lint, tests, build, coverage, and diff checks pass.

## Technical Approach

Keep the existing implementation shape. Change metadata defaults rather than
special-casing resolved values in TypeScript. Add a post-build Git diff command
to the existing CI build job. Model workflow YAML with narrow Zod test schemas so
tests operate on typed parsed objects. Use a job-level default-branch condition,
because branch filters are static glob patterns while job `if` supports contexts.

## Decision (ADR-lite)

**Context:** A `release.published` event can be followed by later uploads through
GitHub's release asset API; no finite pair of snapshots proves there will be no
future upload.

**Decision:** Treat attachment completeness as an entry precondition for the
standalone manual-publish workflow, require automated producers to chain Facade
after their upload job, and retain freshness checking for changes observed during
the build.

**Consequences:** The guarantee is accurate and testable without adding arbitrary
delays. Real timing remains part of T05b Pages acceptance.

## Out of Scope

* Predicting or blocking arbitrary future Release asset uploads.
* Live Pages deployment validation (T05b).
* Publishing a stable Action version.

## Technical Notes

* Review evidence supplied in the attached audit text.
* Existing contract: `.trellis/spec/backend/action-pages-contracts.md`.
* Research: `research/github-review-contracts.md`.
