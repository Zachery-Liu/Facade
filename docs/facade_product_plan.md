# Facade 产品规划与架构基线

> 文档版本：修订版 1.1（Human UI + Agent Interface）  
> 修订日期：2026-09-06  
> 工作名：Facade  
> 产品定位：Software releases for humans and agents.  
> 状态：开发基线；配置和接口在 v0.1 发布前可根据真实接入结果调整。

本文基于原始项目计划重新整理，定义产品范围、核心行为、数据模型、实施顺序及验收标准。文中的配置与 TypeScript 接口是待实现的设计契约，不代表功能已经完成。

---

## 1. 产品定位与价值

Facade 是建立在 GitHub Releases 之上的软件分发元数据层，同时生成面向人的下载页和面向 Agent 的结构化接口。

维护者通过仓库配置和 GitHub Actions，把 Release 数据转成面向最终用户的下载页面。安装包始终直接从 GitHub Releases 下载，Facade 不代理文件，也不承担软件下载带宽。

产品首先解决三个问题：

1. 维护者发布软件后，无需再手动更新下载页。
2. 访问者能够清楚地选择适合自己系统的安装包。
3. Agent 能读取归一化的版本、兼容条件、安装偏好和验证信息，并区分作者声明与工具推断。

多主题是后续的展示能力。第一版优先证明下载准确、接入简单、发布可靠，以及机器接口含义明确。Facade 提供可追溯、可验证的分发元数据；自动安装与信任决策由消费者负责。

### 1.1 第一批目标用户

- 在公开 GitHub 仓库发布桌面软件的个人开发者和小团队。
- 同时维护 macOS、Windows 或 Linux 安装包，缺少独立下载页的项目。
- 愿意使用 GitHub Actions，但不希望运营数据库或下载服务器的维护者。
- 希望为 Agent 和自动化工具提供明确安装元数据的上述项目维护者。

CLI 工具可以使用 Facade，但第一版默认展示围绕桌面软件设计。纯库、SDK、移动应用商店分发不作为首批验收对象。

### 1.2 使用流程

```text
维护者完成一次性 Pages 配置
              ↓
添加 Facade 配置和工作流
              ↓
发布 Release，并完成全部附件上传
              ↓
运行 facade build
              ↓
生成 HTML + manifest.json + install.md + llms.txt
              ↓
部署到 GitHub Pages
```

默认验收地址是 `https://owner.github.io/repository/`。自定义域名属于可选配置，需要维护者设置域名和 DNS，不能承诺仅添加文件即可自动获得。

建议产品文案：

> Turn GitHub Releases into a download page and structured installation metadata.

品牌文案：

> Facade — Software releases for humans and agents.

技术定位：A normalized distribution layer on top of GitHub Releases.

### 1.3 Agent-friendly 的核心价值

GitHub Releases 提供原始 Artifacts 与 Release 元数据。Facade 在其上归一化 OS / Architecture、文件用途和安装条件，并加入维护者声明的安装偏好。Agent 不必每次重新猜测 amd64 与 x86_64 的关系、哪个文件属于辅助产物、是否需要 glibc 或 musl。

“按项目声明执行”仅适用于标记为项目显式配置的字段。来自文件名规则的结果始终标记为推断；缺失信息保持未知。Facade 不把启发式识别变成作者承诺，也不把作者声明变成已经验证的事实。

---

## 2. 版本范围

### 2.1 v0.1 必须包含

- 公开 GitHub 仓库作为唯一数据源。
- 单个选定 Release 的静态下载页。
- 同一次构建生成 `manifest.json`、`install.md`、`llms.txt`，三者与 Human UI 共用数据。
- 公开且带版本号的 Manifest 契约、JSON Schema 和最小只读消费者示例。
- 字段来源、当前 Release 渠道标识，以及作者声明的 libc、最低 OS / libc 版本。
- 有适用条件的安装偏好，以及显式关联的签名 / provenance 引用和 source commit 声明。
- GitHub Latest 或指定 tag 两种版本选择方式。
- macOS、Windows、Linux 的文件分类和下载展示。
- OS、CPU 架构、格式、文件用途识别。
- 人工覆盖、排除文件、推荐优先级。
- 浏览器端尽力识别平台，以及始终可用的手动选择。
- 一个完成度足够高的 Product Theme。
- 产品信息、版本、发布日期、文件大小、更新说明和可用的校验摘要。
- 显式配置的安装命令、文档链接和仓库链接。
- `facade init`、`facade build`、`facade inspect`。
- GitHub Action，以及手动发布和 CI 发布两种接入示例。
- 项目子路径部署、无 JavaScript 下载、错误诊断。

### 2.2 v0.2 候选范围

- Developer Theme，用于检验相同 Manifest 能否支持不同布局。
- `facade dev`，包括本地预览和配置热更新。
- 更广泛的安装包命名支持。
- 根据实际需求完善品牌字段和主题选项。

### 2.3 后续再评估

- Release 历史和 stable / beta / nightly 多渠道解析；v0.1 只标识当前 Release 的渠道。
- Playground、在线配置器、Facade 官网交互演示。
- 社区主题、独立 Theme SDK、多数据源。
- SaaS 托管、Analytics、组织管理、自定义镜像。
- Agent 自动安装执行器、Attestation / Sigstore 实际验证、环境探测与依赖求解。
- 有真实集成需求后再评估 MCP 或 Agent Server。

### 2.4 v0.1 明确不做

账号、数据库、支付、私有仓库、GitLab、AI 分类、下载代理、自建 CDN、主题市场、远程第三方主题执行、在线 Dashboard。

不自动生成或执行安装脚本，不根据仓库名称猜测 Homebrew / Winget 包名，不把系统识别当成兼容性保证。v0.1 不运行 Agent Server、不执行签名验证、不从二进制推导完整运行要求，也不宣称输出已经构成可信安装证明。

---

## 3. 设计原则

1. **Source 与 Theme 解耦。** Theme 只消费 Manifest，不调用 GitHub API。
2. **分类和推荐分离。** 识别一个文件的属性，不等于应该把它放进主下载按钮。
3. **不确定性必须显式表达。** 保留 unknown，不通过猜测提高覆盖率。
4. **人工配置可解释。** inspect 展示命中的规则、覆盖前后结果和推荐原因。
5. **静态 HTML 提供完整基本功能。** JavaScript 只增强交互。
6. **网络访问集中在 Source。** Core 在给定输入下产生确定结果。
7. **CLI 与 Action 共用构建流程。** Action 不重新实现分类、版本选择或渲染。
8. **先通过真实接入验证协议，再承诺兼容性。** 内部模块边界先于独立包发布。
9. **人机接口共享事实来源。** HTML、install.md 和 llms.txt 从同一 Manifest 生成，不分别维护安装事实。
10. **来源和验证状态分离。** API 值、项目声明、规则推断各有来源；存在摘要或证明引用不等于已验证。
11. **推荐受条件约束。** 未知条件不自动视为满足；校验失败不能触发绕过验证的安装回退。

---

## 4. 总体架构

```text
GitHub API + Repository Config + Local Branding Assets
                        ↓
                  Source / Loader
                        ↓
             RepositorySnapshot + Config
                        ↓
           Classifier → Overrides → Selection
                        ↓
                 ReleasePageManifest
                 ↙             ↘
       Human UI Renderer      Agent Publisher
       HTML / CSS / JS        manifest.json
                              install.md / llms.txt
                 ↘             ↙
                Static Output Directory
                        ↓
                   GitHub Pages
```

