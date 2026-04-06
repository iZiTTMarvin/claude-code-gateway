# Engineering Plan

## Scope

本次规划采用已批准的设计方案 **B：围绕 Claude Code 重构核心**。

目标不是继续修补“通用逻辑模型路由器”，而是把系统核心切换为：

`服务商配置 -> 模型发现/手填 -> Claude Code 槽位映射 -> 本地 Anthropic-compatible 网关`

## What Already Exists

- Electron 桌面壳：窗口、Preload、IPC 基础链路已存在
- 本地代理生命周期：`electron/main/proxy-manager.ts`
- 持久化能力：`electron/main/config-store.ts`
- Anthropic-compatible 请求入口：`electron-proxy/server.ts`
- 基础服务商管理 UI：`ProviderCard` + `useProviders`

## Proposed Architecture

### 1. Shared Data Model

用以下模型替换当前 `AppConfig.providers + routes` 的中心结构：

```text
AppConfig
├── providers: ProviderConfig[]
├── slotMappings: SlotMapping[]
├── appSettings: AppSettings
└── gatewayAuth: GatewayAuthConfig
```

建议类型：

- `ProviderConfig`
  - `id`
  - `name`
  - `baseUrl`
  - `apiKey`
  - `protocol` 固定为 `anthropic`
  - `discovery`: 最近一次同步时间、状态、错误、已发现模型列表
- `DiscoveredModel`
  - `id`
  - `displayName`
  - `providerId`
  - `raw`
- `SlotKind`
  - `main | thinking | opus | sonnet | haiku`
- `SlotMapping`
  - `slot`
  - `providerId`
  - `source`
    - `discovered`
    - `custom`
  - `modelId`
- `GatewayRuntimeState`
  - `running`
  - `port`
  - `lastRequestSummary`
  - `lastSyncSummary`

### 2. Cross-Layer Flow

```text
User edits provider
  -> Renderer hook calls IPC save
    -> Main process persists provider
      -> Main process triggers model discovery
        -> Upstream Anthropic-compatible provider
          -> Discovery result saved to store
            -> Renderer refreshes provider + model state
              -> User selects / hand-types slot mapping
                -> Mapping persisted
                  -> /v1/messages resolves slot -> provider -> model
```

### 3. Gateway Resolution

当前请求解析是“逻辑模型名 -> route -> provider -> actualModel”。

重构后建议改成：

```text
Incoming Claude Code request
  -> infer target slot
  -> lookup SlotMapping
  -> resolve ProviderConfig + modelId
  -> forward Anthropic-compatible request upstream
```

说明：

- `/v1/messages` 必须作为第一优先链路
- `count_tokens` 第一版可保留兼容性能力位，但实现复杂度需要单独控制
- OpenAI `/v1/chat/completions` 不再作为第一版主路径

## Implementation Phases

### Phase 1: Schema & Contract Reset

- 重写 `shared/types.ts`
- 更新 `config-store.ts` 持久化 schema
- 为旧配置准备最小迁移策略或明确的破坏性重置策略
- 补充共享类型测试

### Phase 2: Provider Discovery

- 引入独立的模型发现服务
- 保存服务商后自动发现模型
- 支持手动重试
- 失败时记录状态但不阻塞继续使用

### Phase 3: UI Restructure

- 主界面改成：
  - 服务商
  - 模型发现
  - Claude Code 槽位映射
  - 网关状态
- 删除“逻辑模型路由卡片”心智
- 槽位映射支持下拉选择 + 自定义输入

### Phase 4: Gateway Rewire

- 让 `/v1/messages` 走新的槽位解析链路
- 错误返回继续遵循 Anthropic-compatible 格式
- 保留必要的健康检查与鉴权中间件

### Phase 5: Tray & Autostart

- 关闭窗口时最小化到托盘
- 托盘菜单最少包括：显示主窗口、重启网关、退出
- 开机自启开关接入本地设置

## TDD Plan

非微小变更按以下顺序推进：

1. 共享类型 / 配置迁移测试
2. 模型发现服务测试
3. 槽位映射解析测试
4. `/v1/messages` 集成测试
5. 托盘与生命周期行为测试（以主进程单元测试为主）

## Test Diagram

```text
[+] Provider config save
    ├── [REQ] save provider -> persisted
    ├── [REQ] save provider -> auto discovery starts
    └── [REQ] save invalid provider -> error surfaced

[+] Model discovery
    ├── [REQ] discovery success -> models stored
    ├── [REQ] discovery failure -> retry available
    └── [REQ] discovery failure -> custom model still allowed

[+] Slot mapping
    ├── [REQ] choose discovered model -> mapping stored
    ├── [REQ] type custom model -> mapping stored
    └── [REQ] provider removed -> dependent mapping invalidated

[+] Gateway request
    ├── [REQ] /v1/messages -> slot resolved -> upstream provider called
    ├── [REQ] missing slot mapping -> anthropic error returned
    └── [REQ] upstream failure -> anthropic error returned

[+] Lifecycle
    ├── [REQ] close window -> tray alive -> proxy alive
    └── [REQ] autostart enabled -> app settings persisted
```

## Failure Modes

- 上游模型发现接口超时
  - 需要测试
  - 需要可重试错误状态
  - 用户必须看到“同步失败但仍可手填”
- 删除服务商后残留槽位映射
  - 需要测试
  - 需要保存时清理或标记失效
  - 不能静默保留坏映射
- 槽位缺失时 Claude Code 请求进入 `/v1/messages`
  - 需要测试
  - 需要返回清晰的 Anthropic-compatible 错误
- 窗口关闭后代理意外停止
  - 需要测试
  - 需要托盘生命周期保护

## Not In Scope

- 完整日志面板
  - 第一版先保留结构化日志和状态摘要，不做完整查看器
- 配置导入导出
  - 不是主链路阻塞项
- 视觉精修
  - 等核心链路稳定后再做第二波
- 自动更新
  - 与当前价值主线无关

## Opinionated Recommendations

- **配置模型要彻底去“逻辑模型路由”化**
  - 否则 UI 和网关层都会继续带着错误心智
- **模型发现要做成显式状态机**
  - `idle / syncing / success / failed`
  - 不要只存一个 `models[]`
- **第一版默认保守**
  - 网关鉴权默认关闭或低摩擦开启
  - `count_tokens` 可先做兼容性兜底，不要为它卡住主链路
