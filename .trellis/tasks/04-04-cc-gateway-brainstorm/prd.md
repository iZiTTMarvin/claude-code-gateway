# cc-gateway — Claude Code 本地网关桌面应用

## Goal

把当前项目从“通用逻辑模型路由器”重构为 **Claude Code 专用的本地 Anthropic-compatible 网关桌面应用**。

用户在 Electron 桌面应用中配置多个 Anthropic-compatible 上游服务商（如 GLM、MiniMax），程序自动拉取模型列表；用户再把这些模型填入 Claude Code 的固定槽位（`Main / Thinking / Opus / Sonnet / Haiku`）。程序统一在本地暴露 `http://localhost:1314`，供 Claude Code 或 `cc-switch` 接入。

## Requirements

### 核心功能

- **Electron 桌面应用**：双击启动后可直接使用，支持托盘常驻
- **本地 Anthropic-compatible 网关**：对外统一暴露 `http://localhost:1314`
- **服务商管理**：用户可添加、编辑、删除多个 Anthropic-compatible 上游服务商
- **模型自动发现**：保存服务商后自动拉取模型列表
- **发现失败兜底**：模型获取失败时支持手动重试，且始终允许手填自定义模型 ID
- **Claude Code 槽位映射**：用户把模型映射到 `Main / Thinking / Opus / Sonnet / Haiku`
- **配置持久化**：服务商、模型发现结果、槽位映射、本地设置均自动保存
- **开机自启**：第一版即支持

### 体验要求

- 使用者只需要在 Claude Code / `cc-switch` 中把 Anthropic Base URL 指向 `localhost:1314`
- 用户日常编码时，主观体验应尽量接近“直接连接 GLM / MiniMax”
- UI 第一版允许朴素，但信息架构必须正确：
  - 服务商
  - 模型发现
  - Claude Code 槽位映射
  - 网关状态

### 协议边界

- 上游服务商前提是 **Anthropic-compatible**
- 本项目第一版不以“任意 OpenAI-compatible 直连 Claude Code”为目标
- 对 Claude Code 侧至少支持：
  - `/v1/messages`
  - `/v1/messages/count_tokens` 的能力位或兼容性处理

## Acceptance Criteria

- [ ] 可添加至少两个 Anthropic-compatible 服务商并成功持久化
- [ ] 保存服务商后，程序自动拉取模型列表
- [ ] 模型拉取失败时，用户可手动重试，且依然可手填模型 ID
- [ ] 用户可完成 `Main / Thinking / Opus / Sonnet / Haiku` 任意槽位映射
- [ ] Claude Code 可通过 `http://localhost:1314` 正常调用本地网关
- [ ] 应用关闭主窗口后进入托盘，网关继续可用
- [ ] 开机自启可配置并生效

## Technical Notes

### 关键重构方向

- 删除当前以 `RouteMapping` 为中心的产品抽象
- 共享类型改为围绕以下对象组织：
  - `ProviderConfig`
  - `DiscoveredModel`
  - `SlotMapping`
  - `GatewayRuntimeState`
- 主界面改为四块：
  - 服务商
  - 模型发现
  - Claude Code 槽位映射
  - 网关状态

### 当前可复用部分

- Electron 外壳、Preload、IPC 基础通路
- 本地网关生命周期管理
- `electron-store` 持久化能力
- 现有 Anthropic-compatible Provider 请求层

### 实施假设

- 第一版继续允许用户使用 `cc-switch` 作为外部配置辅助，不在本次任务中接管其全部能力
- 模型发现采用“通用尝试 + 失败兜底”的策略，不为每家厂商硬编码单独 UI 流程
- 本地网关鉴权默认保持低摩擦，是否默认开启在实现阶段再根据复杂度收口

## Out of Scope (Wave 2)

- 漂亮 UI 精修
- 完整日志面板
- 导入导出配置
- 自动更新
- 多语言支持
