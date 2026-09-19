# Fix T08 review findings

## Goal

Close the remaining T08 Agent Interface validation and provenance gaps so generated manifests cannot misstate fixture data, publish unresolved identity metadata, or render contradictory/injected repository links.

## Requirements

* Represent fixture-provided repository, release, and asset facts with an explicit `fixture/provided` evidence pair.
* Reject public manifests when required top-level evidence has `unknown` or `conflict` status.
* When `source.provider` is `github`, require `source.repositoryUrl` to identify the same owner/repository path as `source.repository`.
* Escape repository URLs in `llms.txt` as Markdown text.
* Keep GitHub Enterprise-compatible repository hosts; bind identity by URL path rather than requiring `github.com`.
* Preserve the existing strict v1 validation and legacy-v0 normalization behavior.

## Acceptance Criteria

* [x] Offline fixture builds emit `fixture/provided` for fixture-supplied source, release, asset, and digest facts.
* [x] `fixture/provided` is accepted, while invalid fixture status combinations are rejected.
* [x] Required top-level evidence marked `unknown` or `conflict` is rejected.
* [x] A GitHub repository URL whose owner/repository path differs from `source.repository` is rejected.
* [x] GitHub Enterprise-style hosts remain valid when the URL path matches the repository identity.
* [x] Markdown syntax inside a repository URL cannot create an injected link in `llms.txt`.
* [x] Tests, lint, type-check, build, and diff checks pass.
* [x] The exported v1 JSON Schema rejects evidence entries missing `path` or `status`.

## Definition of Done

* Regression tests cover every discovered counterexample.
* Public schema, semantic validation, generator output, documentation, and Trellis spec remain consistent.
* Generated GitHub Action bundle is rebuilt.

## Technical Approach

Extend the evidence source enum with `fixture`, make release resolution choose provenance from the declared provider, add fail-closed semantic checks for required manifest evidence and GitHub repository identity, and render repository URLs through the existing Markdown text escaper.

## Decision (ADR-lite)

**Context:** `provider: fixture` currently coexists with false `github-api/provided` evidence, while repository validation must not unnecessarily exclude GitHub Enterprise.

**Decision:** Add first-class `fixture/provided` evidence and validate GitHub identity using the normalized URL pathname rather than a fixed hostname.

**Consequences:** Consumers gain accurate provenance; the v1 evidence-source enum gains one value; GitHub Enterprise URLs remain supported, while mismatched repository paths fail validation.

## Out of Scope

* Network verification that a repository URL is reachable.
* A general trust or signature model for fixture files.
* Changes to release selection semantics unrelated to evidence integrity.

## Technical Notes

* Relevant files: `packages/facade/src/manifest/release-page-manifest.ts`, `semantic-validation.ts`, `compiler/release-resolver.ts`, `agent-interface/render-agent-files.ts`.
* This is follow-up work on the existing `feat/t08-agent-interface` branch, not an independent feature branch.
