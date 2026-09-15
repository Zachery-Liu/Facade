# Fix main review findings

## Goal
Fix the four findings reviewed against origin/main e6d5dcf, as requested by the user.

## Requirements
- Isolate skipped non-default-branch config pushes from the Pages deployment concurrency group; keep eligible refreshes serialized in the shared group.
- Pin both example Actions to an accessible immutable commit supporting minimal YAML and ambient repository inference.
- Stage live builds, verify their inputs, and publish only stable output. Verification errors and repeated changes must preserve previous output and remove staging directories.
- Update English/Chinese READMEs and the developer documentation index to describe implemented online CLI and Action/Pages support.

## Acceptance Criteria
- [x] Regression tests cover preserved output on verification errors/repeated mutations, successful retry, staging cleanup, and workflow concurrency separation.
- [x] Existing output ownership/locking behavior remains intact.
- [x] Both templates use a verified immutable Action reference supporting schema-only YAML.
- [x] Typecheck, lint, test, build, and coverage pass; the Action bundle is regenerated.

## Validation
- Node 22.16.0, pnpm 11.19.0; offline frozen-lockfile install.
- Typecheck, lint, test, build, coverage and git diff --check passed. 80 tests;
  statements/lines 88.19%, branches 90.03%, functions 89.33%.
- Executed the actual e6d5dcfb5ae901841a7798e03abd7d63c6103fd8 Action bundle in
  isolation with schema-only YAML, GITHUB_REPOSITORY, and a preloaded fake GitHub
  transport: exit 0, release v1, complete generated output. No real deployment.
- Workflow tests assert the exact conditional concurrency expression, eligible
  shared site group, branch triggers and job condition. Remote scheduler behavior
  was reviewed against GitHub documentation, not exercised in a live workflow.

## Technical Approach
Split static rendering into prepare/publish/dispose lifecycle shared by offline and live builds. Compare fresh inputs after rendering but before publication. Give skipped pushes a run-specific concurrency suffix. Update the Action pin to the reviewed main configuration fix, independently of the runtime fix in this branch.

## Scope and Decisions
The user approved all four review findings. No additional product features or live deployment are required. Preserve unknown working-tree changes by using a new worktree and codex/fix-main-review branch based on origin/main.

## Research
GitHub workflow-level concurrency applies independently of job-level conditions: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax . A shared group can cancel running and pending refreshes, so isolating skipped runs is required; only changing cancel-in-progress is insufficient for pending runs.

## Definition of Done
Behavioral regressions verified, docs/spec contracts synchronized, generated bundle consistent, changes reviewed and committed locally per Trellis workflow.
