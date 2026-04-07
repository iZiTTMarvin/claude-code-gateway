/**
 * window.electronAPI 全局类型声明
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
  providerId: string;
  status: 'success' | 'failed';
  models: readonly DiscoveredModel[];
  syncedAt: string;
  error?: string;
}

export interface ElectronAPI {
  getConfig(): Promise<AppConfig>;
  saveConfig(config: Partial<AppConfig>): Promise<AppConfig>;
  generateGatewayApiKey(): Promise<string>;
  startProxy(): Promise<void>;
  stopProxy(): Promise<void>;
  getProxyStatus(): Promise<ProxyStatus>;
  discoverProviderModels(providerId: string): Promise<ProviderModelDiscoveryResult>;
  retryProviderModelDiscovery(providerId: string): Promise<ProviderModelDiscoveryResult>;
  onProxyStatusChange(callback: (status: ProxyStatus) => void): () => void;

  // Token 用量统计
  getUsageSummary(params?: { startDate?: string; endDate?: string }): Promise<UsageSummary>;
  getUsageRecords(params: UsageQueryParams): Promise<UsageQueryResult>;
  getDailyTrend(params?: { startDate?: string; endDate?: string }): Promise<DailyUsageSummary[]>;
  deleteUsageBefore(params: { date: string }): Promise<void>;
  clearAllUsage(): Promise<void>;
  getAllPricing(): Promise<ModelPricing[]>;
  upsertPricing(pricing: ModelPricing): Promise<ModelPricing>;
  deletePricing(params: { modelId: string }): Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
