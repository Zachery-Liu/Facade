# GitHub Action and Pages contracts (verified 2026-09-08)

## Sources

* GitHub Action metadata reference:
  https://docs.github.com/en/actions/reference/workflows-and-actions/metadata-syntax
* GitHub Pages custom workflows:
  https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
* Pages publishing source setup:
  https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
* `GITHUB_TOKEN` event behavior:
  https://docs.github.com/en/actions/concepts/security/github_token
* Official `configure-pages` metadata:
  https://github.com/actions/configure-pages/blob/main/action.yml
* Official Pages upload/deploy releases:
  https://github.com/actions/upload-pages-artifact/releases
  and https://github.com/actions/deploy-pages/releases
* Official Actions toolkit core releases:
  https://github.com/actions/toolkit/blob/main/packages/core/RELEASES.md

## Findings

* JavaScript actions may declare `runs.using: node24`; their metadata inputs and
  outputs belong in root `action.yml`/`action.yaml`.
* `@actions/core` 3.0.1 is ESM-only, supports Node 24, and provides the canonical
  input, token masking, logging annotation, output, and failure APIs.
* `actions/configure-pages@v5` exposes `base_path`, which is the correct source for
  project-site paths such as `/repository` and is empty for a root/custom-domain
  site. Facade should normalize the empty value to `/`.
* Current GitHub Pages documentation demonstrates `configure-pages@v5`,
  `upload-pages-artifact@v4`, and `deploy-pages@v4`. The upload action has a newer
  v5 release, but the docs' mutually compatible v4 pair is sufficient and less
  likely to outrun the documented workflow contract for this task.
* The Pages artifact must contain the whole static site. Deployment requires
  `pages: write` and `id-token: write`, a dependent deploy job, and normally the
  `github-pages` environment with the deployment URL output.
* Custom workflows must first be selected as the repository's Pages publishing
  source. A `CNAME` file does not configure a custom domain.
* Events caused by the repository `GITHUB_TOKEN` normally do not start a new
  workflow run. A release created by an existing CI workflow must therefore chain
  Facade explicitly after release asset upload rather than expect a separate
  `release.published` workflow to run.

## Repository mapping

* Use a Node 24 bundled JavaScript Action and keep official Pages upload/deploy
  outside the Action.
* Keep build and deploy jobs separate so a failed or stale build cannot upload or
  replace the previous deployment.
* Use site-level concurrency with cancellation in both workflow templates.
* Validate YAML templates structurally in tests and reserve end-to-end Pages runs
  for T05b.
