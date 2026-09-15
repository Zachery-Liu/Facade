# Dependabot alert remediation delivery

- Branch: `fix/dependabot-alerts`, based on `origin/main` at `302418b`.
- Alerts 2, 3, and 4 map to `GHSA-82fw-gwwq-j7x9` / `CVE-2026-84373`.
- `vitest`, `@vitest/coverage-v8`, and resolved `@vitest/mocker` are all `4.1.11`.
- No Vitest 3.x resolution remains in `pnpm-lock.yaml`.
- Frozen offline install, typecheck, lint, build, 80 tests, and coverage pass.
- Coverage: 93.95% statements, 88.37% branches, 93.24% functions, 95.14% lines.
- `pnpm audit --audit-level=moderate --registry=https://registry.npmjs.org` reports no known vulnerabilities.
- `action/dist/index.cjs` content hash remains identical to `origin/main` and is excluded from the change.
