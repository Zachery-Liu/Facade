# T09 Product Theme

## Goal

Turn the minimal server rendered release page into the public Product Theme described in `docs/implementation_plan.md`, while preserving the validated manifest as the source shared with Agent consumers.

## Requirements

- Author product name, description, safe brand imagery, site appearance (light, dark, auto), accent, and external links through strict configuration and the v1 manifest. Preserve useful source defaults and permit a useful page with none of these options.
- Show release channel/tag, release notes, download conditions, file sizes, installation commands and their version binding, all downloads including auxiliary files, and links to the Agent output.
- Server render the full usable page and every real download link. Add browser enhancement for conservative OS/architecture detection, shared `selectInstallation` results, manual selection, appearance switching, and copy feedback. Never guess architecture or libc.
- Keep `selected`, `needs-input`, and `no-match` visibly distinct; say that a recommendation meets only provided conditions. Do not claim an asset is verified merely because a digest or signature is listed.
- Support narrow screens, keyboard navigation, focus visibility, long text, missing imagery, and no JavaScript.
- Render release notes through a controlled Markdown subset that escapes raw HTML and rejects unsafe URL schemes. Do not execute installation commands.
- Keep manifest, install.md and llms.txt coherent. Validate new v1 fields and update documentation/examples as needed.

## Acceptance Criteria

- [x] A built `index.html` contains useful product and release details, all direct download links, and safe install commands without script execution.
- [x] Selection enhancement uses the shared core and preserves uncertainty; manual environment choices can resolve ambiguous or unknown results.
- [x] Light, dark, auto, accent, copy status, responsive layout, and keyboard access work.
- [x] Markdown input cannot inject active HTML or unsafe links.
- [x] Multiple candidates, unknown architecture, absent images, long text, and disabled JavaScript remain usable.
- [x] Typecheck, lint, tests, build, and coverage gates pass.

## Technical Approach

Keep Preact SSR for first paint and direct links. Add small browser runtime for progressive controls. Keep selection logic exclusively in `core/select-installation.ts`. Extend the strict config, snapshot, and manifest contracts only for fields the page actually consumes. Bundle theme assets as part of the build so the Action remains self-contained. Use a conservative Markdown renderer and explicit URL validation.

## Out of Scope

- Automatic downloads, command execution, or verification.
- Remote GitHub calls from the page.
- Third-party themes, general Markdown or raw HTML support, or a full client-side app.

## References

- `docs/implementation_plan.md` T09
- `docs/facade_product_plan.md` sections 5 and 10
- `docs/selection.md`; `.trellis/spec/frontend/`; `.trellis/spec/backend/selection.md`
