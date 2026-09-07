# 安全策略

[English](SECURITY.md) | 简体中文

> 本文档为英文版本的简体中文翻译。如中英文内容存在差异，以英文版本为准。

## 报告安全漏洞

请不要通过公开 GitHub Issue 报告安全漏洞。

请前往 [GitHub Security Advisories](https://github.com/Zachery-Liu/Facade/security/advisories)，选择 **Report a vulnerability**，通过 GitHub 的私密漏洞报告渠道提交。

在问题完成评估，并在适当情况下提供修复或缓解措施之前，请不要公开披露漏洞细节。

提交安全报告时，请尽量包含：

- 问题描述；
- 受影响的版本或 commit；
- 在适当情况下提供复现步骤或 PoC；
- 潜在影响；
- 如果已知，可提供建议的缓解或修复方案。

除非理解问题确实必需，请不要提交真实凭证、Access Token、私有仓库内容或其他敏感用户数据。

## 支持的版本

Facade 当前仍处于积极的预发布开发阶段。

在正式建立稳定版本支持策略之前，安全修复通常只应用于最新开发版本。较旧的开发快照不应被视为仍会获得安全更新。

## 范围

安全报告可以涉及 Facade CLI、GitHub Action、生成产物、依赖处理、Release 元数据处理以及其他由本仓库维护的组件。

Facade 不代理 Release 下载、不自动替用户安装软件，也不替用户判断产物是否可信。如果问题实际来自某个项目通过 GitHub Releases 分发的第三方软件，通常应向该软件自己的维护者报告。
