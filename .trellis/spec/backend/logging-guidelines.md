# Logging Guidelines

> cc-gateway 日志规范。

---

## Overview

日志服务于两个目的：

- 排查本地网关和上游 provider 问题
- 给未来日志面板保留结构化输入

当前应继续使用统一 `logger`，不要退回 `console.log`。

---

## Required Log Events

| 事件 | 级别 | 必须字段 |
|------|------|----------|
| 代理启动 | `info` | 端口 |
| 代理停止 | `info` | 停止原因 |
| 收到请求 | `info` | method、path、model |
| 路由解析成功 | `info` | requestModel、providerId、actualModel |
| 路由来源 | `debug` | `slot` / `direct-model` / `legacy-route` |
| 模型发现成功 | `info` | providerId、models count |
| 模型发现失败 | `warn` | providerId、error |
| fallback 启用 | `warn` | providerId、fallback source |
| `/v1/models` 返回 | `info` | count |
| 上游调用失败 | `error` | providerId、error |

---

## Examples

```typescript
logger.info(`REQUEST: POST /v1/messages model=${model}`)
logger.info(`ROUTE: ${requestModel} -> ${providerId}/${actualModel}`)
logger.debug(`Resolver: source=${resolvedBy} key=${resolvedKey} protocol=${protocol}`)
logger.info(`DISCOVERY: provider=${providerId} status=success models=${count}`)
logger.warn(`DISCOVERY: provider=${providerId} status=failed error=${message}`)
logger.warn(`[${providerId}] Upstream model list unavailable, fallback to static MiniMax catalog`)
```

---

## Sensitive Data Rules

禁止记录：

- API Key 明文
- 用户消息全文
- 完整请求 / 响应 body（除非 debug 且已脱敏）

---

## High-Frequency Log Ban

以下位置禁止逐条打高频日志：

- 流式 chunk 循环
- 大列表 discovery 结果逐模型打印

应改为摘要日志。

---

## Compatibility Note

若 discovery 结果来自静态 fallback，日志必须能让人一眼看出它不是远程 API 返回。  
这是当前 finish-work 的必查项之一。
