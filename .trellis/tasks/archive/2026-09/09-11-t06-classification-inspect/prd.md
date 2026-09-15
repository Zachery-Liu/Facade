# Implement T06 classification overrides and inspect

## Goal

Replace the T03 filename special cases with a conservative, explainable asset-classification pipeline; allow maintainers to correct classifications with ordered configuration rules; and expose the exact same resolved data through human-readable and JSON `facade inspect` output.

## What I already know

- `docs/implementation_plan.md` freezes T06 as complete OS, architecture, format, kind, libc, conflict, token-boundary, override, exclusion, priority, tag-scope, diagnostics, provenance, trace, and inspect work.
- `docs/facade_product_plan.md` defines the v0.1 enums, conservative inference behavior, full-name case-sensitive glob rules, ordered field replacement, and inspect expectations.
- The current compiler only recognizes four T03 filename shapes and the public manifest only carries `os` and `kind` among classification fields.
- `build` supports fixture and GitHub inputs; GitHub config is loaded by the fresh-build capture boundary but is not currently passed into compilation.
- T07 owns environment matching and shared final selection. T08 owns complete verification-material semantics and the full Agent Interface.

## Assumptions

- The checked-in implementation and product plans are the confirmed product contract; the user's request to complete T06 confirms this scope.
- A rule-level optional exact `tag` predicate is the T06 representation of tag scoping. A mismatch skips the whole rule and is visible in diagnostics.
- T06 adds the classification and override-related manifest fields required by later tasks without implementing T07's environment-aware selector.
- Fixture inspection may optionally consume the same YAML config as build so parity is testable offline.

## Open Questions

- None blocking. Schema details not explicitly named in the plan will follow the smallest strict representation consistent with the frozen semantics.

## Requirements

### Classification

- Classify each asset independently into:
  - OS: `macos | windows | linux | unknown`
  - architecture: `arm64 | x64 | x86 | universal | unknown`
  - format: `dmg | pkg | exe | msi | appimage | deb | rpm | zip | tar.gz | other`
  - kind: `installer | portable | archive | checksum | signature | debug | update | unknown`
  - libc: `glibc | musl | none | unknown`
- Preserve the source asset name, byte size, ID, and GitHub download URL.
- Detect auxiliary kinds before artifact inference and ensure they cannot become recommendation-eligible solely through priority.
- Prefer longest suffixes, use delimiter-aware tokens, and avoid substring false positives such as product names containing `win` or `mac`.
- Treat `x86_64` as x64 only and `win32-x64` as Windows x64.
- Infer musl only from a bounded token. Infer glibc from `glibc` or a recognized Linux GNU target pattern, not arbitrary `gnu` substrings.
- Record each field as inferred, unknown, explicit, or conflict, with a stable reason and optional rule/config path.
- Preserve contradictory token and token-versus-format evidence as diagnostics; do not silently choose a recommendation-eligible answer.

### Ordered overrides

- Extend strict config parsing with `downloads.auto` and ordered `downloads.rules`.
- Rules match the entire, case-sensitive asset name using glob syntax.
- A rule may be restricted to one exact release tag; a tag mismatch skips the complete rule and appears in inspect diagnostics.
- A rule may explicitly set or reset exclusion and may override only the provided fields: OS, architecture, format, kind, libc requirement, label, and integer priority.
- Later matching rules override only fields they explicitly provide. Every before/after change is retained in a stable trace.
- `downloads.auto: false` disables filename inference and only includes assets matched by at least one applicable rule.
- Zero asset matches produce a warning tied to the config path. Invalid rule/config combinations fail strict config parsing.
- Rules cannot change IDs, sizes, or download URLs.

### Shared resolution and inspect

- Introduce one shared resolution boundary returning the public manifest plus build diagnostics and inspect-only traces.
- Fixture build, GitHub build, text inspect, and JSON inspect use that boundary.
- Excluded assets are absent from build outputs but present in inspect with their exclusion reason and trace.
- `facade inspect` accepts the same source-selection inputs as `build`, plus `--json`; fixture mode supports an explicitly supplied config and otherwise uses defaults.
- Text output includes release/source selection, every source asset, final classification, field reasons, exclusion/recommendation eligibility, applied overrides, and unmatched/skipped rules.
- JSON output is deterministic structured data and uses the same final asset field semantics as `manifest.json`.
- Diagnostics and public artifacts never contain credentials or machine-local absolute paths.

## Acceptance Criteria

- [ ] Tests cover OS, architecture, format, kind, libc, longest suffixes, case variants, and token boundaries.
- [ ] Tests cover conflicting OS/architecture/libc tokens and token-versus-format conflicts without silent resolution.
- [ ] Tests prove checksum, signature, debug, and update assets are not recommendation-eligible regardless of priority.
- [ ] Tests cover full-name case-sensitive glob matching, ordered partial overrides, exclusion reset, exact tag match/mismatch, zero-match warnings, and `auto: false`.
- [ ] Evidence identifies filename inference versus project-config declarations; inspect contains the full ordered override trace.
- [ ] Text and JSON inspect are deterministic and match build classification for identical snapshot/config input.
- [ ] Fixture and GitHub build paths both apply downloads configuration.
- [ ] Existing build replacement, source, Action, and output-safety tests remain green.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm coverage` pass.

## Definition of Done

- T06 implementation, unit tests, integration/CLI tests, and relevant configuration examples/docs are complete.
- Public manifest schema and semantic checks reflect T06 fields without claiming T07/T08 behavior.
- New stable coding contracts discovered during implementation are added to `.trellis/spec/`.
- Changes are committed on the dedicated T06 branch without unrelated working-tree changes.

## Out of Scope

- Environment detection, compatibility evaluation, installation-preference fallback, and the T07 shared selector.
- Full verification-material resolution, signatures/attestations validation, install methods, and the T08 Agent Interface.
- Product-theme redesign (T09), `init` UX (T10), binary ELF/Mach-O/PE inspection, AI classification, or automatic installation.
- Claims that an inferred or configured artifact is cryptographically verified or universally compatible.

## Technical Approach

- Add a dedicated classifier module that emits per-field evidence and conflict diagnostics.
- Add a compiler/resolver layer that applies strict config rules in order, produces the manifest, and retains an inspect report.
- Keep classification logic pure and deterministic; isolate file loading/GitHub retrieval and CLI rendering at outer boundaries.
- Thread the loaded configuration through fresh-input capture so the fingerprinted config is exactly the config used for publication.
- Render inspect text from the structured report; JSON serializes the same report directly.

## Expansion Sweep

- Future evolution: keep field evidence and override traces extensible for T07 selection reasons and T08 verification materials, but do not implement them now.
- Related scenarios: preserve fixture/GitHub and build/inspect parity through one resolver rather than command-specific classifiers.
- Failure cases: retain unknown/conflict states, report zero-match and tag-skipped rules, reject malformed config, and never let priority bypass auxiliary/conflict eligibility.

## Technical Notes

- Product contract: `docs/facade_product_plan.md` sections 5.2-5.4, 7, 8.1, 9.1, 11.2, and 14.
- Sequencing contract: `docs/implementation_plan.md` T06, with T07 and T08 deliberately separate.
- Likely impacted areas: `src/classifier/`, `src/compiler/`, `src/config/`, `src/build/`, `src/cli/`, manifest schema/validation, and tests/fixtures.
