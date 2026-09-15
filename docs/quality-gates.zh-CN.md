# GitHub 质量门禁

> 本文档为英文版本的简体中文翻译。如中英文内容存在差异，以英文版本为准。

[English](./quality-gates.md) | 简体中文

Facade 将 `main` 视为可发布分支。功能开发应从 `main` 创建独立分支，通过 Pull Request 合入；不要直接向 `main` 推送功能改动。

## Pull Request 合并要求

Pull Request 合入 `main` 前必须满足：

- 分支已经与最新的 `main` 保持同步；
- 所有 required status checks 均已通过；
- 所有 Review 会话均已解决；
- 使用 squash merge 完成合并。

仓库当前要求 `0` 个 approving reviews。这是 Facade 处于单人维护阶段时的有意配置，**并不代表普通贡献者拥有合并权限**：只有原本就具备仓库 merge 权限的用户才能合并 Pull Request。

GitHub 针对未归属到具体用户的 Copilot Pull Request 所提供的额外 approval 设置当前处于启用状态。由于 required approval 数量为 `0`，该设置目前不会产生实际效果。

## 本地检查

创建 Pull Request 前，请运行：

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm coverage
```

这些命令对应主要 CI 检查的本地版本。`minimum-node` job 会使用 package 声明的最低受支持 Node.js 版本再次执行项目检查。CodeQL 和 Dependency Review 则由 GitHub 在 Pull Request 上运行。

## GitHub 必需检查

仓库内的 GitHub Actions 提供以下 required checks：

| 工作流 | 检查 | 失败时的含义 |
| --- | --- | --- |
| `CI` | `typecheck` | TypeScript 类型检查未通过 |
| `CI` | `lint` | ESLint 有错误或 warning |
| `CI` | `test` | Vitest 测试失败 |
| `CI` | `build` | 生产构建失败 |
| `CI` | `coverage` | 覆盖率低于当前基线 |
| `CI` | `minimum-node` | 项目无法在 package 声明的最低受支持 Node.js 版本上通过检查 |
| `CodeQL` | `Analyze (actions)` | 工作流安全分析发现问题 |
| `CodeQL` | `Analyze (javascript-typescript)` | JavaScript/TypeScript 安全分析发现问题 |
| `Dependency review` | `dependency-review` | PR 引入了存在已知 high 或 critical 漏洞的依赖 |

各 workflow 仅申请完成自身任务所需的权限。CodeQL 和 Dependency Review 不读取项目密钥。

## 覆盖率基线

`pnpm coverage` 使用 Vitest 的 V8 provider，生成终端报告、Cobertura XML、JSON summary 和 HTML 报告。当前最低阈值是：

| 指标 | 最低值 |
| --- | ---: |
| Statements | 69% |
| Branches | 84% |
| Functions | 68% |
| Lines | 69% |

这是一条防回退基线，不是随意设定的远期目标。提高阈值时，必须同时在同一 Pull Request 中补足相应测试。

## 当前 `main` Ruleset

当前启用的 `main quality gate` GitHub Ruleset 对 `refs/heads/main` 生效，并执行以下仓库策略：

- 合入 `main` 前必须经过 Pull Request。
- 合并前必须解决 Review 会话。
- Required approval 数量在单人维护阶段为 `0`；有固定协作者后应提高该数量。
- GitHub 针对未归属 Copilot 变更的额外 approval 设置处于启用状态，但在 required approval 为 `0` 时目前不会产生实际效果。
- 要求线性历史，仓库只允许 squash merge。
- 阻止分支删除和 non-fast-forward 更新，包括 force push。
- Required status checks 使用上表九个检查名称，并要求分支在合并前保持最新。
- 仓库所有者 `Zachery-Liu` 只能通过 Pull Request bypass Ruleset，用于异常恢复，不作为日常开发路径。

## Ruleset 配置来源

预期的 Ruleset 配置已经版本化保存在 [`../.github/rulesets/main-quality-gate.json`](../.github/rulesets/main-quality-gate.json)。

GitHub 上实际生效的 Ruleset 与仓库内版本化 JSON 应描述同一套策略。如果有意修改 GitHub 上的实际设置，应在同一个 Pull Request 中同步更新 JSON 模板和本文档，避免仓库配置与文档发生漂移。

## 恢复或重建 Ruleset

Ruleset 当前已经启用。只有在规则被删除、仓库迁移或配置意外丢失时，才需要执行以下恢复流程：

1. 打开 **Settings → Rules → Rulesets → New ruleset → Import a ruleset**，选择 `.github/rulesets/main-quality-gate.json`。
2. 确认导入后的 Ruleset 名称为 `main quality gate`，目标为 `main`，状态为 **Active**。
3. 确认已启用 Pull Request 要求、会话解决、线性历史、仅 squash merge、删除保护和 non-fast-forward 保护。
4. 确认上表九个 required status checks 全部存在，并启用要求分支保持最新的 strict policy。
5. Facade 仍为单人维护时，确认 required approval 数量为 `0`。
6. 确认未归属 Copilot 变更的额外 approval 设置与版本化 JSON 保持一致。
7. 确认仓库所有者的 bypass 仍然仅限 Pull Request。

如果恢复时 GitHub 没有提供某个 required check 名称，请先运行一次对应 workflow，再选择 GitHub 实际生成的检查名称。
