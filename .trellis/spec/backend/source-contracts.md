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

## Scenario: Static output replacement

### 1. Scope / Trigger

Use this boundary whenever a build publishes the generated site into an output directory.

### 2. Signatures

```ts
buildRelease(snapshot, { outDir, basePath }): Promise<OfflineBuildResult>
```

### 3. Contracts

- Generate every file in a sibling staging directory before publishing.
- Hold an atomically-created `outDir.facade-lock` directory throughout replacement.
- Replace only an output containing the exact `.facade-output` marker.
- Collapse line breaks and escape Markdown metadata before rendering text outputs.

### 4. Validation & Error Matrix

| Condition | Result |
| --- | --- |
| Lock already exists | `BUILD_OUTPUT_LOCKED`; preserve the lock |
| Backup already exists | `BUILD_BACKUP_COLLISION`; preserve the backup |
| Existing output has no valid marker | `BUILD_UNOWNED_OUTPUT`; preserve the output |
| Backup or lock cleanup fails after publication | Return `cleanupRequired: true` |

### 5. Good / Base / Bad Cases

- Good: one builder holds the lock, replaces a marked output, and removes recovery state.
- Base: first publication has no prior output and moves staging directly into place.
- Bad: check for a backup and rename without a lock; concurrent builders can both pass the check.

### 6. Tests Required

- Assert an existing lock and its contents survive a refused build.
- Assert backup collisions and unowned outputs survive unchanged.
- Assert release and asset metadata containing Markdown characters or line breaks remains one logical entry.

### 7. Wrong vs Correct

#### Wrong

Use separate existence checks as concurrency control.

#### Correct

Acquire the adjacent lock atomically, re-check ownership and backup state while holding it, then publish.
