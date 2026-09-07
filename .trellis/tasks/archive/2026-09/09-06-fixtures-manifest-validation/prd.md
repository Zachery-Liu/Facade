# T02 Fixtures and Manifest Validation

## Goal

Establish offline release fixtures and a shared validation boundary for Facade configuration and Manifest data, so later source, renderer, CLI, and Action work use explicit contracts.

## Requirements

- Add checked-in release fixtures with assets covering macOS, Windows, Linux, checksum/signature, unknown, and conflicting-name cases.
- Define Zod schemas for configuration, normalized assets, evidence, and Manifest structure without freezing the public v0.1 schema version.
- Add semantic validation for unique IDs, asset URL uniqueness, evidence references, and signature references.
- Keep all fixture tests offline and deterministic.

## Acceptance Criteria

- [x] Valid fixtures parse and semantic validation succeeds.
- [x] Invalid fixtures produce actionable diagnostics.
- [x] No test makes a network request.
- [x] Schema version remains explicitly pre-freeze.

## Out of Scope

- GitHub API loading, asset classification heuristics, CLI commands, rendering outputs, Action deployment.

## Scope reconciliation

T01 initially added a provisional Manifest and render slice to establish tooling examples. T02 owns the contract validation and fixtures from this point; the reviewed schema and semantic tests are its authoritative continuation.

## Technical Notes

- Product plan: `docs/implementation_plan.md` T02 and `docs/facade_product_plan.md` sections 5 and 9.
- Build on the T01 Zod and test setup.
