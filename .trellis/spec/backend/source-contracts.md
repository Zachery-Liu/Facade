# Source Contracts

## Scenario: Release source boundary

### 1. Scope / Trigger

Use `src/source/repository-snapshot.ts` when a fixture loader or future source
adapter crosses into Facade's raw repository/release/asset boundary. Keep the
GitHub-specific mapping in its adapter; this module owns only neutral fields.

### 2. Signatures

```ts
interface ReleaseSource {
  getRepository(): Promise<RepositoryMetadata>;
  getLatestRelease(): Promise<RawRelease>;
  getReleaseByTag(tag: string): Promise<RawRelease>;
  getReleaseAssets(releaseId: string): Promise<RawAsset[]>;
}
```

### 3. Contracts

- `RepositorySnapshotSchema` strictly accepts `repository`, `release`, and `assets`.
- `repository.fullName` is `owner/repository`; URLs must be HTTP(S).
- A release has opaque `id`, exact `tagName`, display `name`, `draft`, and `prerelease`.
- An asset has opaque `id`, `name`, HTTP(S) `downloadUrl`, and non-negative integer `size`.

### 4. Validation & Error Matrix

| Condition | Result |
| --- | --- |
| Unknown object key | Zod parse failure |
| Invalid repository name or URL | Zod parse failure |
| Empty ID/name or negative/fractional size | Zod parse failure |

### 5. Good / Base / Bad Cases

- Good: a checked-in source fixture includes `cli/cli`, `v2.100.0`, and assets.
- Base: an empty asset list remains structurally valid for a release with no uploads.
- Bad: accepting a provider-specific extra field or `ftp:` download URL.

### 6. Tests Required

- Parse a checked-in source fixture without network access.
- Assert the repository name, tag, and asset count.
- Add rejection coverage whenever a schema constraint changes.

### 7. Wrong vs Correct

#### Wrong

Pass unvalidated GitHub API JSON directly into classification.

#### Correct

Parse the adapter or fixture output through `RepositorySnapshotSchema` before
classification, then retain only the neutral contract fields.

## Scenario: Manifest validation ownership

### 1. Scope / Trigger

Use this boundary whenever a manifest enters rendering or an external consumer
parses the release-page contract.

### 2. Signatures

```ts
ReleasePageManifestSchema.parse(input): ReleasePageManifest
validateManifestSemantics(manifest): ValidationDiagnostic[]
```

### 3. Contracts

The Zod schema owns object shape, required fields, enums, and HTTP(S) URL
format. `validateManifestSemantics` owns cross-asset rules: unique IDs and
URLs, signature references, and evidence references. `FacadeConfigSchema`
uses strict discriminated release strategies: `github-latest` has no tag;
`tag` requires a non-empty tag.

### 4. Validation & Error Matrix

| Condition | Result |
| --- | --- |
| Missing or malformed structural field | Zod parse failure |
| Duplicate asset ID | semantic diagnostic |
| `github-latest` with a tag | Zod parse failure |
| `tag` without a tag value | Zod parse failure |

### 5. Good / Base / Bad Cases

* Good: a distinct-asset manifest has no diagnostics.
* Base: a structurally valid duplicate-ID manifest parses, then reports one
  duplicate-ID diagnostic.
* Bad: using `superRefine` in the structural schema to duplicate a semantic
  validator rule.

### 6. Tests Required

* Parse a duplicate-ID fixture and assert the semantic diagnostic.
* Reject both inconsistent release-strategy shapes.
* Continue rejecting invalid download URL formats structurally.

### 7. Wrong vs Correct

#### Wrong

Implement a cross-asset rule in both Zod and the semantic validator.

#### Correct

Keep cross-asset policy in `validateManifestSemantics` so every consumer can
apply the same second validation layer.
