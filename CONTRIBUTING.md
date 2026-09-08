# Contributing to Facade

[简体中文](CONTRIBUTING.zh-CN.md) | English

Thanks for your interest in contributing to Facade.

Facade welcomes both human-authored and agent-assisted contributions. Contributors using AI coding agents should also follow the [AI and agent contributors](#ai-and-agent-contributors) section below.

Facade is currently under active development. Small, focused pull requests are preferred over large changes that combine unrelated concerns.

## Before starting

For bugs and feature requests, check existing issues before opening a new one.

For substantial behavioral or architectural changes, opening an issue first is recommended so the intended direction can be discussed before implementation.

## Development setup

Facade uses Node.js and pnpm.

```bash
corepack enable
pnpm install --frozen-lockfile
```

## Quality checks

Before opening a pull request, run:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm coverage
```

GitHub Actions runs the equivalent checks for pull requests to `main`.

For the complete required-check and merge policy, see [GitHub Quality Gates](docs/quality-gates.md).

## AI and agent contributors

Facade supports development with AI coding agents, but agents should not work from repository contents alone.

This repository uses [Trellis](.trellis/workflow.md) to provide persistent project context, task planning, coding guidelines, and development history.

If you use Codex, Claude Code, Cursor, Copilot, or another agent-capable tool, start by reading:

- [`AGENTS.md`](AGENTS.md) — repository-level instructions for agents;
- [`.trellis/workflow.md`](.trellis/workflow.md) — the development lifecycle;
- [`.trellis/spec/`](.trellis/spec/) — package- and layer-specific engineering guidelines.

### Initialize the agent workspace

On first use, initialize a Trellis developer identity if one has not already been configured:

```bash
python ./.trellis/scripts/init_developer.py <your-name>
```

You can inspect the available project context with:

```bash
python ./.trellis/scripts/get_context.py
python ./.trellis/scripts/get_context.py --mode packages
```

### Use Trellis for implementation work

For implementation, refactoring, build, or other repository-changing work, agents should normally create a Trellis task before editing code:

```bash
python ./.trellis/scripts/task.py create "<task title>"
```

The expected lifecycle is:

```text
plan
  ↓
research / clarify requirements
  ↓
record the task and relevant context
  ↓
implement
  ↓
verify
  ↓
capture reusable project knowledge
  ↓
commit
  ↓
finish / archive the task
```

Before implementation, agents should consult the relevant files under `.trellis/spec/` rather than relying on remembered conventions.

Task-specific decisions, research, and implementation context should be persisted in the Trellis task directory so that another agent or a later session can continue the work without depending on chat history.

### Agent responsibilities

Agents contributing to Facade are expected to:

- follow `AGENTS.md` and the active Trellis workflow;
- plan changes before modifying implementation code;
- use a dedicated branch for independent work;
- avoid including unrelated working-tree changes;
- read the relevant `.trellis/spec/` guidance before changing a package or layer;
- keep task research and decisions in repository-managed Trellis files when appropriate;
- run the same quality checks required of other contributors;
- update project specs when a change introduces a reusable convention, architectural decision, or bug-prevention rule;
- make uncertainty explicit rather than inventing missing requirements or repository facts.

If the agent platform exposes Trellis commands or project-scoped Trellis skills, prefer those over manually reproducing the workflow.

A contributor may explicitly ask an agent to skip the Trellis task flow for a small or exceptional change. Agents should not silently bypass it on their own.

## Branches

Create feature work from `main` using a descriptive branch name, for example:

```text
feat/release-selection
fix/windows-asset-detection
docs/configuration-guide
```

Do not push feature work directly to `main`.

## Commits

Use Conventional Commit-style subjects:

```text
feat: add release selection
fix: handle missing architecture metadata
docs: document asset overrides
test: cover ambiguous release assets
refactor: simplify manifest construction
ci: update quality gates
chore: update development tooling
```

Keep commits focused and avoid including unrelated changes.

## Pull requests

Pull requests should explain:

- what changed and why;
- how the change was verified;
- whether any public or machine-readable contract changed.

The repository uses squash merging, so keep the pull request title suitable for use as the final commit subject.

## Design principles

Changes should preserve Facade's core responsibilities:

- keep user-facing and agent-facing output derived from the same source of truth;
- represent uncertainty explicitly rather than presenting inference as fact;
- keep classification separate from recommendation;
- do not proxy release downloads;
- do not execute installations or make trust decisions on behalf of users;
- keep core generated output usable without JavaScript.

## Community standards

By participating in the project, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Security

Do not report security vulnerabilities in public issues.

See [SECURITY.md](SECURITY.md) for the private reporting process.

## License

By contributing to this repository, you agree that your contributions will be licensed under the GNU Affero General Public License v3.0.
