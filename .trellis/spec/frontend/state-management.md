# Frontend State Management

## Observed pattern

Manifest data is validated at build time and serialized into the HTML. Selection is derived by `src/core/select-installation.ts`; `browser-runtime.ts` reads form controls and renders status without mutating the manifest. Hooks support separate Preact consumers, with manual environment choice in `use-selection-input.ts` and copy feedback in `use-copy-feedback.ts`.

There is no global store. Preserve `selected`, `needs-input`, and `no-match` rather than defaulting an unknown environment to a preferred asset. Do not cache a mutable second copy of the manifest in client state.
