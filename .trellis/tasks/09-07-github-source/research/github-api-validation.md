# Public GitHub API Validation

Observed on 2026-09-07 using unauthenticated read-only requests with the GitHub JSON accept header:

| Repository | Latest tag | Draft | Prerelease | Embedded asset count |
| --- | --- | ---: | ---: | ---: |
| `cli/cli` | `v2.100.0` | false | false | 22 |
| `electron/electron` | `v44.2.0` | false | false | 68 |
| `microsoft/vscode` | `1.136.1` | false | false | 0 |

The three latest-release API requests all succeeded and demonstrate that public repositories work without a token. This is evidence for the GitHub source endpoints only. It is not evidence that Facade can build all three repositories: the T03 static build entry point has not been implemented in the current `main` baseline.
