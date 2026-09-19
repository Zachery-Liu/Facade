# Agent Interface contract

## 1. Scope / Trigger

Use this contract whenever code changes the public manifest, Agent-facing static files, verification references, evidence, JSON Schema, or read-only consumer validation.

## 2. Signatures

```ts
validateReleasePageManifest(input: unknown): ManifestValidationResult
selectInstallation(manifest: unknown, environment: unknown, policy?: unknown): SelectionResult
renderInstall(manifest: ReleasePageManifest): string
renderLlms(manifest: ReleasePageManifest, basePath: string): string
```

`ReleasePageManifestJsonSchema` is the distributable draft-07 structural schema exported by `@facade/cli/selection`. It requires both `path` and `status` on every evidence entry and HTTP(S) repository/download URLs; the semantic validator checks that paths resolve and statuses agree with their sources.

## 3. Contracts

- `manifest.json`, `install.md`, and `llms.txt` are pure projections of one resolver-produced manifest; renderers never call GitHub or classify assets again.
- A public manifest carries exact release identity and channel, repository identity, selection fields, evidence with RFC 6901 JSON Pointers, digests, and `verificationMaterials`.
- `schemaVersion: 1` is parsed strictly and is never repaired with synthesized source, release, channel, or verification fields. Only the explicit legacy `schemaVersion: 0` compatibility path may normalize old input before internal use.
- Every selection or verification field has evidence with a final-field `path` and a `status`; this includes asset identity/classification, recommendation eligibility, verification materials, release/source identity, installation methods, and preference conditions.
- Evidence metadata uses compatible source/status pairs: `github-api` and `fixture` → `provided`; `project-config` → `explicit | unknown | conflict`; `filename-rule` and `derived` → `inferred | unknown | conflict`; `unknown` → `unknown | conflict`. Fixture builds use `fixture/provided` for fixture-supplied repository, release, asset, and digest facts instead of claiming GitHub API provenance.
- Top-level evidence paths are unique so one field cannot carry contradictory provenance records. Required v1 source/release evidence must be resolved (not `unknown` or `conflict`), and provider-owned repository/release evidence must match `source.provider` (`github` → `github-api`, `fixture` → `fixture`, `unknown` → `unknown`).
- When `source.provider` is `github`, `source.repositoryUrl` may use GitHub.com or a GitHub Enterprise host, but its two decoded path segments must match `source.repository`; encoded separators, additional prefixes, and different repositories fail semantic validation.
- `verificationMaterials` contains references only: signature asset IDs/schemes, expected GitHub Attestation repositories, and an optional author-declared full source commit SHA. There is no `verified` state.
- If a referenced signature declares `signatureFor`, that target must be the artifact carrying the reference; contradictory bindings fail closed.
- A source commit declaration requires an exact-tag download rule. Signature globs resolve after exclusions against the final included signature downloads and must match exactly one.
- Normal releases default to `stable`; prereleases default to `prerelease`. Explicit `beta` and `nightly` are author declarations. A prerelease cannot be declared `stable`.
- `llms.txt` is base-path-aware navigation. It does not duplicate download metadata or interpolate release notes as instructions, and every dynamic label, tag, and displayed repository URL is single-line Markdown-escaped.
- The example consumer performs local read, structure/semantic validation, and pure selection only. It must not gain network, download, child-process, command-execution, or installation capabilities.

## 4. Validation & Error Matrix

| Condition | Result |
| --- | --- |
| Unknown `schemaVersion` or malformed field | Structural validation failure; selector returns `needs-input` |
| Incomplete schema-version-1 identity/release fields | Structural validation failure; never synthesize provenance or a stable channel |
| Evidence pointer is absent, malformed, or unresolved | Semantic diagnostic |
| Required selection/verification evidence is absent or lacks status | Semantic diagnostic |
| Evidence source/status pair is incompatible | Semantic diagnostic; selection fails closed |
| Required v1 source/release evidence is `unknown` or `conflict` | Semantic diagnostic; public validation/build/selection fail closed |
| Provider-owned evidence source differs from `source.provider` | Semantic diagnostic |
| GitHub repository URL path does not identify `source.repository` | Semantic diagnostic |
| Top-level evidence repeats a JSON Pointer | Semantic diagnostic, even when the duplicate records agree |
| Method, preference asset, or signature reference is dangling | Semantic diagnostic |
| Referenced signature is explicitly bound to another artifact | Semantic diagnostic |
| Signature glob matches zero/multiple final signature assets | `CONFIG_INVALID`; build stops before publication |
| `sourceCommit` is not 40 hex or rule has no exact tag | Configuration validation failure |
| Exact-tag rule does not match selected release tag | Rule is skipped with the existing tag-mismatch diagnostic |
| GitHub prerelease plus explicit `stable` | `CONFIG_INVALID` / semantic diagnostic |
| Any Agent output or manifest validation fails | Staged build fails; prior published output remains |

## 5. Good / Base / Bad Cases

- Good: a tagged artifact references one included `.sig`, an expected repository, and a source SHA; output says every item is not verified. A fixture build labels its supplied facts `fixture/provided`.
- Base: an artifact has empty verification arrays and no digest; the guide says unknown/not provided and selection remains based on declared compatibility facts.
- Bad: repair an incomplete v1 manifest with invented provenance, label fixture data as GitHub API data, publish unresolved or duplicate top-level provenance, accept a mismatched repository URL, interpolate Markdown from a release tag or repository URL, bind an excluded or differently targeted signature, parse release notes into commands, or continue on an unknown protocol version.

## 6. Tests Required

- Assert JSON Schema accepts the valid checked-in example and rejects the unknown-version example.
- Execute the exported JSON Schema itself against valid, unknown-version, and incomplete-v1 checked-in examples; testing only the source Zod schema does not prove the exported artifact.
- Remove `path` and `status` from both top-level and asset evidence in otherwise valid v1 examples and assert the exported JSON Schema rejects each case.
- Replace repository and download URLs with `ftp://` values and assert the exported JSON Schema and runtime validator both reject them.
- Assert shared semantic validation rejects dangling references, invalid evidence pointers, and channel conflicts.
- Assert required evidence coverage/path/status, source/status compatibility, resolved and provider-matched top-level evidence, fixture provenance, GitHub repository URL identity (including encoded-separator rejection), unique top-level evidence paths, contradictory `signatureFor` bindings, escaped preference IDs/release tags/repository URLs, and Universal supported-architecture rendering.
- Cover stable/prerelease defaults plus explicit beta/nightly behavior.
- Cover unique, missing, ambiguous, and excluded signature matches; full-SHA and exact-tag constraints.
- Assert GitHub SHA-256 mapping survives resolver output but never creates a verified claim.
- Build under a project base path and assert `llms.txt` links to that path.
- Feed heading/link/fence-like free text and assert it cannot alter structured conditions or Agent instructions.
- Keep selector/browser/consumer parity and run the complete offline quality gate.

## 7. Wrong vs Correct

### Wrong

Render from raw GitHub responses, repair incomplete v1 input with compatibility defaults, accept contradictory provenance, interpolate unescaped IDs/tags, infer commands from release notes, or expose `verified: true` when a signature, digest, Attestation reference, or source SHA merely exists.

### Correct

Compile configuration and source data once into the validated manifest, keep legacy normalization version-gated, validate structure plus evidence/reference semantics (including provider provenance, resolved top-level facts, repository identity, source/status, and path uniqueness), escape every rendered identifier/tag/URL, and leave download, cryptographic verification, execution authorization, and installation to the consumer.
