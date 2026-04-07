# Backend: SQLite Storage + SSE Parsing + Usage Collection

## Goal

实现 token 用量数据的采集、存储和查询后端。包括：改造流式响应处理以提取 usage、SQLite 存储层、IPC handler 供前端调用。

## Boundary（与 W2 前端的接口契约）

### W1 负责实现，W2 消费的接口：

**IPC Channels（在 preload 中注册）：**

| Channel | 参数 | 返回值 | 说明 |
|---------|------|--------|------|
| `usage:get-summary` | `{ startDate?, endDate? }` | `UsageSummary` | 汇总概览 |
| `usage:get-records` | `UsageQueryParams` | `UsageQueryResult` | 分页查询记录 |
| `usage:get-daily-trend` | `{ startDate?, endDate? }` | `DailyUsageSummary[]` | 按天趋势 |
| `usage:delete-before` | `{ date: string }` | `void` | 清理指定日期前的数据 |
| `usage:clear-all` | 无 | `void` | 清空全部数据 |
| `pricing:get-all` | 无 | `ModelPricing[]` | 获取所有模型定价 |
| `pricing:upsert` | `ModelPricing` | `ModelPricing` | 创建/更新模型定价 |
| `pricing:delete` | `{ modelId: string }` | `void` | 删除模型定价 |

**共享类型（已在 `shared/types.ts` 中定义）：**
- `UsageRecord`, `UsageSummary`, `ProviderUsageSummary`, `ModelUsageSummary`
- `DailyUsageSummary`, `ModelPricing`, `UsageQueryParams`, `UsageQueryResult`

### W1 不得触碰的文件（W2 职责）：
- `src/App.tsx` — 页面布局和路由
- `src/components/` — 所有 UI 组件
- `src/hooks/` — 前端 hooks
- `src/pages/` — 页面组件（W2 新建）
- `src/lib/ipc.ts` — 前端 IPC 封装（W2 负责）

### W1 可以修改的文件：
- `electron-proxy/server.ts` — 改造 `writeStreamResponse`，添加 SSE 解析和 usage 提取
- `electron-proxy/types.ts` — 如需扩展代理层类型
- `electron/main/ipc-handlers.ts` — 注册新的 IPC handlers
- `electron/preload/index.ts` — 暴露新的 IPC API 给渲染进程
- `electron/main/` — 新建 `usage-db.ts`（SQLite 存储层）
- `shared/types.ts` — 类型定义（已由主仓库预定义）

## Requirements

### 1. SQLite 存储层 (`electron/main/usage-db.ts`)

使用 `better-sqlite3` 实现：

**表结构：**

```sql
CREATE TABLE IF NOT EXISTS usage_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,          -- ISO 8601
  provider_id TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  model_id TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  protocol TEXT NOT NULL            -- 'anthropic' | 'openai'
);

CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON usage_records(timestamp);
CREATE INDEX IF NOT EXISTS idx_usage_provider ON usage_records(provider_id);
CREATE INDEX IF NOT EXISTS idx_usage_model ON usage_records(model_id);

CREATE TABLE IF NOT EXISTS model_pricing (
  model_id TEXT PRIMARY KEY,
  input_price_per_million REAL NOT NULL DEFAULT 0,
  output_price_per_million REAL NOT NULL DEFAULT 0
);
```

**必需函数：**
- `initUsageDb()` — 初始化数据库，创建表和索引
- `insertUsageRecord(record)` — 插入一条 usage 记录
- `getUsageSummary(startDate?, endDate?)` — 查询汇总
- `queryUsageRecords(params: UsageQueryParams)` — 分页查询
- `getDailyTrend(startDate?, endDate?)` — 按天聚合趋势
- `deleteRecordsBefore(date)` — 按日期清理
- `clearAllRecords()` — 清空全部记录
- `getAllPricing()` / `upsertPricing(pricing)` / `deletePricing(modelId)` — 定价 CRUD

**费用计算逻辑：**
- 汇总查询时，关联 `model_pricing` 表计算费用
- 无定价的模型费用为 0
- 公式：`cost = (inputTokens / 1_000_000) * inputPricePerMillion + (outputTokens / 1_000_000) * outputPricePerMillion`

### 2. SSE 流解析 + Usage 采集

改造 `electron-proxy/server.ts` 中的 `writeStreamResponse`：

**核心思路：** 不再直接 `body.pipe(res)`，而是逐行解析 SSE 事件，在转发的同时提取最后一个事件中的 usage。

**Anthropic 协议（`stream: true`）：**
- 事件流格式：`event: message_delta\ndata: {"usage":{"input_tokens":N,"output_tokens":N}}`
- 在 `message_delta` 或 `message_stop` 事件中提取 usage

**OpenAI 协议（`stream: true`）：**
- 最后一个 chunk 包含 `usage.prompt_tokens` / `usage.completion_tokens`
- 以 `data: [DONE]` 标记流结束

**采集回调：** 提取到 usage 后，调用 `insertUsageRecord` 异步写入（不阻塞响应流）

**注意：** 需要将 `providerId`、`providerName`、`modelId`、`protocol` 传递到流处理函数中。

### 3. IPC Handlers

在 `electron/main/ipc-handlers.ts` 中注册上述所有 IPC channel 的处理函数。

在 `electron/preload/index.ts` 中暴露对应的 API 方法。

## Acceptance Criteria

- [ ] SQLite 数据库在应用启动时自动初始化
- [ ] 每次 API 请求（流式/非流式）完成后，usage 自动写入 SQLite
- [ ] 流式请求的 usage 从 SSE 事件中正确提取（Anthropic + OpenAI）
- [ ] 非流式请求的 usage 从响应 JSON 中正确提取
- [ ] 所有 IPC handler 正确实现并通过 preload 暴露
- [ ] 费用计算正确（有定价的模型计算，无定价的返回 0）
- [ ] 数据清理功能（按日期删除、全部清空）
- [ ] 不影响现有代理功能的性能和稳定性

## Technical Notes

- SQLite 推荐 `better-sqlite3`（同步 API，适合 Electron 主进程）
- 流解析不能阻塞响应转发，usage 写入应该用异步方式
- 数据库文件存放在 Electron `app.getPath('userData')` 目录下
- 现有 `writeStreamResponse` 需要重构，新函数签名需要包含 provider/model 信息
- `forwardRequest` 中已有 `provider` 和 `actualModel`，可以直接传递
- 非流式请求的 usage 在 `result.data` 中提取

## Definition of Done

- 类型检查通过（`tsc --noEmit`）
- ESLint 通过
- CHANGELOG.md 更新
