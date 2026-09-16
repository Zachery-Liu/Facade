# T08 delivery

The complete read-only Agent Interface is implemented on `codex/t08-agent-interface`, based on merged `main` commit `4964c6e`.

- Manifest v1 now carries source/release identity, safe channel metadata, JSON-Pointer evidence, SHA-256 source digests, and reference-only verification materials.
- Repository YAML supports explicit channels and tag-scoped signature, Attestation, and source-commit declarations.
- Final signature references resolve uniquely after exclusions; ambiguous or missing bindings fail closed.
- `install.md` and base-path-aware `llms.txt` render from the validated manifest and make the no-verification/no-execution boundary explicit.
- `@facade/cli/selection` exports draft-07 JSON Schema data plus shared structural/semantic validation.
- Checked-in valid/invalid examples and the local-only consumer cover safe protocol handling.
- The bundled Action was rebuilt from the updated source.

## Verification

- `pnpm typecheck` — passed.
- `pnpm lint` — passed with zero warnings.
- `pnpm test` — 15 files, 171 tests passed.
- `pnpm build` — passed for CLI, selection export, declarations, and bundled Action.
- `pnpm coverage` — statements 93.58%, branches 87.30%, functions 94.31%, lines 96.00%.
- `git diff --check` — passed.

Unrelated pre-existing root-worktree paths remain excluded: `package.json`, `.playwright-cli/`, and `.worktrees/`.
