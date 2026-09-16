# T07 delivery

Implementation, review repairs, and integration with the latest main are ready for PR acceptance. The task remains `in_progress` until the PR is accepted or merged.

- Branch: feat/t07-selection; merged origin/main through d4927a5.
- Validation: typecheck, lint, both CLI/selection and Action builds, 156 tests, coverage and branch diff checks passed.
- Coverage: statements 94.77%, branches 88.60%, functions 95.53%, lines 96.91%.
- Browser hook SSR and packaged consumer return identical selection results.
- Review fixes: repository YAML now compiles install methods, preferences, Universal architecture sets, and minimum runtime versions into the real Manifest producer path; `assetMatch` resolves to stable eligible asset IDs with zero-match warnings.
- Universal architecture membership now stays unknown when the environment architecture is missing or unknown; only a known declared member matches.
- Earlier review fixes remain covered: rank-aware unknown blocking, concrete preference architectures, and Linux-only libc preference conditions.
- T06 manifest/classification integration and the T07 authoring-to-selection path are covered end to end; T09 browser hydration remains a separate workstream.

## Proposed work commit

feat: add shared installation selector

- .trellis/spec/backend/database-guidelines.md
- .trellis/spec/backend/directory-structure.md
- .trellis/spec/backend/error-handling.md
- .trellis/spec/backend/index.md
- .trellis/spec/backend/selection.md
- .trellis/spec/frontend/hook-guidelines.md
- .trellis/spec/frontend/state-management.md
- docs/selection.md
- examples/select-installation.mjs
- packages/facade/package.json
- packages/facade/src/core/conditions.ts
- packages/facade/src/core/select-installation.ts
- packages/facade/src/core/selection-contract.ts
- packages/facade/src/core/selection-state.ts
- packages/facade/src/manifest/release-page-manifest.ts
- packages/facade/src/manifest/semantic-validation.ts
- packages/facade/src/selection.ts
- packages/facade/src/themes/product/hooks/use-selection-input.ts
- packages/facade/test/manifest-validation.test.ts
- packages/facade/test/release-page.test.tsx
- packages/facade/test/selection.test.tsx
- packages/facade/tsup.config.ts

Task metadata is retained for subsequent archive bookkeeping. No unrecognized files exist in this worktree; original main worktree changes are excluded.
