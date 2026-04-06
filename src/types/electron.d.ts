/**
 * window.electronAPI 全局类型声明
 */

import type { AppConfig, DiscoveredModel, ProxyStatus } from '../../shared/types';

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
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
