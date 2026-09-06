# Component Guidelines

## Observed pattern

Components are typed Preact functions with local prop aliases. `AssetCard` accepts one normalized `ManifestAsset`; `AssetList` composes cards; `ReleasePage` composes semantic page content. All three are in `src/themes/product/components/` and render through `test/release-page.test.tsx`.

Use semantic elements and native download links: `AssetCard` renders an `<a>` and `ReleasePage` renders `<main>`/`<h1>`. Pass normalized manifest data, never raw source API objects.

Do not hide manual choices or state uncertainty in presentation code, and do not render untrusted Markdown as raw HTML.
