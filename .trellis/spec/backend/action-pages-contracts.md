# Action and Pages Contracts

## Scenario: Bundled Action and fresh Pages input

### 1. Scope / Trigger

Use this contract whenever changing the root `action.yml`,
`src/action/`, live GitHub build orchestration, the checked-in Action bundle, or
the Pages workflow templates. These files cross configuration, GitHub REST,
atomic output, Action runtime, and Pages deployment boundaries.

### 2. Signatures

```ts
buildFreshGitHubRelease({
  configPath,
  outDir,
  basePath,
  environment,
  overrides,
}): Promise<{
  basePath: string;
  files: readonly ['index.html', 'manifest.json', 'install.md', 'llms.txt'];
  releaseTag: string;
  attempts: 1 | 2;
  cleanupRequired?: true;
}>

runAction(core, dependencies?): Promise<void>
```

The root Action declares inputs `config`, `repository`, `tag`, `base-path`,
`out-dir`, and `token`; it declares outputs `output-path` and `release-tag`.

### 3. Contracts

* Runtime: `action.yml` uses Node 24 and points at the checked-in bundled CJS
  entry. The CJS format is intentional: transitive toolkit dependencies use
  dynamic Node built-in `require` calls that fail in an ESM bundle.
* Packaging: the Action bundle contains every non-built-in runtime dependency.
  A consuming repository must not install pnpm or Facade dependencies. CI must
  run the build and then fail on
  `git diff --exit-code -- action/dist/index.cjs`.
* Precedence: explicit Action overrides, then `FACADE_*`, validated YAML,
  ambient inference, and defaults; see Source Contracts for individual fields.
  A non-empty `tag` input selects the exact-tag strategy. Optional
  `repository` and `token` metadata inputs have no defaults: a metadata
  default is indistinguishable from an explicit Action input and would bypass
  the lower-precedence layers.
* Source: honor `GITHUB_API_URL` for GitHub Enterprise and use `GITHUB_TOKEN`
  only through the source adapter. Mask an explicit Action token input before
  work begins; workflow templates pass `github.token` explicitly.
* Freshness: fingerprint exact checked-out config bytes, resolved source options,
  and the normalized snapshot before and after staging, before publication.
  One mismatch disposes staging and causes one rebuild; a mismatch on the second
  attempt fails. Verification errors preserve the prior complete output.
  This detects changes to
  those sampled inputs during the build interval, not remote configuration
  commits after checkout or arbitrary future Release asset uploads.
* Outputs: write both outputs only after a stable successful build. Never put
  tokens or absolute paths into errors or annotations.
* Output ownership: the Action defaults `out-dir` to `.facade-dist` so it does
  not collide with a consumer's conventional `dist` directory. Templates pass
  that value explicitly when pinning an earlier immutable Action commit.
* Pages: workflows configure Pages before building, pass `base_path`, upload
  the entire output directory as one Pages artifact, and deploy in a dependent
  job. The build job needs `pages: read`; the deploy job needs `pages: write`,
  `id-token: write`, and the `github-pages` environment. A `release.published`
  run retains its tag ref even when checkout explicitly targets the default
  branch. When the environment uses a custom deployment branch policy, it must
  permit the matching release tag pattern as well as the default branch;
  otherwise the deploy job fails before any action step starts.
* Concurrency: eligible refreshes share the workflow-level group
  `facade-pages-${{ github.repository }}-site` with
  `cancel-in-progress: true`, so a newer refresh cancels an older run before it
  can deploy stale output. The release-assets job belongs only in the chained
  template; consumers must ensure it has completed every asset upload before
  Facade's workflow or dependent jobs begin.
* Unpublished Action: examples use an accessible immutable commit, never a
  fictional major tag. The standalone workflow limits configured-path pushes to
  branches with `branches: ['**']`, which excludes tag pushes without
  hard-coding a default-branch name. Its build job still gates push events on
  `github.ref_name == github.event.repository.default_branch`, and explicitly
  checks out that default branch. A skipped tag-push run must never enter the
  site concurrency group and cancel a valid `release.published` refresh.
  Non-default-branch pushes still trigger the workflow, so they must use a
  separate run-specific group, not the shared site group. The standalone suffix
  is `${{ github.event_name == 'push' && github.ref_name != github.event.repository.default_branch && github.run_id || 'site' }}`.
  A job-level `if` does not isolate workflow-level concurrency; setting only
  `cancel-in-progress` conditionally still allows pending runs to be displaced.
  Both Action pins must support the documented minimal YAML contract; when
  updating a pin, smoke-test its bundle rather than only testing current source.
