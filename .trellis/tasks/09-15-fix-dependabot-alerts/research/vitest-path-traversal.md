# Vitest path traversal advisory

## Source

- GitHub Dependabot alerts 2, 3, and 4 for `Zachery-Liu/Facade`, queried on 2026-09-15.
- Advisory: `GHSA-82fw-gwwq-j7x9`, `CVE-2026-84373`.
- Vendor advisory: https://github.com/vitest-dev/vitest/security/advisories/GHSA-82fw-gwwq-j7x9

## Finding

All three medium alerts represent the same vulnerability. Redirect mocks in `@vitest/mocker` could read files outside the project root when an attacker can reach an exposed Vite development server WebSocket. Facade uses Vitest as a development dependency, but retaining the affected package is unnecessary risk.

Affected stable versions are `>=2.1.0, <4.1.11`. The first patched stable release is Vitest `4.1.11`; older 2.x and 3.x lines are not receiving the fix.

## Repository mapping

- `packages/facade/package.json` directly declares `vitest` and `@vitest/coverage-v8` 3.x.
- `pnpm-lock.yaml` resolves `vitest@3.2.7` and `@vitest/mocker@3.2.7`.
- Coverage and Vitest should remain version-aligned because the coverage package peers with Vitest.

## Chosen remediation

Upgrade both direct Vitest packages to exactly `4.1.11`, regenerate the pnpm lockfile, verify every Vitest-family resolution, run the complete repository gate, and run `pnpm audit`. Do not use a transitive-only override or dismiss the alerts.
