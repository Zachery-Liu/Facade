# Frontend Directory Structure

## Observed layout

The Product Theme lives in `packages/facade/src/themes/product/`:

```text
themes/product/
├── components/       # AssetCard, AssetList, ReleaseNotes, ReleasePage
├── hooks/            # useCopyFeedback, useSelectionInput
├── browser-runtime.ts # progressive selection, appearance, copy controls
├── browser-bundle.ts  # generated browser asset embedded by the build
└── theme-style.ts     # CSS embedded in the built HTML
```

`ReleasePage` composes the page, `AssetList` maps normalized assets, and `AssetCard` owns the download link. `browser-runtime.ts` imports the same selector from `core/` as the read-only consumer. `packages/facade/scripts/bundle-browser.mjs` regenerates the browser bundle before tsup packages the CLI and Action.

Keep a component, its local props type, and narrow helpers together. Do not duplicate manifest validation or selection policy in a theme component.
