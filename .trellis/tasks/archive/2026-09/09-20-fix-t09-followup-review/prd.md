# Fix T09 follow-up review findings

## Goal

Correct the three remaining Product Theme review findings on the existing T09 branch.

## Acceptance criteria

- Download button hover preserves readable foreground/background contrast for every valid accent, including `#777777`.
- Release notes retain triple backticks inside a four-backtick fenced block and close only with a fence at least as long as the opener.
- Generated heading IDs are nonempty, unique within the page, and support Unicode headings and safe fragment links.
- Add regressions and pass the documented quality gate.
