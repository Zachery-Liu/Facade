# Database Guidelines

## Current convention: no persistence

There is no database, ORM, migration system, account model, or persistent server state. This is both a product boundary and the current implementation state.

Release-shaped data is runtime-validated in `src/manifest/release-page-manifest.ts`, passed as in-memory values to `src/core/selection-state.ts`, and exercised in `test/release-page.test.tsx`. None of these modules persists data.

Do not introduce a cache database for releases, build state, or analytics. If persistence becomes in-scope, create a dedicated task that defines ownership, migration, retention, and test conventions before adding a dependency.
