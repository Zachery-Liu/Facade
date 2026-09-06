# Facade Development Documentation

Facade's development, product-design, and implementation documentation is currently maintained **primarily in Simplified Chinese**.

This is intentional. During the project's rapid development phase, keeping the primary design and planning record in one language makes it easier for the current maintainer to capture product decisions, architectural constraints, implementation plans, and engineering rules accurately without creating unnecessary translation drift.

This convention applies to internal development documentation, not to stable end-user or contributor-facing documentation. As Facade matures, user-facing guides, CLI documentation, configuration references, and other public documentation may be provided in English and additional languages as needed.

## Current documents

- [`facade_product_plan.md`](./facade_product_plan.md) — product planning, architectural baseline, and core behavioral constraints. Primarily maintained in Simplified Chinese.
- [`implementation_plan.md`](./implementation_plan.md) — v0.1 implementation plan, work breakdown, and acceptance requirements. Primarily maintained in Simplified Chinese.
- [`quality-gates.md`](./quality-gates.md) — CI, coverage, Ruleset, and merge quality gates. English version.
- [`quality-gates.zh-CN.md`](./quality-gates.zh-CN.md) — Simplified Chinese translation of the quality-gates document.

## Language convention

Unless a document explicitly states otherwise, development documents under `docs/` are maintained primarily in Simplified Chinese and the Chinese version is the primary source during the current development phase.

When translations are added, the relationship between the primary document and its translation should be stated explicitly. Product or architecture decisions should not be maintained independently in different language versions.

Code, API names, configuration fields, commands, protocol names, and other technical identifiers should remain in their original English form.
