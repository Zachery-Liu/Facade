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
`tag` requires a non-empty tag. `FacadeConfigInputSchema` accepts the minimal
repository YAML before source inference and defaults run;
`FacadeConfigSchema` represents a fully specified repository and release
selection. Neither schema accepts credentials.

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

## Scenario: GitHub release adapter

### 1. Scope / Trigger

Use this boundary when GitHub REST responses are converted into `ReleaseSource` values.

### 2. Signatures

```ts
GitHubReleaseSource.getSnapshot('github-latest'): Promise<RepositorySnapshot>
GitHubReleaseSource.getSnapshot('tag', tag): Promise<RepositorySnapshot>
resolveGitHubSourceOptions(
  configInput: FacadeConfigInput,
  environment: GitHubSourceEnvironment,
  cli?: GitHubSourceOverrides,
): GitHubSourceOptions
```

`GitHubSourceEnvironment` recognizes the explicit keys
`FACADE_REPOSITORY`, `FACADE_RELEASE_STRATEGY`, and `FACADE_RELEASE_TAG`,
the ambient `GITHUB_REPOSITORY`, and the credential input `GITHUB_TOKEN`.

### 3. Contracts

- Parse JSON and provider fields, then validate every mapped value with the neutral Source schemas.
- Return `github-latest` without a tag; return `tag` only with a non-empty tag.
- Resolve ordinary fields independently as explicit CLI > explicit `FACADE_*` override > repository YAML > ambient inference > defaults.
- Parse repository YAML through `FacadeConfigInputSchema` at the file-loading boundary, then resolve it through the same named layers; do not require a fully specified `FacadeConfigSchema` before ambient inference runs.
- Treat `GITHUB_REPOSITORY` as ambient inference only. Repository YAML beats it, and release-event variables do not implicitly change the configured release selection.
- Default an omitted release selection to `github-latest`; fail when no layer supplies a repository.
- Resolve credentials separately as CLI token > `GITHUB_TOKEN`; never accept credentials from YAML or include them in diagnostics.
- Treat `403` with exhausted rate-limit headers and every `429` as rate limiting.
- Never retry before `retry-after` or `x-ratelimit-reset`; fail immediately when the requested delay exceeds the bounded local wait.

### 4. Validation & Error Matrix

| Condition | Result |
| --- | --- |
| Malformed JSON or invalid mapped URL/name/ID | `SOURCE_INVALID_RESPONSE` with cause |
| `403` without rate-limit evidence | `SOURCE_ACCESS_DENIED` |
| `403` with exhausted limit or `429` | `SOURCE_RATE_LIMITED` |
| Retry count outside 1–10 | `SOURCE_INVALID_RETRY_POLICY` |
| No repository in explicit, YAML, or ambient layers | `SOURCE_REPOSITORY_REQUIRED` |
| Unsupported `FACADE_RELEASE_STRATEGY` | `SOURCE_INVALID_STRATEGY` |
| Tagged selection without a tag | `SOURCE_TAG_REQUIRED` |

### 5. Good / Base / Bad Cases

- Good: a valid GitHub page maps immediately to HTTP(S)-only neutral assets.
- Good: repository YAML beats `GITHUB_REPOSITORY`, while an explicit
  `FACADE_REPOSITORY` or CLI repository can still override the YAML field.
- Base: minimal `{ schema: 1 }` YAML uses `GITHUB_REPOSITORY` and defaults the
  release strategy to `github-latest`.
- Bad: treat every environment variable as one precedence layer, allowing
  ambient CI metadata to override repository-owned YAML.
- Bad: cap a server-requested long wait and retry early, or pass `z.url()`
  output directly as an HTTP(S) Source URL.

### 6. Tests Required

- Cover malformed JSON and a provider URL rejected by the neutral schema.
- Distinguish ordinary `403` from rate-limited `403` and do not retry a long server delay.
- Prove CLI > `FACADE_*` > YAML > `GITHUB_REPOSITORY`, plus the default `github-latest` selection.
- Assert lower-precedence tags are omitted when the resolved strategy is `github-latest`.

### 7. Wrong vs Correct

#### Wrong

Assume provider-shape validation is equivalent to the neutral Source contract,
or merge `FACADE_*` overrides and `GITHUB_REPOSITORY` into a single
"environment" layer.

#### Correct

Validate the mapped repository, release, assets, and final snapshot through their shared schemas before returning. Keep explicit overrides, repository configuration, ambient inference, defaults, and credentials as named layers at the source-options boundary.
