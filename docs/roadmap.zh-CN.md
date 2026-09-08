# Facade 路线图

> **Software releases for humans and agents.**  
> **面向用户与 Agent 的软件发布。**

**状态：** 本文档为持续演进的路线图。近期阶段相对具体；后续阶段属于方向性规划，只有在底层协议经过真实项目验证后，才应提升为正式版本承诺。

本文描述的是 **Facade 将往哪里发展**。逐任务的 v0.1 实施计划仍保留在 [`implementation_plan.md`](./implementation_plan.md)。

- 产品语义与设计：[`facade_product_plan.md`](./facade_product_plan.md)
- 当前 v0.1 实施计划：[`implementation_plan.md`](./implementation_plan.md)
- 英文版：[`roadmap.md`](./roadmap.md)

## 状态标签

- **Current / 当前** — 正在实施。
- **Near-term / 近期** — 当前基础验证完成后优先推进。
- **Planned / 已规划** — 属于目标架构，但尚未作为具体版本承诺。
- **Exploration / 探索** — 依赖前序阶段真实验证结果的发展方向。
- **Long-term / 长期** — 可选的远期演进，不属于当前承诺。

---

## 北极星

Facade 不应该停留在“更好的 GitHub Releases 页面”。它长期应该成为：

> **一层确定性、可解释的软件发布元数据与解析基础设施。**

```text
源代码
   ↓
构建系统
   ↓
构建 / Artifact 元数据
   ↓
Release Source
   ↓
Facade 规范化
   ↓
稳定 Manifest + Resolver
   ↓
用户 / Agent / Registry / Catalog
```

核心产品承诺保持不变：

> **Software releases for humans and agents.**  
> **面向用户与 Agent 的软件发布。**

## 架构原则

1. **单一事实来源。** 用户界面、Agent 接口、CLI、Registry 与 Catalog 应消费同一份规范化事实与 Resolver 语义。
2. **推断不等于声明。** 文件名猜测只能作为 evidence，而不是 ground truth。
3. **`unknown` 是合法结果。** 无法安全判断时保留不确定性，而不是制造确定性。
4. **可解释性优先。** 分类、维护者声明、冲突、选择结果与证据链都应可检查。
5. **确定性优先。** 等价输入应产生稳定的规范化输出。
6. **先描述事实，再考虑执行。** 先描述与解析软件，再考虑安装执行。
7. **规范化证据，不制造信任。** 可以表达 checksum、signature、SBOM、provenance、attestation，但不能声称证据没有证明的事情。
8. **先协议，后平台。** 稳定 Metadata 与 Resolver 语义优先于大型 Registry、Catalog 或 Installer 体验。
9. **Source 独立。** GitHub Releases 是第一个 Source Adapter，而不是永久协议边界。
10. **默认由 Publisher 拥有事实。** 发布者应拥有自己的 Manifest 与 Artifact metadata，Registry 负责索引，而不是成为事实唯一存放位置。
11. **优先声明事实，而不是不断提高猜测复杂度。** 最好的 classifier 往往是 Artifact 产生时就记录下来的事实。
12. **兼容性本身就是基础设施能力。** 一旦外部系统依赖 Manifest 或 Resolver，兼容性就成为产品承诺。

---

## 路线总览

```text
v0.1 — Release Distribution Foundation        [Current / 当前]
        ↓
v0.2 — Distribution Intelligence              [Near-term / 近期]
        ↓
v0.3 — Build-Aware + Portable Protocol        [Planned / 已规划]
        ↓
v1.0 — Compatibility Guarantee                [Planned / 已规划]
        ↓
Registry                                      [Exploration / 探索]
        ↓
Catalog + Agent Software Registry             [Exploration / 探索]
        ↓
Open Ecosystem + Integrations                 [Exploration / 探索]
        ↓
Optional Installer / Store-like UX            [Long-term / 长期]
```

v0.1 之后的版本边界是方向性的。只有当前一层在真实仓库中证明有价值且足够稳定后，后续能力才应提升为正式版本范围。

---

## v0.1 — Release Distribution Foundation

**状态：Current / 当前**

### 目标

建立一条从真实 GitHub Release 到面向用户与机器的分发界面的完整、确定性链路。

