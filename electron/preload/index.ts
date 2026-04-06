/**
 * Preload 脚本
 * 通过 contextBridge 向渲染进程暴露安全的 API
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { AppConfig, DiscoveredModel, ProxyStatus, IPCResult } from '../../shared/types';

interface ProviderModelDiscoveryResult {
  providerId: string;
  status: 'success' | 'failed';
  models: readonly DiscoveredModel[];
  syncedAt: string;
  error?: string;
}

/** 解包 IPCResult，成功返回 data，失败抛出 Error */
function unwrap<T>(result: IPCResult<T>): T {
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.data;
}

const electronAPI = {
  async getConfig(): Promise<AppConfig> {
    const result: IPCResult<AppConfig> = await ipcRenderer.invoke('config:get');
    return unwrap(result);
  },

  async saveConfig(config: Partial<AppConfig>): Promise<AppConfig> {
    const result: IPCResult<AppConfig> = await ipcRenderer.invoke('config:save', config);
    return unwrap(result);
  },

  async generateGatewayApiKey(): Promise<string> {
    const result: IPCResult<string> = await ipcRenderer.invoke('auth:generate-api-key');
    return unwrap(result);
  },

  async startProxy(): Promise<void> {
    const result: IPCResult<undefined> = await ipcRenderer.invoke('proxy:start');
    unwrap(result);
  },

  async stopProxy(): Promise<void> {
    const result: IPCResult<undefined> = await ipcRenderer.invoke('proxy:stop');
    unwrap(result);
  },

  async getProxyStatus(): Promise<ProxyStatus> {
    const result: IPCResult<ProxyStatus> = await ipcRenderer.invoke('proxy:get-status');
    return unwrap(result);
  },

  async discoverProviderModels(providerId: string): Promise<ProviderModelDiscoveryResult> {
    const result: IPCResult<ProviderModelDiscoveryResult> = await ipcRenderer.invoke(
      'discovery:sync-provider',
      providerId,
    );
    return unwrap(result);
  },

  async retryProviderModelDiscovery(providerId: string): Promise<ProviderModelDiscoveryResult> {
    const result: IPCResult<ProviderModelDiscoveryResult> = await ipcRenderer.invoke(
      'discovery:sync-provider',
      providerId,
    );
    return unwrap(result);
  },

  onProxyStatusChange(callback: (status: ProxyStatus) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, status: ProxyStatus) => callback(status);
    ipcRenderer.on('proxy:status-change', handler);
    return () => {
      ipcRenderer.removeListener('proxy:status-change', handler);
    };
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
