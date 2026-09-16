# T07 shared installation selector

Implement docs/implementation_plan.md sections 2.1–2.3 and T07, as requested.

## Requirements
- Pure selectInstallation(manifest, environment, policy) shared by browser and read-only consumers.
- Tri-state conditions, missingMetadata, deterministic ranking without breaking ties by filename.
- Explicit Universal architecture sets; no default x64/glibc; numeric dotted versions only; no Linux OS version comparison.
- Ordered installation preferences, unknown blocks fallback, unavailable commands permit fallback, unverified version binding remains visible and policy-controlled.
- Default filename evidence and strict API/config-only policy; no execution, network, or verification.
- Extend current main contracts additively using T06 field names. Ensure every author-facing selection field has a complete repository YAML -> resolver -> Manifest producer path; `assetMatch` resolves against final eligible downloads.

## Acceptance
- Tests for conditions, ranks, preference transitions, evidence, malformed protocols/references and consumer parity.
- End-to-end YAML config -> resolver -> generated Manifest -> selector coverage, including assetMatch compilation and authored runtime constraints.
- Missing or unknown environment architecture keeps Universal membership unknown; only a known architecture contained in supportedArchitectures may match.
- Typecheck, lint, tests, build and coverage pass offline.
- Document environment inputs and result semantics; preserve static download links.

## Scope
T08 complete Agent Interface and T09 theme hydration/design remain separate. Provide a read-only consumer and browser hook integration now.
