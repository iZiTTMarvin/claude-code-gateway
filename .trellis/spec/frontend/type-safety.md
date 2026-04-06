# Type Safety

> cc-gateway 前端类型安全规范。

---

## Overview

本项目使用 TypeScript strict 模式。共享类型必须围绕 **Claude Code 槽位映射** 组织，而不是继续以“通用逻辑模型路由”作为中心抽象。

---

## Shared Types

所有跨进程数据结构统一定义在 `shared/types.ts`。

当前核心模型：

```typescript
export type SlotKind = 'main' | 'thinking' | 'opus' | 'sonnet' | 'haiku'
export type ModelDiscoveryStatus = 'idle' | 'syncing' | 'success' | 'failed'
export type SlotMappingSource = 'discovered' | 'custom'

export interface DiscoveredModel {
  readonly id: string
  readonly displayName: string
  readonly providerId: string
  readonly raw?: Readonly<Record<string, unknown>>
}

export interface ProviderDiscoveryState {
  readonly status: ModelDiscoveryStatus
  readonly syncedAt: string | null
  readonly error: string | null
  readonly models: readonly DiscoveredModel[]
}

export interface Provider {
  readonly id: string
  readonly name: string
  readonly protocol: 'anthropic' | 'openai'
  readonly baseUrl: string
  readonly apiKey: string
  readonly discovery?: ProviderDiscoveryState
}

export interface SlotMapping {
  readonly id: string
  readonly slot: SlotKind
  readonly providerId: string
  readonly source: SlotMappingSource
  readonly modelId: string
}

export interface AppSettings {
  readonly port: number
  readonly minimizeToTrayOnClose: boolean
  readonly autoLaunch: boolean
}

export interface AppConfig {
  readonly providers: readonly Provider[]
  readonly slotMappings: readonly SlotMapping[]
  readonly appSettings: AppSettings
  readonly gatewayAuth: GatewayAuthConfig
  readonly port: number              // deprecated compatibility
  readonly routes: readonly RouteMapping[] // deprecated compatibility
}
```

---

## IPC Typing

`window.electronAPI` 只暴露已类型化的接口，渲染进程禁止自行拼装未声明的 IPC 通道。

```typescript
export interface ElectronAPI {
  getConfig(): Promise<AppConfig>
  saveConfig(config: Partial<AppConfig>): Promise<AppConfig>
  generateGatewayApiKey(): Promise<string>
  startProxy(): Promise<void>
  stopProxy(): Promise<void>
  getProxyStatus(): Promise<ProxyStatus>
  discoverProviderModels(providerId: string): Promise<ProviderModelDiscoveryResult>
  retryProviderModelDiscovery(providerId: string): Promise<ProviderModelDiscoveryResult>
  onProxyStatusChange(callback: (status: ProxyStatus) => void): () => void
}
```

要求：

- `src/lib/ipc.ts` 和 `src/types/electron.d.ts` 必须同步更新
- discovery 返回值必须包含 `status / models / syncedAt / error`
- UI 不得假设 `discovery.models` 一定存在

---

## Validation

用户输入仍需运行时校验：

```typescript
function validateProvider(data: { name: string; baseUrl: string; apiKey: string }): string | null {
  if (!data.name.trim()) return '服务商名称不能为空'
  if (!data.baseUrl.trim()) return 'Base URL 不能为空'
  if (!data.apiKey.trim()) return 'API Key 不能为空'

  try {
    new URL(data.baseUrl)
  } catch {
    return 'Base URL 格式不正确'
  }

  return null
}
```

---

## Rules

### 1. 共享类型只从 `shared/types.ts` 导入

```typescript
import type { AppConfig, Provider, SlotMapping } from '../../shared/types'
```

禁止在渲染进程重新定义同名结构。

### 2. IPC discovery 类型必须返回 `DiscoveredModel[]`

不要把模型列表在 IPC 层降级成裸 `string[]`，否则会丢失 `displayName / providerId / raw`。

### 3. 创建 Provider 时排除 `discovery`

```typescript
type CreateProviderData = Omit<Provider, 'id' | 'discovery'>
```

### 4. 禁止 `any`

若类型未知，使用 `unknown`，并在边界处收窄。

### 5. 禁止非空断言掩盖配置缺失

像 discovery、slotMappings 这类可空结构，必须显式处理缺省路径。
