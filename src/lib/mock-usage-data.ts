/**
 * Mock 数据 - 用于 W1 后端未就绪时的前端开发
 * W1 完成后删除此文件，切换为真实 IPC 调用
 */

import type {
  UsageRecord,
  UsageSummary,
  DailyUsageSummary,
  ModelPricing,
  UsageQueryParams,
  UsageQueryResult,
} from '../../shared/types';

/** 生成最近 N 天的日期字符串 */
function recentDates(days: number): string[] {
  const result: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    result.push(d.toISOString().split('T')[0]);
  }
  return result;
}

/** 随机整数 */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** 格式化日期时间 */
function isoDateTime(dateStr: string, hour: number, minute: number): string {
  return `${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`;
}

// --- Mock 厂商列表 ---
const MOCK_PROVIDERS = [
  { id: 'anthropic', name: 'Anthropic' },
  { id: 'openai', name: 'OpenAI' },
  { id: 'minimax', name: 'MiniMax' },
  { id: 'glm', name: 'GLM' },
] as const;

// --- Mock 模型列表 ---
const MOCK_MODELS: readonly { modelId: string; providerId: string; providerName: string }[] = [
  { modelId: 'claude-sonnet-4-20250514', providerId: 'anthropic', providerName: 'Anthropic' },
  { modelId: 'claude-haiku-4-20250414', providerId: 'anthropic', providerName: 'Anthropic' },
  { modelId: 'gpt-4o', providerId: 'openai', providerName: 'OpenAI' },
  { modelId: 'gpt-4o-mini', providerId: 'openai', providerName: 'OpenAI' },
  { modelId: 'MiniMax-Text-01', providerId: 'minimax', providerName: 'MiniMax' },
  { modelId: 'glm-4-flash', providerId: 'glm', providerName: 'GLM' },
] as const;

// --- 生成 mock 用量记录 ---
const MOCK_DATES = recentDates(90);
const MOCK_RECORDS: readonly UsageRecord[] = MOCK_DATES.flatMap(date => {
  const countPerDay = randInt(3, 15);
  const records: UsageRecord[] = [];
  for (let i = 0; i < countPerDay; i++) {
    const provider = MOCK_PROVIDERS[randInt(0, MOCK_PROVIDERS.length - 1)];
    const model = MOCK_MODELS[randInt(0, MOCK_MODELS.length - 1)];
    records.push({
      id: records.length + 1,
      timestamp: isoDateTime(date, randInt(8, 23), randInt(0, 59)),
      providerId: provider.id,
      providerName: provider.name,
      modelId: model.modelId,
      inputTokens: randInt(100, 5000),
      outputTokens: randInt(50, 2000),
      protocol: provider.id === 'anthropic' ? 'anthropic' : 'openai',
    });
  }
  return records;
});

// --- Mock 定价 ---
const MOCK_PRICING: readonly ModelPricing[] = [
  { modelId: 'claude-sonnet-4-20250514', inputPricePerMillion: 3, outputPricePerMillion: 15 },
  { modelId: 'claude-haiku-4-20250414', inputPricePerMillion: 0.8, outputPricePerMillion: 4 },
  { modelId: 'gpt-4o', inputPricePerMillion: 2.5, outputPricePerMillion: 10 },
  { modelId: 'gpt-4o-mini', inputPricePerMillion: 0.15, outputPricePerMillion: 0.6 },
  { modelId: 'MiniMax-Text-01', inputPricePerMillion: 1, outputPricePerMillion: 2 },
  { modelId: 'glm-4-flash', inputPricePerMillion: 0.1, outputPricePerMillion: 0.1 },
];

/** 计算费用（$/1M tokens * token数 / 1M） */
function computeCost(inputTokens: number, outputTokens: number, modelId: string): number {
  const pricing = MOCK_PRICING.find(p => p.modelId === modelId);
  if (!pricing) return 0;
  return (
    (inputTokens * pricing.inputPricePerMillion) / 1_000_000 +
    (outputTokens * pricing.outputPricePerMillion) / 1_000_000
  );
}

