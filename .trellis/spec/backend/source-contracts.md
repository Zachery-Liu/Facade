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
