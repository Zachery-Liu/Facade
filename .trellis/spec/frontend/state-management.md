# Frontend State Management

## Observed pattern

Manifest data is immutable validated input (`src/manifest/release-page-manifest.ts`). Selection is derived by `src/core/selection-state.ts`; optional UI choice is local hook state in `use-selection-input.ts`; copy feedback is local state in `use-copy-feedback.ts`.

There is no global store. Preserve `selected`, `needs-input`, and `no-match` rather than defaulting an unknown environment to a preferred asset. Do not cache a mutable second copy of the manifest in client state.
