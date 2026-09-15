# GitHub review contract verification (2026-09-08)

## Sources

* Workflow syntax:
  https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
* Contexts reference:
  https://docs.github.com/en/actions/reference/workflows-and-actions/contexts
* Release and release asset REST endpoints:
  https://docs.github.com/en/rest/releases
* Release asset upload endpoint:
  https://docs.github.com/en/rest/releases/assets

## Findings

* Push `branches` values are static branch-name glob patterns. They cannot express
  "the repository default branch" dynamically. Job-level `if` expressions can
  compare event/context values before a runner is allocated.
* `github.ref_name` identifies the triggering branch/tag. The repository webhook
  payload exposes `github.event.repository.default_branch`, so a push job can be
  gated against the actual default branch without hard-coding `main`.
* GitHub exposes an independent endpoint for uploading an asset to an existing
  Release. A stable before/after snapshot only establishes that no observed input
  changed during that interval; it cannot establish that no future upload occurs.
* A commit SHA is GitHub's strongest stable Action reference. The existing T05a
  templates correctly pin the unpublished Action implementation commit.
