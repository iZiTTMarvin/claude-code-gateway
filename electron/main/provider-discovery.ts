/**
 * Provider 模型发现服务（主进程）。
 * 当前实现以运行时内存快照为主，后续可与持久化层合并。
 */

import type { Provider } from '../../shared/types';
import {
  discoverAllProviderModels,
  discoverProviderModels,
} from '../../electron-proxy/router';
import type { DiscoveredModel, ProviderModelDiscoveryResult } from '../../electron-proxy/types';
import { logger } from '../../electron-proxy/utils/logger';

export interface ProviderDiscoverySnapshot {
  readonly providerId: string;
  readonly status: 'success' | 'failed';
  readonly models: readonly DiscoveredModel[];
  readonly syncedAt: string;
  readonly error?: string;
}

const discoveryCache = new Map<string, ProviderDiscoverySnapshot>();

function toSnapshot(result: ProviderModelDiscoveryResult): ProviderDiscoverySnapshot {
  return {
    providerId: result.providerId,
    status: result.status,
    models: result.models,
    syncedAt: result.syncedAt,
    error: result.error,
  };
}

export async function syncProviderDiscovery(
  provider: Provider
): Promise<ProviderDiscoverySnapshot> {
  const result = await discoverProviderModels(provider);
  const snapshot = toSnapshot(result);
  discoveryCache.set(snapshot.providerId, snapshot);

  if (snapshot.status === 'success') {
    logger.info(
      `DISCOVERY: provider=${snapshot.providerId} status=success models=${snapshot.models.length}`
    );
  } else {
    logger.warn(
      `DISCOVERY: provider=${snapshot.providerId} status=failed error=${snapshot.error ?? 'unknown'}`
    );
  }

  return snapshot;
}

export async function syncAllProvidersDiscovery(
  providers: readonly Provider[]
): Promise<readonly ProviderDiscoverySnapshot[]> {
  const results = await discoverAllProviderModels(providers);
  const snapshots = results.map(toSnapshot);
  for (const snapshot of snapshots) {
    discoveryCache.set(snapshot.providerId, snapshot);
  }

  logger.info(`DISCOVERY: sync-all providers=${providers.length} done=${snapshots.length}`);
  return snapshots;
}

export function getProviderDiscovery(providerId: string): ProviderDiscoverySnapshot | null {
  return discoveryCache.get(providerId) ?? null;
}

export function getAllProviderDiscoveries(): readonly ProviderDiscoverySnapshot[] {
  return [...discoveryCache.values()];
}

export function clearMissingProviderDiscoveries(currentProviders: readonly Provider[]): void {
  const providerIds = new Set(currentProviders.map(provider => provider.id));
  for (const providerId of discoveryCache.keys()) {
    if (!providerIds.has(providerId)) {
      discoveryCache.delete(providerId);
    }
  }
}
