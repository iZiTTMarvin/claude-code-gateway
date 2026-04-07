/**
 * SQLite 用量存储层
 * 使用 better-sqlite3 实现 token 用量数据的持久化存储和查询
 */

import path from 'node:path';
import type { Database } from 'better-sqlite3';
import type {
  DailyUsageSummary,
  ModelPricing,
  ModelUsageSummary,
  ProviderProtocol,
  ProviderUsageSummary,
  UsageQueryParams,
  UsageQueryResult,
  UsageRecord,
  UsageSummary,
} from '../../shared/types';
import { logger } from '../../electron-proxy/utils/logger';

let db: Database | null = null;

/** 获取数据库文件路径（需在 Electron 主进程中调用） */
async function getDbPath(): Promise<string> {
  // 动态 import electron 以保持 electron-proxy 层独立性
  const { app } = await import('electron');
  return path.join(app.getPath('userData'), 'usage.db');
}

/** 初始化数据库，创建表和索引 */
export async function initUsageDb(): Promise<void> {
  if (db) return;

  const DatabaseCtor = (await import('better-sqlite3')).default;
  const dbPath = await getDbPath();
  db = new DatabaseCtor(dbPath);

  // 启用 WAL 模式，提升并发性能
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS usage_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      provider_name TEXT NOT NULL,
      model_id TEXT NOT NULL,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      protocol TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON usage_records(timestamp);
    CREATE INDEX IF NOT EXISTS idx_usage_provider ON usage_records(provider_id);
    CREATE INDEX IF NOT EXISTS idx_usage_model ON usage_records(model_id);

    CREATE TABLE IF NOT EXISTS model_pricing (
      model_id TEXT PRIMARY KEY,
      input_price_per_million REAL NOT NULL DEFAULT 0,
      output_price_per_million REAL NOT NULL DEFAULT 0
    );
  `);

  logger.info(`Usage DB initialized at ${dbPath}`);
}

/** 确保 DB 已初始化 */
function requireDb(): Database {
  if (!db) {
    throw new Error('Usage DB is not initialized. Call initUsageDb() first.');
  }
  return db;
}

/** 新增 usage 记录 */
export function insertUsageRecord(record: {
  providerId: string;
  providerName: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  protocol: ProviderProtocol;
}): void {
  const database = requireDb();
  try {
    database.prepare(
      `INSERT INTO usage_records (timestamp, provider_id, provider_name, model_id, input_tokens, output_tokens, protocol)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      new Date().toISOString(),
      record.providerId,
      record.providerName,
      record.modelId,
      record.inputTokens,
      record.outputTokens,
      record.protocol
    );
  } catch (error) {
    logger.error(`Failed to insert usage record: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/** 获取模型定价映射（modelId -> pricing） */
function getPricingMap(): Map<string, ModelPricing> {
  const database = requireDb();
  const rows = database.prepare('SELECT * FROM model_pricing').all() as Array<{
    model_id: string;
    input_price_per_million: number;
    output_price_per_million: number;
  }>;

  const map = new Map<string, ModelPricing>();
  for (const row of rows) {
    map.set(row.model_id, {
      modelId: row.model_id,
      inputPricePerMillion: row.input_price_per_million,
      outputPricePerMillion: row.output_price_per_million,
    });
  }
  return map;
}

/** 根据定价计算费用 */
function calculateCost(modelId: string, inputTokens: number, outputTokens: number, pricingMap: Map<string, ModelPricing>): number {
  const pricing = pricingMap.get(modelId);
  if (!pricing) return 0;
  return (inputTokens / 1_000_000) * pricing.inputPricePerMillion
       + (outputTokens / 1_000_000) * pricing.outputPricePerMillion;
}

/** 构建日期过滤 SQL 片段 */
function buildDateFilter(startDate?: string, endDate?: string): { clause: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (startDate) {
    conditions.push('timestamp >= ?');
    params.push(startDate);
  }
  if (endDate) {
    conditions.push('timestamp <= ?');
    params.push(endDate);
  }

  return {
    clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

/** 获取用量汇总概览 */
export function getUsageSummary(startDate?: string, endDate?: string): UsageSummary {
  const database = requireDb();
  const { clause, params } = buildDateFilter(startDate, endDate);
  const pricingMap = getPricingMap();

  const row = database.prepare(
    `SELECT
       COUNT(*) as total_requests,
       COALESCE(SUM(input_tokens), 0) as total_input_tokens,
       COALESCE(SUM(output_tokens), 0) as total_output_tokens
     FROM usage_records ${clause}`
  ).get(...params) as { total_requests: number; total_input_tokens: number; total_output_tokens: number };

  // 按 provider 汇总
  const providerRows = database.prepare(
    `SELECT
       provider_id,
       provider_name,
       COUNT(*) as total_requests,
       COALESCE(SUM(input_tokens), 0) as total_input_tokens,
       COALESCE(SUM(output_tokens), 0) as total_output_tokens
     FROM usage_records ${clause}
     GROUP BY provider_id, provider_name`
  ).all(...params) as Array<{
    provider_id: string;
    provider_name: string;
    total_requests: number;
    total_input_tokens: number;
    total_output_tokens: number;
  }>;

  // 按 model 汇总
  const modelRows = database.prepare(
    `SELECT
       model_id,
       provider_id,
       provider_name,
       COUNT(*) as total_requests,
       COALESCE(SUM(input_tokens), 0) as total_input_tokens,
       COALESCE(SUM(output_tokens), 0) as total_output_tokens
     FROM usage_records ${clause}
     GROUP BY model_id, provider_id, provider_name`
  ).all(...params) as Array<{
    model_id: string;
    provider_id: string;
    provider_name: string;
    total_requests: number;
    total_input_tokens: number;
    total_output_tokens: number;
  }>;

  // 先计算每个模型的费用，用于汇总到 provider 层和总计
  const modelBreakdown: ModelUsageSummary[] = modelRows.map(m => ({
    modelId: m.model_id,
    providerId: m.provider_id,
    providerName: m.provider_name,
    totalRequests: m.total_requests,
    totalInputTokens: m.total_input_tokens,
    totalOutputTokens: m.total_output_tokens,
    totalCost: calculateCost(m.model_id, m.total_input_tokens, m.total_output_tokens, pricingMap),
  }));

  // 按 provider 聚合模型费用
  const providerCostMap = new Map<string, number>();
  for (const m of modelBreakdown) {
    providerCostMap.set(m.providerId, (providerCostMap.get(m.providerId) ?? 0) + m.totalCost);
  }

  const providerBreakdown: ProviderUsageSummary[] = providerRows.map(p => ({
    providerId: p.provider_id,
    providerName: p.provider_name,
    totalRequests: p.total_requests,
    totalInputTokens: p.total_input_tokens,
    totalOutputTokens: p.total_output_tokens,
    totalCost: providerCostMap.get(p.provider_id) ?? 0,
  }));

  // 总费用 = 所有模型费用之和
  const totalCost = modelBreakdown.reduce((sum, m) => sum + m.totalCost, 0);

  return {
    totalRequests: row.total_requests,
    totalInputTokens: row.total_input_tokens,
    totalOutputTokens: row.total_output_tokens,
    totalCost,
    providerBreakdown,
    modelBreakdown,
  };
}

/** 分页查询用量记录 */
export function queryUsageRecords(params: UsageQueryParams): UsageQueryResult {
  const database = requireDb();
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const queryParams: unknown[] = [];

  if (params.providerId) {
    conditions.push('provider_id = ?');
    queryParams.push(params.providerId);
  }
  if (params.modelId) {
    conditions.push('model_id = ?');
    queryParams.push(params.modelId);
  }
  if (params.startDate) {
    conditions.push('timestamp >= ?');
    queryParams.push(params.startDate);
  }
  if (params.endDate) {
    conditions.push('timestamp <= ?');
    queryParams.push(params.endDate);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRow = database.prepare(
    `SELECT COUNT(*) as total FROM usage_records ${whereClause}`
  ).get(...queryParams) as { total: number };

  const rows = database.prepare(
    `SELECT * FROM usage_records ${whereClause} ORDER BY timestamp DESC LIMIT ? OFFSET ?`
  ).all(...queryParams, pageSize, offset) as Array<{
    id: number;
    timestamp: string;
    provider_id: string;
    provider_name: string;
    model_id: string;
    input_tokens: number;
    output_tokens: number;
    protocol: string;
  }>;

  const records: UsageRecord[] = rows.map(r => ({
    id: r.id,
    timestamp: r.timestamp,
    providerId: r.provider_id,
    providerName: r.provider_name,
    modelId: r.model_id,
    inputTokens: r.input_tokens,
    outputTokens: r.output_tokens,
    protocol: r.protocol as ProviderProtocol,
  }));

  return {
    records,
    total: countRow.total,
    page,
    pageSize,
  };
}

/** 获取按天聚合的趋势数据 */
export function getDailyTrend(startDate?: string, endDate?: string): DailyUsageSummary[] {
  const database = requireDb();
  const { clause, params } = buildDateFilter(startDate, endDate);
  const pricingMap = getPricingMap();

  // 按天+模型分组，以便正确计算每日费用
  const rows = database.prepare(
    `SELECT
       DATE(timestamp) as date,
       model_id,
       COALESCE(SUM(input_tokens), 0) as total_input_tokens,
       COALESCE(SUM(output_tokens), 0) as total_output_tokens
     FROM usage_records ${clause}
     GROUP BY DATE(timestamp), model_id
     ORDER BY date ASC`
  ).all(...params) as Array<{
    date: string;
    model_id: string;
    total_input_tokens: number;
    total_output_tokens: number;
  }>;

  // 按天聚合
  const byDate = new Map<string, { inputTokens: number; outputTokens: number; cost: number }>();
  for (const r of rows) {
    const existing = byDate.get(r.date) ?? { inputTokens: 0, outputTokens: 0, cost: 0 };
    byDate.set(r.date, {
      inputTokens: existing.inputTokens + r.total_input_tokens,
      outputTokens: existing.outputTokens + r.total_output_tokens,
      cost: existing.cost + calculateCost(r.model_id, r.total_input_tokens, r.total_output_tokens, pricingMap),
    });
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      totalInputTokens: data.inputTokens,
      totalOutputTokens: data.outputTokens,
      totalCost: data.cost,
    }));
}

/** 删除指定日期之前的记录 */
export function deleteRecordsBefore(date: string): void {
  const database = requireDb();
  database.prepare('DELETE FROM usage_records WHERE timestamp < ?').run(date);
  logger.info(`Deleted usage records before ${date}`);
}

/** 清空所有用量记录 */
export function clearAllRecords(): void {
  const database = requireDb();
  database.prepare('DELETE FROM usage_records').run();
  logger.info('Cleared all usage records');
}

/** 获取所有模型定价 */
export function getAllPricing(): ModelPricing[] {
  const database = requireDb();
  const rows = database.prepare('SELECT * FROM model_pricing').all() as Array<{
    model_id: string;
    input_price_per_million: number;
    output_price_per_million: number;
  }>;

  return rows.map(r => ({
    modelId: r.model_id,
    inputPricePerMillion: r.input_price_per_million,
    outputPricePerMillion: r.output_price_per_million,
  }));
}

/** 创建或更新模型定价 */
export function upsertPricing(pricing: ModelPricing): ModelPricing {
  const database = requireDb();
  database.prepare(
    `INSERT INTO model_pricing (model_id, input_price_per_million, output_price_per_million)
     VALUES (?, ?, ?)
     ON CONFLICT(model_id) DO UPDATE SET
       input_price_per_million = excluded.input_price_per_million,
       output_price_per_million = excluded.output_price_per_million`
  ).run(pricing.modelId, pricing.inputPricePerMillion, pricing.outputPricePerMillion);

  return pricing;
}

/** 删除模型定价 */
export function deletePricing(modelId: string): void {
  const database = requireDb();
  database.prepare('DELETE FROM model_pricing WHERE model_id = ?').run(modelId);
}
