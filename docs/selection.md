# 共享安装选择器（T07）

构建后通过 `@facade/cli/selection` 导入 `selectInstallation(manifest, environment, policy)`。
Product Theme 的 `useSelectionInput` 调用相同纯函数。函数只读取输入，不检测本机、联网、下载、执行命令或验证签名。

```ts
const result = selectInstallation(manifest, {
  os: 'linux',
  arch: 'x64',
  libc: { family: 'glibc', version: '2.35' },
  commands: { brew: 'unavailable' },
}, { sources: 'default', requireVersionBinding: false });
```

环境字段全部可省略：`os` 为 macos/windows/linux/unknown，`arch` 为 arm64/x64/x86/unknown；`osVersion` 和 libc 的 `version` 接受原始字符串，无法按点分非负整数比较时结果为 unknown。`commands` 将命令名映射到 available/unavailable/unknown；未提供命令状态等于 unknown。浏览器传入可靠检测线索或用户选择，不能从缺失信息默认 x64 或 glibc。Hook 的手动环境覆盖检测结果，可通过设置 undefined 恢复检测输入。

Manifest 在当前 main 结构上增加可选 `arch`、`supportedArchitectures`、`format`、`priority`、`requirements`、`recommendationEligible`、`installMethods` 和 `installationPreferences`。保留 schemaVersion 0 与开发中的 1；其他协议版本返回 needs-input 及诊断。T06 尚未合入此分支，旧构建产物缺少架构时不会自动推荐；此处不重新实现分类器。

`requirements` 可声明 `minimumOsVersion` 及 `libc: { family, minimumVersion? }`。Linux 不比较系统版本；libc 只在 Linux 上参与判断，none 表示明确不依赖 libc。macOS Universal 必须声明 supportedArchitectures，并且环境架构在该集合内。

结果有 selected、needs-input、no-match 三种状态。仅 selected 提供 `selected` 候选；`candidates` 保留已评估候选的条件、evidence、rank、rankingReasons 和 missingMetadata。`conditions` 记录已评估的偏好条件，顶层 missingMetadata 按候选 ID 汇总。明确不兼容候选仍可用于解释，但不能被选择。

未声明最低版本、Linux libc 等限制进入 missingMetadata，不伪造 match，也不阻止推荐。已声明条件但环境未知会阻止自动选择。显示结果时应使用“符合已提供条件”。同分保留选择，名称只稳定排序；Linux 不依靠用途替用户选择包格式。排序先 priority，再精确架构，再用途。为保守处理未知信息，存在尚未排除的 unknown 候选时返回 needs-input。

安装偏好按配置顺序检查 when，未知即停止；首条匹配规则按 prefer 顺序选择方法或 assetIds。命令明确 unavailable 才允许继续；当前列表全不可用或为空时转默认文件选择，不检查后续规则。空文件组产生诊断；不存在的引用是输入错误。`assetMatch` 属于配置编译阶段，选择器只消费解析后的 assetIds。

方法结构为 `{ id, platform, name, command, prerequisites, versionBinding? }`，prerequisites 是 `{ "command-available": "brew" }` 数组。versionBinding 省略时为 unverified；默认允许只读展示，`requireVersionBinding: true` 会要求补充确认。自由文本 command 不影响结构化条件，也不产生执行授权。验证失败应由消费者停止流程，不调用选择器绕过失败。

默认来源策略允许 filename-rule 和 derived，保留证据。严格策略要求参与匹配或排序的字段、下载 URL、方法条件及命令具有 github-api 或 project-config 来源；缺失、unknown 或 conflict 证据返回 needs-input。字段 evidence 使用点分路径，例如 `requirements.libc.family`、方法的 `command`、偏好的 `when.os`。来源标签是输入声明，不等于真实性验证。

只读消费者示例：

```sh
pnpm build
node examples/select-installation.mjs manifest.json environment.json
```

T09 将完成页面交互与浏览器检测；T08 将扩展完整 Agent Interface。当前静态页面继续保留所有真实下载链接。
