/**
 * IPC 调用封装
 * ✅ 修复: Preload时序问题 + 空值安全检查
 * 解决渲染进程提前执行时electronAPI尚未挂载报错
 */

import type {
  AppConfig,
  DiscoveredModel,
  ProxyStatus,
  UsageSummary,
  UsageQueryParams,
  UsageQueryResult,
  DailyUsageSummary,
  ModelPricing,
} from '../../shared/types';

export interface ProviderModelDiscoveryResult {
  readonly providerId: string;
  readonly status: 'success' | 'failed';
  readonly models: readonly DiscoveredModel[];
  readonly syncedAt: string;
  readonly error?: string;
}

/** 等待electronAPI安全挂载，增加重试机制 */
async function getApi() {
  // 使用指数退避重试，最长等待3秒（适配开发环境热重载和React严格模式）
  for (let attempt = 0; attempt < 30; attempt++) {
    if (window.electronAPI) return window.electronAPI;
    // 指数退避: 30ms, 60ms, 120ms, 240ms, 最大500ms
    const delay = Math.min(30 * Math.pow(1.5, attempt), 500);
    await new Promise(r => setTimeout(r, delay));
  }
  throw new Error('Electron API 初始化失败，请确认Preload脚本已正确加载');
}

/** 异步版本的onProxyStatusChange，支持重试等待API就绪 */
export async function onProxyStatusChange(
  callback: (status: ProxyStatus) => void
): Promise<() => void> {
  const api = await getApi();
  return api.onProxyStatusChange(callback);
}
export async function getConfig(): Promise<AppConfig> {
  const api = await getApi();
  return api.getConfig();
}

export async function generateGatewayApiKey(): Promise<string> {
  const api = await getApi();
  return api.generateGatewayApiKey();
}

export async function saveConfig(config: Partial<AppConfig>): Promise<AppConfig> {
  const api = await getApi();
  return api.saveConfig(config);
}

export async function startProxy(): Promise<void> {
  const api = await getApi();
  return api.startProxy();
}

export async function stopProxy(): Promise<void> {
  const api = await getApi();
  return api.stopProxy();
}

export async function getProxyStatus(): Promise<ProxyStatus> {
  const api = await getApi();
  return api.getProxyStatus();
}

export async function discoverProviderModels(
  providerId: string,
): Promise<ProviderModelDiscoveryResult> {
  const api = await getApi();
  return api.discoverProviderModels(providerId);
}

export async function retryProviderModelDiscovery(
  providerId: string,
): Promise<ProviderModelDiscoveryResult> {
  const api = await getApi();
  return api.retryProviderModelDiscovery(providerId);
}

// ============================================================
// Token 用量统计 IPC 封装
// ============================================================

export async function getUsageSummary(
  params?: { startDate?: string; endDate?: string },
): Promise<UsageSummary> {
  const api = await getApi();
  return api.getUsageSummary(params);
}

export async function getUsageRecords(
  params: UsageQueryParams,
): Promise<UsageQueryResult> {
  const api = await getApi();
  return api.getUsageRecords(params);
}

export async function getDailyTrend(
  params?: { startDate?: string; endDate?: string },
): Promise<DailyUsageSummary[]> {
  const api = await getApi();
  return api.getDailyTrend(params);
}

export async function deleteUsageBefore(date: string): Promise<void> {
  const api = await getApi();
  return api.deleteUsageBefore({ date });
}

export async function clearAllUsage(): Promise<void> {
  const api = await getApi();
  return api.clearAllUsage();
}

export async function getAllPricing(): Promise<ModelPricing[]> {
  const api = await getApi();
  return api.getAllPricing();
}

export async function upsertPricing(pricing: ModelPricing): Promise<ModelPricing> {
  const api = await getApi();
  return api.upsertPricing(pricing);
}

export async function deletePricing(params: { modelId: string }): Promise<void> {
  const api = await getApi();
  return api.deletePricing(params);
}
