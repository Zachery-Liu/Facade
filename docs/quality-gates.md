# GitHub 质量门禁

Facade 将 `main` 视为可发布分支。所有功能应从 `main` 新建 `feat/<name>` 分支，通过 Pull Request 合入；不要直接向 `main` 推送功能改动。

仓库内的 GitHub Actions 提供以下检查：

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

## 启用 main Ruleset

GitHub Ruleset 是仓库设置，不能由普通 git 提交可靠地替代。将本分支推送并让所有工作流至少运行一次后，仓库管理员在 GitHub 执行以下操作：

1. 打开 **Settings → Rules → Rulesets → New branch ruleset**。
2. 命名为 `main quality gate`，目标分支设为 `main`，状态设为 **Active**。
3. 启用 **Require a pull request before merging**；要求至少一项批准，并启用“合并前必须解决所有会话”。
4. 启用 **Require status checks to pass** 和“要求分支为最新”；从 GitHub 实际显示的检查列表选择上表全部八项。状态检查名称以首次运行显示的名称为准，避免手工输入一个不存在的名称。
5. 启用 **Block force pushes**。管理员可保留 bypass 权限，以便紧急恢复；常规改动仍必须经 PR。

不要在首次工作流运行之前设置 required status checks：GitHub 只会列出近期已出现过的检查名称。

## 本地等价检查

在提交 Pull Request 前运行：

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm coverage
```

CodeQL 和 Dependency Review 由 GitHub 在 PR 上执行。它们不读取项目密钥；各工作流只申请完成自身任务所需的最小权限。
