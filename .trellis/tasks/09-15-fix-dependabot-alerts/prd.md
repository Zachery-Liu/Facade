# Fix Dependabot security alerts

## Goal

Close the three open Dependabot alerts on the default branch by upgrading the vulnerable Vitest dependency family to the first stable patched release without weakening tests, coverage, or supply-chain controls.

## Requirements

- Upgrade direct `vitest` and `@vitest/coverage-v8` development dependencies together to `4.1.11`.
- Regenerate `pnpm-lock.yaml` so neither `vitest` nor `@vitest/mocker` resolves below `4.1.11`.
- Preserve the existing scoped esbuild security overrides and frozen-lockfile workflow.
- Keep the change on the dedicated `fix/dependabot-alerts` branch based on current `origin/main`.
- Do not dismiss alerts or add an override that merely hides the vulnerable Vitest resolution.

## Acceptance Criteria

- [x] `package.json` declares aligned Vitest packages at `4.1.11`.
- [x] The lockfile contains no vulnerable Vitest 3.x resolution.
- [x] A frozen offline install succeeds after lockfile generation.
- [x] Typecheck, lint, test, build, and coverage pass.
- [x] `pnpm audit` reports no known vulnerability for the resolved dependency graph.
- [ ] GitHub recognizes alerts 2, 3, and 4 as fixed after the branch is merged.

## Definition of Done

- Dependency and lockfile changes are minimal and reviewable.
- Existing Action bundle and runtime behavior remain unchanged unless the build reproducibly requires regeneration.
- Security advisory and verification evidence are recorded under `research/`.

## Technical Approach

Use the vendor-published first patched stable version for both Vitest packages, regenerate with pnpm 11, inspect all Vitest-family resolutions, then run the repository's complete quality gate and audit.

## Decision (ADR-lite)

**Context:** Three alerts describe one path-traversal advisory through a direct test dependency and its transitive mocker package.
**Decision:** Upgrade the owning direct dependency family instead of pinning only the transitive package.
**Consequences:** This crosses Vitest major versions and therefore requires the complete test/coverage gate, but keeps peer packages aligned and removes the vulnerable code at its source.

## Out of Scope

- Dismissing alerts based on development-only exposure.
- Unrelated dependency upgrades or application feature changes.
- Fixing future alerts not currently open on the default branch.

## Technical Notes

- Advisory: GHSA-82fw-gwwq-j7x9 / CVE-2026-84373.
- Alerts: direct `vitest` plus lockfile resolutions for `vitest` and `@vitest/mocker`.
- Research: `research/vitest-path-traversal.md`.
