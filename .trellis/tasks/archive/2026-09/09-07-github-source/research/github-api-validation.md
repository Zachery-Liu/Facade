# Public GitHub API Validation

Observed on 2026-09-07 using unauthenticated read-only requests with the GitHub JSON accept header:

| Repository | Latest tag | Draft | Prerelease | Embedded asset count |
| --- | --- | ---: | ---: | ---: |
| `cli/cli` | `v2.100.0` | false | false | 22 |
| `electron/electron` | `v44.2.0` | false | false | 68 |
| `microsoft/vscode` | `1.136.1` | false | false | 0 |

The three latest-release API requests all succeeded and demonstrate that public repositories work without a token. This is evidence for the GitHub source endpoints only. T03 and the GitHub-to-build bridge were merged later; this observation still does not by itself prove end-to-end Facade builds for all three repositories.
