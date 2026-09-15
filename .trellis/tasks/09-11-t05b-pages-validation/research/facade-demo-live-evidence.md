# Facade-demo live Pages evidence

Target repository: `Zachery-Liu/Facade-demo` (public, disposable).

## Environment

* Pages URL: `https://zachery-liu.github.io/Facade-demo/`
* Pages build type: `workflow`.
* Initial Pages environment policy allowed only custom branch patterns. This
  prevented a `release.published` run from starting its deploy job because the
  workflow ref was a tag despite an explicit default-branch checkout.

## Observations

| Scenario | Evidence | Result |
| --- | --- | --- |
| Baseline standalone refresh | [run 34550345567](https://github.com/Zachery-Liu/Facade-demo/actions/runs/34550345567) | build and deploy succeeded; `/`, `manifest.json`, `install.md`, and `llms.txt` all returned HTTP 200. |
| Chain after upload | [run 34550521437](https://github.com/Zachery-Liu/Facade-demo/actions/runs/34550521437) | `release-assets` → `facade` → `deploy` all succeeded; live manifest selected `v2.0.0`. |
| Failure recovery | [run 34550585669](https://github.com/Zachery-Liu/Facade-demo/actions/runs/34550585669) | intentional invalid base path failed with `BUILD_INVALID_BASE_PATH`; upload and deploy were skipped; public manifest remained `v2.0.0`. |
| Refresh cancellation | delayed [run 34550646109](https://github.com/Zachery-Liu/Facade-demo/actions/runs/34550646109), replacement [run 34550658793](https://github.com/Zachery-Liu/Facade-demo/actions/runs/34550658793) | delayed run was canceled during its sleep before build; replacement completed build and deploy. |
| Tag-push defect | [run 34550086989](https://github.com/Zachery-Liu/Facade-demo/actions/runs/34550086989) | a skipped tag-push workflow canceled the release run before the `branches: ['**']` fix. |
| Release-event environment policy | [run 34550955879](https://github.com/Zachery-Liu/Facade-demo/actions/runs/34550955879) | v4 build artifact contained `releaseTag: v4.0.0`; deploy initially failed before steps, then succeeded after only tag `v4.0.0` was added to the test environment policy. |

## Artifact and propagation note

The v4 Pages artifact contained all four outputs and `manifest.json` declared
`v4.0.0`. Immediately after successful deployment, the public endpoint still
served v2 with `Cache-Control: max-age=600`; this is recorded as Pages
propagation/cache behavior rather than an artifact-selection failure.
