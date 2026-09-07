# GitHub 质量门禁

> 本文档为英文版本的简体中文翻译。如中英文内容存在差异，以英文版本为准。

[English](./quality-gates.md) | 简体中文

Facade 将 `main` 视为可发布分支。功能开发应从 `main` 创建独立分支，通过 Pull Request 合入；不要直接向 `main` 推送功能改动。

仓库的 `main quality gate` GitHub Ruleset 当前已处于 **Active** 状态，并对 `refs/heads/main` 生效。仓库内的 GitHub Actions 提供以下 required checks：

| 工作流 | 检查 | 失败时的含义 |
| --- | --- | --- |
| `CI` | `typecheck` | TypeScript 类型检查未通过 |
| `CI` | `lint` | ESLint 有错误或 warning |
| `CI` | `test` | Vitest 测试失败 |
| `CI` | `build` | 生产构建失败 |
| `CI` | `coverage` | 覆盖率低于当前基线 |
| `CodeQL` | `Analyze (actions)` | 工作流安全分析发现问题 |
| `CodeQL` | `Analyze (javascript-typescript)` | JavaScript/TypeScript 安全分析发现问题 |
| `Dependency review` | `dependency-review` | PR 引入了已知 high 或 critical 漏洞的依赖 |

## 覆盖率基线

`pnpm coverage` 使用 Vitest 的 V8 provider，生成终端报告、Cobertura XML、JSON summary 和 HTML 报告。当前最低阈值是：

| 指标 | 最低值 |
| --- | ---: |
| Statements | 69% |
| Branches | 84% |
| Functions | 68% |
| Lines | 69% |

这是一条防回退基线，不是随意设定的远期目标。提高阈值时，必须同时在同一 PR 中补足相应测试。

## 当前 `main` Ruleset

当前启用的 `main quality gate` Ruleset 执行以下仓库策略：

- 合入 `main` 前必须经过 Pull Request。
- 合并前必须解决 Review 会话。
- Required approval 数量当前为 `0`，适合单人维护阶段；有固定协作者后应提高该数量。
- 要求线性历史，仓库只允许 squash merge。
- 阻止分支删除和 non-fast-forward 更新，包括 force push。
- Required status checks 使用上表八个检查名称，并要求分支在合并前保持最新。
- 仓库所有者 `Zachery-Liu` 只能通过 Pull Request bypass Ruleset，用于异常恢复，不作为日常开发路径。

预期的 Ruleset 配置已经版本化保存在 [`../.github/rulesets/main-quality-gate.json`](../.github/rulesets/main-quality-gate.json)。如果有意修改 GitHub 上的实际设置，应在同一次改动中同步更新该模板和本文档，避免仓库配置与文档发生漂移。

## 恢复或重建 Ruleset

Ruleset 当前已经启用。只有在规则被删除、仓库迁移或配置意外丢失时，才需要执行以下恢复流程：

1. 打开 **Settings → Rules → Rulesets → New ruleset → Import a ruleset**，选择 `.github/rulesets/main-quality-gate.json`。
2. 确认导入后的 Ruleset 名称为 `main quality gate`，目标为 `main`，状态为 **Active**。
3. 确认已启用 Pull Request 要求、会话解决、线性历史、仅 squash merge、删除保护和 non-fast-forward 保护。
4. 确认上表八个 required status checks 全部存在，并启用要求分支保持最新的 strict policy。
5. 确认仓库所有者的 bypass 仍然仅限 Pull Request。

如果恢复时 GitHub 没有提供某个 required check 名称，请先运行一次对应 workflow，再选择 GitHub 实际生成的检查名称。

## 本地等价检查

在提交 Pull Request 前运行：

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm coverage
```

CodeQL 和 Dependency Review 由 GitHub 在 Pull Request 上执行。它们不读取项目密钥；各 workflow 只申请完成自身任务所需的最小权限。
