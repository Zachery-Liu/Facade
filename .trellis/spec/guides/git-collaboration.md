# Git Collaboration Guide

## Commit and push default

When the user asks to commit, including by saying “提交”, treat it as authorization to create Conventional Commits for the requested work and push the resulting branch to its configured remote.

Do not push only when the user explicitly says not to push, for example “不要推送” or “不推送”.

## Commit scope

- Include only files changed for the requested work or explicitly identified by the user.
- Do not include unrelated or unrecognized working-tree changes.
- Use a Conventional Commit type and concise imperative subject, such as `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, or `chore:`.
- Verify the staged diff before committing, and report the resulting commit and push status.
