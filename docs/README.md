# Facade Development Documentation

Facade's development, product-design, and implementation documentation is currently maintained **primarily in Simplified Chinese**.

This is intentional. During the project's rapid development phase, keeping the primary design and planning record in one language makes it easier for the current maintainer to capture product decisions, architectural constraints, implementation plans, and engineering rules accurately without creating unnecessary translation drift.

This convention applies to internal development documentation, not to stable end-user or contributor-facing documentation. As Facade matures, user-facing guides, CLI documentation, configuration references, and other public documentation may be provided in English and additional languages as needed.

## Current documents

- [`facade_product_plan.md`](./facade_product_plan.md) — broader product and architecture design baseline. Some implementation-level examples predate the current v0.1 contracts; use the precedence rules below before treating them as current requirements. Primarily maintained in Simplified Chinese.
- [`implementation_plan.md`](./implementation_plan.md) — current v0.1 behavior freeze, work breakdown, and acceptance requirements. Primarily maintained in Simplified Chinese.
- [`roadmap.md`](./roadmap.md) — public long-term roadmap covering the distribution metadata layer, portable protocol, Registry, Agent software discovery, and open ecosystem. Maintained together with its Chinese translation.
- [`roadmap.zh-CN.md`](./roadmap.zh-CN.md) — Simplified Chinese translation of the public roadmap; structure and product meaning should remain synchronized with `roadmap.md`.
- [`quality-gates.md`](./quality-gates.md) — CI, coverage, Ruleset, and merge quality gates. English version.
- [`quality-gates.zh-CN.md`](./quality-gates.zh-CN.md) — Simplified Chinese translation of the quality-gates document.

## Current baseline precedence

During v0.1 implementation, [`implementation_plan.md`](./implementation_plan.md) is the most recent frozen source for task scope and behavior that has already been revised during implementation. Current code and tests define the implemented contract. The broader product plan remains the architecture/design baseline, but older implementation examples in it are not authoritative when they conflict with the implementation plan or code.

In particular, do not infer a current implementation requirement solely from an older library name, `preferredId` example, fixed verification-status example, or minimal configuration example in the product plan when the implementation plan and current code define a newer contract.

The implemented GitHub source option precedence is **CLI > environment > config**. The source boundary currently resolves repository, release strategy/tag, and token using that order. This describes the current implementation; later public CLI/config work may extend the surface without silently changing the precedence rule.

## Current implementation boundary

The repository is still in v0.1 development. At the current implementation point:

- the public CLI surface is fixture-backed (`facade build --fixture ...`);
- the GitHub Release source and source-to-build bridge exist internally, but live GitHub CLI wiring is not yet exposed;
- the generated development manifest uses `schemaVersion: 0`; `schemaVersion: 1` is reserved for the v0.1 protocol freeze at release;
- the full classifier/override model, shared selector, `inspect`, Action/Pages path, Product Theme, and final Agent contract are still planned v0.1 work.

Use the current code and tests to answer “what works now,” `implementation_plan.md` to answer “what v0.1 must still deliver,” and `roadmap.md` to answer “what may come after the v0.1 foundation.”

## Language convention

Unless a document explicitly states otherwise, development documents under `docs/` are maintained primarily in Simplified Chinese and the Chinese version is the primary source during the current development phase.

The public Roadmap is an exception: `roadmap.md` and `roadmap.zh-CN.md` are maintained as synchronized English and Simplified Chinese versions because the roadmap is contributor-facing project documentation.

When translations are added, the relationship between the primary document and its translation should be stated explicitly. Product or architecture decisions should not be maintained independently in different language versions.

Code, API names, configuration fields, commands, protocol names, and other technical identifiers should remain in their original English form.
