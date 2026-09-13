# T07 delivery

Implementation and local validation complete; commit confirmation pending.

- Branch: feat/t07-selection; base: main (4a73d90).
- Validation: typecheck, lint, build, 77 tests, coverage and git diff --check passed.
- Coverage: statements/lines 92.61%, branches 91.95%, functions 91.42%.
- Browser hook SSR and packaged consumer return identical selection results.
- T06 integration and T09 browser hydration remain separate workstreams.

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
