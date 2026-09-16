# Frontend Type Safety

## Observed pattern

`src/manifest/release-page-manifest.ts` defines Zod schemas and derives `ManifestAsset` / `ReleasePageManifest` types with `z.infer`. `test/release-page.test.tsx` validates fixture data through the runtime schema before rendering; components import the derived types.

The validated runtime manifest uses the strict `schemaVersion: 1` contract. The
manifest parser may normalize legacy `schemaVersion: 0` inputs at the boundary,
but components and hooks consume only the resulting v1 shape. Unsupported
versions must fail closed instead of reaching rendering or selection logic.

Use discriminated unions for selection state and avoid `any`, broad casts, non-null assertions, and unvalidated JSON input.
