# Frontend Type Safety

## Observed pattern

`src/manifest/release-page-manifest.ts` defines Zod schemas and derives `ManifestAsset` / `ReleasePageManifest` types with `z.infer`. `test/release-page.test.tsx` validates fixture data through the runtime schema before rendering; components import the derived types.

During the pre-release validation phase, `schemaVersion` is a nonnegative number, not a frozen `1` literal. Freeze the public `schemaVersion: 1` contract only after the documented real-sample, Product Theme, and consumer validation gate.

Use discriminated unions for selection state and avoid `any`, broad casts, non-null assertions, and unvalidated JSON input.