### 4.1 模块职责

| 模块 | 输入 | 输出 / 职责 |
|---|---|---|
| Config | YAML、运行参数 | 校验后的配置、路径解析 |
| GitHub Source | 仓库标识、凭据、版本选择条件 | 规范化仓库和 Release 快照 |
| Classifier | Asset 文件名及基础元数据 | 各字段识别结果与依据 |
| Core | 配置、快照、识别结果 | 覆盖处理、推荐候选、Manifest、诊断 |
| Theme | Manifest、已解析主题选项 | HTML、CSS、最小客户端脚本 |
| Agent Publisher | 同一 Manifest | JSON 序列化、结构化安装说明和文档导航 |
| CLI | 命令参数、当前工作目录 | 调用统一构建流程、输出诊断 |
| Action | 工作流输入、GitHub 环境 | 调用相同构建入口，输出产物位置 |

Core 不访问网络，不读取环境变量，不产生 HTML。路径复制、令牌读取和文件写入由构建编排层处理。

### 4.2 起步目录

```text
facade/
├── packages/
│   └── facade/
│       ├── src/
│       │   ├── config/
│       │   ├── source/github/
│       │   ├── classifier/
│       │   ├── core/
│       │   ├── agent-interface/
│       │   ├── themes/product/
│       │   ├── runtime/
│       │   └── cli/
│       └── package.json
├── action/
├── fixtures/
│   ├── assets/
│   └── repositories/
├── examples/
│   ├── manual-release/
│   └── ci-release/
├── docs/
├── package.json
└── pnpm-workspace.yaml
```

使用 pnpm workspace，但初期只维护一个主要 npm 包和一个 Action 入口。只有在复用、独立发布或依赖隔离确实需要时，才拆分 schema、classifier、theme-sdk 等包。

### 4.3 技术选型

| 用途 | 第一版选择 |
|---|---|
| 语言 | TypeScript，开启严格类型检查 |
| 包管理 | pnpm |
| 配置 | YAML + Zod；从运行时 Schema 推导类型 |
| GitHub 请求 | Octokit |
| CLI | commander |
| 测试 | Vitest；关键浏览器流程使用 Playwright |
| HTML 渲染 | Preact 服务端渲染 |
| 样式与客户端构建 | CSS + Vite，仅构建主题和必要运行时 |
| CLI / Action 构建 | 实施时选择支持目标 Node 版本的打包工具 |
| 部署 | GitHub Pages 官方 Actions |

依赖和 Actions 的具体版本在实施时核验并锁定。第一版不引入 Next.js、数据库、Worker 或完整页面 hydration。用户执行 build 时消费预构建主题资源，避免每次生成站点都重新编译主题源码。

---

## 5. 配置契约

默认配置位置：`.github/facade.yml`。

最小配置允许只包含：

```yaml
schema: 1
```

仓库名、描述和 Release 信息尽量从 GitHub 获取。在 Action 中从 `GITHUB_REPOSITORY` 推导仓库；本地通过明确的 `--repository` 参数或可识别的 GitHub origin 推导。无法确定时给出错误，不猜测其他 remote。

### 5.1 完整示例

```yaml
schema: 1

product:
  name: Nova
  description: A fast native Markdown editor.
  icon: ../assets/icon.png
  screenshot:
    src: ../assets/screenshot.png
    alt: Nova editor showing a Markdown document

release:
  strategy: github-latest
  # 指定版本时使用 strategy: tag，并添加 tag: v2.4.1
  # channel: beta  # 可选显式声明；不参与版本查找

site:
  # Action 可从 Pages 元数据提供；本地静态构建默认为 /
  basePath: /nova/
  # 可选，用于 canonical 等绝对地址
  url: https://example.github.io/nova/

downloads:
  auto: true
  rules:
    - match: '*-darwin-universal.zip'
      set:
        os: macos
        arch: universal
        kind: archive
        label: macOS Universal
        priority: 100

    - match: 'NovaSetup-*.exe'
      set:
        os: windows
        arch: x64
        kind: installer
        label: Windows installer
        priority: 100

    - match: '*-symbols.zip'
      exclude: true

install:
  - id: homebrew
    platform: macos
    name: Homebrew
    command: brew install --cask nova
    prerequisites:
      - command-available: brew
    # 外部包管理器命令默认不保证安装当前 Release
    versionBinding: unverified
  - id: winget
    platform: windows
    name: Winget
    command: winget install Nova.Nova
    prerequisites:
      - command-available: winget
    versionBinding: unverified

installationPreferences:
  - id: macos-default
    when:
      os: macos
    prefer:
      - method: homebrew
      - assetMatch: '*-darwin-universal.zip'

theme:
  name: product
  appearance: auto
  accent: '#0066ff'

links:
  - label: Documentation
    url: https://docs.example.com
```

上述产品、包名及命令均为配置示例，不代表实际存在的安装方式。

### 5.2 配置语义

- 所有本地素材路径相对于配置文件目录。示例中的 `../assets/` 指仓库根目录的 `assets/`。
- v0.1 品牌图片支持仓库内 PNG、JPEG、WebP；打包为站内资源。远程图片及用户 SVG 可后续增加。
- 不允许素材路径解析到仓库根目录之外；解析符号链接后也要检查。
- 配置优先级：显式 CLI 参数 > YAML > 环境推导 > 默认值。
- `site.basePath` 规范化为带首尾斜杠的路径；所有站内资源统一使用该路径生成。
- `site.url` 与 basePath 冲突时失败，避免生成错误 canonical 或资源路径。
- 未知配置字段报错，附带 YAML 字段位置；不静默忽略拼写错误。
- `downloads.auto: false` 时，不应用自动推断；只展示至少命中一条规则的 Assets，并以规则给出的属性为准。未填写属性保留 unknown。
- 安装命令仅显示和复制，构建过程与浏览器都不执行。
- installationPreferences 只表达作者安装偏好，不授权执行命令。prerequisites 由消费者检查，Facade 不探测其本机环境。
- install.id 与 installationPreferences.id 必须各自唯一；method 必须引用存在的 install.id。
- `assetMatch` 在当前 Release 的最终下载集合中解析为稳定 ID，匹配多个文件保留候选，零匹配警告；不能绕过排除或推荐资格过滤。
- versionBinding 默认为 unverified。仅当作者明确声明命令安装当前 Release 时可设 selected-release；仍标记为项目声明。Facade 不查询包管理器验证版本同步。
- release.channel 可声明 stable / beta / nightly / prerelease。省略时根据 GitHub prerelease 布尔值映射为 stable 或 prerelease，不猜测 beta / nightly。
- 显式 stable 与 GitHub prerelease=true 冲突时失败；beta / nightly 是作者的更具体渠道声明，页面必须清楚标注。

### 5.3 覆盖规则