```text
GitHub Release
    ↓
Source
    ↓
Classifier
    ↓
维护者覆盖规则
    ↓
共享 Selector
    ↓
ReleasePageManifest
    ↓
User UI + Agent Interface
```

### 核心能力

- GitHub Release Source 与规范化 RepositorySnapshot
- 结构与语义校验
- 保守的 Artifact 分类
- 维护者覆盖、排除与推荐优先级
- 可检查的 provenance 与 diagnostics
- 单一共享安装 Selector
- 稳定 Manifest 与 Agent Interface
- 静态用户下载页
- CLI 与 GitHub Action 集成
- 确定性输出与安全 staged replacement
- GitHub Pages 部署路径

首版重点验证 macOS、Windows、Linux；x64、arm64、universal；以及 dmg、pkg、exe、msi、zip、tar.gz、deb、rpm、AppImage 等常见 Installer / Archive。

详细 T00–T12 任务仍见 [`implementation_plan.md`](./implementation_plan.md)。

---

## v0.2 — Distribution Intelligence

**状态：Near-term / 近期**

### 目标

从“Facade 能描述一个 Release”升级到“Facade 能诊断并解析一个软件分发”。

### 一等 Target 与 Environment 模型

不要无限扩充扁平 OS enum。长期 Target 应由可组合维度构成：

```text
Target =
    OS
  + Architecture
  + ABI / libc
  + Runtime Requirements
  + Artifact Format
```

Consumer Environment 也应成为协议一等对象：

```text
Environment =
    OS
  + Architecture
  + ABI / libc
  + Runtime Versions
  + OS Version
  + Capabilities
```

兼容性应成为明确关系：

```text
Artifact Target × Consumer Environment → Compatibility Result
```

### Policy Engine

Compatibility 回答“什么能运行”，Policy 回答“什么被允许或更应该被选择”。

```text
Facts → Compatibility → Policy → Selection
```

Policy 可以要求签名 / provenance、禁止某些 channel、偏好某种安装方式，但 Policy 只能在事实之间选择，不能改写事实。

### Release Completeness Diagnostics

Facade 不只要描述“有什么”，也要报告“缺什么、哪里不明确”，例如缺失 Windows arm64、没有 checksum、存在未知 architecture。未来 strict 模式可以把这些诊断升级为 CI Release Quality Gate。

### Release Graph 与 Channel

支持 stable、beta、nightly、LTS、preview，并进一步表达 `supersedes`、`yanked`、`deprecated`、`security-fixed-by` 等关系。Resolver 最终应同时回答“选哪个 Release”和“选哪个 Artifact”。

### Package Manager Reference

规范化 Homebrew、Winget、Scoop、Chocolatey、apt、dnf、Snap、Flatpak、AUR、npm、pip、cargo 等现有安装路径，但不让 Facade 变成 Package Manager。版本绑定必须明确。

### 更丰富的 Artifact Role

从 installer/archive 扩展到 binary、checksum、signature、SBOM、provenance、debug symbols、source、update bundle、documentation。

---

## v0.3 — Build-Aware + Portable Protocol

**状态：Planned / 已规划**

### 目标

让元数据尽可能靠近事实产生的位置，并使 Facade Metadata 脱离站点生成器也能独立使用。

### Evidence 模型

Facade 应区分：

```text
Declared   — 构建系统或 producer 明确输出
Observed   — 从 Artifact 本身观测得到
Inferred   — 从文件名或 heuristic 推断
Asserted   — 维护者明确声明
```

它们不能彼此静默覆盖。矛盾必须可诊断：

```text
Declared: arm64
Observed: x64
→ conflict diagnostic
```

### Build-time Declaration

Adapter 可以从 Rust target triple、Go `GOOS`/`GOARCH`、C/C++ toolchain、Zig target、Electron/Tauri packaging config 等来源收集事实。

Facade 不应成为 compiler，而应成为 build system 与 software distribution 之间的 metadata bridge。

### Artifact Inspection

当声明不存在时，可以对 ELF、Mach-O、PE 等进行浅层检查，恢复高置信度信息。Inspection 结果属于 **observed evidence**，不能包装成维护者声明。

### Artifact Identity

