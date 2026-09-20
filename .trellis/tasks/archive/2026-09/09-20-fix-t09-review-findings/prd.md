# Fix T09 review findings

## Goal

Correct four Product Theme review findings on the existing T09 branch.

## Acceptance criteria

- Every valid six-digit accent keeps text, focus outlines, and download button labels readable in light and dark appearance.
- A local brand image content change during a GitHub build invalidates the captured input and triggers the existing retry/failure policy.
- Release notes preserve blank lines inside fenced code and recognize headings immediately followed by body text while escaping untrusted text.
- Linux assets with `libc.family: none` never display `Requires none`.
- Add focused regressions and pass the documented quality gate.
