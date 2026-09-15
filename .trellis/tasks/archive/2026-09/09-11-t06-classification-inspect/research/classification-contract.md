# T06 classification contract research

## Sources

- `docs/implementation_plan.md`: T06 scope and completion criteria; verification-material tag constraint.
- `docs/facade_product_plan.md`: configuration semantics (5.2-5.4), classifier (7), recommendation eligibility boundary (8.1), manifest evidence (9.1), inspect (11.2), fixtures/tests (14).
- Existing implementation under `packages/facade/src`: T03 classifier, strict Zod config, neutral source snapshots, staged build replacement, and Commander CLI.

## Contract distilled for implementation

1. Classification stays pure and conservative. Unknown and conflict are first-class states; there is no confidence percentage and no arbitrary fallback guess.
2. Delimiter-aware filename evidence may infer OS, architecture, format, kind, and Linux libc. Longest suffix and auxiliary-purpose detection precede platform inference.
3. Configuration is author-declared evidence. Rules use full-name, case-sensitive glob matching and apply in array order. A later rule replaces only explicitly supplied fields.
4. Exclusion is independently resettable. Priority is metadata for the later selector and cannot make an auxiliary or conflicted asset eligible.
5. Rule outcomes must be inspectable: matched assets, tag skips, zero-match warnings, field before/after values, and final exclusion.
6. Build and inspect must share resolution. The public manifest contains included final assets and stable field evidence; inspect additionally contains excluded assets and full traces.
7. T07 remains responsible for environment-aware matching/ranking. T08 remains responsible for complete verification-material resolution. T06 only exposes a conservative recommendation-eligibility fact needed to prove auxiliary/conflicted assets are filtered.

## Data-flow decision

```text
validated Source snapshot + validated config
  -> classify every raw asset
  -> apply applicable rules in order
  -> produce { manifest, inspect assets, diagnostics, rule results }
  -> build renderers consume manifest
  -> inspect text/JSON consume the structured report
```

For fresh GitHub builds, config text, source options, and snapshot already participate in the freshness fingerprint. The captured validated config must travel with that snapshot into publication; reloading it during publish would break the captured-input contract.

## Schema decision

- `downloads.auto` defaults to `true` when the block or field is omitted.
- `downloads.rules[]` is strict and contains `match`, optional exact `tag`, optional `exclude`, and optional strict `set`.
- `set` supports the T06 fields: `os`, `arch`, `format`, `kind`, `label`, `priority`, and `requirements.libc.family`.
- An applicable rule must provide `exclude` and/or at least one `set` field.
- Exact tag scoping is deliberately minimal and deterministic; pattern/range tag matching is not part of the frozen v0.1 scope.

## Test implications

- Table-driven classifier tests own token boundaries, synonyms, formats, auxiliary kinds, libc target patterns, and conflicts.
- Resolver tests own config order, tag applicability, unmatched diagnostics, exclusion reset, auto-off behavior, evidence, trace, eligibility, and determinism.
- CLI/integration tests prove fixture and GitHub config propagation plus text/JSON/build parity.
