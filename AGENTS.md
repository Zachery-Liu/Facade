# Project Instructions

## Git delivery

- When the user asks to commit (including “提交”), create Conventional Commits for the requested work and push the resulting branch to its configured remote.
- Do not push only when the user explicitly says not to push (for example, “不要推送” or “不推送”).
- Never include unrelated or unrecognized working-tree changes in a commit.

## Branch workflow

- Start each independent new feature or Trellis task on a dedicated branch created from its approved base branch. Do not implement independent feature work directly on main.
- A CI fix, review change, rebase, or documentation correction for an unmerged pull request is part of that pull request's workstream, even if Trellis records it as a follow-up task. Keep that work on the existing pull request branch; do not create a child branch unless the user explicitly requests one or the scope is independent.
- If no relevant pull request is open, use a dedicated branch for the new work.

## Terminal recovery

- If Codex reports `setup refresh had errors`, do not infer that this repository or Trellis is unreadable or uninitialized.
- Request elevated command execution and retry a read-only context command such as `python .\.trellis\scripts\get_context.py`.
- If elevated execution is unavailable, report an environment-level blocker; do not present restarting Codex as the only recovery path.

<!-- TRELLIS:START -->
# Trellis Instructions

These instructions are for AI assistants working in this project.

This project is managed by Trellis. The working knowledge you need lives under `.trellis/`:

- `.trellis/workflow.md` — development phases, when to create tasks, skill routing
- `.trellis/spec/` — package- and layer-scoped coding guidelines (read before writing code in a given layer)
- `.trellis/workspace/` — per-developer journals and session traces
- `.trellis/tasks/` — active and archived tasks (PRDs, research, jsonl context)

If a Trellis command is available on your platform (e.g. `/trellis:finish-work`, `/trellis:continue`), prefer it over manual steps. Not every platform exposes every command.

If you're using Codex or another agent-capable tool, additional project-scoped helpers may live in:
- `.agents/skills/` — reusable Trellis skills
- `.codex/agents/` — optional custom subagents

Managed by Trellis. Edits outside this block are preserved; edits inside may be overwritten by a future `trellis update`.

<!-- TRELLIS:END -->
