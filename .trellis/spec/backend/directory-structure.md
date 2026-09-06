# Backend Directory Structure

## Observed initial layout

The primary package is `packages/facade`. Its source currently follows the product-plan boundaries:

```text
packages/facade/src/
├── cli/                 # commander entry and program construction
├── core/                # pure selection-state logic
├── manifest/            # Zod runtime contract and derived types
├── runtime/             # shared error and diagnostics boundaries
└── themes/product/      # SSR product-theme implementation
```

Examples: `src/cli/index.ts` is the executable boundary, `src/core/selection-state.ts` is dependency-free domain logic, and `src/manifest/release-page-manifest.ts` owns the shared runtime contract. Tests mirror behavior in `test/`.

Add `config/`, `source/github/`, `classifier/`, `agent-interface/`, and Action code only when their documented work packages begin. Keep `core/` free of network, environment, and HTML concerns.
