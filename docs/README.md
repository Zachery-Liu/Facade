# Facade Development Documentation

Facade's development, product-design, and implementation documentation is currently maintained **primarily in Simplified Chinese**.

This is intentional. During the project's rapid development phase, keeping the primary design and planning record in one language makes it easier for the current maintainer to capture product decisions, architectural constraints, implementation plans, and engineering rules accurately without creating unnecessary translation drift.

This convention applies to internal development documentation, not to stable end-user or contributor-facing documentation. As Facade matures, user-facing guides, CLI documentation, configuration references, and other public documentation may be provided in English and additional languages as needed.

## Current documents

- [`facade_product_plan.md`](./facade_product_plan.md) — product planning, architectural baseline, and core behavioral constraints. Primarily maintained in Simplified Chinese.
- [`implementation_plan.md`](./implementation_plan.md) — current v0.1 behavior freeze, work breakdown, and acceptance requirements. Primarily maintained in Simplified Chinese.
- [`roadmap.md`](./roadmap.md) — public long-term roadmap covering the distribution metadata layer, portable protocol, Registry, Agent software discovery, and open ecosystem. Maintained together with its Chinese translation.
- [`roadmap.zh-CN.md`](./roadmap.zh-CN.md) — Simplified Chinese translation of the public roadmap; structure and product meaning should remain synchronized with `roadmap.md`.
- [`quality-gates.md`](./quality-gates.md) — CI, coverage, Ruleset, and merge quality gates. English version.
- [`quality-gates.zh-CN.md`](./quality-gates.zh-CN.md) — Simplified Chinese translation of the quality-gates document.

## Current baseline precedence

During v0.1 implementation, [`implementation_plan.md`](./implementation_plan.md) is the most recent frozen source for task scope and behavior that has already been revised during implementation. The broader product plan remains the architectural baseline, but some older implementation-level details in it still require a dedicated synchronization pass before v0.1 release.

In particular, do not infer a current implementation requirement solely from an older library name, `preferredId` example, or fixed verification-status example in the product plan when the implementation plan and current code define a newer contract. Configuration precedence is intentionally **not** resolved by this note and remains a separate product decision.

## Language convention

Unless a document explicitly states otherwise, development documents under `docs/` are maintained primarily in Simplified Chinese and the Chinese version is the primary source during the current development phase.

The public Roadmap is an exception: `roadmap.md` and `roadmap.zh-CN.md` are maintained as synchronized English and Simplified Chinese versions because the roadmap is contributor-facing project documentation.

When translations are added, the relationship between the primary document and its translation should be stated explicitly. Product or architecture decisions should not be maintained independently in different language versions.

Code, API names, configuration fields, commands, protocol names, and other technical identifiers should remain in their original English form.
