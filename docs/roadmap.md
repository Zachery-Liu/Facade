# Facade Roadmap

> **Software releases for humans and agents.**

**Status:** Living roadmap. Near-term stages are concrete; later stages are directional and should only become release commitments after the underlying protocol proves useful in real projects.

This document describes **where Facade is going**. The task-by-task v0.1 execution plan remains in [`implementation_plan.md`](./implementation_plan.md).

- Product semantics and design: [`facade_product_plan.md`](./facade_product_plan.md)
- Current v0.1 execution plan: [`implementation_plan.md`](./implementation_plan.md)
- Chinese translation: [`roadmap.zh-CN.md`](./roadmap.zh-CN.md)

## Status labels

- **Current** — actively being built.
- **Near-term** — expected after the current foundation is proven.
- **Planned** — intended architecture, not yet a release commitment.
- **Exploration** — direction that depends on evidence from earlier stages.
- **Long-term** — optional evolution, not a current commitment.

---

## North Star

Facade should not stop at being a better GitHub Releases page. Its long-term role is:

> **A deterministic, explainable distribution metadata and resolution layer for software releases.**

```text
Source Code
    ↓
Build System
    ↓
Build / Artifact Metadata
    ↓
Release Source
    ↓
Facade Normalization
    ↓
Stable Manifest + Resolver
    ↓
Users / Agents / Registries / Catalogs
```

The core promise remains:

> **Software releases for humans and agents.**

## Architectural principles

1. **One source of truth.** User-facing UI, Agent interfaces, CLI consumers, registries, and catalogs should consume the same normalized facts and resolver semantics.
2. **Inference is not declaration.** Filename guesses are evidence, not ground truth.
3. **Unknown is valid.** Preserve uncertainty instead of manufacturing certainty.
4. **Explainability first.** Classification, assertions, conflicts, selection, and evidence should be inspectable.
5. **Determinism first.** Equivalent inputs should produce stable normalized outputs.
6. **Facts before execution.** Describe and resolve software before considering installation execution.
7. **Normalize evidence; do not invent trust.** Checksums, signatures, SBOMs, provenance, and attestations may be represented without Facade claiming more than they prove.
8. **Protocol before platform.** Stable metadata and resolver semantics come before a large registry, catalog, or installer experience.
9. **Source independence.** GitHub Releases is the first source adapter, not the protocol boundary.
10. **Publisher ownership by default.** Publishers should own manifests and artifact metadata; registries should index those facts rather than become their only home.
11. **Prefer declarations over smarter guessing.** The best classifier is often metadata emitted where an artifact is created.
12. **Compatibility is infrastructure.** Once external systems depend on Facade Manifest or resolver semantics, compatibility becomes a product promise.

---

## Roadmap at a glance

```text
v0.1 — Release Distribution Foundation        [Current]
        ↓
v0.2 — Distribution Intelligence              [Near-term]
        ↓
v0.3 — Build-Aware + Portable Protocol        [Planned]
        ↓
v1.0 — Compatibility Guarantee                [Planned]
        ↓
Registry                                      [Exploration]
        ↓
Catalog + Agent Software Registry             [Exploration]
        ↓
Open Ecosystem + Integrations                 [Exploration]
        ↓
Optional Installer / Store-like UX            [Long-term]
```

Version boundaries after v0.1 are directional. Scope should be promoted only when earlier layers have proven useful and stable in real repositories.

---

## v0.1 — Release Distribution Foundation

**Status: Current**

### Goal

Build one complete, deterministic path from a real GitHub Release to user-facing and machine-readable distribution interfaces.

```text
GitHub Release
    ↓
Source
    ↓
Classifier
    ↓
Maintainer overrides
    ↓
Shared selector
    ↓
ReleasePageManifest
    ↓
User UI + Agent Interface
```

### Core capabilities

- GitHub Release source and normalized repository snapshots
- structural and semantic validation
- conservative artifact classification
- maintainer overrides, exclusion, and recommendation priority
- inspectable provenance and diagnostics
- one shared installation selector
- stable Manifest and Agent Interface
- static user-facing release page
- CLI and GitHub Action integration
- deterministic output and safe staged replacement
- GitHub Pages deployment path

Initial target coverage focuses on macOS, Windows, and Linux; x64, arm64, and universal targets; and common installers/archives such as dmg, pkg, exe, msi, zip, tar.gz, deb, rpm, and AppImage.

The detailed T00–T12 work breakdown remains in [`implementation_plan.md`](./implementation_plan.md).

---

## v0.2 — Distribution Intelligence

**Status: Near-term**

### Goal

Move from “Facade can describe a release” to “Facade can diagnose and resolve a software distribution.”

### First-class target and environment models

Avoid an ever-growing flat OS enum. Target semantics should be composable:

```text
Target =
    OS
  + Architecture
  + ABI / libc
  + Runtime Requirements
  + Artifact Format
```

The consumer environment should become a first-class protocol object:

```text
Environment =
    OS
  + Architecture
  + ABI / libc
  + Runtime Versions
  + OS Version
  + Capabilities
```

Compatibility becomes an explicit relation:

```text
Artifact Target × Consumer Environment → Compatibility Result
```

### Policy engine

Compatibility answers **what can run**. Policy answers **what is allowed or preferred**.

```text
Facts → Compatibility → Policy → Selection
```

Policies may require signatures/provenance, deny channels, or prefer installation methods. Policy chooses among facts; it must not rewrite them.

### Release completeness diagnostics

Facade should report missing and ambiguous distribution coverage, for example missing Windows arm64, missing checksums, or assets with unknown architecture. A future strict mode may allow these diagnostics to become CI release-quality gates.

### Release graph and channels

Support stable, beta, nightly, LTS, and preview channels, then model relationships such as `supersedes`, `yanked`, `deprecated`, and `security-fixed-by`. The resolver should eventually answer both *which release* and *which artifact* should be selected.

### Package-manager references

Normalize external installation paths such as Homebrew, Winget, Scoop, Chocolatey, apt, dnf, Snap, Flatpak, AUR, npm, pip, and cargo without becoming a package manager. Version binding must remain explicit.

### Richer artifact roles

Expand roles beyond installer/archive to binary, checksum, signature, SBOM, provenance, debug symbols, source, update bundle, and documentation.

---

## v0.3 — Build-Aware + Portable Protocol

**Status: Planned**

### Goal

Move metadata closer to where facts are created and make Facade metadata usable independently of Facade's own site generator.

### Evidence model

Facade should distinguish:

```text
Declared   — emitted by a build system or producer
Observed   — measured from the artifact itself
Inferred   — derived from filenames or heuristics
Asserted   — explicitly supplied by a maintainer
```

These sources should not silently overwrite each other. Contradictions should be diagnosable:

```text
Declared: arm64
Observed: x64
→ conflict diagnostic
```

### Build-time declarations

Adapters may collect facts from Rust target triples, Go `GOOS`/`GOARCH`, C/C++ toolchains, Zig targets, Electron/Tauri packaging configuration, and other build systems.

Facade should not become a compiler. It should be the metadata bridge between build systems and software distribution.

### Artifact inspection

When declarations are unavailable, shallow inspection may recover high-confidence facts from formats such as ELF, Mach-O, and PE. Inspection results remain **observed evidence**, not maintainer declarations.

### Artifact identity

An artifact needs a stable semantic identity that survives filename or URL changes. Long-term objects should include:

```text
Project → Release → Artifact
```

Artifact identity should connect target, role, provenance, verification material, and content digest without treating a mutable URL as canonical identity.

### Portable manifest and sidecar metadata

Facade should support producer-owned metadata such as a release-level `facade-release.json` or equivalent sidecar representation. GitHub Releases should become one source of protocol objects rather than the permanent protocol boundary.

### Portable resolver

The selector should become a reusable resolver independent from the web UI:

```text
resolve(software | capability, environment, policy)
→ selected | needs-input | no-match
```

Capability-based resolution may later answer requests such as “provide the `ffmpeg` command for Linux arm64 musl under this policy.”

---

## v1.0 — Compatibility Guarantee

**Status: Planned**

### Goal

Turn the portable Manifest and Resolver ecosystem into a stable cross-implementation compatibility contract.

v0.1 already freezes the first public `ReleasePageManifest` contract as `schemaVersion: 1`. v0.3 makes that metadata portable and independently producible. v1.0 is where compatibility across independent producers, consumers, and resolver implementations becomes a durable public promise.

v1.0 should define:

- stable schema/version semantics
- backward/forward compatibility rules
- migration and deprecation policy
- protocol-level conformance tests
- independent producer conformance
- stable resolver behavior
- manifest discovery rules
- freshness and history semantics
- security/threat-model documentation

### Manifest discovery

Before v1.0, consumers need a stable way to discover whether a project publishes Facade metadata. Possible mechanisms include repository configuration, release assets, well-known metadata, HTTP link metadata, or registry lookup. The protocol should settle on explicit discovery rules rather than rely on guessing.

### Freshness, immutability, and history

Registry and resolver consumers need to know when facts were generated or observed and whether an artifact changed. Protocol maturity may require content digests, snapshot identity, `generatedAt` / `observedAt`, immutable artifact references, and refresh semantics.

### Threat model

Facade must clearly distinguish publisher claims, observed facts, registry indexes, and verification evidence. The protocol should define what a compromised registry can alter, how manifests bind to artifacts, and what an Agent may safely conclude from Facade metadata alone.

### Conformance

A tool should not need Facade's own build pipeline to produce Facade-compatible metadata. GoReleaser, Cargo tooling, Tauri, Electron packagers, CI systems, and other producers should be able to emit conformant manifests directly.

> A protocol becomes infrastructure when compatibility itself is treated as a feature.