- `match` 是对完整 Asset 名称的 glob 匹配，区分大小写；inspect 显示实际匹配对象。
- 多条规则按配置顺序应用，后匹配规则只覆盖其显式提供的字段。
- `exclude` 是独立布尔覆盖项，后续规则可显式重新设置；最终为 true 的文件不进入页面。
- `set` 可覆盖 `os`、`arch`、`format`、`kind`、`label`、`priority`、`requirements` 和 `verification`。嵌套对象按整体替换处理，避免合并出作者未声明的条件。
- 不允许通过覆盖规则替换下载 URL；第一版下载目标始终来自选定 Release 的 Assets。
- 命中零个文件的规则产生警告，帮助发现版本改名导致的规则失效。
- 配置字段不合法时构建失败；仅识别失败不导致构建失败。

### 5.4 兼容条件与验证引用

以下是可追加的下载规则示例，所有引用和版本仅用于演示：

```yaml
downloads:
  auto: true
  rules:
    - match: '*-linux-aarch64-gnu.tar.gz'
      set:
        os: linux
        arch: arm64
        kind: archive
        requirements:
          libc:
            family: glibc
            minimumVersion: '2.28'
        verification:
          signatures:
            - assetMatch: '*-linux-aarch64-gnu.tar.gz.sig'
              scheme: openpgp
          attestations:
            - kind: github-attestation
              repository: example/nova
    - match: '*-darwin-universal.zip'
      set:
        requirements:
          minimumOsVersion: '12.0'
```

minimumOsVersion 和 minimumVersion 是字符串形式的最低版本，不支持任意范围表达式。比较依赖目标 OS / libc 语义，不能统一当作 SemVer。省略表示未声明，不表示兼容所有版本。

配置中的 requirements 和 verification 均可部分填写；编译器规范化缺失项为 libc.family=unknown、空引用数组和 status=not-verified。minimumVersion 仅允许与 glibc / musl 一起声明；minimumOsVersion 需要已知 OS。与最终 OS 不相容的显式 libc 配置属于配置错误。sourceCommit 和验证引用必须随软件发布维护，Facade 不自动证明它们仍然对应新的 tag。

v0.1 的 libc family 支持 glibc / musl / none / unknown；none 必须由作者明确声明，不能从“没有 libc token”推导。最低版本只由项目配置提供。架构与格式识别不自动补出最低版本。

verification 的签名 assetMatch 必须唯一对应当前下载集合中未排除的 signature 文件，否则失败。Attestation 引用记录预期仓库，不表示已发现或验证证明。sourceCommit 可在某条规则的 verification 中显式提供完整 commit SHA，标记为项目声明；不从 tag 或 target_commitish 推导为构建来源。

外部包管理器可能从其自己的分发地址安装，也可能尚未更新到选定 Release。下载直连 GitHub 的承诺适用于 Facade 的 Artifact 链接，不能延伸成外部包管理器的来源保证。

---

## 6. 数据源与版本选择

### 6.1 Source 接口

```ts
interface ReleaseSource {
  getRepository(): Promise<RepositoryMetadata>
  getLatestRelease(): Promise<RawRelease>
  getReleaseByTag(tag: string): Promise<RawRelease>
  getReleaseAssets(releaseId: string): Promise<RawAsset[]>
}

interface RepositorySnapshot {
  repository: RepositoryMetadata
  release: RawRelease
  assets: RawAsset[]
}
```

v0.1 不为未实现的平台建立完整插件体系。Raw 类型使用中性字段名，GitHub 字段映射集中在 Adapter。

### 6.2 选择规则

- 默认 `github-latest`：以 GitHub Latest Release API 返回结果为准。
- 不自行按 SemVer 排序，也不把“最后发布”当成 Latest 的同义词。
- `strategy: tag`：精确匹配 tag，不删除前导 `v`，不猜测相近版本。
- draft 永远不发布到下载站；默认不自动选择 prerelease。
- 指定 tag 指向 prerelease 时允许展示，页面明显标注“预发布”。
- Latest 不存在时明确失败；不静默回退到 beta。
- 每次页面只展示一个 Release 的 Assets；缺失平台不从旧版本补齐。
- channel 只描述选中版本，不参与 v0.1 的版本选择，不提供多渠道索引。

### 6.3 请求与失败处理

- Asset 列表必须处理分页，不能假定 Release 对象内嵌列表已经完整。
- 仅对幂等读取执行有限重试；速率限制遵循返回的等待信息，并设置总等待上限。
- 认证失败、仓库不可访问、版本不存在、限流和网络失败使用不同诊断码。
- Action 使用有 `contents: read` 权限的令牌；本地可读取 `GITHUB_TOKEN`。
- 令牌不写入日志、Manifest 或静态产物。
- 不下载完整安装包计算摘要。直接使用 API 提供且格式有效的摘要；缺失时不展示。
- v0.1 不解析独立 checksum 文件以合成摘要，文件可以在辅助文件列表中下载。
- 显示摘要只表示来源提供了该值，不宣称软件安全、签名已验证或本地下载已校验。
- Source 为 API 字段记录来源；Config Loader 记录站点配置的仓库相对路径和实际检出的 commit（可确定时）。配置 commit 与软件 source commit 是不同概念。

---

## 7. Asset Classifier

### 7.1 输出维度

```ts
type OperatingSystem = 'macos' | 'windows' | 'linux' | 'unknown'
type Architecture = 'arm64' | 'x64' | 'x86' | 'universal' | 'unknown'
type AssetFormat =
  | 'dmg' | 'pkg' | 'exe' | 'msi' | 'appimage'
  | 'deb' | 'rpm' | 'zip' | 'tar.gz' | 'other'
type AssetKind =
  | 'installer' | 'portable' | 'archive'
  | 'checksum' | 'signature' | 'debug' | 'update' | 'unknown'

interface FieldEvidence {
  field: 'os' | 'arch' | 'format' | 'kind' | 'libc'
  status: 'explicit' | 'inferred' | 'unknown' | 'conflict'
  ruleId?: string
  reason: string
}
```

Android、iOS 和其他架构不作为 v0.1 的承诺支持项。无法归类的文件仍可作为其他下载展示。

### 7.2 识别方法

1. 保存原始文件名，用规范化副本做检测。
2. 优先处理 checksum、signature、debug、update 等辅助用途。
3. 使用最长后缀匹配格式，例如先判断 `.tar.gz`。
4. 按明确 token 边界识别 OS 和架构。
5. 使用格式辅助推断 OS，但允许记录冲突。
6. 应用用户覆盖，保留来源轨迹。

不得使用不带边界的简单 substring 来匹配 `win`、`mac`、`x86`。`x86_64` 不应同时被识别为 x86；`win32-x64` 中的 win32 作为 Windows 平台 token，不独立推断为 32 位架构。

`.zip` 和 `.tar.gz` 本身不证明平台。`.pkg` 作为启发式依据处理，不视为所有生态中的绝对平台标识。

Linux 目标命名中的 musl 可通过明确 token 规则识别；gnu 只在已确认的目标 triple 模式中推断为 glibc，不能对任意含 gnu 的文件套用。两者均标记为 filename-rule 来源。未识别时 libc 为 unknown，不能默认 glibc。

若文件名平台 token 与格式提示冲突，应输出冲突诊断并取消自动推荐资格，直到用户明确覆盖。

### 7.3 不使用伪精确置信度

第一版不输出“98% 正确”之类未经校准的概率。每个维度分别记录匹配依据、推断状态和冲突。

