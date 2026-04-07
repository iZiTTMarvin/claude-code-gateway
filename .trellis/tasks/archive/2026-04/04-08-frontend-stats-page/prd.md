# Frontend: Sidebar Navigation + Statistics Page + Recharts Charts

## Goal

实现前端统计页面，包括侧边栏导航、汇总概览、趋势图表、厂商对比、详细表格、模型定价配置和数据清理功能。

## Boundary（与 W1 后端的接口契约）

### W2 依赖 W1 实现的 IPC API：

| IPC Channel | 调用方式 | 返回类型 |
|-------------|---------|----------|
| `usage:get-summary` | `electronAPI.getUsageSummary({ startDate?, endDate? })` | `UsageSummary` |
| `usage:get-records` | `electronAPI.getUsageRecords(params)` | `UsageQueryResult` |
| `usage:get-daily-trend` | `electronAPI.getDailyTrend({ startDate?, endDate? })` | `DailyUsageSummary[]` |
| `usage:delete-before` | `electronAPI.deleteUsageBefore({ date })` | `void` |
| `usage:clear-all` | `electronAPI.clearAllUsage()` | `void` |
| `pricing:get-all` | `electronAPI.getAllPricing()` | `ModelPricing[]` |
| `pricing:upsert` | `electronAPI.upsertPricing(pricing)` | `ModelPricing` |
| `pricing:delete` | `electronAPI.deletePricing({ modelId })` | `void` |

**共享类型（已在 `shared/types.ts` 中定义，W2 直接导入使用）：**
- `UsageRecord`, `UsageSummary`, `ProviderUsageSummary`, `ModelUsageSummary`
- `DailyUsageSummary`, `ModelPricing`, `UsageQueryParams`, `UsageQueryResult`

### 开发期间的 Mock 策略

W1 的 IPC API 可能尚未就绪。W2 应该：
1. 在 `src/lib/ipc.ts` 中封装所有 usage 相关的 IPC 调用
2. 可以先用 mock 数据开发 UI，等 W1 完成后切换为真实 IPC 调用
3. mock 数据放在独立文件中，方便后续移除

### W2 不得触碰的文件（W1 职责）：
- `electron-proxy/server.ts` — 代理服务器
- `electron-proxy/router.ts` — 路由解析
- `electron/main/ipc-handlers.ts` — IPC handler 实现
- `electron/main/usage-db.ts` — SQLite 存储层（W1 新建）
- `electron/preload/index.ts` — preload 脚本（W1 负责）

### W2 可以修改的文件：
- `src/App.tsx` — 添加侧边栏导航和路由切换
- `src/components/` — 新增统计相关组件
- `src/hooks/` — 新增 `useUsage.ts` hook
- `src/lib/ipc.ts` — 新增 usage 相关 IPC 封装
- `src/pages/` — 新建统计页面（新目录）
- `src/types/electron.d.ts` — 更新 electronAPI 类型声明
- `package.json` — 添加 recharts 依赖

## Requirements

### 1. 侧边栏导航

改造 `src/App.tsx` 的布局：

```
┌────┬──────────────────────────────────────┐
│ ⚙️ │                                      │
│    │  当前配置页面内容                      │
│ 📊 │  （左栏：服务商 + 模型发现）           │
│    │  （右栏：网关状态 + 鉴权）             │
└────┴──────────────────────────────────────┘
```

- 左侧添加窄侧边栏（图标导航），宽度约 56px
- 两个导航项：配置（齿轮图标）、统计（柱状图图标）
- 当前页面高亮显示
- 使用 React state 管理页面切换（不需要 react-router）
- 图标使用内联 SVG 或 Unicode 符号（不引入额外图标库）

### 2. 统计页面 (`src/pages/StatsPage.tsx`)

页面垂直滚动布局，从上到下包含以下区块：

#### 2.1 汇总概览卡片

一行 4 个卡片：
- 总请求数
- 总 Input Tokens
- 总 Output Tokens
- 总费用（美元）

每个卡片包含：标题、数值、可选的小图标。风格与现有卡片一致。

#### 2.2 趋势图表

使用 Recharts 绘制折线图/柱状图：
- X 轴：日期
- Y 轴：token 数量
- 两条线：input tokens、output tokens
- 支持切换时间范围（7天 / 30天 / 90天 / 全部）

#### 2.3 厂商对比

使用 Recharts 绘制柱状图或饼图：
- X 轴：厂商名称
- Y 轴：token 数量或费用
- 支持切换指标（token 数 / 费用）

#### 2.4 详细表格

分页表格，列包含：
- 时间
- 厂商
- 模型 ID
- Input Tokens
- Output Tokens
- 费用

支持：
- 按列排序（点击表头）
- 按厂商筛选
- 按时间范围筛选
- 分页（每页 20 条）

#### 2.5 模型定价配置

可折叠的配置区域：
- 表格形式展示已配置的模型定价
- 支持添加/编辑/删除定价
- 每行：模型 ID、Input 价格（$/1M tokens）、Output 价格（$/1M tokens）
- 使用受控表单，与现有 ProviderForm 风格一致

#### 2.6 数据管理

数据清理区域：
- "清理指定日期前的数据"按钮 + 日期选择器
- "清空全部数据"按钮
- 两个操作都需要二次确认弹窗

### 3. Hook 封装 (`src/hooks/useUsage.ts`)

```typescript
export function useUsage() {
  // 汇总概览
  summary: UsageSummary | null
  loadingSummary: boolean
  refreshSummary: (startDate?, endDate?) => void

  // 详细记录
  records: UsageRecord[]
  totalRecords: number
  loadingRecords: boolean
  queryRecords: (params: UsageQueryParams) => void

  // 趋势数据
  dailyTrend: DailyUsageSummary[]
  loadingTrend: boolean
  refreshTrend: (startDate?, endDate?) => void

  // 定价管理
  pricingList: ModelPricing[]
  loadingPricing: boolean
  savePricing: (pricing: ModelPricing) => Promise<void>
  deletePricing: (modelId: string) => Promise<void>
  refreshPricing: () => void

  // 数据清理
  deleteBefore: (date: string) => Promise<void>
  clearAll: () => Promise<void>
}
```

### 4. 依赖安装

安装 `recharts`：
```bash
npm install recharts
```

## Acceptance Criteria

- [ ] 侧边栏导航正常工作，配置/统计页面切换流畅
- [ ] 汇总概览卡片正确展示数据
- [ ] 趋势图表正确渲染，支持时间范围切换
- [ ] 厂商对比图表正确渲染
- [ ] 详细表格支持排序、筛选、分页
- [ ] 模型定价配置支持 CRUD 操作
- [ ] 数据清理功能有二次确认
- [ ] 所有组件使用命名导出（禁止 default export）
- [ ] 组件不直接调用 `window.electronAPI`，通过 hooks → lib/ipc.ts 调用
- [ ] 使用 mock 数据时，UI 能正常渲染和交互

## Technical Notes

- 图表库：Recharts（`import { LineChart, BarChart, PieChart } from 'recharts'`）
- 页面切换用简单的 React state，不需要 react-router
- 表格排序/筛选逻辑放在 hook 中，组件只负责渲染
- 侧边栏图标可以用 SVG inline 或 Unicode（如 ⚙️ 📊）
- 配置页面内容（ProviderCard、ModelDiscoveryCard 等）保持不变，只是被包裹在新的布局中
- 现有 `src/components/` 目录下的组件不需要修改

## Definition of Done

- 类型检查通过（`tsc --noEmit`）
- ESLint 通过
- CHANGELOG.md 更新
