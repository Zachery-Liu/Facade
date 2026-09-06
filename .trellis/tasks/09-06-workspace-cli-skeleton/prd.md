# T01 Workspace and CLI Skeleton

## Goal

Create the first executable Facade slice: a pnpm workspace with one strict-TypeScript package, a packageable `facade` CLI that exposes help, and repeatable quality scripts. This creates real source examples without implementing release loading, rendering, or GitHub integration.

## Requirements

- Create the root pnpm workspace and `packages/facade` primary package.
- Configure strict TypeScript and a build that emits a runnable CLI package artifact.
- Implement `facade --help` using commander.
- Add lint, typecheck, test, and build scripts.
- Add an offline Vitest test proving the CLI help path works from the built artifact.
- Preserve the product-plan layout: `config`, `source/github`, `classifier`, `core`, `agent-interface`, `themes/product`, `runtime`, and `cli` under `packages/facade/src`; only create files needed for this slice.

## Acceptance Criteria

- [ ] `pnpm install` succeeds.
- [ ] `pnpm typecheck`, `pnpm test`, and `pnpm build` succeed.
- [ ] The built package runs `facade --help` without executing TypeScript source.
- [ ] No GitHub calls, release processing, rendering, database, or Action behavior is introduced.

## Technical Approach

Use pnpm workspaces, strict TypeScript, commander, tsup for the Node CLI bundle, and Vitest. The CLI entry point must remain a thin boundary adapter; no domain policy is implemented in this task.

## Decision (ADR-lite)

**Context**: The documented v0.1 plan calls for one primary npm package and a separately packaged CLI, before product logic exists.

**Decision**: Use a single workspace package at `packages/facade` and emit its executable entry point into `dist/`.

**Consequences**: Early tests can run entirely offline and later modules can be added to the planned directory layout without package churn.

## Out of Scope

- YAML/config loading behavior
- GitHub API requests and release data
- Schemas beyond build metadata
- static rendering, browser assets, Action implementation, deployment

## Technical Notes

- Product architecture: `docs/facade_product_plan.md` sections 4.2–4.3.
- Existing bootstrap specs are implementation-preparation baselines and will be updated with actual code examples only after this task supplies them.
