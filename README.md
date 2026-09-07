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
  <img alt="Status: v0.1 planning" src="https://img.shields.io/badge/status-v0.1%20planning-2563EB?style=flat-square">
  <img alt="pnpm 11.19.0" src="https://img.shields.io/badge/pnpm-11.19.0-F69220?style=flat-square&logo=pnpm&logoColor=white">
</p>

<p align="center">
  <a href="README.zh-CN.md">简体中文</a> · English
</p>

Facade turns a GitHub Release into a static, maintainable download page and a
shared set of machine-readable installation metadata. It keeps installers on
GitHub Releases: Facade normalizes and presents distribution facts, but never
proxies software downloads or makes installation and trust decisions for users.

## Status

Facade is in the v0.1 implementation-planning stage. The repository currently
contains the product baseline, execution plan, and Trellis workflow setup; the
CLI, GitHub Action, and generated site have not been implemented yet.

## What v0.1 will provide

- A static download page for one selected public GitHub Release.
- Direct links to the release assets for macOS, Windows, and Linux.
- Normalized asset metadata: operating system, architecture, format, purpose,
  compatibility requirements, evidence source, and selection rationale.
- One shared `ReleasePageManifest` used to generate the human page and three
  Agent-facing outputs: `manifest.json`, `install.md`, and `llms.txt`.
- `facade init`, `facade inspect`, and `facade build` commands.
- GitHub Action templates for standalone release publishing and existing CI
  pipelines, with GitHub Pages deployment.

## Design principles

- **One source of truth.** The page and Agent interfaces are generated from the
  same manifest.
- **State uncertainty explicitly.** Filename inference is never presented as a
  maintainer declaration; unknown remains unknown.
- **Separate classification from recommendation.** Identifying an asset does
  not automatically make it the preferred download.
- **Keep responsibility with the consumer.** Facade can describe signatures,
  attestations, and installation preferences, but does not verify artifacts or
  execute install commands.
- **Static by default.** Core output works without JavaScript; scripts only
  improve selection and interaction.

## Planned architecture

```text
GitHub API + repository configuration + local branding assets
                           |
                    Source / Loader
                           |
     Classifier -> overrides -> selection -> ReleasePageManifest
                           |
        +------------------+------------------+
        |                                     |
 Human UI renderer                    Agent publisher
 HTML / CSS / JS              manifest.json / install.md / llms.txt
        |                                     |
        +------------------+------------------+
                           |
                 Static output for GitHub Pages
```

The initial stack is TypeScript, pnpm, Zod, Octokit, commander, Preact, Vite,
Vitest, and Playwright. The project begins as one primary npm package plus one
Action entry point, with internal module boundaries rather than premature
package splitting.

## Planned workflow

```text
Release assets + .github/facade.yml
              -> facade build
              -> HTML + manifest.json + install.md + llms.txt
              -> GitHub Pages
```

Facade also intends to provide a compact `Released with Facade` badge that
maintainers can place in GitHub Release notes. Clicking the badge should open
the Facade-generated download page for that release. The badge is a navigation
and attribution affordance, not a download proxy; any future automatic insertion
into release notes should be explicit opt-in.

The intended minimal configuration is:

```yaml
# .github/facade.yml
schema: 1
```

Additional configuration will support release selection, product branding,
asset overrides, installation preferences, verification references, and theme
options. Exact CLI and Action syntax will be documented when the first working
end-to-end build is available.

## Roadmap

1. Establish the workspace, strict TypeScript build, fixtures, schemas, and
   semantic validation.
2. Deliver an offline end-to-end build producing all four static outputs.
3. Add the GitHub source, CLI, Action, and real GitHub Pages validation.
4. Complete asset classification, explainable overrides, and the shared
   installation selector.
5. Finish the Agent contract and accessible Product Theme.
6. Validate packaging, onboarding, external integrations, then freeze
   `schemaVersion: 1` for the v0.1 release.

## Scope boundaries

v0.1 intentionally excludes private repositories, databases, accounts,
payments, download proxying/CDN, hosted analytics, automatic installation,
actual signature or attestation verification, release history, a theme
marketplace, and an MCP/Agent server.

## Documentation

- [Development documentation](docs/README.md) — language convention and index for
  the development and design documents maintained under `docs/`.
- [Product baseline](docs/facade_product_plan.md) — product scope, architecture,
  contracts, UX, Action behavior, and acceptance criteria. **Simplified Chinese;
  primary development document.**
- [Quality gates](docs/quality-gates.md) — CI checks and the active `main`
  merge-rule configuration.
- [Implementation plan](docs/implementation_plan.md) — dependency-ordered work
  packages, verification matrix, and release gates. **Simplified Chinese;
  primary development document.**
- [Trellis workflow](.trellis/workflow.md) — project task lifecycle and AI
  collaboration process.

## License

Licensed under the [GNU Affero General Public License v3.0](LICENSE).
