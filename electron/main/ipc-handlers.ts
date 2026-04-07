/**
 * IPC 消息处理器
 * 注册主进程的 IPC handler
 */

import { ipcMain, type BrowserWindow } from 'electron';
import { generateGatewayApiKey, getConfig, saveConfig, saveProviderDiscovery } from './config-store';
import { applyDesktopSettings } from './desktop-runtime';
import { startProxy, stopProxy, getProxyStatus, setStatusChangeCallback } from './proxy-manager';
import {
  clearMissingProviderDiscoveries,
  getAllProviderDiscoveries,
  getProviderDiscovery,
  syncAllProvidersDiscovery,
  syncProviderDiscovery,
} from './provider-discovery';
import type { AppConfig, IPCResult, ModelPricing, ProxyStatus, UsageQueryParams } from '../../shared/types';
import { ProviderNotFoundError } from '../../electron-proxy/utils/errors';
import { logger } from '../../electron-proxy/utils/logger';
import {
  clearAllRecords,
  deleteRecordsBefore,
  deletePricing,
  getAllPricing,
  getDailyTrend,
  getUsageSummary,
  queryUsageRecords,
  upsertPricing,
} from './usage-db';

function normalizeDiscoveredModels(providerId: string, models: readonly {
  id: string;
  displayName: string;
  raw?: unknown;
}[]) {
  return models.map(model => ({
    id: model.id,
    displayName: model.displayName,
    providerId,
    raw:
      model.raw && typeof model.raw === 'object'
        ? (model.raw as Readonly<Record<string, unknown>>)
        : undefined,
  }));
}

/** 包装 handler 返回值为 IPCResult */
function ok<T>(data: T): IPCResult<T> {
  return { ok: true, data };
}

function fail(error: string): IPCResult<never> {
  return { ok: false, error };
}

/** 注册所有 IPC handler */
export function registerIPCHandlers(mainWindow: BrowserWindow): void {
  // 配置管理
  ipcMain.handle('config:get', async () => {
    return ok(await getConfig());
  });

  ipcMain.handle('config:save', async (_event, partial: Partial<AppConfig>) => {
    try {
      const config = await saveConfig(partial);
      applyDesktopSettings(config.appSettings);
      clearMissingProviderDiscoveries(config.providers);

      if (partial.providers !== undefined) {
        // 保存服务商后自动触发模型发现（失败不阻塞保存流程）
        syncAllProvidersDiscovery(config.providers)
          .then(async snapshots => {
            for (const snapshot of snapshots) {
              await saveProviderDiscovery(snapshot.providerId, {
                status: snapshot.status,
                syncedAt: snapshot.syncedAt,
                error: snapshot.error ?? null,
                models: normalizeDiscoveredModels(snapshot.providerId, snapshot.models),
              });
            }
          })
          .catch(error => {
            const message = error instanceof Error ? error.message : String(error);
            logger.warn(`模型自动发现失败: ${message}`);
          });
      }

      return ok(config);
    } catch (err) {
      return fail(err instanceof Error ? err.message : '保存配置失败');
    }
  });

  ipcMain.handle('auth:generate-api-key', () => {
    return ok(generateGatewayApiKey());
  });

  // 代理管理
  ipcMain.handle('proxy:start', async () => {
    try {
      await startProxy(getConfig);
      return ok(undefined);
    } catch (err) {
      return fail(err instanceof Error ? err.message : '启动代理失败');
    }
  });

  ipcMain.handle('proxy:stop', async () => {
    try {
      await stopProxy();
      return ok(undefined);
    } catch (err) {
      return fail(err instanceof Error ? err.message : '停止代理失败');
    }
  });

  ipcMain.handle('proxy:get-status', () => {
    return ok(getProxyStatus());
  });

  // 模型发现
  ipcMain.handle('discovery:sync-provider', async (_event, providerId: string) => {
    try {
      const config = await getConfig();
      const provider = config.providers.find(item => item.id === providerId);
      if (!provider) {
        throw new ProviderNotFoundError(providerId);
      }

      const snapshot = await syncProviderDiscovery(provider);
      await saveProviderDiscovery(snapshot.providerId, {
        status: snapshot.status,
        syncedAt: snapshot.syncedAt,
        error: snapshot.error ?? null,
        models: normalizeDiscoveredModels(snapshot.providerId, snapshot.models),
      });
      return ok(snapshot);
    } catch (err) {
      return fail(err instanceof Error ? err.message : '服务商模型同步失败');
    }
  });

  ipcMain.handle('discovery:sync-all', async () => {
    try {
      const config = await getConfig();
      const snapshots = await syncAllProvidersDiscovery(config.providers);
      return ok(snapshots);
    } catch (err) {
      return fail(err instanceof Error ? err.message : '批量模型同步失败');
    }
  });

  ipcMain.handle('discovery:get-provider', async (_event, providerId: string) => {
    return ok(getProviderDiscovery(providerId));
  });

  ipcMain.handle('discovery:get-all', async () => {
    return ok(getAllProviderDiscoveries());
  });

  // 代理状态变更推送
  setStatusChangeCallback((status: ProxyStatus) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('proxy:status-change', status);
    }
  });

  // ===== 用量统计 =====

  ipcMain.handle('usage:get-summary', async (_event, params?: { startDate?: string; endDate?: string }) => {
    try {
      const summary = getUsageSummary(params?.startDate, params?.endDate);
      return ok(summary);
    } catch (err) {
      return fail(err instanceof Error ? err.message : '获取用量汇总失败');
    }
  });

  ipcMain.handle('usage:get-records', async (_event, params: UsageQueryParams) => {
    try {
      const result = queryUsageRecords(params);
      return ok(result);
    } catch (err) {
      return fail(err instanceof Error ? err.message : '查询用量记录失败');
    }
  });

  ipcMain.handle('usage:get-daily-trend', async (_event, params?: { startDate?: string; endDate?: string }) => {
    try {
      const trend = getDailyTrend(params?.startDate, params?.endDate);
      return ok(trend);
    } catch (err) {
      return fail(err instanceof Error ? err.message : '获取每日趋势失败');
    }
  });

  ipcMain.handle('usage:delete-before', async (_event, params: { date: string }) => {
    try {
      deleteRecordsBefore(params.date);
      return ok(undefined);
    } catch (err) {
      return fail(err instanceof Error ? err.message : '删除用量记录失败');
    }
  });

  ipcMain.handle('usage:clear-all', async () => {
    try {
      clearAllRecords();
      return ok(undefined);
    } catch (err) {
      return fail(err instanceof Error ? err.message : '清空用量记录失败');
    }
  });

  // ===== 模型定价 =====

  ipcMain.handle('pricing:get-all', async () => {
    try {
      const pricing = getAllPricing();
      return ok(pricing);
    } catch (err) {
      return fail(err instanceof Error ? err.message : '获取模型定价失败');
    }
  });

  ipcMain.handle('pricing:upsert', async (_event, pricing: ModelPricing) => {
    try {
      const result = upsertPricing(pricing);
      return ok(result);
    } catch (err) {
      return fail(err instanceof Error ? err.message : '保存模型定价失败');
    }
  });

  ipcMain.handle('pricing:delete', async (_event, params: { modelId: string }) => {
    try {
      deletePricing(params.modelId);
      return ok(undefined);
    } catch (err) {
      return fail(err instanceof Error ? err.message : '删除模型定价失败');
    }
  });
}
