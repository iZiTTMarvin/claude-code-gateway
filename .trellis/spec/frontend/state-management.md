# State Management

> cc-gateway 前端状态管理规范。

---

## Overview

本项目使用 `useState + useEffect + IPC`，不引入额外状态库。  
持久化真源头在主进程的 `electron-store`，渲染进程只维护 UI 侧镜像状态。

---

## State Categories

### 1. Config State

持久化数据包括：

- `providers`
- `slotMappings`
- `appSettings`
- `gatewayAuth`

数据流：

```text
electron-store (disk)
  <-> Main Process
  <-> IPC
  <-> Renderer hooks
```

### 2. Discovery State

每个 provider 的模型发现必须显式维护状态机：

```typescript
type ModelDiscoveryStatus = 'idle' | 'syncing' | 'success' | 'failed'
```

规则：

- `syncing` 时 UI 必须有进行中反馈
- `failed` 时必须展示错误消息
- `failed` 不得阻止槽位手填模型 ID

### 3. Proxy Status State

代理状态通过主进程推送：

- `getProxyStatus()` 初始化
- `onProxyStatusChange()` 订阅更新

### 4. UI State

临时状态：

- 当前编辑项
- 表单开关
- 当前正在保存 / 同步的槽位或 provider

---

## Recommended Hook Split

- `useProviders`
  - provider 增删改
  - provider discovery 触发与状态维护
- `useSlotMappings`
  - 5 个固定槽位的映射保存 / 清空
- `useAppSettings`
  - 托盘与开机自启设置
- `useProxyStatus`
  - 本地网关运行状态
- `useGatewayAuth`
  - 本地网关鉴权设置

---

## Cross-Layer Contract

```text
save provider
  -> persist config
  -> trigger discovery
  -> persist discovery result
  -> renderer refreshes provider state
  -> user maps slot
  -> /v1/messages resolves slot or direct model
```

必须保证：

- 配置保存成功与 discovery 成功/失败解耦
- 删除 provider 时同时清理相关 slot mappings
- renderer 不依赖 runtime-only discovery cache 作为唯一来源

---

## Rules

### 1. 所有 IPC 订阅必须 cleanup

### 2. 不在 render 中触发 IPC

### 3. 不直接 mutation state

### 4. 不让 discovery 失败污染 config save

错误 discovery 只更新状态，不回滚已保存 provider。

### 5. 状态提升优先于全局状态库

当前单页桌面应用规模下，通过父组件协调 hooks 即可。
