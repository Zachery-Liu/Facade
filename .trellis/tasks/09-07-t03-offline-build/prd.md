# Implement T03 Offline Build Closure

## Goal

Turn a checked-in repository snapshot fixture into a deterministic static release bundle without network access: a no-JavaScript download page plus `manifest.json`, `install.md`, and `llms.txt` that all describe the same release assets.

## What I already know

- T02 already provides strict repository snapshot schemas, fixture snapshots, a minimal manifest schema, semantic validation, and SSR page components.
- The frozen roadmap defines T03 as a deliberately small classifier: macOS ARM64 DMG, Windows x64 EXE, Linux x64 archives, and checksum files only.
- T04 must later call this shared build entry point after it obtains live snapshots; it must not reimplement compilation or output replacement.

## Requirements

- Load and validate an offline `RepositorySnapshot` fixture without network access.
- Classify only the T03 asset-token set and compile a shared release representation.
- Write `index.html`, `manifest.json`, `install.md`, and `llms.txt`; every output must share the release tag, asset IDs, and download URLs.
- Render useful, semantic download links in HTML without JavaScript.
- Normalize root and project-subpath `basePath` values without changing GitHub download URLs.
- Replace an output directory only after all outputs have been generated successfully; ordinary failures roll back and a later build recovers an interrupted replacement.
- Provide CLI support for fixture input, output directory, and base path.
- Test all behavior offline, including root/subpath behavior and failed-build preservation.

## Acceptance Criteria

- [x] A fixture build emits all four files with consistent release and asset facts.
- [x] macOS ARM64 DMG, Windows x64 EXE, Linux x64 archives, and checksum assets receive the expected initial classification.
- [x] The generated HTML contains usable direct download anchors without JavaScript.
- [x] Root and project-subpath builds have correct internal output paths while retaining original download URLs.
- [x] A build error does not replace an existing output directory; replacement is crash-recoverable rather than falsely advertised as a cross-platform atomic directory swap.
- [x] `facade build --fixture ... --out-dir ... --base-path ...` works from the compiled CLI.
- [x] typecheck, lint, test, build, and coverage pass.

## Out of Scope

- Live GitHub API access (T04), full classification and selection policy (T06/T07), signatures/attestations (T08), and product-theme polish (T09).
- JavaScript interactivity, deployment, or Actions integration.

## Technical Approach

Keep the compiler pure up to a single output boundary. Parse the fixture with T02 schemas, derive a compact manifest using only the supported token classifications, render all four formats from that same compiled object, write a sibling staging directory, then rename it into place only after every write succeeds. The CLI is a narrow adapter over the shared build function.

## Decision (ADR-lite)

**Context:** T04 needs a stable build boundary, but external I/O must not leak into tests.

**Decision:** T03 accepts an already-normalized fixture snapshot and owns compilation/output only; T04 later supplies live snapshots to the same entry point.

**Consequences:** T03 remains fully offline and testable, while GitHub credentials and retry policy stay outside the build contract.

## Technical Notes

- Inputs: `fixtures/repositories/basic-release.source.json`, `packages/facade/src/source/repository-snapshot.ts`.
- Existing SSR component: `packages/facade/src/themes/product/components/release-page.tsx`.
- T03 plan: `docs/implementation_plan.md`.
