# Frontend Directory Structure

## Observed initial layout

The Product Theme lives in `packages/facade/src/themes/product/`:

```text
themes/product/
├── components/  # AssetCard, AssetList, ReleasePage
└── hooks/       # useCopyFeedback, useSelectionInput
```

`ReleasePage` composes the page, `AssetList` maps normalized assets, and `AssetCard` owns the download link. Shared contract and selection imports remain outside the theme in `manifest/` and `core/`.

Keep a component, its local props type, and narrow helpers together. Do not duplicate manifest validation or selection policy in a theme component.
