# Fix main baseline contracts

## Goal

Repair the verified T00–T02 baseline defects at `99370fb` before subsequent
release-source work builds on those contracts.

## Requirements

* Retain one `engines.node` declaration with the pre-existing minimum of
  `>=22.13.0`.
* Cover that minimum and current Node 22 in CI.
* Resolve the build-toolchain's vulnerable `esbuild` transitively, preferring
  an upstream `tsup` update and using a narrowly scoped pnpm override only if
  the current upstream release cannot resolve it.
* Restore a runnable ESLint toolchain after validating that the locked ESLint
  10.9.1 package omits a module it requires at startup.
* Trigger CI and CodeQL on `fix/**` pushes, matching the repository's repair
  branch naming convention.
* Keep structural manifest validation separate from semantic diagnostics: the
  shared semantic validator owns duplicate asset IDs.
* Make release selection a strict discriminated union so `github-latest`
  cannot accept a `tag` and `tag` requires one.
* Synchronize the versioned main ruleset with the live extra-approval setting.

## Acceptance Criteria

* [ ] `packages/facade/package.json` has exactly one Node engine declaration.
* [ ] CI runs package checks on 22.13.0 and current 22.
* [ ] The lockfile resolves the `tsup` build path without esbuild 0.27.7.
* [ ] Duplicate asset IDs parse structurally and are reported once as semantic
  diagnostics.
* [ ] Strict release strategy tests reject inconsistent configurations.
* [ ] The versioned ruleset includes the live extra-approval parameter.
* [ ] Lint, typecheck, tests, build, and coverage pass.

## Technical Approach

Use `22.13.0` because it was the declaration predating the accidental
duplicate. Use a CI matrix to run each existing quality job at the declared
minimum and the current 22 line. Preserve public Zod parsing as structural
validation, moving no semantic behavior out of `validateManifestSemantics`.

## Out of Scope

* T03/T04 feature code and any migration of the stale local `main` ref.
* Changing the live GitHub ruleset directly.

## Technical Notes

* Branch base: `99370fb` (`origin/main`); the local `main` ref is stale.
* Impacted paths: package manifest/lockfile, CI workflow, ruleset template,
  manifest/config contracts, and contract tests.
