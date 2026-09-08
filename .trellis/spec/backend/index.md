# Backend Development Guidelines

These guidelines document the initial implemented Facade workspace. They must evolve as GitHub source, configuration, classification, and build orchestration are implemented.

| Guide | Use when |
| --- | --- |
| [Directory Structure](./directory-structure.md) | adding or moving modules |
| [Database Guidelines](./database-guidelines.md) | considering persistence |
| [Error Handling](./error-handling.md) | defining failures or selection states |
| [Logging Guidelines](./logging-guidelines.md) | emitting CLI or Action diagnostics |
| [Source Contracts](./source-contracts.md) | defining or consuming raw repository, release, or asset data |
| [Action and Pages Contracts](./action-pages-contracts.md) | changing the bundled Action, freshness checks, or Pages templates |
| [Quality Guidelines](./quality-guidelines.md) | writing or reviewing backend code |

## Pre-Development Checklist

Read Directory Structure and Quality Guidelines for every backend change. Read Error Handling for boundaries, Database Guidelines before proposing persistence, and Logging Guidelines when adding diagnostics.
Read Action and Pages Contracts before changing `action.yml`, the Action bundle,
live-build orchestration, or Pages workflow templates.
