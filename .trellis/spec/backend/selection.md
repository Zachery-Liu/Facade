# Shared installation selection

## 1. Scope / Trigger
All browser and read-only consumer installation decisions use the same pure core.

## 2. Signatures
`selectInstallation(manifest: unknown, environment: unknown, policy?: unknown): SelectionResult`, exported as `@facade/cli/selection`.

## 3. Contracts
See `docs/selection.md` and Zod schemas in `selection-contract.ts`. Unknown inputs fail closed; no ambient environment, I/O or command execution. Missing declarations are metadata, not unknown conditions. Universal needs an explicit macOS architecture set. Numeric version segments use BigInt.

## 4. Validation & Error Matrix
Malformed input, unsupported version, dangling IDs: needs-input with diagnostics. Declared mismatch: exclude. Unknown condition or disallowed evidence: needs-input. Unique compatible first rank: selected. Ties: needs-input. No viable candidates: no-match.

## 5. Good / Base / Bad Cases
Good: known macOS arm64 selects one matching installer. Base: missing minimum OS version is reported but does not block. Bad: unavailable environment architecture must never silently become x64.

## 6. Tests Required
Cover numeric version padding and invalid strings, Universal sets, Linux libc and formats, priority versus incompatible candidates, ordered fallback, command prerequisites, strict evidence, version binding, unsupported protocols, and hook/consumer parity. Preserve packaged CLI entry path when adding bundle entry points.

## 7. Wrong vs Correct
Wrong: alphabetically choose the first equal-ranked file, or skip an unknown preferred method.
Correct: return needs-input and preserve conditions/evidence. Only explicit mismatch permits preference fallback; the first matching rule owns fallback to default artifacts.