```text
Nova-arm64.dmg
  OS: macOS       依据：dmg 格式规则
  Arch: arm64     依据：arm64 token
  Kind: installer 依据：dmg 格式规则
  推荐资格：有
```

未来如引入分数，需先明确其为排序分数还是经过验证的正确概率。

---

## 8. 下载推荐

### 8.1 候选过滤

必须同时满足以下条件，才可进入自动推荐候选：

- 未被排除，下载链接和文件元数据有效。
- 用途为 installer、portable 或 archive。
- OS 已知，arch 为明确架构或 universal。
- 没有未解决的分类冲突。
- 属于当前选定 Release。

checksum、signature、debug、update 永远不进入主推荐。unknown 保留在其他下载，不能因为文件名包含平台 token 就自动成为主按钮。

### 8.2 平台内排序

在兼容候选范围内按以下规则排序：

1. 用户配置的 priority，数值越高越优先，默认 0。
2. 已知架构的精确匹配，再考虑适用于该架构的 universal。
3. installer、portable、archive 的默认用途顺序。
4. 相同名次保留为并列候选；按文件名稳定展示，不任意挑选唯一推荐。

用户 priority 不能让不兼容架构或辅助文件越过候选过滤。v0.1 不根据 CPU 架构推断操作系统版本兼容性，也不默认承诺转译运行支持。

Linux 同平台可能有 deb、rpm 和 AppImage。无法知道发行版时，若维护者没有明确首选项，应展示格式选择，不任意断言某格式普遍最佳。

### 8.3 浏览器行为

- 浏览器检测结果允许 OS 和架构分别为 unknown。
- 平台信息只是推荐线索，不作为下载权限或兼容性证明。
- macOS 架构未知时，有明确 Universal 包可推荐；否则显示 Apple Silicon / Intel 选择。
- Windows 或 Linux 架构未知时，也不得直接默认为 x64。
- 手机访问且没有受支持平台时，显示桌面平台入口。
- 所有情况下都保留“查看全部下载”。
- 用户手动选择优先于自动检测，不反复覆盖用户选择。
- 无 JavaScript 时显示静态平台列表及真实下载链接。
- 不自动跳转、不自动开始下载、不在浏览器请求 GitHub API。

`universal` 在 v0.1 中主要表示已确认的 macOS 多架构包，不自动推断为跨操作系统通用。

### 8.4 面向人和 Agent 的条件语义

推荐分为“下载候选排序”和“作者安装偏好”。前者覆盖 Artifact；后者可以表达“macOS 优先 Homebrew，否则提供对应下载候选”。二者在同一 Manifest 中独立记录，不用一个无条件的 recommended=true 代替。

- 每个候选保留 OS、arch、libc、最低版本和命令前提；priority 只在兼容候选内生效。
- 消费者对条件得出 match / mismatch / unknown。省略最低版本表示没有获得这项保证，不可伪造为 match。
- 缺少 libc 或最低版本环境信息时，浏览器可以展示带要求标签的候选；不能宣称已确认兼容。Agent 是否接受推断依据由自身策略决定。
- 多条安装偏好 when 同时命中时，按配置顺序应用第一个；prefer 按顺序保留，候选仍需通过自身条件检查。
- 命令不存在等“不适用”可以转到后续候选；未知条件需要进一步检查或人工选择。
- 下载摘要、签名或来源验证失败必须停止当前安装流程，不自动切换方式绕过失败。
- v0.1 不生成可自动执行的安装计划，不执行依赖安装、sudo 或 shell 命令。

---

## 9. Manifest 契约

Manifest 同时是渲染输入协议和公开机器接口，是人机输出的唯一结构化事实来源。先通过真实样本、Product Theme 与只读消费者验证，再在 v0.1 发布时冻结 schemaVersion 1。为减少本次设计变动，保留 ReleasePageManifest 类型名，其职责已包含 Agent Interface。

```ts
interface ReleasePageManifest {
  schemaVersion: 1
  product: {
    name: string
    description?: string
    icon?: string
    screenshot?: { src: string; alt: string }
  }
  site: {
    basePath: string
    url?: string
  }
  release: {
    id: string
    tag: string
    name?: string
    publishedAt: string
    prerelease: boolean
    channel: 'stable' | 'prerelease' | 'beta' | 'nightly'
    releaseUrl: string
    notes?: { format: 'markdown'; content: string }
  }
  downloads: DownloadAsset[]
  recommendations: RecommendationGroup[]
  installMethods: InstallMethod[]
  installationPreferences: InstallationPreference[]
  evidence: MetadataEvidence[]
  links: Array<{ label: string; url: string }>
  source: {
    provider: 'github'
    repository: string
    repositoryUrl: string
    config: { path: string; commit?: string }
  }
}

interface DownloadAsset {
  id: string
  name: string
  label?: string
  url: string
  os: OperatingSystem
  arch: Architecture
  format: AssetFormat
  kind: AssetKind
  size: number
  priority: number
  requirements: RuntimeRequirements
  digest?: { algorithm: 'sha256'; value: string }
  verification: VerificationMetadata
}

interface RecommendationGroup {
  os: Exclude<OperatingSystem, 'unknown'>
  arch: Architecture
  candidateIds: string[]
  preferredId?: string
  reason: 'single-candidate' | 'ranked' | 'manual-choice' | 'no-match'
}

interface InstallMethod {
  id: string
  platform: OperatingSystem | 'all'
  name: string
  command: string
  prerequisites: Array<{ 'command-available': string }>
  versionBinding: 'selected-release' | 'unverified'
}

interface RuntimeRequirements {
  minimumOsVersion?: string
  libc: {
    family: 'glibc' | 'musl' | 'none' | 'unknown'
    minimumVersion?: string
  }
}

interface InstallationPreference {
  id: string
  when: {
    os: Exclude<OperatingSystem, 'unknown'>
    arch?: Exclude<Architecture, 'unknown'>
    libc?: 'glibc' | 'musl' | 'none'
  }
  prefer: Array<
    | { type: 'method'; methodId: string }
    | { type: 'artifacts'; assetIds: string[] }
  >
}

interface VerificationMetadata {
  status: 'not-verified'
  signatures: Array<{ assetId: string; scheme: 'openpgp' | 'minisign' | 'other' }>
  attestations: Array<{ kind: 'github-attestation'; repository: string }>
  sourceCommit?: string
}

interface MetadataEvidence {
  // 指向 Manifest 最终值的 JSON Pointer，不引用易变日志文本
  path: string
  source: 'github-api' | 'project-config' | 'filename-rule' | 'derived' | 'unknown'
  status: 'provided' | 'inferred' | 'unknown' | 'conflict'
  ruleId?: string
  configPath?: string
  derivedFrom?: string[]
}

interface BuildDiagnostic {
  code: string
  severity: 'warning' | 'error'
  message: string
  assetId?: string
  configPath?: string
}
```

### 9.1 字段约束

