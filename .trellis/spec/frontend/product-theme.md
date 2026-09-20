# Product Theme contract

## 1. Scope / Trigger

Use this contract when changing `themes/product/`, the product configuration, or the build output that serves the release page. The page is a server-rendered projection of the validated v1 manifest with a small browser enhancement.

## 2. Signatures

```ts
ReleasePage({ manifest, basePath }: { manifest: ReleasePageManifest; basePath?: string })
selectInstallation(manifest: unknown, environment: unknown, policy?: unknown): SelectionResult
prepareRelease(snapshot: RepositorySnapshot, options: BuildReleaseOptions): Promise<PreparedRelease>
```

`browser-runtime.ts` imports the same `selectInstallation` implementation as the read-only consumer. `scripts/bundle-browser.mjs` regenerates `browser-bundle.ts` as part of `pnpm build`; keep that generated file and the Action bundle in sync.

## 3. Contracts

- Config `product` may provide `name`, `description`, local `icon`, and local `screenshot { src, alt }`; `theme` provides `name: product`, `appearance: light | dark | auto`, and a six-digit hex `accent`; `links` are HTTP(S) destinations without credentials.
- A source release may provide `body`. The resolver projects it as `manifest.release.notes` with evidence at `/release/notes`. Notes are author content, not trusted HTML.
- `manifest.product` contains the resolved display name, optional description, and published root-relative image paths. `manifest.theme` and `manifest.links` are validated v1 fields. The legacy `productName` and `releaseTag` remain for consumers.
- The exported draft-07 JSON Schema carries the local image path pattern and an HTTP(S), no-credentials pattern for `links[].url`; `validateReleasePageManifest` performs the final runtime and semantic checks.
- Brand images are read only from within the repository, checked by extension, file signature, and size, then copied under `branding/`. Build failures use `CONFIG_INVALID`.
- The generated HTML contains the usable release page, every asset's direct link, and install command text before JavaScript runs. Browser input supplies OS hints conservatively; architecture, libc, and version remain unknown unless supplied by the user. UI selection calls the shared core and displays its `selected`, `needs-input`, or `no-match` state.
- Render Markdown through a limited element set with Preact text escaping. Permit only HTTP(S) external links, safe repository-relative links resolved against the selected tag, and safe fragment links. Never execute install commands or claim that listed verification material was verified.
- Embed manifest JSON with `<`, `>`, and `&` escaped so data cannot close the script element. The browser runtime reads that payload; it does not fetch GitHub data.

## 4. Validation & Error Matrix

| Input or state | Required behavior |
| --- | --- |
| No JavaScript or script failure | All download links, release facts, notes, and commands remain in SSR HTML. |
| Unknown architecture or libc | No guessed compatibility; offer user inputs and direct links. |
| Invalid or off-repository image path | Fail the build with `CONFIG_INVALID`; do not copy the file. |
| Unsupported image content or oversize image | Fail the build with `CONFIG_INVALID`. |
| Raw HTML or unsafe Markdown link | Escape as text or omit the link destination. |
| Unverified install method or digest | Label as metadata/display only; do not imply verification. |

## 5. Good / Base / Bad Cases

- Good: a Windows OS hint plus a manually selected x64 architecture selects the matching installer if the core selector agrees.
- Base: absent image, description, notes, and install methods still produce a complete download page with repository and Agent links.
- Bad: inferring x64 from a Windows user agent, rendering release notes with `innerHTML`, or hiding raw downloads after a `needs-input` result.

## 6. Tests Required

- Assert the built HTML, manifest, and Agent files use the same release data and preserve direct links.
- Assert unsafe notes and brand URLs do not create active HTML or links; assert valid relative links resolve to the selected tag.
- Assert brand file containment, image format checks, and published paths.
- Assert unknown environment remains uncertain and a manual choice can resolve it; check light/dark/auto and mobile overflow in a browser when changing runtime or styles.
- Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, and `pnpm coverage` before delivery.

## 7. Wrong vs Correct

**Wrong:** Use a browser-specific ranking rule and inject notes HTML directly into the DOM.

**Correct:** Use `selectInstallation` for recommendations, render notes as safe Preact nodes, and retain static download links independently of the browser enhancement.
