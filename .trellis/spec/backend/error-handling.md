# Error Handling

> cc-gateway 错误处理规范，覆盖本地网关、主进程和 IPC 边界。

---

## Overview

当前产品主路径是 **Anthropic-compatible**，因此错误处理优先围绕 `/v1/messages` 组织。

三层错误边界：

1. `electron-proxy/`：请求转发、模型解析、模型列表
2. `electron/main/`：配置持久化、discovery、桌面生命周期
3. `IPC`：主进程与渲染进程之间的错误传递

---

## Core Errors

继续沿用：

- `ModelNotFoundError`
- `ProviderNotFoundError`
- `ProviderError`
- `AuthenticationError`

新增语义要求：

- `ModelNotFoundError` 现在既可能表示“槽位没配”，也可能表示“direct model 未命中 discovery/legacy routes”
- discovery 失败不应升级为“配置保存失败”

---

## Gateway Error Rules

### 1. `/v1/messages`

必须返回 Anthropic-compatible 错误结构：

```typescript
res.status(statusCode).json(toAnthropicError(error))
```

### 2. `/v1/models`

模型列表失败时：

- 返回 `500`
- 不暴露内部 stack
- 错误类型保持一致

### 3. `count_tokens`

若第一版未完整实现：

- 明确返回兼容性错误
- 不允许静默假成功

---

## Discovery Error Rules

模型发现失败处理：

```typescript
const config = await saveConfig(partial)

syncAllProvidersDiscovery(config.providers).catch((error) => {
  logger.warn(`模型自动发现失败: ${error instanceof Error ? error.message : String(error)}`)
})

return ok(config)
```

要求：

- 保存 provider 成功后再做 discovery
- discovery 失败只写入 provider discovery state
- UI 必须看到失败状态，并允许用户手填模型 ID

---

## IPC Error Rules

IPC 只返回 `IPCResult<T>`，不直接传 `Error` 对象。

```typescript
type IPCResult<T> = { ok: true; data: T } | { ok: false; error: string }
```

发现模型、保存配置、启动停止代理都必须走同一包装模式。

---

## Silent Failure Ban

以下场景如果没有测试、没有错误处理、而且用户看不到异常，视为阻断 finish-work：

- 槽位未配置时 `/v1/messages` 直接失败
- provider 删除后残留坏映射
- discovery 失败但 UI 仍显示“同步成功”
- `/v1/models` 空列表但用户无法区分“真空”还是“获取失败”

---

## Fallback Rule

如果 provider 不提供模型列表接口，而系统选择使用“官方文档静态目录”兜底：

- 必须在日志中明确标注为 fallback
- 不得冒充为远程 discovery 成功
- 该行为应视为兼容手段，而不是正式契约