- 所有 Asset 引用必须指向 downloads 中存在的 ID。
- candidateIds 排序稳定；只有存在明确唯一首选时才提供 preferredId。
- 为浏览器架构未知的情况生成对应选择组，避免运行时重新实现分类。RecommendationGroup 只是 OS / arch 维度的候选索引，消费者仍需读取候选的 requirements，preferredId 不等于可无条件安装。
- 文件大小单位为字节；显示格式由 Theme 处理。
- 不把任意 tag 强制转换为 SemVer；页面保留原 tag。
- 不将原始 GitHub API 响应、令牌或本地绝对路径写入 Manifest。
- 品牌素材路径已经解析为站内可使用路径。
- 与选择和验证相关的最终字段必须有机器可读 evidence，包括 os / arch / kind / format、requirements、digest、channel、安装命令与偏好、签名和来源声明。完整覆盖前后轨迹继续放在 inspect，Human UI 无需展示内部日志。
- evidence.path 必须存在，source 说明数据来源，status 说明是否推断或冲突。文件名的明确 token 匹配对外仍是 inferred，不能因为内部规则叫 explicit 就标记为作者声明。
- derived 字段通过 derivedFrom 记录依据，例如由 prerelease 推导 channel。未声明的兼容信息由对应 unknown 状态表达；可选字段省略表示未提供，不表示条件已满足。
- 非 Linux 平台的 libc 统一保留 unknown，消费者根据 OS 判断该维度不适用；none 只用于项目明确声明不依赖 libc 的 Linux 文件。
- v0.1 的 verification.status 始终是 not-verified，摘要即使存在也不改变此状态。空 signatures / attestations 表示未提供引用，不是验证通过。
- 所有 methodId、assetIds 和 signature assetId 引用必须可解析；签名不能通过宽泛 glob 绑定多个安装文件。
- stable 来自 GitHub 状态或显式配置，beta / nightly 只能来自显式配置；不提供历史版本、下载统计或多渠道解析。
- 结构化 ID 使用来源 ID 或作者显式 ID，不依赖显示名称；同一输入下数组顺序和 evidence.path 稳定。

### 9.2 确定性与兼容性

给定同一配置、配置来源标识、品牌素材、Source 快照和工具版本，Manifest 与生成文件应一致。fixture 模式固定这些输入，不能混入运行机器的 Git 状态。避免在公共产物中加入当前时间等无业务必要的变化字段。

构建时间、工具版本、诊断和输入标识可写入独立 build report。发布后新增可选字段应保持兼容；删除字段、修改语义或改变类型需要新的 schemaVersion。Renderer 对不支持的版本明确失败；示例消费者也必须先检查 schemaVersion，不能按未知协议执行安装。

提供与运行时校验一致的 JSON Schema 和有效 / 无效样例，随包和版本化文档发布。枚举扩展的兼容性需明确评估；消费者对不识别的条件必须视为 unknown，不能默认允许。v0.1 没有摘要或元数据签名链保证，HTTPS 获取也不能替代对预期项目身份的独立信任。

### 9.3 Agent Interface 的三个入口

| 文件 | 内容与职责 |
|---|---|
| manifest.json | 规范化的机器数据、适用条件、字段来源、验证引用 |
| install.md | 从 Manifest 生成的版本、平台选择、安装方式、前提与验证说明 |
| llms.txt | 简短站点介绍及 Manifest、安装说明、项目文档导航 |

三个文件默认随 build 生成，不需要额外开启 Agent 功能，也不引入运行时服务。llms.txt 是导航提案，不是通用自动发现、身份认证或执行授权协议，不承诺所有 Agent 自动读取。[参考 6]

install.md 必须包含当前 tag / channel、仓库链接、Artifact ID 与下载 URL、适用条件、安装偏好、已有摘要和未验证说明。未声明条件明确写成“未知 / 未声明”。与当前 Release 版本绑定未验证的包管理器命令应明确标注。

llms.txt 链接使用实际站点 basePath 下的入口；未配置绝对 site.url 时使用可正确解析的相对地址。HTML 页脚同时提供机器接口入口。`/project/` 部署不能错误链接到域名根目录的 `/manifest.json`。

Agent Publisher 不二次调用 GitHub，不重新分类，也不从 Release Notes 提取并执行命令。Markdown 输出由固定模板生成，正确转义标签与代码围栏；不将作者自由文本插入为 Agent 的操作指令。Release Notes 是可选阅读材料，不能覆盖结构化条件或消费者权限策略。

### 9.4 验证与消费边界

期望的消费者流程是：读取 Manifest → 检查版本与预期项目身份 → 根据本机条件选择候选 → 下载文件 → 比较摘要 → 按消费者策略验证签名 / Attestation 和来源 → 在获得相应执行授权后安装。

v0.1 交付元数据及只读选择示例，不交付这条链路的自动执行器。GitHub Attestation 验证需要对实际文件执行验证并约束预期仓库等身份；记录证明引用不能代替该步骤。[参考 7]

SHA256 用于对照期望内容，文件和摘要来自同一被攻陷来源时不建立独立信任。sourceCommit 声明、配置 commit、tag 当前指向和已验证 provenance 中的构建 commit 必须区分。未来引入 verified 状态时，需要新的验证结果模型记录验证对象、验证器、身份策略和时间，不能把一个布尔值复用于所有保证。

消费者不应把 Facade 页面中的文本视为自身系统指令。清单中的命令是项目提供的安装数据，不能绕过权限、确认流程或验证失败。元数据可帮助验证，但不能证明软件没有恶意行为。

---

## 10. Product Theme 与静态页面

### 10.1 页面内容顺序

1. 产品名称、图标和一句话描述。
2. 版本、日期，以及预发布标识。
3. 推荐下载或平台 / 架构选择。
4. 全部平台下载列表。
5. 可选产品截图。
6. 可选安装命令。
7. Release Notes。
8. 其他下载与辅助文件。
9. 仓库、文档链接和简洁页脚。

每个下载项至少显示用途标签、平台、架构、格式和大小。存在 libc 或最低版本要求时显示对应条件。摘要可折叠并提供复制，不挤占主下载区域。安装偏好与 Agent 输出一致，条件未知时展示选择；不显示没有实际验证依据的“可信 / 已验证”徽章。

### 10.2 视觉与可访问性

- 第一版只提供 Product Theme，支持 light / dark / auto 和 accent。
- 以下载选择清晰为首要布局约束，避免装饰压过文件信息。
- 无截图、无图标、无描述时仍有完整布局，不产生空白占位。
- 支持移动端、键盘操作、可见焦点和可读对比度。
- 复制按钮反馈成功或失败；不能只靠颜色表达状态。
- 下载链接使用普通可访问链接，脚本失败不影响访问。

### 10.3 内容处理

- Release Notes 统一通过受控 Markdown 渲染和 HTML 清理流程。
- 默认不允许原始 HTML 执行；过滤脚本、事件处理属性和危险 URL scheme。
- 产品名称、描述、文件标签等文本始终转义。
- 相对文档链接按明确的仓库和选定 tag 上下文转换；fragment 保留为页内链接，并与标题 ID 规则一致。
- 无法安全转换的链接输出诊断，不默认为站点本地路径。
- 外部链接保留其实际目的地；不以代码执行方式处理安装命令。

### 10.4 Theme API

```ts
interface FacadeTheme {
  name: string
  render(
    manifest: ReleasePageManifest,
    options: ResolvedThemeOptions
  ): Promise<RenderedSite>
}

interface RenderedSite {
  files: Array<{
    path: string
    content: string | Uint8Array
  }>
}
```

所有输出 path 必须是输出目录内的相对路径。v0.1 仅加载内置主题，不执行来自配置文件的任意 npm 主题代码。manifest.json、install.md、llms.txt 是 Agent Publisher 保留路径，Theme 不能覆盖；构建编排层检查文件冲突。

