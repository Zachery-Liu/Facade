# T08 complete Agent Interface

Implement `docs/implementation_plan.md` T08 on top of `feat/t07-selection`.

## Goal

Publish a complete, deterministic, read-only Agent Interface from the same validated release model used by the selector and page. The interface must expose provenance and verification materials without implying that Facade verified a download or authorized execution.

## Requirements

- Extend the public schema-version-1 manifest with release channel, repository/release identity, field-level evidence expressed as stable JSON Pointers, and per-download verification materials.
- Treat `verificationMaterials` as references only. It may contain a uniquely resolved signature asset, GitHub Attestation expected repository, and a full source commit SHA; it must never contain or imply `verified: true` or a trust badge.
- Extend repository YAML authoring so `release.channel` and download-rule verification declarations compile through the real resolver. A verification declaration carrying `sourceCommit` must be on an exact matching tag rule. Signature `assetMatch` must uniquely identify an included signature download.
- Keep the existing T07 selector pure and read-only. It must accept the completed manifest, reject unsupported schema versions or semantic violations, and never fetch, download, execute commands, install software, or treat free text as conditions.
- Generate `manifest.json`, `install.md`, and `llms.txt` from one validated manifest. `install.md` must include tag/channel, repository link, download IDs/URLs, declared conditions, preferences, digests when present, verification references, and explicit not-verified/version-binding warnings. Unknown metadata must be described as unknown or undeclared.
- `llms.txt` is navigation only and links to the actual base-path-aware `manifest.json` and `install.md`; no raw release notes or other author free text may become instructions.
- Ship a JSON Schema aligned with runtime structural validation, checked-in valid and invalid manifest examples, and documentation of the two-layer structural/semantic validation contract.
- Provide a consumer example that validates the protocol and semantics, selects only, prints a result, and cannot download or install.
- Keep generated outputs deterministic and fail the whole staged build if any Agent output or contract check fails.

## Acceptance Criteria

- [ ] Runtime schema and generated JSON Schema accept the valid example and reject structural invalid examples.
- [ ] Shared semantic validation rejects duplicate IDs, dangling method/asset/signature references, invalid evidence pointers, incompatible channel declarations, and invalid cross-field verification declarations.
- [ ] A prerelease defaults to `prerelease`; a normal release defaults to `stable`; explicit `beta`/`nightly` is preserved; explicit `stable` conflicts with a prerelease source.
- [ ] Signature references resolve uniquely against included signature downloads; zero or multiple matches fail closed.
- [ ] `sourceCommit` is a full SHA and cannot apply through a non-exact or mismatched tag rule.
- [ ] No public output includes a positive verified claim merely because a digest, signature, attestation, or source commit is present.
- [ ] Free-text release metadata containing headings, links, or code fences cannot alter structured conditions or inject Agent instructions.
- [ ] Unknown `schemaVersion` and semantic-invalid manifests make the consumer/selector return a safe non-selection.
- [ ] Base-path builds link Agent entry points under the configured project path.
- [ ] Typecheck, lint, tests, build, and coverage pass offline.

## Technical Approach

- Keep the T07 manifest's existing selection-facing names during this task and add the Agent contract fields around them; this avoids duplicating or destabilizing the proven selector while the v1 protocol is still pre-freeze.
- Move Agent text rendering into `src/agent-interface/` and keep it a pure projection of the validated manifest.
- Generate JSON Schema from the same Zod schema rather than maintaining an independent hand-written contract.
- Keep cross-reference and JSON Pointer checks in `validateManifestSemantics`, not duplicated in structural validation.
- Expose a small validation API for consumers and make the example call it before `selectInstallation`.

## Decision (ADR-lite)

**Context:** T07 already delivers a tested selector over a flat v1 selection model, while T09 will complete the Product Theme. Replacing every selection-facing field with the older nested product-plan sketch would mix T08 with T09 and create two simultaneous migrations.

**Decision:** Evolve the existing v1 manifest additively with explicit Agent metadata, evidence pointers, and verification materials. The generated artifacts and examples become the executable contract; protocol freeze remains T12.

**Consequences:** T08 remains focused on public Agent safety and validation, and T09 can consume the enriched model without a second selection implementation. Any final naming cleanup remains possible before T12 freezes schema version 1.

## Out of Scope

- Downloading files, checking digests, verifying signatures/Attestations, executing commands, installing packages, or requesting execution authorization.
- T09 visual redesign/browser environment detection and T10 init UX.
- Historical release/channel indexes or automatic beta/nightly discovery.
- Freezing schema version 1 for public compatibility; that remains T12.

## Technical Notes

- Normative scope: `docs/implementation_plan.md` sections 2.4, 2.5, T08, and the test matrix.
- Detailed safety/format guidance: `docs/facade_product_plan.md` sections 9.1–9.4 and 14.3.
- Base branch: current `main` at `4964c6e` (includes the merged T06 classifier and T07 selector/authoring path).
- Existing unrelated root-worktree changes (`package.json`, `.playwright-cli/`, `.worktrees/`) are excluded.
- Research: [`research/agent-interface-contract.md`](research/agent-interface-contract.md).
