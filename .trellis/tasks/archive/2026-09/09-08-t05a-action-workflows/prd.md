# T05a Action and workflow integration

## Goal

Provide a self-contained JavaScript GitHub Action and two safe Pages workflow
integration templates that invoke Facade's shared GitHub-release build path. This
closes the engineering portion of the Action/Pages loop without claiming that
real Pages behavior has been externally accepted.

## Requirements

* Add a root `action.yml` with inputs for `config`, `repository`, optional `tag`,
  `base-path`, `out-dir`, and `token`, and outputs for `output-path` and
  `release-tag`.
* Package the action for GitHub's Node 24 JavaScript-action runtime. The checked-in
  action bundle must contain all runtime dependencies and must not require pnpm or
  an install step in the consuming repository.
* Make the Action and CLI use the same configuration/source/build boundaries.
  Add YAML configuration loading and keep input precedence explicit:
  Action inputs over environment over `.github/facade.yml`.
* Emit GitHub-native warnings/errors, mask the token, set declared outputs, and
  report failures without printing secrets or local absolute paths.
* Before the build is eligible for Pages upload, verify both configuration and
  selected GitHub Release input freshness. If either changed during the first
  build, rebuild once from the new inputs; if inputs change again, fail with a
  stable actionable diagnostic.
* Add a standalone workflow template for `release.published`, manual dispatch,
  and default-branch Facade config/brand changes. It must explicitly check out
  the default branch because a release event otherwise points at a tag.
* Add an existing-release-CI integration template whose Facade job depends on the
  job that creates the Release and uploads every asset. Do not rely on a release
  event triggered with `GITHUB_TOKEN`.
* Both templates must configure Pages before building, pass the returned project
  `base_path`, upload the entire Facade output as one Pages artifact, and deploy
  in a separate dependent job with the required environment and permissions.
* Both templates must serialize the site deployment stream with workflow-level
  concurrency and cancel superseded refreshes.
* Until a public Action release exists, templates reference the documented,
  repository-accessible immutable implementation commit `992e3eb68562941eee73c75da32b07b8e08b5851` rather
  than a fictional `facade/action@v1` tag.
* Add automated validation for action metadata, bundled entrypoints, templates,
  Action input/output behavior, freshness rebuild/failure behavior, and existing
  CLI/build behavior.

## Acceptance Criteria

* [x] `pnpm build` creates both the CLI bundle and a self-contained Action bundle
      at the path declared by `action.yml`.
* [x] A packaged-action smoke test runs without `node_modules` available.
* [x] Tests prove all declared Action inputs map to shared build options and both
      declared outputs are written.
* [x] Tests prove one input change causes exactly one rebuild and a second change
      fails before a Pages artifact can be uploaded.
* [x] Workflow validation proves both templates use `configure-pages`,
      `upload-pages-artifact`, and `deploy-pages` with explicit build/deploy
      ordering, whole-output upload, permissions, environment, and concurrency.
* [x] The standalone template covers release, manual, config, and conventional
      branding refresh triggers while checking out the default branch.
* [x] The CI-chain template clearly exposes the required upstream job dependency
      after all release assets are uploaded.
* [x] `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, and
      `pnpm coverage` pass.

## Definition of Done

* Tests cover unit, workflow-contract, and packaged-action smoke behavior.
* Lint, typecheck, test, build, and coverage are green.
* Relevant Action/workflow integration contracts are captured in Trellis specs.
* Generated Action artifacts are reproducible and checked for drift in CI/tests.
* Failure behavior preserves the previous live Pages deployment because upload
  and deploy only run after a successful Action step.

## Technical Approach

Create a small shared live-build orchestration boundary that loads and validates
YAML config, resolves Action/environment/config precedence, fetches a normalized
GitHub snapshot, builds via `buildRelease`, and returns the release tag. A
freshness wrapper fingerprints the exact config bytes plus normalized snapshot,
allows one retry, and throws on a second mutation. The Action adapter is thin:
`@actions/core` handles inputs, masking, annotations, outputs, and failure state.
`tsup` emits separate bundled CLI and Action entrypoints.

Workflow templates use GitHub's official Pages actions at the currently verified
major versions. The Action reference pins the first T05a implementation commit;
no public version is implied before T11.

## Decision (ADR-lite)

**Context:** A composite Action that shells into the CLI would either require a
consumer install or commit a second runtime mechanism, while a separate Action
implementation risks drifting from CLI behavior.

**Decision:** Ship a bundled Node 24 JavaScript Action as an adapter over shared
TypeScript build orchestration, using `@actions/core` and `yaml` as bundled runtime
dependencies. Keep Pages upload/deploy in workflow templates.

**Consequences:** The repository commits generated Action JavaScript and must
verify bundle drift. The Action stays reusable and consumers need no package
manager. Real deployment behavior remains an external acceptance item.

## Out of Scope

* Running or certifying a live GitHub Pages deployment (T05b).
* Publishing a Marketplace listing, npm package, release tag, or stable `@v1`
  Action reference (T11).
* `facade init`, complete onboarding/troubleshooting documentation (T12).
* Custom-domain automation or treating `CNAME` as Pages configuration.
* New Release event semantics beyond published/manual/config-and-brand refresh.
* Stronger guarantees against clients observing cached older content during an
  otherwise correctly serialized deployment.

## Technical Notes

* Product source: `docs/implementation_plan.md` T05a and
  `docs/facade_product_plan.md` sections 11–12.
* Existing shared boundaries:
  `packages/facade/src/build/offline-build.ts`,
  `packages/facade/src/source/github/build-github-release.ts`, and
  `packages/facade/src/source/github/source-options.ts`.
* Research: `research/github-action-pages-contracts.md`.
