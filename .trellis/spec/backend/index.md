# Backend Development Guidelines

These guidelines document the Facade workspace through the T08 Agent Interface. They must continue evolving as the Product Theme, initialization UX, and release workflow are completed.

| Guide | Use when |
| --- | --- |
| [Directory Structure](./directory-structure.md) | adding or moving modules |
| [Database Guidelines](./database-guidelines.md) | considering persistence |
| [Error Handling](./error-handling.md) | defining failures or selection states |
| [Logging Guidelines](./logging-guidelines.md) | emitting CLI or Action diagnostics |
| [Source Contracts](./source-contracts.md) | defining or consuming raw repository, release, or asset data |
| [Action and Pages Contracts](./action-pages-contracts.md) | changing the bundled Action, freshness checks, or Pages templates |
| [Quality Guidelines](./quality-guidelines.md) | writing or reviewing backend code |
| [Shared Selection](./selection.md) | installation conditions, ranking, source policy or browser/consumer integration |
| [Agent Interface](./agent-interface.md) | public manifest, evidence, verification references, Agent files, or read-only consumers |

## Pre-Development Checklist

Read Directory Structure and Quality Guidelines for every backend change. Read Error Handling for boundaries, Database Guidelines before proposing persistence, and Logging Guidelines when adding diagnostics.
Read Action and Pages Contracts before changing `action.yml`, the Action bundle,
live-build orchestration, or Pages workflow templates.
