# Backend Error Handling

## Observed pattern

Use a stable error code and preserve the causal error. `src/runtime/facade-error.ts` defines `FacadeError`; `test/runtime-diagnostics.test.ts` verifies both `code` and `cause`. Boundary code should translate low-level errors into this form with an actionable message.

Selection uncertainty is a returned union, not an exception: `src/core/selection-state.ts` yields `selected`, `needs-input`, or `no-match`, with all states exercised in `test/release-page.test.tsx`.

Do not use catch-all defaulting for missing source data, and do not put tokens, authorization headers, or absolute paths in an error message.
