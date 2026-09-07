<p align="center">
  <img src="docs/assets/facade-logo-readme.svg" alt="Facade" width="380">
</p>

<p align="center"><strong>面向用户与 Agent 的软件发布页。</strong></p>

<p align="center">
  <a href="https://github.com/Zachery-Liu/Facade/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/Zachery-Liu/Facade/ci.yml?branch=main&style=flat-square&logo=githubactions&logoColor=white&label=CI"></a>
  <a href="https://github.com/Zachery-Liu/Facade/actions/workflows/codeql.yml"><img alt="CodeQL" src="https://img.shields.io/github/actions/workflow/status/Zachery-Liu/Facade/codeql.yml?branch=main&style=flat-square&logo=github&logoColor=white&label=CodeQL"></a>
  <a href="https://github.com/Zachery-Liu/Facade/actions/workflows/dependency-review.yml"><img alt="Dependency Review" src="https://img.shields.io/github/actions/workflow/status/Zachery-Liu/Facade/dependency-review.yml?branch=main&style=flat-square&logo=dependabot&logoColor=white&label=dependencies"></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/github/license/Zachery-Liu/Facade?style=flat-square&label=license"></a>
  <br>
  <a href="https://github.com/Zachery-Liu/Facade/issues"><img alt="Open issues" src="https://img.shields.io/github/issues/Zachery-Liu/Facade?style=flat-square&logo=github&label=issues"></a>
  <a href="https://github.com/Zachery-Liu/Facade/pulls"><img alt="Open pull requests" src="https://img.shields.io/github/issues-pr/Zachery-Liu/Facade?style=flat-square&logo=github&label=PRs"></a>
  <img alt="Status: v0.1 planning" src="https://img.shields.io/badge/status-v0.1%20planning-2563EB?style=flat-square">
  <a href="https://pnpm.io/"><img alt="pnpm 11.19.0" src="https://img.shields.io/badge/pnpm-11.19.0-F69220?style=flat-square&logo=pnpm&logoColor=white"></a>
</p>

<p align="center">
  <a href="README.md">English</a> · 简体中文
</p>

Facade 将 GitHub Release 转化为静态、易维护的下载页，并生成一组可供机器读取的安装元数据。安装包始终直接托管在 GitHub Releases；Facade 负责归一化和呈现分发事实，但不代理软件下载，也不替用户或 Agent 作出安装和信任决策。

## 当前状态

Facade 处于 v0.1 实施规划阶段。仓库目前包含产品基线、实施计划和 Trellis 工作流；CLI、GitHub Action 和生成的站点尚未实现。

## v0.1 计划提供的能力

- 为单个选定的公开 GitHub Release 生成静态下载页。
- 为 macOS、Windows 和 Linux 的 Release 附件提供直连下载。
- 归一化附件元数据：操作系统、架构、格式、用途、兼容条件、证据来源和选择理由。
- 以同一份 `ReleasePageManifest` 生成面向用户的页面及三个 Agent 入口：`manifest.json`、`install.md`、`llms.txt`。
- 提供 `facade init`、`facade inspect`、`facade build` 命令。
- 为独立发布和既有 CI 流水线提供 GitHub Action 模板，并部署至 GitHub Pages。

## 设计原则

- **单一事实来源。** 页面和 Agent 接口均由同一份 Manifest 生成。
- **明确表达不确定性。** 文件名推断不等同于维护者声明；未知就是未知。
- **分类与推荐分离。** 识别出附件属性，不代表它自动成为首选下载项。
- **由消费者承担决策。** Facade 可以描述签名、证明和安装偏好，但不验证产物，也不执行安装命令。
- **默认静态可用。** 核心输出无需 JavaScript；脚本只用于增强选择与交互。

## 计划架构

```text
GitHub API + 仓库配置 + 本地品牌资源
                   |
              Source / Loader
                   |
Classifier -> 覆盖规则 -> 选择器 -> ReleasePageManifest
                   |
     +-------------+-------------+
     |                           |
用户界面渲染器                  Agent 发布器
HTML / CSS / JS     manifest.json / install.md / llms.txt
     |                           |
     +-------------+-------------+
                   |
        用于 GitHub Pages 的静态产物
```

首版技术栈为 TypeScript、pnpm、Zod、Octokit、commander、Preact、Vite、Vitest 和 Playwright。项目初期仅维护一个主要 npm 包和一个 Action 入口，先通过内部模块边界隔离职责，避免过早拆分包。

## 计划流程

```text
Release 附件 + .github/facade.yml
              -> facade build
              -> HTML + manifest.json + install.md + llms.txt
              -> GitHub Pages
```

Facade 还计划提供一个紧凑的 `Released with Facade` 徽章，供维护者放在 GitHub Release 描述中。点击徽章后应直接打开该版本对应的 Facade 下载页。这个徽章用于导航和归属展示，不承担下载代理功能；如果未来提供自动写入 Release 描述的能力，也应当由维护者显式选择启用。

预期的最小配置如下：

```yaml
# .github/facade.yml
schema: 1
```

后续配置将支持版本选择、产品品牌、附件覆盖规则、安装偏好、验证材料引用和主题选项。首个可用的端到端构建完成后，会补充准确的 CLI 与 Action 用法。

## 路线图

1. 建立工程骨架、严格 TypeScript 构建、fixtures、Schema 和语义校验。
2. 完成离线端到端构建，生成四种静态输出。
3. 接入 GitHub 数据源、CLI、Action，并完成真实 GitHub Pages 验证。
4. 完成附件分类、可解释的覆盖规则和共享安装选择器。
5. 完成 Agent 契约与可访问的 Product Theme。
6. 验证打包、接入体验和外部集成，并冻结 v0.1 的 `schemaVersion: 1`。

## 范围边界

v0.1 明确不包含私有仓库、数据库、账号、支付、下载代理/CDN、托管分析、自动安装、实际签名或证明验证、历史版本、主题市场，以及 MCP/Agent Server。

## 文档

- [产品基线](docs/facade_product_plan.md)：产品范围、架构、契约、交互、Action 行为与验收标准。
- [质量门禁](docs/quality-gates.zh-CN.md)：CI 检查与当前 `main` 合并规则配置。
- [实施计划](docs/implementation_plan.md)：按依赖排序的任务包、验证矩阵和发布门槛。
- [Trellis 工作流](.trellis/workflow.md)：项目任务生命周期与 AI 协作流程。

## 开源协议

本项目采用 [GNU Affero General Public License v3.0（AGPL-3.0-only）](LICENSE)。
