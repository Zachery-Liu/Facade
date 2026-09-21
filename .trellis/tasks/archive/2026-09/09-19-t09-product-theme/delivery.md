# T09 delivery

## Implemented

- Product configuration, local brand imagery with repository containment and format checks, theme appearance and accent, and links flow into the v1 manifest and rendered page.
- Release body flows from the GitHub adapter or fixture through the neutral snapshot to `release.notes`, with source evidence. Notes use a safe Markdown subset.
- The Product Theme server renders every download, conditions, install command, notes, and Agent resource link. A browser bundle uses the shared selector for conservative environment hints and manual choices, plus appearance and copy feedback.
- Public JSON Schema, Agent navigation, docs, frontend specs, and built Action bundle are synchronized.

## Verification

- `pnpm test`: 188 tests passed (15 files).
- `pnpm coverage`: statements 93.58%, branches 85.92%, functions 93.06%, lines 96.93%; above repository thresholds.
- `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `git diff --check`: passed.
- Chrome preview: unknown architecture showed needs-input; manual x64 selected the matching Windows installer; dark appearance applied; 390px and 360px mobile views had no horizontal overflow, including an intentionally long product name and link label.

## Remaining process

- Commit the task changes, then archive this Trellis task and record the session per workflow.