// --- Mock API 实现 ---

export function mockGetUsageSummary(
  _startDate?: string,
  _endDate?: string,
): UsageSummary {
  const totalRequests = MOCK_RECORDS.length;
  const totalInputTokens = MOCK_RECORDS.reduce((s, r) => s + r.inputTokens, 0);
  const totalOutputTokens = MOCK_RECORDS.reduce((s, r) => s + r.outputTokens, 0);
  const totalCost = MOCK_RECORDS.reduce(
    (s, r) => s + computeCost(r.inputTokens, r.outputTokens, r.modelId),
    0,
  );

  const providerMap = new Map<string, { requests: number; input: number; output: number; cost: number }>();
  for (const r of MOCK_RECORDS) {
    const existing = providerMap.get(r.providerId) ?? { requests: 0, input: 0, output: 0, cost: 0 };
    providerMap.set(r.providerId, {
      requests: existing.requests + 1,
      input: existing.input + r.inputTokens,
      output: existing.output + r.outputTokens,
      cost: existing.cost + computeCost(r.inputTokens, r.outputTokens, r.modelId),
    });
  }

  const providerBreakdown = Array.from(providerMap.entries()).map(([providerId, data]) => ({
    providerId,
    providerName: MOCK_PROVIDERS.find(p => p.id === providerId)?.name ?? providerId,
    totalRequests: data.requests,
    totalInputTokens: data.input,
    totalOutputTokens: data.output,
    totalCost: data.cost,
  }));

  return {
    totalRequests,
    totalInputTokens,
    totalOutputTokens,
    totalCost,
    providerBreakdown,
    modelBreakdown: [],
  };
}

export function mockGetUsageRecords(params: UsageQueryParams): UsageQueryResult {
  let filtered = [...MOCK_RECORDS];

  if (params.providerId) {
    filtered = filtered.filter(r => r.providerId === params.providerId);
  }
  if (params.modelId) {
    filtered = filtered.filter(r => r.modelId === params.modelId);
  }
  if (params.startDate) {
    filtered = filtered.filter(r => r.timestamp >= params.startDate!);
  }
  if (params.endDate) {
    filtered = filtered.filter(r => r.timestamp <= params.endDate!);
  }

  // 按时间倒序
  filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const total = filtered.length;
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const start = (page - 1) * pageSize;
  const records = filtered.slice(start, start + pageSize);

  return {
    records,
    total,
    page,
    pageSize,
  };
}

export function mockGetDailyTrend(
  startDate?: string,
  endDate?: string,
): DailyUsageSummary[] {
  const dateMap = new Map<string, { input: number; output: number; cost: number }>();

  const filtered = MOCK_RECORDS.filter(r => {
    const dateStr = r.timestamp.split('T')[0];
    if (startDate && dateStr < startDate) return false;
    if (endDate && dateStr > endDate) return false;
    return true;
  });

  for (const r of filtered) {
    const dateStr = r.timestamp.split('T')[0];
    const existing = dateMap.get(dateStr) ?? { input: 0, output: 0, cost: 0 };
    dateMap.set(dateStr, {
      input: existing.input + r.inputTokens,
      output: existing.output + r.outputTokens,
      cost: existing.cost + computeCost(r.inputTokens, r.outputTokens, r.modelId),
    });
  }

  return Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      totalInputTokens: data.input,
      totalOutputTokens: data.output,
      totalCost: data.cost,
    }));
}

export function mockGetAllPricing(): ModelPricing[] {
  return [...MOCK_PRICING];
}

export function mockUpsertPricing(pricing: ModelPricing): ModelPricing {
  return { ...pricing };
}

export function mockDeletePricing(_modelId: string): void {
  // no-op for mock
}

export function mockDeleteBefore(_date: string): void {
  // no-op for mock
}

export function mockClearAll(): void {
  // no-op for mock
}
