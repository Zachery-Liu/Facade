# Backend Quality Guidelines

## Observed checks

The root workspace exposes `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `pnpm test`. `packages/facade/tsconfig.json` enables strict TypeScript; `packages/facade/eslint.config.mjs` applies TypeScript-aware linting.

Tests are offline and behavior-focused: `test/cli-help.test.ts` runs the built artifact, `test/release-page.test.tsx` covers schema/selection/SSR, and `test/runtime-diagnostics.test.ts` covers error/logging behavior.

Keep domain logic deterministic and typed. Do not use `any`, unchecked assertions, network calls in unit tests, or nondeterministic output ordering.
