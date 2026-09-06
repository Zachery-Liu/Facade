# Frontend Quality Guidelines

## Observed checks

`test/release-page.test.tsx` verifies that validated manifest data renders semantic static HTML and preserves explicit selection outcomes. The test runs offline with Vitest; `pnpm typecheck`, `pnpm lint`, and `pnpm build` are required alongside it.

The current theme is server-rendered Preact. Keep direct download links and core release information available without JavaScript; hooks are optional enhancement only.

As the theme grows, add tests for keyboard use, appearance modes, responsive layouts, long text, no-image states, unknown platforms, and multiple candidates. Do not ship client-only rendering or color-only status signals.