### 10.5 输出

```text
dist/
├── index.html
├── manifest.json
├── install.md
├── llms.txt
└── assets/
    ├── theme.<hash>.css
    ├── runtime.<hash>.js
    └── branding...
```

第一版只有一个 HTML 页面及三个静态机器接口，无 SPA 路由要求。构建先写入受控临时目录，完成全部输出和契约校验后替换指定产物目录；拒绝将仓库根目录、配置目录或任意非受控目录作为清理目标。人机产物作为同一站点 artifact 部署；客户端跨请求仍可能遇到缓存差异，应以其读取的单份 Manifest 为准，不把不同版本文档拼接成安装计划。

---

## 11. CLI

### 11.1 init

```bash
facade init
```

- 生成最小配置和工作流模板。
- 询问或接受参数指定“手动发布”或“已有 CI 发布”接入方式。
- 已有文件默认不覆盖，显示需要添加的内容。
- 输出一次性 Pages 设置说明及下一步命令。
- 不代替用户创建 Release，不自动修改远端设置。

### 11.2 inspect

```bash
facade inspect --repository owner/repository
facade inspect --json
facade inspect --fixture fixtures/repositories/example.json
```

inspect 与 build 使用同一个解析入口。输出选定版本 / 渠道、Asset 属性、识别依据、覆盖轨迹、排除原因、候选排序和未命中规则；同时解释 libc / 最低版本来源、安装前提、版本绑定及验证引用状态。JSON 报告与公开 Manifest 使用一致的字段语义。

```text
Release: v2.4.1  (github-latest)

Nova-arm64.dmg
  macOS / arm64 / dmg / installer
  OS: dmg rule; Arch: arm64 token
  Recommendation: preferred for macOS arm64

Nova-symbols.zip
  Excluded: downloads.rules[2]

Nova-portable.zip
  OS: unknown; Arch: unknown
  Shown in Other Downloads; not recommended
```

### 11.3 build

```bash
facade build
facade build --repository owner/repository --out-dir dist
facade build --tag v2.4.1
facade build --fixture fixtures/repositories/example.json
```

共享参数：`--config`、`--repository`、`--tag`、`--fixture`。build 另外支持 `--out-dir` 和 `--base-path`。fixture 模式不请求 GitHub，运行在固定输入上。

build 完成摘要列出 HTML 和三个机器接口的输出路径，统一验证 Schema、引用完整性与链接路径；任何接口生成失败都使整个构建失败。

退出码约定：0 成功，包括非致命警告；1 构建或数据错误；2 配置或参数错误。JSON 模式提供稳定诊断码，文本格式可以改善。

`dev` 不属于 v0.1。第一版文档提供使用普通静态服务器预览 dist 的方式。

---

## 12. GitHub Action 与部署

### 12.1 Action 的职责

Action 调用与 CLI 相同的构建入口，并提供：

- 输入：config、repository、可选 tag、base-path、out-dir、token。
- 输出：output-path、release-tag。
- GitHub 日志中的结构化警告与错误。

Action 本身负责构建，Pages 上传和部署由官方 Actions 完成。Action 的发布产物应包含运行所需依赖，不能假定使用方仓库安装了 pnpm 或 Facade。

实际 Action 仓库名、npm 名称和发布引用在公开发布前确认；本计划不把 `facade/action@v1` 当成已存在的依赖。

### 12.2 手动发布接入

```text
release: published
       ↓
检出承载站点配置的默认分支
       ↓
configure-pages → 获取站点路径
       ↓
Facade build → 依据配置选择 Latest 或固定 tag
       ↓
upload-pages-artifact
       ↓
deploy-pages
```

发布事件是刷新入口，不隐式覆盖配置中的版本选择。例如发布 beta 触发刷新时，默认站点仍展示 GitHub Latest 稳定版本。

同时提供 `workflow_dispatch` 和默认分支配置 / 品牌素材变更触发。仅监听 `.github/facade.yml` 不足以覆盖图标、截图与工作流修改；模板覆盖约定素材目录，自定义路径需要维护者补充。

### 12.3 已有 CI 发布接入

```text
构建各平台安装包
       ↓
创建 / 发布 Release，并上传全部 Assets
       ↓
在同一工作流后续 job 中调用 Facade
       ↓
上传并部署 Pages
```

使用 `GITHUB_TOKEN` 创建 Release 不会再触发独立的 release 工作流，因此不能只提供 published 监听模板。首选在既有发布流程中显式串联 Facade，并通过 job 依赖确保附件上传完成。[参考 1]

### 12.4 部署约束

- build job 原则上只需要 contents: read。
- deploy job 配置 pages: write、id-token: write 和 github-pages environment。
- build 与 deploy 分开时显式配置 needs。
- workflow 配置站点级 concurrency；新刷新取消旧刷新，避免较旧构建稍后覆盖。
- 使用 configure-pages 及站点路径信息生成正确的项目子路径资源链接。
- 同时上传 HTML 与三个 Agent 接口，验证部署后 JSON 和 Markdown 入口可读取；不单独发布另一套可能过期的安装文档。
- 文档明确 Pages 发布源设置，以及 environment 对默认分支 / tag 的保护规则。
- 发布事件默认检出可能是 tag；模板必须明确选择站点配置所在 ref，并验证部署保护设置与实际 ref 相容。
- 构建失败时不上传 / 部署新产物，线上保留上一次成功站点。
- 自定义域名单独配置，不把 CNAME 文件当成 GitHub Pages 域名设置的替代。[参考 2、3]

### 12.5 更新与修复

v0.1 的更新契约为“发布完成后构建，或手动刷新”。后续修改 Release Notes、删除或替换 Asset 后，维护者需要重新运行工作流。

不承诺只监听 published 就实时同步所有变更。若未来支持额外事件或定时刷新，应单独定义触发语义和成本。

---

## 13. 异常行为

| 场景 | v0.1 行为 |
|---|---|
| 仓库无法确定 | 失败，提示 --repository |
| 仓库不存在或不可访问 | 失败，区分权限与资源错误 |
| 无 Latest / 只有预发布 | 默认失败，提示可明确指定 tag |
| 指定 tag 不存在或是 draft | 失败 |
| Release 没有 Assets | 失败，提示先完成上传 |
| 排除后没有任何可展示文件 | 失败 |
| 只有未知文件或辅助文件 | 构建成功并警告；显示列表和无推荐状态 |
| 单个平台缺包 | 不显示该平台的有效下载按钮，不跨版本补包 |
| 架构无法检测 | 显示架构选择，不默认 x64 |
| 分类存在冲突 | 保留文件，取消自动推荐资格并警告 |
| 多个候选无法决定首选 | 显示选择，建议配置 priority |
| Digest 不存在或无效 | 不显示；无效值产生警告 |
| 缺少产品描述或图片 | 省略对应区域 |
| 配置字段或本地素材无效 | 失败并定位字段 / 路径 |
| 规则未匹配任何文件 | 警告 |
| API 限流或网络失败 | 有限重试后失败，保留线上旧站 |
| JavaScript 不可用 | 静态下载列表继续可用 |
| Release 后续变更 | 手动或发布流程重新构建后同步 |
| libc 或最低版本信息不足 | 保留 unknown / 未声明，Agent 不能视为已确认兼容 |
| 签名绑定无匹配或多匹配 | 构建失败，要求作者明确关联 |
| 仅提供 Attestation 引用 | 标记 not-verified，不宣称证明已存在或验证成功 |
| 包管理器命令版本绑定未知 | 标记 unverified，不宣称安装当前 Release |
| 安装偏好引用不存在的方法 | 配置错误，构建失败 |
| 渠道显式 stable 与 prerelease=true 冲突 | 构建失败 |
| 消费者遇到未知 Schema / 条件 | 示例消费者停止或返回 unknown，不静默按旧语义继续 |
| 消费者实际校验失败 | 安装说明要求停止，不回退绕过验证；Facade 自身不执行安装 |
| 任一 Agent 输出失败 | 整体构建失败，不部署部分产物 |

