# Backend Quality Guidelines

## Observed checks

The root workspace exposes `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `pnpm test`. `packages/facade/tsconfig.json` enables strict TypeScript; `packages/facade/eslint.config.mjs` applies TypeScript-aware linting.

Tests are offline and behavior-focused: `test/cli-help.test.ts` runs the built artifact, `test/release-page.test.tsx` covers schema/selection/SSR, and `test/runtime-diagnostics.test.ts` covers error/logging behavior.

Keep domain logic deterministic and typed. Do not use `any`, unchecked assertions, network calls in unit tests, or nondeterministic output ordering.

## GitHub pull-request gate

Run the local gate before opening a pull request:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm coverage
```

`lint` must pass with zero warnings. Coverage uses Vitest V8 and must meet the current repository baseline: statements 69%, branches 84%, functions 68%, and lines 69%. Keep the report artifacts (`coverage-summary.json`, Cobertura XML, and HTML) available for CI review; do not lower these thresholds to accept untested behavior.

The `main` GitHub Ruleset must require the independent CI checks (`typecheck`, `lint`, `test`, `build`, `coverage`), the `minimum-node` compatibility job, both CodeQL analyses (`actions`, `javascript-typescript`), and Dependency Review. Enable it only after an initial workflow run, then select the check labels GitHub actually reports. Direct feature work belongs on `feat/<name>` and reaches `main` through a passing pull request.

GitHub workflows must use frozen pnpm installation, least-privilege `permissions`, and no repository secrets for these checks. When using `actions/setup-node` with `cache: pnpm`, pnpm must already be discoverable before that action runs; otherwise its cache initialization fails before subsequent `corepack enable`. Prefer no cache until pnpm setup is explicit, or activate pnpm through a dedicated setup step first.

CI keeps the five required quality-job contexts on floating Node 22 and runs a
separate `minimum-node` job at the `packages/facade` `engines.node` minimum.
When a build dependency requires a security override, declare the narrowest
parent-scoped selector in `pnpm-workspace.yaml` (not `package.json` with pnpm
11) and regenerate the lockfile; assert the vulnerable resolved version is
absent before relying on the override.