---

## Registry

**Status: Exploration**

Once Manifest and Resolver semantics are stable, Facade can add a federated indexing layer:

```text
Publisher-owned Manifest
        ↓
Registry indexes facts
        ↓
Consumers query Registry
```

The Registry may index project identity, source, manifest location, latest stable release, channels, targets, installation methods, verification metadata, and publisher identity. It should not require Facade to host binaries.

Public, self-hosted, and alternative registry implementations should be able to coexist.

---

## Catalog + Agent Software Registry

**Status: Exploration**

A user-oriented Catalog can provide software discovery using the same normalized facts: search, categories, platform filters, license, installation methods, update recency, channels, and verification/provenance availability.

For Agents, Facade can replace web-search-and-filename-guessing with structured resolution:

```text
software / capability
+ environment
+ policy
    ↓
Registry + Resolver
    ↓
compatible release + artifact
+ install method
+ requirements
+ verification material
+ evidence
```

Users and Agents should always consume the same normalized release facts.

---

## Open Ecosystem + Integrations

**Status: Exploration**

Facade should remain useful even when Facade itself is not the only producer, registry, or consumer.

Community participation should be possible through:

- third-party source adapters
- third-party Manifest producers
- build-system integrations
- package/platform profiles
- resolver implementations
- public or self-hosted registries
- Catalog/search frontends
- IDE and Agent integrations
- shared fixture corpora
- protocol conformance suites
- interoperability tests and examples

Facade should prefer small, explicit integration contracts over a large arbitrary plugin runtime in the core.

```text
Facade = one reference implementation
      + interoperable third-party producers/consumers
      + no mandatory central hosted service
```

---

## Optional Installer / Store-like UX

**Status: Long-term**

Installation is a separate risk surface involving arbitrary code execution, privileges, dependencies, rollback, and supply-chain security. It should only be considered after Manifest, Resolver, Registry, and Catalog layers demonstrate real demand.

Keep the architectural boundary explicit:

```text
Registry = facts
Resolver = selection
Installer = execution
```

A Catalog may become visually store-like without requiring a marketplace, payments, centralized binary hosting, or proprietary infrastructure.

---

## Platform expansion strategy

Expand through the composable target/environment model rather than special-case enums.

**Initial:** Windows/macOS/Linux, x64/arm64/universal, common installers and archives.

**Next:** FreeBSD, x86, armv7, riscv64, glibc/musl, more package formats, minimum runtime requirements, and richer CLI/server software support.

**Later:** Android and iOS should use dedicated distribution profiles because ABI, SDK, signing, stores, entitlements, and distribution restrictions do not fit the desktop artifact model cleanly.

---

## Explicit early non-goals

Do not prioritize these before the metadata protocol is mature:

- automatic installer execution
- arbitrary shell execution
- becoming a general package manager
- dependency solving
- binary CDN hosting
- mandatory centralized accounts
- recommendation feeds, ratings, or reviews
- AI as the canonical artifact classifier
- arbitrary plugin scripts
- automatic trust claims
- deep binary reverse engineering

> **Keep the core deterministic.**

AI may consume Facade facts. AI should not become the canonical source of those facts.

---

## Decision gates

Roadmap stages should be unlocked by evidence, not implementation enthusiasm.

### Before v0.1 release

- the current implementation plan is complete
- several real GitHub repositories build successfully
- deterministic output and Pages workflows are verified
- external onboarding is tested
- release schema and compatibility semantics are frozen

### Before build-time integration becomes core

- target and Environment models are no longer filename-centric
- provenance can express declared, observed, inferred, and asserted facts
- contradictory evidence is diagnosed instead of silently overwritten
- artifact identity semantics are stable enough to survive filename/URL changes
- release-only workflows still work without build integration

### Before a public Registry

- Manifest is portable
- Resolver is independent from the UI
- Environment, compatibility, policy, and identity models are credible
- publisher ownership/federation rules are defined
- third-party producers can pass conformance tests

### Before Installer / Store-like UX

- Registry and Catalog demonstrate real demand
- a dedicated security model exists
- installation execution is isolated from metadata resolution

---

## Evolution map

```text
Better Release Experience
        ↓
Distribution Metadata Layer
        ↓
Distribution Intelligence
        ↓
Build-Aware Metadata
        ↓
Portable Manifest + Resolver Protocol
        ↓
Registry
        ↓
Catalog + Agent Software Registry
        ↓
Open Ecosystem + Integrations
        ↓
Optional Installer / Store-like UX — only if justified
```

The invariant is:

```text
Facts
→ Identity
→ Normalization
→ Compatibility
→ Policy
→ Resolution
→ Protocol
→ Compatibility Guarantee
```

## One-sentence summary

Facade should evolve from a GitHub Release presentation tool into **the build-aware distribution metadata and resolution layer that lets users and agents understand the same software release from the same set of facts.**

> **Software releases for humans and agents.**
