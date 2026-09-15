# Shared installation selection

## 1. Scope / Trigger
All browser and read-only consumer installation decisions use the same pure core.

## 2. Signatures
`selectInstallation(manifest: unknown, environment: unknown, policy?: unknown): SelectionResult`, exported as `@facade/cli/selection`.

## 3. Contracts
See `docs/selection.md` and Zod schemas in `selection-contract.ts`. Unknown inputs fail closed; no ambient environment, I/O or command execution. Missing declarations are metadata, not unknown conditions. Universal needs an explicit macOS architecture set and remains eligible when the browser knows macOS but not its CPU architecture. Preference architectures are concrete; libc preference conditions are Linux-only. Numeric version segments use BigInt.

## 4. Validation & Error Matrix
Malformed input, unsupported version, dangling IDs: needs-input with diagnostics. Declared mismatch: exclude. Unknown top-ranked condition or disallowed evidence: needs-input. A lower-ranked unknown that cannot affect first place does not block a unique compatible winner. Unique compatible first rank: selected. Ties: needs-input. No viable candidates: no-match.

## 5. Good / Base / Bad Cases
Good: known macOS arm64 selects one matching installer; macOS with an unknown CPU selects a unique explicit Universal candidate. Base: missing minimum OS version is reported but does not block, and a lower-ranked unknown candidate does not block a known higher-priority winner. Bad: unavailable environment architecture must never silently become x64; non-Linux preferences must not accept or ignore libc conditions.

## 6. Tests Required
Cover numeric version padding and invalid strings, Universal sets with known and unknown environment architectures, Linux-only libc preferences, concrete preference architectures, lower-ranked unknown candidates, priority versus incompatible candidates, ordered fallback, command prerequisites, strict evidence, version binding, unsupported protocols, and hook/consumer parity. Preserve packaged CLI and Action entry paths when adding bundle entry points.

## 7. Wrong vs Correct
Wrong: alphabetically choose the first equal-ranked file, let every lower-ranked unknown block a known winner, silently ignore a macOS libc condition, or skip an unknown preferred method.
Correct: return needs-input when the top rank is unresolved and preserve conditions/evidence; select a unique known winner when unknown candidates cannot reach its rank. Reject structurally inapplicable preference conditions. Only explicit mismatch permits preference fallback; the first matching rule owns fallback to default artifacts.
