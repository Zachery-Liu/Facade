# 为 Facade 做贡献

[English](CONTRIBUTING.md) | 简体中文

> 本文档为英文版本的简体中文翻译。如中英文内容存在差异，以英文版本为准。

感谢你对 Facade 的关注和贡献。

Facade 欢迎由人类完成以及由 AI Agent 辅助完成的贡献。如果你使用 AI 编码 Agent，也请遵循下方的 [AI 与 Agent 贡献者](#ai-与-agent-贡献者) 说明。

Facade 目前仍处于积极开发阶段。相比把多个无关内容混在一起的大型 PR，我们更倾向于范围清晰、目标集中的小型 PR。

## 开始之前

提交 Bug 或功能建议前，请先搜索已有 Issue，避免重复。

如果变更会明显影响产品行为或架构，建议先开 Issue 讨论方向，再开始实现。

## 开发环境

Facade 使用 Node.js 和 pnpm。

```bash
corepack enable
pnpm install --frozen-lockfile
```

## 质量检查

创建 Pull Request 前，请运行：

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm coverage
```

针对 `main` 的 Pull Request 也会在 GitHub Actions 中执行对应检查。

## AI 与 Agent 贡献者

Facade 支持使用 AI 编码 Agent 参与开发，但 Agent 不应只读取仓库代码后就直接开始修改。

本仓库使用 [Trellis](.trellis/workflow.md) 管理持久化项目上下文、任务规划、编码规范和开发历史。

如果你使用 Codex、Claude Code、Cursor、Copilot 或其他具备 Agent 能力的工具，请先阅读：

- [`AGENTS.md`](AGENTS.md) — 面向 Agent 的仓库级指令；
- [`.trellis/workflow.md`](.trellis/workflow.md) — 开发生命周期和任务流程；
- [`.trellis/spec/`](.trellis/spec/) — 按 package 和 layer 组织的工程规范。

### 初始化 Agent 工作区

首次使用时，如果还没有配置 Trellis developer identity，请先初始化：

```bash
python ./.trellis/scripts/init_developer.py <your-name>
```

可以通过以下命令查看当前项目上下文：

```bash
python ./.trellis/scripts/get_context.py
python ./.trellis/scripts/get_context.py --mode packages
```

### 使用 Trellis 完成实现类工作

实现、重构、构建或其他会修改仓库内容的工作，Agent 通常应在编辑代码之前创建 Trellis task：

```bash
python ./.trellis/scripts/task.py create "<task title>"
```

预期流程为：

```text
规划
  ↓
调研 / 澄清需求
  ↓
记录任务和相关上下文
  ↓
实现
  ↓
验证
  ↓
沉淀可复用的项目知识
  ↓
提交
  ↓
完成 / 归档任务
```

开始实现之前，Agent 应阅读 `.trellis/spec/` 下与当前改动相关的规范，而不是依赖模型记忆中的约定。

任务相关的决策、调研结果和实现上下文应在适当情况下持久化到 Trellis task 目录，使其他 Agent 或后续会话无需依赖聊天历史也能继续工作。

### Agent 的责任

参与 Facade 开发的 Agent 应：

- 遵循 `AGENTS.md` 和当前 Trellis workflow；
- 修改实现代码前先完成规划；
- 独立工作使用独立分支；
- 不把无关或无法确认来源的工作区改动混入提交；
- 修改某个 package 或 layer 前阅读对应的 `.trellis/spec/`；
- 在适当情况下把任务调研和决策记录到仓库管理的 Trellis 文件中；
- 执行与人类贡献者相同的质量检查；
- 当改动形成可复用约定、架构决策或防止同类 Bug 的规则时更新项目 spec；
- 明确表达不确定性，不虚构缺失的需求或仓库事实。

如果 Agent 平台提供 Trellis 命令或项目级 Trellis skill，应优先使用这些能力，而不是手动仿造流程。

贡献者可以明确要求 Agent 在小型或特殊改动中跳过 Trellis task 流程，但 Agent 不应自行静默绕过该流程。

## 分支

从 `main` 创建描述清晰的独立工作分支，例如：

```text
feat/release-selection
fix/windows-asset-detection
docs/configuration-guide
```

不要直接在 `main` 上实现功能或修复。

## Commit

Commit subject 使用 Conventional Commit 风格：

```text
feat: add release selection
fix: handle missing architecture metadata
docs: document asset overrides
test: cover ambiguous release assets
refactor: simplify manifest construction
ci: update quality gates
chore: update development tooling
```

每个 commit 应保持目标集中，不要包含无关改动。

## Pull Request

Pull Request 应说明：

- 改了什么以及为什么要改；
- 如何完成验证；
- 是否修改了任何公开或机器可读的契约。

仓库使用 squash merge，因此 PR 标题应适合作为最终进入 `main` 的 commit subject。

## 设计原则

变更应继续遵循 Facade 的核心职责边界：

- 人类页面与 Agent 输出来自同一事实来源；
- 明确表达不确定性，不把推断包装成事实；
- 分类与推荐保持分离；
- 不代理 Release 下载；
- 不替用户执行安装或作出信任决策；
- 核心生成结果在没有 JavaScript 时仍然可用。

## 社区规范

参与本项目即表示你同意遵循 [行为准则](CODE_OF_CONDUCT.zh-CN.md)。

## 安全问题

请不要通过公开 Issue 报告安全漏洞。

私密报告流程请参阅 [SECURITY.zh-CN.md](SECURITY.zh-CN.md)。

## 许可证

向本仓库贡献代码即表示你同意你的贡献按照 GNU Affero General Public License v3.0 授权。