---

## 14. 测试与质量标准

### 14.1 真实样本

首批选择约 5 个公开仓库：桌面应用、跨平台 CLI、多 Linux 格式、非标准命名、包含大量辅助文件的项目。

为每个 fixture 记录来源仓库、tag、采集日期和人工确认结果。普通测试只使用保存的快照，不依赖在线 API。

样本必须包含：

- `x86_64`、`amd64`、`aarch64` 和大小写变体。
- `win32-x64`、darwin universal 等容易歧义的组合。
- 缺少 OS 或架构的文件。
- 安装版、便携版、多个 Linux 格式。
- checksum、signature、symbols、debug、update 文件。
- token 冲突、产品名包含平台片段、非 SemVer tag。
- 无 Release、无 Assets、分页、缺少 Digest、只有预发布。
- glibc / musl、最低 OS / libc 声明、未知条件和互相冲突的目标 token。
- Homebrew 不可用、安装优先级、命令与 Release 版本绑定未验证。
- 签名精确关联、关联缺失 / 歧义、Attestation 引用和 source commit 声明。
- 伪装成 Agent 指令的 Release Notes、Markdown 围栏和链接转义样本。

### 14.2 分类与推荐指标

- 分别统计 OS、arch、format、kind 的准确情况。
- 分开报告识别覆盖率、已识别结果准确率、冲突数。
- 推荐测试单独报告错误平台 / 错误架构和辅助文件误推荐。
- 按仓库留出验证样本，避免只有针对既有文件名写规则的训练样本。
- 公开指标附样本集版本和统计方法，不将测试集准确率等同于所有仓库表现。

v0.1 发布门槛：验收样本中不允许出现已知错误平台、错误架构或辅助文件成为主推荐。识别不足可以通过明确手动选择或 overrides 处理。

### 14.3 测试层次

| 层次 | 验证内容 |
|---|---|
| 单元测试 | token 边界、冲突、覆盖顺序、排序、配置验证 |
| Source 测试 | 分页、认证失败、限流、Latest / tag 选择 |
| 集成测试 | fixture + config → Manifest → HTML / install.md / llms.txt，验证数据一致 |
| 公开契约测试 | JSON Schema、evidence 路径、引用完整性、未知状态、条件推荐、旧消费者行为 |
| Agent 只读消费测试 | 指定环境选择候选、来源策略、条件不明时返回 unknown；不安装软件 |
| 浏览器测试 | 未知架构、手动选择、无 JS、复制、移动端 |
| 内容安全测试 | Markdown HTML、危险链接、输出路径与素材路径 |
| 真实部署测试 | 手动 Release、CI Release、项目子路径、失败保留旧站 |

同时验证相同输入的输出确定性。测试应覆盖行为边界，避免只复制实现细节的断言。

---

## 15. 实施顺序与阶段出口

### M0：真实样本与最小需求

交付：5 类仓库样本、首批预期分类、默认页面内容草图、版本选择契约，以及 Human / Agent 共用的字段来源和未知条件定义。

出口：可以用实际文件解释“哪些文件应该推荐、哪些必须手选、哪些只是辅助文件”。不冻结完整 Schema。

### M1：最小端到端构建

交付：内部模块结构、最小配置、基础分类、最小公开 Manifest、Product Theme 基础页面、三个 Agent 输出骨架、build 命令。

出口：离线 fixture 能生成 HTML 和三个机器接口，同一版本和 Asset ID 贯穿输出；全部真实下载链接可访问，关闭 JS 仍能选择文件。

### M2：真实 GitHub 与 Pages

交付：GitHub Adapter、Latest / tag、分页和失败诊断、Action 骨架、两类发布模板、basePath。

出口：一个测试仓库的真实手动发布和 CI 发布都能更新 Pages；API 或构建失败不会替换线上站点。

### M3：正确推荐与可诊断配置

交付：用途识别、冲突处理、覆盖规则、priority、架构未知选择、libc / 最低版本条件、安装偏好、来源证据及 inspect 文本 / JSON 输出。

出口：对首批真实样本，不会错误推荐辅助文件或错误架构；不标准命名可通过配置修正。

### M4：可交付的人机接口

交付：Product Theme 完整布局、品牌素材、安装命令、Release Notes、Digest、响应式和键盘操作；同时完成 install.md、llms.txt、验证引用、JSON Schema 与只读消费者示例。

出口：真实长文本、无图片、多文件及未知平台场景均可正常使用；只读消费者能解释候选、条件和来源，未知或冲突信息不会被描述为已验证。

### M5：接入体验与 v0.1 发布

交付：init、接入文档、升级说明、固定版本发布产物、完整验收记录。

出口：按第 16 节完成验收后，冻结 schemaVersion 1 并发布 v0.1。

### M6：v0.2 验证扩展

交付：Developer Theme 和 dev server。

出口：两个主题使用同一份 Manifest，Core 不包含主题分支。若发现模型缺口，按兼容性规则演进。

Playground 在上述闭环之后评估，不作为早期开发前置依赖。日历排期在明确投入人数并完成 M0 后制定，不根据模块数量直接估算交付日期。

---

## 16. v0.1 Definition of Done

以下项目全部满足，才认为第一版完成：

