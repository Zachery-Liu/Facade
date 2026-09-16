# Shared installation selection

## 1. Scope / Trigger
All browser and read-only consumer installation decisions use the same pure core.

## 2. Signatures
`selectInstallation(manifest: unknown, environment: unknown, policy?: unknown): SelectionResult`, exported as `@facade/cli/selection`.

## 3. Contracts
See `docs/selection.md` and Zod schemas in `selection-contract.ts`. Unknown inputs fail closed; no ambient environment, I/O or command execution. Missing declarations are metadata, not unknown conditions. Universal needs an explicit macOS architecture set; when the environment CPU architecture is missing or unknown, membership in that set is unknown and automatic selection must stop. Preference architectures are concrete; libc preference conditions are Linux-only. Numeric version segments use BigInt.

## 4. Validation & Error Matrix
Malformed input, unsupported version, dangling IDs: needs-input with diagnostics. Declared mismatch: exclude. Unknown top-ranked condition or disallowed evidence: needs-input. A lower-ranked unknown that cannot affect first place does not block a unique compatible winner. Unique compatible first rank: selected. Ties: needs-input. No viable candidates: no-match.

Prove a lower rank using accepted evidence. An unresolved `priority` has no trusted upper bound; unresolved architecture may gain exact-match rank, and unresolved OS/kind may gain purpose rank (a trusted Linux OS still has no purpose preference). If any viable unknown candidate could tie or outrank the first candidate, return needs-input. Keep reported ranks and evidence intact; potential rank bounds are internal and must not leak into JSON.

## 5. Good / Base / Bad Cases
Good: known macOS arm64 selects a Universal installer whose explicit set contains arm64. Base: missing minimum OS version is reported but does not block, and a lower-ranked unknown candidate does not block a known higher-priority winner. Bad: missing or unknown environment architecture must never satisfy a Universal set, silently become x64, or permit automatic selection; non-Linux preferences must not accept or ignore libc conditions.

## 6. Tests Required
Cover numeric version padding and invalid strings, Universal sets with known, missing, and unknown environment architectures, Linux-only libc preferences, concrete preference architectures, lower-ranked unknown candidates, priority versus incompatible candidates, ordered fallback, command prerequisites, strict evidence, version binding, unsupported protocols, and hook/consumer parity. Preserve packaged CLI and Action entry paths when adding bundle entry points.

Regress strict rejected priority and default unknown priority with an apparent 10-versus-0 winner; both must need input in either input order. Cover unresolved arch/kind/OS that can reach first place, a trusted priority gap that prevents it, and explicit incompatibility that still excludes an uncertain candidate.

## 7. Wrong vs Correct
Wrong: alphabetically choose the first equal-ranked file, treat an unknown CPU as a member of a Universal architecture set, let every lower-ranked unknown block a known winner, silently ignore a macOS libc condition, or skip an unknown preferred method.
Correct: return needs-input when the top rank or Universal membership is unresolved and preserve conditions/evidence; select a unique known winner when unknown candidates cannot reach its rank. Reject structurally inapplicable preference conditions. Only explicit mismatch permits preference fallback; the first matching rule owns fallback to default artifacts.

Wrong: use rejected priority 0 to conclude a candidate cannot beat trusted priority 10. Correct: return needs-input until that ranking uncertainty is resolved.
