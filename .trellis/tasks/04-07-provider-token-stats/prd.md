# Provider Token Usage Statistics

## Goal

为 cc-gateway 添加 Token 用量统计功能，按厂商（Provider）和模型（Model ID）维度追踪和展示 API 调用的 Token 消耗和成本，帮助用户了解各厂商/模型的使用情况和费用分布。

## What I already know

* 项目是 Electron + React 桌面应用，作为 LLM API 网关
* 当前无任何 token 计数或用量追踪功能（handleCountTokens 返回 501）
* 存储层使用 electron-store（JSON 文件），无传统数据库
* 支持两种协议：Anthropic (`/v1/messages`) 和 OpenAI (`/v1/chat/completions`)
* 路由层在 `electron-proxy/router.ts`，请求处理在 `electron-proxy/server.ts`
* 前端使用 React 19 + Tailwind CSS
* Provider 数据模型：`{ id, name, protocol, baseUrl, apiKey, discovery }`
* Claude Code 全部使用流式请求（stream: true + SSE）
* 当前流式处理是 `body.pipe(res)` 直接透传，无 SSE 解析

## Decisions

| 决策项 | 选择 | 原因 |
|--------|------|------|
| 数据采集方式 | 流式 SSE 解析 | Claude Code 主要使用流式请求 |
| 记录粒度 | 每次请求一条 | 支持细粒度分析，存储量可控（~200B/条，27年才1GB） |
| 存储方案 | SQLite | 支持条件删除、聚合查询、文件体积小 |
| 图表库 | Recharts | React 生态最流行，功能丰富 |
| 页面导航 | 侧边栏导航 | 配置/统计两个独立视图 |
| 清理策略 | 手动清理 | 用户完全掌控数据生命周期 |
| 成本估算 | 需要 | 每个模型可设置单价，自动计算费用 |

## Requirements

### 数据采集
* 每次请求完成后，从 SSE 流的最后一个事件中提取 usage 字段
* Anthropic 协议：`message_delta` 或 `message_stop` 事件中的 `usage.input_tokens` / `usage.output_tokens`
* OpenAI 协议：最后一个 chunk 中的 `usage.prompt_tokens` / `usage.completion_tokens`
* 记录字段：timestamp, provider_id, provider_name, model_id, input_tokens, output_tokens, protocol

### 存储层
* 使用 SQLite 存储每次请求的 token 用量
* 表结构：`usage_records (id, timestamp, provider_id, provider_name, model_id, input_tokens, output_tokens, protocol)`
* 成本配置表：`model_pricing (model_id, input_price_per_million, output_price_per_million)`

### UI 统计页面（侧边栏导航）
* **汇总概览**：总 token 数、总请求数、总费用、活跃厂商数等卡片
* **趋势图表**：按天/周/月的 token 用量折线图或柱状图
* **厂商对比**：不同厂商的用量对比（饼图或柱状图）
* **详细表格**：每条请求记录列表（时间、厂商、模型、input/output token、费用），支持排序筛选
* **成本估算**：每个模型可设置 input/output 单价（$/1M tokens），自动计算费用

### 数据管理
* 手动清理：支持按时间范围删除历史数据（如"清理 30 天前的数据"）
* 清理操作需二次确认

## Acceptance Criteria

* [ ] 每次 API 请求完成后，自动从 SSE 流中提取 usage 并存入 SQLite
* [ ] 流式请求的 usage 正确提取（Anthropic + OpenAI 两种协议）
* [ ] 侧边栏导航：配置页 / 统计页切换
* [ ] 汇总概览卡片展示总 token、总请求数、总费用
* [ ] 趋势图表展示按天/周/月的 token 用量
* [ ] 厂商对比图表展示各厂商用量分布
* [ ] 详细表格展示每条请求记录，支持排序筛选
* [ ] 模型定价配置功能，自动计算费用
* [ ] 手动清理功能（按时间范围删除，二次确认）
* [ ] 不影响现有代理功能的性能和稳定性

## Definition of Done

* Tests added/updated (unit/integration where appropriate)
* Lint / typecheck / CI green
* CHANGELOG.md 更新
* Rollback/rollback considered if risky

## Out of Scope

* 实时流式 token 计数（进度条式）
* 导出报表功能（CSV/Excel）
* 自动清理策略

## Technical Notes

* 关键文件：`electron-proxy/server.ts`（请求处理）、`electron-proxy/router.ts`（路由解析）
* 存储：`electron/main/config-store.ts`（electron-store，仅配置用）
* 类型定义：`shared/types.ts`
* 前端组件：`src/components/`、`src/hooks/`
* Anthropic SSE 事件：`message_start` → `content_block_delta`（多次）→ `message_delta`（含 usage）→ `message_stop`
* OpenAI SSE 事件：chunk（多次）→ 最后一个 chunk 含 `usage` + `data: [DONE]`
* SQLite 推荐库：`better-sqlite3`（同步 API，适合 Electron 主进程）
