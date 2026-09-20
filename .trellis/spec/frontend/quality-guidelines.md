# Frontend Quality Guidelines

## Observed checks

`test/release-page.test.tsx` verifies that validated manifest data renders semantic static HTML and preserves explicit selection outcomes. The test runs offline with Vitest; `pnpm typecheck`, `pnpm lint`, and `pnpm build` are required alongside it.

The theme is server-rendered Preact with an embedded browser enhancement. Keep direct download links, notes, commands, and core release information available without JavaScript.

For browser runtime and style changes, check keyboard use, appearance modes, responsive layouts, long text, no-image states, unknown platforms, and multiple candidates. Do not ship client-only rendering or color-only status signals. A browser check should verify that the viewport has no horizontal overflow at narrow widths and that unknown architecture remains unresolved until supplied or reliably detected.
