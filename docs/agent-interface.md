# Agent Interface

Facade builds three read-only release resources from one validated manifest:

- `manifest.json` is the structured protocol.
- `install.md` explains downloads, declared conditions, author preferences, digests, and verification references.
- `llms.txt` only navigates to the manifest and installation guide under the configured deployment base path.

None of these files authorizes execution. Facade does not download artifacts, compare digests, verify signatures or GitHub Attestations, execute package-manager commands, or install software.

## Protocol validation

Consumers must check both layers before making a selection:

1. `ReleasePageManifestJsonSchema` checks the schema-version-1 structure, required fields, URL formats, enums, and JSON Pointer syntax.
2. `validateReleasePageManifest` additionally checks semantic references, including unique IDs, installation preference targets, evidence paths, signature-asset purposes, channel consistency, and verification-material references.

Both are exported by `@facade/cli/selection`. Unsupported schema versions and semantic errors fail closed.

```js
import {
  selectInstallation,
  validateReleasePageManifest,
} from '@facade/cli/selection'

const validation = validateReleasePageManifest(input)
if (!validation.success) {
  console.error(validation.diagnostics)
  process.exitCode = 2
} else {
  const result = selectInstallation(validation.manifest, environment)
  console.log(JSON.stringify(result, null, 2))
}
```

[`examples/select-installation.mjs`](../examples/select-installation.mjs) is the complete read-only consumer. It reads caller-supplied local JSON, validates it, and selects. It has no network, download, child-process, verification, command-execution, or installation behavior.

## Evidence and trust boundary

Evidence entries point to final manifest values with RFC 6901 JSON Pointers. `source` distinguishes GitHub API data, repository configuration, filename inference, derived values, and unresolved values. Inferred filename facts are not author declarations.

`verificationMaterials` may name a signature asset and scheme, an expected GitHub Attestation repository, and an author-declared full source commit SHA. These are references only. Their presence never produces `verified: true`, a trust badge, or permission to continue after verification failure. GitHub-provided SHA-256 digests are preserved separately and are likewise not treated as locally verified.

## Channels

A normal GitHub release defaults to `stable`; a GitHub prerelease defaults to `prerelease`. Authors may explicitly declare `beta` or `nightly`. Declaring a prerelease source as `stable` is a semantic error. Channels describe the selected release and do not implement multi-channel discovery.

## Examples

- [`valid-agent-manifest.json`](../examples/manifests/valid-agent-manifest.json) is structurally and semantically valid.
- [`invalid-unknown-version.json`](../examples/manifests/invalid-unknown-version.json) demonstrates an unsupported protocol version.
- [`invalid-dangling-signature.json`](../examples/manifests/invalid-dangling-signature.json) is structurally valid but fails semantic reference validation.

Release notes and other author free text are not parsed into commands or compatibility conditions and are not inserted into Agent instructions. Only structured fields influence selection.