Artifact 需要一个稳定语义身份，而不是只靠 filename 或 URL：

```text
Project → Release → Artifact
```

Artifact Identity 应关联 Target、Role、Provenance、Verification Material 与 Content Digest，并避免把可变 URL 当作 canonical identity。

### Portable Manifest 与 Sidecar Metadata

Facade 应支持由 Publisher 拥有的 release-level `facade-release.json` 或等价 sidecar metadata。GitHub Releases 应逐步成为协议对象的一种 Source，而不是协议边界。

### Portable Resolver

Selector 应演进成与 Web UI 解耦的通用 Resolver：

```text
resolve(software | capability, environment, policy)
→ selected | needs-input | no-match
```

Capability-based resolution 未来可以回答：“在 Linux arm64 musl 且满足指定 Policy 的环境中，哪个软件可以提供 `ffmpeg` 命令？”

---

## v1.0 — Compatibility Guarantee

**状态：Planned / 已规划**

### 目标

把 Manifest 与 Resolver 从内部实现细节升级成稳定公共契约。

v1.0 应明确：

- 稳定 Schema / Version 语义
- Backward / Forward Compatibility 规则
- Migration 与 Deprecation Policy
- Protocol Conformance Tests
- 独立 Producer Conformance
- 稳定 Resolver 行为
- Manifest Discovery 规则
- Freshness 与 History 语义
- Security / Threat Model 文档

### Manifest Discovery

在 v1.0 前，Consumer 必须能稳定发现某个项目是否发布 Facade Metadata。可能机制包括 repository config、release asset、well-known metadata、HTTP link metadata 或 Registry lookup。协议最终必须给出明确规则，而不是靠猜。

### Freshness、Immutability 与 History

Registry / Resolver 需要知道事实何时生成、何时被观测，以及 Artifact 是否发生变化。协议成熟后可能需要 content digest、snapshot identity、`generatedAt` / `observedAt`、immutable artifact reference 与 refresh semantics。

### Threat Model

Facade 必须明确区分 Publisher Claim、Observed Fact、Registry Index 与 Verification Evidence。需要定义 Registry 被攻破后能篡改什么、Manifest 如何与 Artifact 绑定，以及 Agent 仅根据 Facade Metadata 能安全得出什么结论。

### Conformance

第三方工具不应必须使用 Facade 自己的 build pipeline 才能生成 Facade-compatible Metadata。GoReleaser、Cargo tooling、Tauri、Electron packager、CI system 等都应可以直接生成协议兼容 Manifest。

> 当兼容性本身被当作产品能力维护时，协议才真正开始成为基础设施。

---

## Registry

**状态：Exploration / 探索**

当 Manifest 与 Resolver 足够稳定后，可以增加联邦式索引层：

```text
Publisher-owned Manifest
        ↓
Registry indexes facts
        ↓
Consumers query Registry
```

Registry 可以索引 Project Identity、Source、Manifest Location、Latest Stable Release、Channel、Target、Installation Method、Verification Metadata 与 Publisher Identity，但不要求 Facade 托管 Binary。

公共 Registry、自托管 Registry 与其他实现应能够并存。

---

## Catalog + Agent Software Registry

**状态：Exploration / 探索**

面向用户的 Catalog 可以基于同一份规范化事实提供软件发现：搜索、分类、平台筛选、License、安装方式、更新时间、Channel、Verification / Provenance 可用性等。

对 Agent 来说，Facade 可以把“网页搜索 + 文件名猜测”替换为结构化解析：

```text
software / capability
+ environment
+ policy
    ↓
Registry + Resolver
    ↓
compatible release + artifact
+ install method
+ requirements
+ verification material
+ evidence
```

用户与 Agent 应始终消费同一套规范化 Release 事实。

---

## Open Ecosystem + Integrations

**状态：Exploration / 探索**

Facade 应在“Facade 自己不是唯一 Producer、Registry 或 Consumer”时仍然有价值。

社区可以从多个层次参与：

- 第三方 Source Adapter
- 第三方 Manifest Producer
- Build System Integration
- Package / Platform Profile
- Resolver Implementation
- 公共或自托管 Registry
- Catalog / Search Frontend
- IDE 与 Agent Integration
- 真实 Fixture Corpus
- Protocol Conformance Suite
- Interoperability Test 与示例

