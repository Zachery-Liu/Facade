# Backend Logging Guidelines

## Observed pattern

`src/runtime/logger.ts` emits one JSON line per event through an injected sink. The logger accepts `info`, `warn`, and `error`; `test/runtime-diagnostics.test.ts` verifies that undefined context fields are omitted.

Use stable, non-sensitive fields such as repository, tag, asset ID, configuration field, and output-relative path. `src/runtime/logger.ts` is intentionally a formatting boundary; callers decide the sink.

Never log tokens, authorization headers, raw environment values, absolute workstation paths, download contents, or unbounded responses.
