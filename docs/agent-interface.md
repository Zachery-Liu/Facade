# Agent Interface

Facade builds three read-only release resources from one validated manifest:

- `manifest.json` is the structured protocol.
- `install.md` explains downloads, declared conditions, author preferences, digests, and verification references.
- `llms.txt` navigates to the manifest and installation guide under the configured deployment base path, and links the rendered release notes when present.

None of these files authorizes execution. Facade does not download artifacts, compare digests, verify signatures or GitHub Attestations, execute package-manager commands, or install software.

## Protocol validation

Consumers must check both layers before making a selection:

1. `ReleasePageManifestJsonSchema` checks the schema-version-1 structure, required fields (including evidence `path` and `status`), URL formats, enums, and JSON Pointer syntax.
2. `validateReleasePageManifest` additionally checks semantic references, including unique IDs, installation preference targets, evidence paths, signature-asset purposes, channel consistency, and verification-material references.

Both are exported by `@facade/cli/selection`. Schema-version-1 input is strict: missing source, release, evidence, or verification fields are never repaired with compatibility defaults. Unsupported versions, incomplete v1 input, and semantic errors fail closed.

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

Evidence entries point to final manifest values with unique RFC 6901 JSON Pointers. Every selection and verification field requires evidence with a final-field path and a status compatible with its source: GitHub API and fixture values are `provided`, repository declarations are `explicit`, filename/derived values are `inferred`, and unresolved sources are `unknown`; applicable sources may also report `unknown` or `conflict`. Fixture builds identify fixture-supplied facts as `fixture/provided` rather than GitHub data. Required v1 repository and release evidence must be resolved, and its source must agree with `source.provider`.

For GitHub manifests, the repository URL may point to GitHub.com or GitHub Enterprise, but its two path segments must identify the same `owner/repository` declared by `source.repository`. Different repositories, extra path prefixes, and encoded path separators fail semantic validation.

`verificationMaterials` may name a signature asset and scheme, an expected GitHub Attestation repository, and an author-declared full source commit SHA. These are references only. Their presence never produces `verified: true`, a trust badge, or permission to continue after verification failure. GitHub-provided SHA-256 digests are preserved separately and are likewise not treated as locally verified.

## Channels

A normal GitHub release defaults to `stable`; a GitHub prerelease defaults to `prerelease`. Authors may explicitly declare `beta` or `nightly`. Declaring a prerelease source as `stable` is a semantic error. Channels describe the selected release and do not implement multi-channel discovery.

## Examples

- [`valid-agent-manifest.json`](../examples/manifests/valid-agent-manifest.json) is structurally and semantically valid.
- [`invalid-unknown-version.json`](../examples/manifests/invalid-unknown-version.json) demonstrates an unsupported protocol version.
- [`invalid-incomplete-v1.json`](../examples/manifests/invalid-incomplete-v1.json) demonstrates that v1 provenance fields are mandatory and are not synthesized.
- [`invalid-dangling-signature.json`](../examples/manifests/invalid-dangling-signature.json) is structurally valid but fails semantic reference validation.

Release notes and other author free text are not parsed into commands or compatibility conditions and are not inserted into Agent instructions. Dynamic identifiers, release tags, and displayed repository URLs are single-line Markdown-escaped in Agent text files. Only structured fields influence selection.

The optional `product`, `theme`, `links`, and `release.notes` fields supply the Product Theme. Local PNG, JPEG, and WebP brand images are published under the site base path and referenced from the same manifest as the HTML page. `release.notes` is author text; the HTML renderer supports headings, lists, code, emphasis, and safe HTTP(S) or repository-relative links. It escapes raw HTML and leaves unsupported links as text. Consumers should treat notes and external links as untrusted content.
