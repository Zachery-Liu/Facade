<p align="center">
  <img src="docs/assets/facade-logo-readme.svg" alt="Facade" width="380">
</p>

<p align="center"><strong>Software releases for humans and agents.</strong></p>

<p align="center">
  <a href="https://github.com/Zachery-Liu/Facade/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/Zachery-Liu/Facade/ci.yml?branch=main&style=flat-square&logo=githubactions&logoColor=white&label=CI"></a>
  <a href="https://github.com/Zachery-Liu/Facade/actions/workflows/codeql.yml"><img alt="CodeQL" src="https://img.shields.io/github/actions/workflow/status/Zachery-Liu/Facade/codeql.yml?branch=main&style=flat-square&logo=github&logoColor=white&label=CodeQL"></a>
  <a href="https://github.com/Zachery-Liu/Facade/actions/workflows/dependency-review.yml"><img alt="Dependency Review" src="https://img.shields.io/github/actions/workflow/status/Zachery-Liu/Facade/dependency-review.yml?style=flat-square&logo=dependabot&logoColor=white&label=dependencies"></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/github/license/Zachery-Liu/Facade?style=flat-square&label=license"></a>
  <br>
  <a href="https://github.com/Zachery-Liu/Facade/issues"><img alt="Open issues" src="https://img.shields.io/github/issues/Zachery-Liu/Facade?style=flat-square&logo=github&label=issues"></a>
  <a href="https://github.com/Zachery-Liu/Facade/pulls"><img alt="Open pull requests" src="https://img.shields.io/github/issues-pr/Zachery-Liu/Facade?style=flat-square&logo=github&label=PRs"></a>
  <a href="https://github.com/Zachery-Liu/Facade/commits/main"><img alt="Last commit" src="https://img.shields.io/github/last-commit/Zachery-Liu/Facade?style=flat-square&logo=git&label=last%20commit"></a>
  <img alt="Status: v0.1 in progress" src="https://img.shields.io/badge/status-v0.1%20in%20progress-2563EB?style=flat-square">
  <img alt="pnpm 11.19.0" src="https://img.shields.io/badge/pnpm-11.19.0-F69220?style=flat-square&logo=pnpm&logoColor=white">
</p>

<p align="center">
  <a href="README.zh-CN.md">简体中文</a> · English
</p>

Facade turns software releases into a clear download experience and structured
distribution metadata. Today it starts with GitHub Releases: artifacts stay on
the publisher's release infrastructure while Facade normalizes what they are,
who they are for, and how users and agents should reason about them.

Facade does **not** proxy downloads, invent trust, or silently execute install
commands.

## Status

**v0.1 is actively being implemented.**

The repository has moved beyond planning. The current implementation already
includes:

- a strict TypeScript/pnpm workspace with CI quality gates;
- fixture-backed schemas and semantic validation;
- a deterministic offline build that emits `index.html`, `manifest.json`,
  `install.md`, and `llms.txt`;
- base-path handling plus staged output replacement and rollback safeguards;
- a GitHub Release source for repository metadata, latest/tag selection, and
  paginated release assets;
- stable source errors, bounded retry behavior, and an internal source-to-build
  integration path.

The public CLI is still intentionally narrow: `facade build` currently builds
from an offline repository snapshot fixture. Live GitHub CLI wiring, the GitHub
Action/Pages flow, the full classifier/override system, shared selector,
`inspect`, Product Theme, and the complete Agent contract remain v0.1 work.

## What v0.1 is building

The v0.1 target is one deterministic pipeline:

```text
GitHub Release
    ↓
Source
    ↓
Classifier
    ↓
Maintainer overrides
    ↓
Shared selector
    ↓
ReleasePageManifest
    ↓
User UI + Agent Interface
```

The same normalized facts should drive both sides:

```text
User-facing
  index.html

Agent-facing
  manifest.json
  install.md
  llms.txt
```

Initial target coverage focuses on common desktop and CLI distributions:

- **OS:** macOS, Windows, Linux
- **Architecture:** x64, arm64, universal; x86 where practical
- **Formats:** dmg, pkg, exe, msi, zip, tar.gz, deb, rpm, AppImage

