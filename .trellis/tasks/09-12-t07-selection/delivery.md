# T07 delivery

Implementation and review repairs are complete; commit confirmation pending.

- Branch: feat/t07-selection; merged current origin/main (302418b).
- Validation: typecheck, lint, both CLI/selection and Action builds, 111 tests, coverage and branch diff checks passed.
- Coverage: statements/lines 91.68%, branches 91.18%, functions 90.8%.
- Browser hook SSR and packaged consumer return identical selection results.
- Review fixes: unknown-architecture macOS Universal selection, rank-aware unknown blocking, concrete preference architectures, and Linux-only libc preference conditions.
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
