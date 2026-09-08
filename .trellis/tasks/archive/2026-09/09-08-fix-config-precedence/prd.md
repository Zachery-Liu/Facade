# Fix Configuration Precedence Contract

## Goal

Remove the conflict between the product plan, the archived T04 requirement, and the GitHub source resolver by defining and implementing one field-by-field configuration precedence contract.

## Requirements

- Resolve ordinary source settings in this order:
  1. explicit CLI override;
  2. explicit `FACADE_*` environment override;
  3. repository YAML;
  4. ambient CI inference;
  5. product default.
- Treat `FACADE_REPOSITORY`, `FACADE_RELEASE_STRATEGY`, and `FACADE_RELEASE_TAG` as explicit overrides. Treat `GITHUB_REPOSITORY` only as ambient repository inference.
- Resolve fields independently, but keep the final release selection coherent: `github-latest` never carries a lower-precedence tag, while `tag` requires a non-empty tag after all layers are resolved.
- Default an omitted release selection to `github-latest`. Do not invent a repository default; fail with a stable error when no layer supplies a repository.
- Reject invalid explicit environment strategies instead of silently falling through.
- Keep credentials outside the ordinary precedence contract. An explicit CLI token may override `GITHUB_TOKEN`; tokens must not be read from YAML, defaults, or ambient repository inference and must never appear in diagnostics.
- Preserve the archived T04 PRD as history and append a clearly labelled post-merge correction rather than rewriting its original requirement.
- Synchronize the product plan, implementation plan, Trellis source contract, implementation, and offline tests.

## Acceptance Criteria

- [x] Tests prove CLI > `FACADE_*` > YAML > `GITHUB_REPOSITORY` > defaults.
- [x] YAML repository selection beats ambient CI repository inference.
- [x] An omitted YAML release selection defaults to `github-latest`.
- [x] Missing repository and incomplete tag selection fail with stable source errors.
- [x] A resolved `github-latest` selection omits lower-precedence tags.
- [x] Token handling remains separately tested and credential-safe.
- [x] Product and Trellis documentation state the same contract and T04 contains a historical correction note.
- [x] Typecheck, lint, test, build, and coverage pass locally.

## Technical Approach

Keep the existing strict `FacadeConfigSchema` as the fully specified configuration contract and add a separate strict input schema for partially specified repository YAML. Update the source-options resolver to accept that input and resolve repository, strategy, and tag by named layers. Ambient inference is limited to `GITHUB_REPOSITORY`; release-event variables are not implicit version overrides.

## Out of Scope

- Parsing a YAML file from disk.
- Discovering a local GitHub repository from Git remotes.
- GitHub Action orchestration or release-event trigger behavior.
- Storing credentials in repository configuration.
