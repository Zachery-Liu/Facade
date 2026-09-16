# Agent Interface contract mapping

## Sources inspected

- `docs/implementation_plan.md` sections 2.1–2.5, T08, and the validation matrix.
- `docs/facade_product_plan.md` sections 5.2–5.4, 8.4, 9, 13, and 14.
- T07 manifest, resolver, semantic validator, selector, generated-output code, tests, and read-only example.

## Existing baseline

T07 already provides a strict schema-version-1 selection model, tri-state selection, evidence-source policy, installation methods/preferences, safe handling of unknown versions, and a local-only example. The missing T08 pieces are public release/channel/source metadata, stable JSON-Pointer evidence, verification-material authoring and references, complete Agent renderers, distributable JSON Schema/examples, and consumer-facing two-layer validation.

## Contract decisions

1. `verificationMaterials` represents references, never a verification result. No `verified` boolean or positive trust label is added.
2. Structural checks remain in Zod/JSON Schema; cross-object rules remain in the shared semantic validator.
3. Evidence paths use RFC 6901 JSON Pointer syntax and are resolved against the final serialized manifest. Evidence is omitted for absent optional fields.
4. Explicit `stable` conflicts with a prerelease source; `beta` and `nightly` require author configuration; defaults derive only `stable` or `prerelease`.
5. Signature matching is exact after rule application: precisely one included signature asset is required. Source commits require a full 40-hex SHA and an exact tag-limited rule.
6. `install.md` and `llms.txt` are deterministic templates over structured fields. Release notes and other author free text are not interpolated as operational instructions.
7. The consumer validates schema version, structure, and semantics before calling the pure selector and performs no I/O beyond reading caller-supplied local JSON.

## Rejected approaches

- A separate hand-maintained JSON Schema: it can drift from runtime Zod validation.
- Treating signature/Attestation presence as verified: Facade does not perform cryptographic verification.
- Parsing Release Notes for commands or conditions: free text must not override structured metadata or consumer policy.
- Replacing the full T07 selection shape in T08: that conflates Agent safety work with T09 theme migration before the T12 protocol freeze.
