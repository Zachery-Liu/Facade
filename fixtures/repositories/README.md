# Repository fixtures

All fixtures are checked in and tests read them from disk only; no test makes a
network request.

`basic-release.source.json` records a minimal raw snapshot of the public
[`cli/cli` `v2.100.0` release](https://github.com/cli/cli/releases/tag/v2.100.0),
including its repository and tag. Its asset sizes remain `0` because T02 does
not normalize file size yet; T04 replaces these placeholders with API-captured
values. `basic-release.json` is the separate normalized Manifest fixture used
to exercise asset classification, auxiliary checksum data, and signatures.

`invalid-signature.json` and `conflicting-name.json` are intentionally local,
deterministic negative cases. They isolate an invalid reference and conflicting
classification without claiming to reproduce an upstream release.
