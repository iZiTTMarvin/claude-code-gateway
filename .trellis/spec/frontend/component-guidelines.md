# Component Guidelines

> cc-gateway 前端组件设计规范。

---

## Overview

当前产品 UI 必须围绕这 4 块组织：

- 服务商
- 模型发现
- Claude Code 槽位映射
- 网关状态

不再以“逻辑模型路由列表”作为主心智。

---

## Component Structure

每个组件文件遵循：

1. 外部依赖导入
2. 内部 hooks / 组件导入
3. 共享类型导入
4. Props interface
5. 命名导出组件

---

## Current Primary Cards

### ProviderCard

职责：

- 添加 / 编辑 / 删除服务商
- 只处理服务商元数据，不直接承担槽位映射逻辑

### ModelDiscoveryCard

职责：

- 展示每个 provider 的 discovery 状态
- 展示最近同步时间
- 暴露“重试获取模型”按钮
- 当模型获取失败时，明确提示“仍可手填模型 ID”

### SlotMappingCard

职责：

- 固定渲染 `Main / Thinking / Opus / Sonnet / Haiku`
- 每个槽位支持：
  - 选择服务商
  - 从已发现模型中选
  - 直接手填模型 ID
- 系统不替用户判断哪个模型“更像 Opus”

### GatewayStatusCard

职责：

- 展示本地监听地址
- 展示 Anthropic-compatible 主路径
- 展示托盘常驻、开机自启等桌面行为设置

---

## Form Rules

### ProviderForm

- 使用受控表单
- 默认协议优先 `anthropic`
- 对 `openai` 协议只能作为兼容保留，不是产品主路径

### Slot Mapping Inputs

- 固定槽位，不允许用户自由新增任意条目
- `providerId` 和 `modelId` 都是显式输入
- 保存时允许 `source = discovered | custom`

---

## IPC Boundary

组件禁止直接调用 `window.electronAPI`。

正确方式：

- 组件 -> hooks
- hooks -> `src/lib/ipc.ts`
- `src/lib/ipc.ts` -> preload bridge

---

## Forbidden Patterns

### 1. 禁止继续扩张旧的 RouteCard / RouteForm

如果需求属于 Claude Code 固定槽位映射，必须落在 `SlotMappingCard` 相关组件中。

### 2. 禁止把动态路由列表伪装成槽位映射

槽位映射是固定 5 个槽位，不是用户可无限增删的路由表。

### 3. 禁止组件自己推导业务契约

比如组件不应自行决定“direct-model 是否优先于 slot”；这种契约必须留在 hook / backend 层。

### 4. 禁止 default export

统一使用命名导出。