* Asset completeness: standalone publication requires all assets to be uploaded
  before the Release is published. Automated producers use the CI-chain example,
  whose Facade job depends on the job that finishes every Release asset upload.

### 4. Validation & Error Matrix

| Condition | Result |
| --- | --- |
| Configuration cannot be read | `CONFIG_READ_FAILED`; omit its path |
| YAML or schema is invalid | `CONFIG_INVALID`; preserve cause internally |
| Optional Action repository/token is omitted | pass no override; resolve environment/config normally |
| Inputs differ after first build | warn `FACADE_INPUT_CHANGED`, rebuild once |
| Inputs differ after second build | `BUILD_INPUT_CHANGED_REPEATEDLY`; previous output preserved; no upload/deploy |
| Capture fails after staging | Failure; previous output preserved; staging disposed |
| Non-default-branch configured-path push | Build skipped; run-specific concurrency group cannot displace site refreshes |
| Asset is uploaded after a stable standalone build | outside freshness guarantee; rerun manually |
| Release build succeeds but deploy has no steps | inspect `github-pages` environment branch/tag policy; permit the release tag |
| Atomic publish leaves recovery directories | success plus `FACADE_OUTPUT_CLEANUP_REQUIRED` warning |
| Known `FacadeError` reaches Action | failure contains stable code and safe message |
| Unexpected error reaches Action | `ACTION_UNEXPECTED_FAILURE`; hide raw details |

### 5. Good / Base / Bad Cases

* Good: a project-site workflow passes `/repository`, the snapshot is stable,
  the `github-pages` environment permits its release tag, and the Action
  returns the exact release tag after one build.
* Base: no repository Action input is supplied; `FACADE_REPOSITORY` or the
  validated YAML repository remains authoritative. An empty Pages root path is
  normalized to `/`.
* Bad: a workflow publishes first and uploads more assets later, or metadata
  silently defaults repository to `github.repository`; neither behavior meets
  the declared standalone/config precedence contracts.

### 6. Tests Required

* Parse `action.yml` and both workflow templates into validated objects.
  Assert exact object paths for metadata defaults, triggers, job conditions,
  step order and inputs, dependency edges, permissions, environment,
  whole-output path, and concurrency; string presence is not structural proof.
* In a live release-event validation, allow the event's tag in the
  `github-pages` environment when a custom branch policy is active; assert the
  deploy job executes rather than failing without steps.
* Copy the built Action entry into a temporary directory without
  `node_modules`; executing it must load successfully far enough to emit the
  expected Action failure protocol.
* Unit-test Action input mapping, secret masking, outputs, stable error codes,
  freshness warnings, deferred-cleanup warnings, and omission of repository/token
  overrides.
* Unit-test stable input, one mutation, repeated mutation, YAML failures,
  `GITHUB_API_URL`, and the shared prepare/publish boundary. Assert previous
  files survive verification errors and mutations, and no staging remains.
* Run typecheck, lint, test, build, and coverage after regenerating the bundle.
  The CI build job must additionally prove the generated bundle has no diff.

### 7. Wrong vs Correct

#### Wrong

```yaml
- uses: facade/action@v1
- run: pnpm install && pnpm facade build
```

This invents an unpublished tag and assumes consumer tooling. Likewise, a
separate `release.published` workflow is not a valid continuation for Releases
created with the repository `GITHUB_TOKEN`.

#### Correct

```yaml
- uses: Zachery-Liu/Facade@<accessible-immutable-commit>
  id: facade
- uses: actions/upload-pages-artifact@v5
  with:
    path: ${{ steps.facade.outputs.output-path }}
```

For existing release CI, place this build job after the asset-upload job with
`needs`, then deploy from a second dependent job. Leave optional metadata
inputs without defaults; templates that intentionally use the current repository
or token pass those inputs explicitly.
