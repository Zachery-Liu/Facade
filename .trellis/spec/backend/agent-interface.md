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

`ReleasePageManifestJsonSchema` is the distributable draft-07 structural schema exported by `@facade/cli/selection`.

## 3. Contracts

- `manifest.json`, `install.md`, and `llms.txt` are pure projections of one resolver-produced manifest; renderers never call GitHub or classify assets again.
- A public manifest carries exact release identity and channel, repository identity, selection fields, evidence with RFC 6901 JSON Pointers, digests, and `verificationMaterials`.
- `verificationMaterials` contains references only: signature asset IDs/schemes, expected GitHub Attestation repositories, and an optional author-declared full source commit SHA. There is no `verified` state.
- A source commit declaration requires an exact-tag download rule. Signature globs resolve after exclusions against the final included signature downloads and must match exactly one.
- Normal releases default to `stable`; prereleases default to `prerelease`. Explicit `beta` and `nightly` are author declarations. A prerelease cannot be declared `stable`.
- `llms.txt` is base-path-aware navigation. It does not duplicate download metadata or interpolate release notes as instructions.
- The example consumer performs local read, structure/semantic validation, and pure selection only. It must not gain network, download, child-process, command-execution, or installation capabilities.

## 4. Validation & Error Matrix

| Condition | Result |
| --- | --- |
| Unknown `schemaVersion` or malformed field | Structural validation failure; selector returns `needs-input` |
| Evidence pointer is absent, malformed, or unresolved | Semantic diagnostic |
| Method, preference asset, or signature reference is dangling | Semantic diagnostic |
| Signature glob matches zero/multiple final signature assets | `CONFIG_INVALID`; build stops before publication |
| `sourceCommit` is not 40 hex or rule has no exact tag | Configuration validation failure |
| Exact-tag rule does not match selected release tag | Rule is skipped with the existing tag-mismatch diagnostic |
| GitHub prerelease plus explicit `stable` | `CONFIG_INVALID` / semantic diagnostic |
| Any Agent output or manifest validation fails | Staged build fails; prior published output remains |

## 5. Good / Base / Bad Cases

- Good: a tagged artifact references one included `.sig`, an expected repository, and a source SHA; output says every item is not verified.
- Base: an artifact has empty verification arrays and no digest; the guide says unknown/not provided and selection remains based on declared compatibility facts.
- Bad: treat a digest or Attestation reference as proof, bind an excluded signature, parse release notes into commands, or continue on an unknown protocol version.

## 6. Tests Required

- Assert JSON Schema accepts the valid checked-in example and rejects the unknown-version example.
- Assert shared semantic validation rejects dangling references, invalid evidence pointers, and channel conflicts.
- Cover stable/prerelease defaults plus explicit beta/nightly behavior.
- Cover unique, missing, ambiguous, and excluded signature matches; full-SHA and exact-tag constraints.
- Assert GitHub SHA-256 mapping survives resolver output but never creates a verified claim.
- Build under a project base path and assert `llms.txt` links to that path.
- Feed heading/link/fence-like free text and assert it cannot alter structured conditions or Agent instructions.
- Keep selector/browser/consumer parity and run the complete offline quality gate.

## 7. Wrong vs Correct

### Wrong

Render from raw GitHub responses, infer commands from release notes, or expose `verified: true` when a signature, digest, Attestation reference, or source SHA merely exists.

### Correct

Compile configuration and source data once into the validated manifest, validate both structure and semantics, render deterministic read-only files, and leave download, cryptographic verification, execution authorization, and installation to the consumer.