Facade 应优先选择小而明确的 Integration Contract，而不是在 core 中引入任意脚本式的大型 Plugin Runtime。

```text
Facade = 一个 reference implementation
      + 可互操作的第三方 producers / consumers
      + 不要求中心化托管服务
```

---

## Optional Installer / Store-like UX

**状态：Long-term / 长期**

Installation 是独立风险面，涉及任意代码执行、权限、依赖、回滚与供应链安全。只有 Manifest、Resolver、Registry、Catalog 已证明真实需求后，才应该考虑。

架构边界应持续保持明确：

```text
Registry = facts
Resolver = selection
Installer = execution
```

Catalog 可以在视觉上接近软件商店，但不需要 Marketplace、支付、中心化 Binary Hosting 或专有基础设施。

---

## Platform 扩展策略

通过可组合 Target / Environment 模型扩展，而不是不断增加特殊 enum。

**初始：** Windows / macOS / Linux，x64 / arm64 / universal，常见 Installer 与 Archive。

**下一步：** FreeBSD、x86、armv7、riscv64、glibc / musl、更多 Package Format、Minimum Runtime Requirement、更加完整的 CLI / Server Software 支持。

**更远期：** Android 与 iOS 应使用独立 Distribution Profile，因为 ABI、SDK、Signing、Store、Entitlement 与 Distribution Restriction 并不适合简单套入 Desktop Artifact 模型。

---

## 明确的早期 Non-goals

在 Metadata Protocol 成熟前，不应优先做：

- 自动执行安装
- 任意 Shell 执行
- 成为通用 Package Manager
- Dependency Solver
- Binary CDN Hosting
- 强制中心化账号
- Recommendation Feed、Rating、Review
- 让 AI 成为 canonical artifact classifier
- 任意 Plugin Script
- 自动 Trust Claim
- 深度 Binary Reverse Engineering

> **保持核心确定性。**

AI 可以消费 Facade Facts，但不应该成为这些 Facts 的 canonical source。

---

## Decision Gates

Roadmap 阶段应由真实证据解锁，而不是只因为“已经想到了”。

### v0.1 发布前

- 当前 Implementation Plan 完成
- 多个真实 GitHub Repository 能稳定构建
- Deterministic Output 与 Pages Workflow 已验证
- External Onboarding 已测试
- 当前 Release 的 Schema 与 Compatibility Semantics 已冻结

### Build-time Integration 成为核心前

- Target 与 Environment 模型已经摆脱 Filename-centric 设计
- Provenance 能表达 declared、observed、inferred、asserted
- 矛盾 Evidence 会被诊断，而不是静默覆盖
- Artifact Identity 足够稳定，可以跨 filename / URL 变化
- Release-only Workflow 在没有 Build Integration 时仍能正常工作

### Public Registry 前

- Manifest 已可移植
- Resolver 已与 UI 解耦
- Environment、Compatibility、Policy、Identity 模型足够可信
- Publisher Ownership / Federation 规则明确
- 第三方 Producer 能通过 Conformance Test

### Installer / Store-like UX 前

- Registry 与 Catalog 已证明真实需求
- 已有独立 Security Model
- Installation Execution 与 Metadata Resolution 完全隔离

---

## 演进图

```text
Better Release Experience
        ↓
Distribution Metadata Layer
        ↓
Distribution Intelligence
        ↓
Build-Aware Metadata
        ↓
Portable Manifest + Resolver Protocol
        ↓
Registry
        ↓
Catalog + Agent Software Registry
        ↓
Open Ecosystem + Integrations
        ↓
Optional Installer / Store-like UX — only if justified
```

核心不变量是：

```text
Facts
→ Identity
→ Normalization
→ Compatibility
→ Policy
→ Resolution
→ Protocol
→ Compatibility Guarantee
```

## 一句话总结

Facade 应从一个 GitHub Release 展示工具，演进成 **build-aware 的软件分发元数据与解析层，让用户和 Agent 基于同一组事实理解同一个软件 Release。**

> **Software releases for humans and agents.**  
> **面向用户与 Agent 的软件发布。**
