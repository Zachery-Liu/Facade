# Backend Directory Structure

## Current layout through T04

The primary package is `packages/facade`. Its source currently follows the product-plan boundaries:

```text
packages/facade/src/
├── build/               # validated snapshot-to-static-output boundary
├── cli/                 # commander entry and program construction
├── compiler/            # pure snapshot-to-manifest compilation
├── config/              # strict runtime configuration schemas
├── core/                # pure selection-state logic
├── manifest/            # Zod runtime contract and derived types
├── source/              # neutral contracts and provider adapters
│   └── github/          # GitHub REST mapping, options, and build bridge
├── runtime/             # shared error and diagnostics boundaries
└── themes/product/      # SSR product-theme implementation
```

Examples: `src/cli/index.ts` is the executable boundary,
`src/build/offline-build.ts` owns static output replacement,
`src/compiler/release-compiler.ts` remains deterministic, and
`src/manifest/release-page-manifest.ts` owns the shared runtime contract. Tests
mirror behavior in `test/`.

`src/source/repository-snapshot.ts` owns the provider-neutral Source contract;
GitHub field mapping and retry policy stay under `src/source/github/`.
Configuration parsing belongs in `config/`, while build I/O and pure compilation
remain separated under `build/` and `compiler/`. Add `agent-interface/` and
Action code only when their documented work packages begin. Keep `core/` free
of network, environment, filesystem, and HTML concerns.