- [ ] 至少 3 个结构不同的真实公开仓库完成接入验证。
- [ ] 其中至少 1 个由非核心开发者按照文档独立完成接入，并记录所遇阻碍。
- [ ] 清楚记录首次配置 Pages 与日常发布分别需要的操作。
- [ ] 手动发布与 GITHUB_TOKEN 驱动的 CI 发布均有成功记录。
- [ ] 在全部 Assets 上传完成后构建，页面版本和下载文件属于同一个 Release。
- [ ] `init` 不覆盖已有配置，`inspect` 与 `build` 得到一致选择结果。
- [ ] GitHub 项目子路径下样式、脚本、图片和下载链接均正常。
- [ ] 已知平台可推荐；未知架构可手动选择，始终可访问全部下载。
- [ ] checksum、signature、debug、update 不成为主推荐。
- [ ] 同平台多个包可以明确选择或通过 priority 设置首选。
- [ ] overrides 可修正识别，且 inspect 能解释结果。
- [ ] 缺少 Digest、描述或图片时页面正常。
- [ ] 无 JavaScript 时仍可完成下载选择。
- [ ] Release Notes 安全渲染；凭据不进入产物。
- [ ] 配置错误、API 失败和构建失败有明确诊断，线上旧站不被替换。
- [ ] 发布期间的并发工作流不会让已取消的旧刷新覆盖新刷新。
- [ ] 单元、集成、关键浏览器测试及真实部署检查通过。
- [ ] 相同输入产物确定，Manifest 已通过实际渲染验证。
- [ ] HTML、manifest.json、install.md、llms.txt 来自同一份 Manifest，tag、渠道、Asset ID 与安装偏好一致。
- [ ] 三个 Agent 入口在根路径和项目子路径均可读取，导航链接正确。
- [ ] 公开 JSON Schema、字段语义文档、有效 / 无效样例及只读消费者示例可用。
- [ ] 字段来源能区分 API、作者声明、文件名推断与派生值；evidence 引用全部有效。
- [ ] glibc / musl、最低版本和未知条件有测试，不把未知条件视为满足。
- [ ] 包管理器命令明确前提与版本绑定；人工和 Agent 得到一致的条件偏好。
- [ ] beta / nightly 必须显式声明，prerelease 不自动等于 beta。
- [ ] 摘要、签名引用、Attestation 引用和 source commit 均不被错误标记为 verified。
- [ ] 安装说明区分不可用回退与校验失败停止，不把项目文本当成 Agent 执行授权。
- [ ] 任一机器接口构建失败均阻止整站部署；不发布部分更新。

自定义域名、第二个主题、dev server、历史版本、Playground、MCP、Agent Server 和自动安装 / 实际证明验证不属于 v0.1 的阻断项。三个静态 Agent 接口及公开契约属于阻断项。

---

## 17. 主要风险与应对

| 风险 | 应对 |
|---|---|
| 文件名无法表达完整兼容性 | 保留 unknown，提供选择与覆盖，不做过度承诺 |
| 多平台 Assets 尚未上传完 | 发布流程显式等待所有产物上传后构建 |
| CI 发布不会触发独立工作流 | 提供同一发布流程串联方式 |
| 自定义命名规则长期变化 | inspect 显示未命中规则，扩充真实 fixture |
| Schema 过早冻结导致返工 | 先完成端到端和真实仓库验证 |
| 主题开发侵占核心交付 | v0.1 只做 Product Theme |
| 初次部署设置超出“两文件”承诺 | 文档清晰说明 Pages 和域名的一次性设置 |
| Release 修改后静态站过期 | 明确刷新契约，保留手动触发入口 |
| 测试准确率无法代表真实用户 | 留出仓库验证，并公开统计边界 |
| 推断被 Agent 当成作者承诺 | 字段级 evidence 与 unknown 语义 |
| 推荐忽略 libc 或环境前提 | 条件推荐，未知不视为满足 |
| 有摘要 / 证明引用被当成已验证 | 明确 not-verified，消费者按自身身份策略验证 |
| 包管理器尚未同步 Release | 版本绑定状态显式展示，不承诺同版本 |
| 人机文档事实不一致 | 同一 Manifest 生成，整站产物校验与部署 |
| 公开协议修改破坏消费者 | JSON Schema、兼容性测试和 schemaVersion 规则 |

---

## 18. 发布与后续演进

### 18.1 发布前确认

- 确认项目许可、npm 包名、GitHub 组织 / Action 仓库名和品牌可用性。
- 锁定支持的 Node 版本，并验证 CLI 与 Action 打包产物。
- 提供固定版本引用示例和升级说明；工作流依赖版本在发布时重新核验。
- README 给出实际部署示例、最小配置、两个发布接入路径和故障排查。
- 记录所支持文件格式与明确限制。
- 发布 Agent Interface 示例和版本化 Schema 文档，说明来源、兼容条件、信任边界与未知状态。

### 18.2 后续优先级

1. 根据真实接入反馈修复识别、发布与选择问题。
2. 增加 Developer Theme，检验 Manifest / Theme 边界。
3. 增加 dev server，缩短本地调整反馈时间。
4. 有明确需求后设计历史版本与 release channels。
5. 主题协议稳定后再开放第三方主题。
6. 出现持续的托管需求后再评估 Facade Cloud。

Agent 方向首先根据消费者反馈完善元数据。之后才评估证明验证结果模型、版本化安装计划和消费者集成；MCP / Agent Server 需要明确优于静态接口的使用场景后再启动。长期可向“可信的软件安装 metadata layer”演进，前提是建立验证对象、来源身份和消费策略的完整约束。

“私有仓库 + 下载直连”涉及访问授权，不能仅靠增加 Source 解决；若未来开发托管版，需单独设计身份与下载权限，作为新的产品范围评审。

---

## 19. 与原计划相比的主要调整

| 原计划 | 本次调整 |
|---|---|
| v0.1 两个主题、dev server，早期 Playground | v0.1 单主题；其余后移 |
| 先完成多层核心，再接入真实部署 | 提前做完整页面和 Action / Pages 闭环 |
| 起步七个独立 packages | 内部模块隔离，按实际需求拆包 |
| 单个 confidence 百分比 | 按字段记录依据、不确定性和冲突 |
| OS / Arch / Format 足以推荐 | 增加 kind、候选过滤、排序及手动选择 |
| 自动识别 macOS 后推荐 Apple Silicon | 无法判断架构时提供 Universal 或明确选择 |
| 只监听 release published | 区分手动发布与 CI 发布，等待附件上传完成 |
| 添加文件即获得自定义域名 | 明确 Pages、域名、DNS 的前置设置 |
| Theme 示例包含历史版本但模型只有单版本 | v0.1 页面与模型统一为单版本 |
| SHA256 作为必达展示 | 有有效来源值才展示，不自行下载计算 |
| Manifest 从第一阶段开始稳定 | 先真实验证，再在 v0.1 发布时冻结 |
| 下载页是唯一产品输出 | Human UI 与 Agent Interface 从 v0.1 同时交付 |
| Manifest 只服务主题渲染 | 公开机器契约，增加 Schema 与消费者验证 |
| 识别值不区分来源 | API、声明、规则推断和派生值各有 evidence |
| 单一下载优先级 | 条件化安装偏好、前提和版本绑定状态 |
| 安全信息只有 SHA256 | 增加显式验证引用与来源声明，保留 not-verified 边界 |

---

## 20. 外部约束参考

以下资料用于核验平台行为；具体依赖版本和浏览器支持情况应在实施时再次确认。核验日期：2026-09-06。

1. [GitHub：Triggering a workflow](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow) — GITHUB_TOKEN 产生事件的工作流触发限制。
2. [GitHub：Using custom workflows with GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) — Pages 构建、产物、权限和部署环境。
3. [GitHub：Managing a custom domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site) — 自定义域名设置和 Actions 部署下的 CNAME 行为。
4. [GitHub：REST API endpoints for releases](https://docs.github.com/en/rest/releases/releases) — Release 数据、Latest 与 Asset 元数据。
5. [MDN：User-Agent Client Hints API](https://developer.mozilla.org/en-US/docs/Web/API/User-Agent_Client_Hints_API) — 浏览器平台与架构信息的可用性限制。
6. [llms.txt 提案](https://llmstxt.org/) — 面向 LLM 的内容导航提案，不是执行或身份验证协议。
7. [GitHub：Using artifact attestations](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations) — 针对实际 Artifact 的来源证明验证与预期仓库约束。
