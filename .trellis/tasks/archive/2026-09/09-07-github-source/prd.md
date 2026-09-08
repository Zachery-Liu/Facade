# Implement GitHub Source

## Goal

Add a typed, read-only GitHub Release source that turns a repository and release selection into the existing `RepositorySnapshot` contract, without leaking credentials or local filesystem details.

## What I already know

- T02 provides `ReleaseSource`, snapshot schemas, and a `github-latest` / `tag` configuration shape.
- The implementation plan freezes T04's scope: repository metadata, latest and explicit-tag releases, complete asset pagination, precedence across CLI/config/environment, bounded retry, error classification, and provenance.
- GitHub's REST API exposes the required repository, release, and paginated asset endpoints; details are in `research/github-rest-releases.md`.

## Requirements

- Implement a GitHub-backed `ReleaseSource` using only GitHub API response summaries.
- Fetch repository data plus either the latest published release or an explicitly selected tag; fetch every release-asset page.
- Resolve repository and release settings with a documented CLI > environment > config precedence.
- Support an optional token without exposing it in errors, logs, snapshots, or generated output.
- Retry transient network/server failures a bounded number of times and classify authentication, no-release, draft, invalid response, and network failures with stable error codes.
- Add fully offline tests for pagination, draft releases, absent latest release, auth failures, network failures, precedence, and credential redaction.

## Acceptance Criteria

- [x] Repository metadata, latest and tag release data, and every asset page normalize to `RepositorySnapshot`.
- [x] The source has deterministic, offline coverage for pagination, draft/no-latest, authentication, and network error paths.
- [x] CLI/config/environment precedence is tested and documented at the source-options boundary; the build CLI itself remains T03 work.
- [x] Source errors and options expose neither tokens nor absolute local paths.
- [x] Local typecheck, lint, test, build, and coverage pass.
- [x] Three public repositories' latest-release endpoints were checked without a token.
- [ ] End-to-end builds of those repositories remain external verification and do not block the source adapter task.

## Technical Approach

Use the planned Octokit REST client behind a small injectable transport/client boundary so tests stay offline. Map API data immediately to the restrictive existing snapshot schemas, retrieve assets with the documented pagination endpoint, and centralize status/error translation and retry policy. Read the token only at source construction time and never retain it in result objects or diagnostic context.

## Out of Scope

- Downloading release artifacts, verifying signatures, or using non-GitHub metadata.
- Building the HTML/static-output pipeline from T03 or Action/Pages integration from T05.
- Claiming external repository validation before it is observed.

## Technical Notes

- Relevant code: `packages/facade/src/source/repository-snapshot.ts`, `packages/facade/src/config/facade-config.ts`, and `packages/facade/src/cli/program.ts`.
- Research: `research/github-rest-releases.md`.
- External source evidence: `research/github-api-validation.md` confirms three public repositories return a Latest Release. T03 and the GitHub-to-build bridge are now merged; live end-to-end repository builds remain unrecorded external verification.
