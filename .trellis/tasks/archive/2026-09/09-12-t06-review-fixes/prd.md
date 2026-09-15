# Review and fix T06

## Goal

Review T06 against its existing classification, ordered override, and inspect contracts and fix reproducible defects on the existing T06 branch.

## Requirements

- Preserve token boundaries when recognizing compound x86_64/x86-64 architecture tokens.
- Keep unknown/conflicting OS assets with inferred libc buildable and consistent with inspect; preserve a diagnostic and publish unknown libc until Linux is established.
- Verify full-name globs consume trailing line terminators correctly (no implementation defect reproduced).
- Preserve source identities and deterministic inspect/build behavior.

## Acceptance Criteria

- Regression tests reproduce each finding before fixes and pass afterwards.
- Lint, typecheck, build, tests, and coverage pass without lowering thresholds.
- The bundled Action includes the fixes and relevant spec contracts are updated.

## Scope

The user's review/fix request confirms the existing T06 contract. No new T07/T08 functionality or unrelated workspace changes are included.

## Review Results

- Confirmed and fixed architecture substring inference: three regression inputs failed before the fix.
- Confirmed and fixed build/inspect inconsistency for inferred musl with missing or conflicting OS: two integration cases failed with BUILD_INVALID_MANIFEST before the fix.
- Full-name glob line-terminator cases already passed; retained boundary coverage without changing glob implementation.
- Validation: 117 tests passed across 13 files; coverage statements/lines 90.69%, branches 87.16%, functions 91.58%; TypeScript and CLI/Action builds passed.
- ESLint passed with zero warnings on all source/test TS, TSX, JS and MJS files enumerated with rg. Direct Node entrypoints were used because pnpm exec did not resolve the installed command shims in this session; directory-based lint traversal stalled.
- Source contracts and the tracked Action bundle are synchronized. The user approved committing, pushing, and opening the T06 pull request.