Classification is deliberately conservative. Unknown stays unknown, filename
inference is not treated as a maintainer declaration, and classification is
kept separate from recommendation.

## Current development CLI

The current CLI surface is fixture-backed and intended for development:

```bash
facade build \
  --fixture <repository-snapshot.json> \
  --out-dir dist \
  --base-path /
```

Repository development uses Node.js `>=22.13.0` and pnpm `11.19.0`:

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm coverage
pnpm build
```

Public installation and release instructions will be documented when the
package, Action, and online source flow are ready.

## Roadmap

<p align="center">
  <img src="docs/assets/facade-roadmap.webp" alt="Facade roadmap" width="100%">
</p>

Facade is intended to evolve in layers rather than jump directly from a release
page generator to a large platform:

```text
v0.1  Release Distribution Foundation
  ↓
v0.2  Distribution Intelligence
  ↓
v0.3  Build-Aware + Portable Protocol
  ↓
v1.0  Compatibility Guarantee
  ↓
      Registry
  ↓
      Catalog + Agent Software Registry
  ↓
      Open Ecosystem + Integrations
```

Long-term work explores a source-independent distribution protocol, stable
artifact identity, first-class environment compatibility, capability-based
resolution, policy-aware selection, build-time declarations, artifact
inspection, portable manifests, federated registries, and third-party
producers/consumers.

The guiding idea is simple:

> Prefer facts emitted where artifacts are created over increasingly clever
> guesses made after release.

See the full [Roadmap](docs/roadmap.md) or
[Chinese Roadmap](docs/roadmap.zh-CN.md).

## Design principles

- **One source of truth.** User-facing UI, Agent interfaces, CLI consumers, and future
  registries should use the same normalized facts and resolver semantics.
- **Inference is not declaration.** Filename guesses are evidence, not ground
  truth.
- **Unknown is valid.** Facade should preserve uncertainty rather than
  manufacture certainty.
- **Classification is not recommendation.** Identifying an artifact does not
  automatically make it the preferred choice.
- **Explainability first.** Classification, assertions, selection, and evidence
  should be inspectable.
- **Deterministic by default.** Equivalent inputs should produce stable
  normalized outputs.
- **Facts before execution.** Facade describes and resolves software before it
  considers any installer-like behavior.
- **Normalize evidence; do not invent trust.** Checksums, signatures, SBOMs,
  provenance, and attestations can be represented without Facade claiming more
  than the evidence proves.
- **Source independent over time.** GitHub Releases is the first source adapter,
  not the permanent protocol boundary.
- **Open ecosystem first.** Publishers should be able to own their metadata, and
  third-party tools should be able to produce or consume Facade-compatible
  manifests without depending on a centralized hosted service.

## Scope boundaries

Facade is a distribution metadata and resolution project, not a general package
manager.

The project does not currently aim to become:

- a binary download proxy or CDN;
- an account/payment platform;
- a dependency solver;
- a system that silently executes installation commands;
- a centralized service that publishers must depend on;
- a system that presents inferred metadata as verified truth.

Optional installer or store-like UX is a long-term exploration, not a current
commitment.

## Contributing

Facade is still early enough that protocol and data-model decisions can change.
Issues, implementation feedback, fixture contributions, source adapters,
build-system integrations, conformance work, and independent consumers are all
valuable.

For large semantic or protocol changes, please start from the product baseline
and roadmap before proposing implementation details.

## Documentation

- [Development documentation](docs/README.md) — development/design document
  index and conventions.
- [Product baseline](docs/facade_product_plan.md) — product scope, semantics,
  architecture, contracts, UX, and acceptance criteria.
- [Implementation plan](docs/implementation_plan.md) — dependency-ordered v0.1
  execution plan and release gates.
- [Roadmap](docs/roadmap.md) — post-v0.1 direction from distribution
  intelligence to an open software distribution protocol and ecosystem.
- [Roadmap (简体中文)](docs/roadmap.zh-CN.md) — Chinese translation of the
  roadmap.
- [Quality gates](docs/quality-gates.md) — CI checks and active merge rules.
- [Trellis workflow](.trellis/workflow.md) — project task lifecycle and AI
  collaboration process.

## License

Licensed under the [GNU Affero General Public License v3.0](LICENSE).
