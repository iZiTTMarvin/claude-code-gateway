# Research

## Relevant Specs

- `.trellis/spec/frontend/component-guidelines.md`
  - 当前组件拆分、表单结构、命名导出规则，后续重构 UI 时需要沿用
- `.trellis/spec/frontend/state-management.md`
  - 明确了 `useState + IPC + electron-store` 的状态流向，适合本次“服务商 / 模型发现 / 槽位映射”状态设计
- `.trellis/spec/frontend/type-safety.md`
  - 共享类型必须放在 `shared/types.ts`，适合本次替换 `RouteMapping` 中心模型
- `.trellis/spec/backend/error-handling.md`
  - 本地网关、IPC 和上游调用的错误必须标准化，尤其是 `/v1/messages` 和模型发现失败路径
- `.trellis/spec/backend/logging-guidelines.md`
  - 第一版虽然不做完整日志面板，但仍需保留结构化日志和后续可转发到 UI 的能力
- `.trellis/spec/guides/cross-layer-thinking-guide.md`
  - 本次变更横跨存储、主进程、渲染进程和网关协议层，必须先定义清楚边界契约

## Code Patterns Found

- **配置加载与主界面组装**
  - `src/App.tsx`
  - 当前模式是启动时通过 IPC 拉取配置，再把配置切分给各个 hook / card
- **配置持久化**
  - `electron/main/config-store.ts`
  - 现有模式是 `electron-store` + `saveConfig(partial)` 局部更新，适合继续沿用
- **网关生命周期与状态推送**
  - `electron/main/proxy-manager.ts`
  - 已具备 `start / stop / getStatus / status change callback` 基础能力
- **Anthropic-compatible 请求入口**
  - `electron-proxy/server.ts`
  - 已有 `/v1/messages` 处理器，是后续槽位映射接入的主要落点
- **服务商 UI 与 Hook**
  - `src/components/ProviderCard.tsx`
  - `src/hooks/useProviders.ts`
  - 当前已经把服务商编辑与 IPC 保存隔离开，适合延伸到“保存后触发模型同步”

## Files to Modify

- `shared/types.ts`
  - 用新的配置结构替换 `RouteMapping` 中心模型
- `electron/main/config-store.ts`
  - 迁移持久化 schema，增加模型发现结果与槽位映射
- `electron/main/ipc-handlers.ts`
  - 新增模型发现和槽位配置的 IPC 接口
- `electron/main/proxy-manager.ts`
  - 保留网关生命周期，后续接入托盘与开机自启
- `electron-proxy/server.ts`
  - 让 `/v1/messages` 从“逻辑模型路由”切换为“Claude Code 槽位解析”
- `electron-proxy/router.ts`
  - 改造成基于槽位映射的目标解析器，或被新解析模块替代
- `src/App.tsx`
  - 重构主界面信息架构
- `src/components/ProviderCard.tsx`
  - 扩展为保存后自动触发模型同步
- `src/components/RouteCard.tsx`
  - 由“逻辑模型路由卡片”重构为“Claude Code 槽位映射卡片”
- `src/hooks/useProviders.ts`
  - 扩展模型同步状态与重试行为
- `electron/main/index.ts`
  - 接入托盘与开机自启

## Temporary Assumptions

- `cc-switch` 继续作为外部工具存在；本程序本轮不负责替代其所有配置写入能力
- 模型发现策略优先尝试 Anthropic 风格列表接口，失败则回落到“只允许手填”
- 第一版以 Windows 为主要验证平台
