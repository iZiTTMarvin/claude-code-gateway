/**
 * 服务商状态管理 Hook
 */

import { useState, useCallback, useEffect } from 'react';
import { randomUUID } from '../../shared/utils';
import type { AppConfig, DiscoveredModel, Provider, RouteMapping } from '../../shared/types';
import * as ipc from '../lib/ipc';

export type ProviderSyncStatus = 'idle' | 'syncing' | 'success' | 'failed';

export interface ProviderDiscoveryState {
  readonly status: ProviderSyncStatus;
  readonly models: readonly DiscoveredModel[];
  readonly error?: string;
  readonly fetchedAt?: number;
}

type SlotMappingLike = {
  readonly providerId: string;
};

type DiscoveryLike = {
  readonly status?: string;
  readonly models?: readonly (DiscoveredModel | string)[];
  readonly error?: string;
  readonly fetchedAt?: number;
  readonly syncedAt?: number;
  readonly updatedAt?: number;
};

const DEFAULT_DISCOVERY_STATE: ProviderDiscoveryState = {
  status: 'idle',
  models: [],
};

function isRouteMappingArray(value: unknown): value is readonly RouteMapping[] {
  return Array.isArray(value);
}

function isSlotMappingArray(value: unknown): value is readonly SlotMappingLike[] {
  return Array.isArray(value);
}

function extractProviderDiscovery(provider: Provider): ProviderDiscoveryState | null {
  const maybeProvider = provider as Provider & { discovery?: DiscoveryLike };
  const discovery = maybeProvider.discovery;
  if (!discovery) {
    return null;
  }

  const status = discovery.status;
  const normalizedStatus: ProviderSyncStatus =
    status === 'syncing' || status === 'success' || status === 'failed' ? status : 'idle';

  return {
    status: normalizedStatus,
    models: Array.isArray(discovery.models)
      ? discovery.models
          .map(model => {
            if (typeof model === 'string') {
              return {
                id: model,
                displayName: model,
                providerId: provider.id,
              } satisfies DiscoveredModel;
            }
            return model;
          })
          .filter((model): model is DiscoveredModel => Boolean(model?.id))
      : [],
    error: discovery.error,
    fetchedAt: discovery.fetchedAt ?? discovery.syncedAt ?? discovery.updatedAt,
  };
}

function omitProviderReferences(config: AppConfig, providerId: string): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  const maybeConfig = config as AppConfig & {
    routes?: unknown;
    slotMappings?: unknown;
  };

  if (isRouteMappingArray(maybeConfig.routes)) {
    patch.routes = maybeConfig.routes.filter(route => route.providerId !== providerId);
  }

  if (isSlotMappingArray(maybeConfig.slotMappings)) {
    patch.slotMappings = maybeConfig.slotMappings.filter(mapping => mapping.providerId !== providerId);
  }

  return patch;
}

export function useProviders(
  config: AppConfig | null,
  setConfig: (config: AppConfig) => void,
) {
  const [editing, setEditing] = useState<Provider | null>(null);
  const [syncingProviderId, setSyncingProviderId] = useState<string | null>(null);
  const [discoveryStateByProvider, setDiscoveryStateByProvider] = useState<
    Record<string, ProviderDiscoveryState>
  >({});

  useEffect(() => {
    if (!config) {
      setDiscoveryStateByProvider({});
      return;
    }

    setDiscoveryStateByProvider(previous => {
      const next: Record<string, ProviderDiscoveryState> = {};
      for (const provider of config.providers) {
        const fromProvider = extractProviderDiscovery(provider);
        next[provider.id] = fromProvider ?? previous[provider.id] ?? DEFAULT_DISCOVERY_STATE;
      }
      return next;
    });
  }, [config]);

  const syncProviderModels = useCallback(
    async (providerId: string) => {
      setSyncingProviderId(providerId);
      setDiscoveryStateByProvider(previous => ({
        ...previous,
        [providerId]: {
          ...(previous[providerId] ?? DEFAULT_DISCOVERY_STATE),
          status: 'syncing',
          error: undefined,
        },
      }));

      try {
        const result = await ipc.discoverProviderModels(providerId);
        setDiscoveryStateByProvider(previous => ({
          ...previous,
          [providerId]: {
            status: result.status === 'failed' ? 'failed' : 'success',
            models: result.models,
            error: result.error,
            fetchedAt: Number.isNaN(Date.parse(result.syncedAt))
              ? Date.now()
              : Date.parse(result.syncedAt),
          },
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setDiscoveryStateByProvider(previous => ({
          ...previous,
          [providerId]: {
            ...(previous[providerId] ?? DEFAULT_DISCOVERY_STATE),
            status: 'failed',
            error: message,
          },
        }));
      } finally {
        setSyncingProviderId(current => (current === providerId ? null : current));
      }
    },
    [],
  );

  const addProvider = useCallback(
    async (provider: Omit<Provider, "id">) => {
      if (!config) return;
      const newProvider: Provider = { ...provider, id: randomUUID() };
      const updated = await ipc.saveConfig({
        providers: [...config.providers, newProvider],
      });
      setConfig(updated);
      void syncProviderModels(newProvider.id);
    },
    [config, setConfig, syncProviderModels],
  );

  const updateProvider = useCallback(
    async (provider: Provider) => {
      if (!config) return;
      const providers = config.providers.map((p) =>
        p.id === provider.id ? provider : p,
      );
      const updated = await ipc.saveConfig({ providers });
      setConfig(updated);
      setEditing(null);
      void syncProviderModels(provider.id);
    },
    [config, setConfig, syncProviderModels],
  );

  const removeProvider = useCallback(
    async (id: string) => {
      if (!config) return;
      const providers = config.providers.filter((p) => p.id !== id);
      const patch = {
        providers,
        ...omitProviderReferences(config, id),
      };
      const updated = await ipc.saveConfig(patch as Partial<AppConfig>);
      setConfig(updated);
      setDiscoveryStateByProvider(previous => {
        const next = { ...previous };
        delete next[id];
        return next;
      });
    },
    [config, setConfig],
  );

  return {
    providers: config?.providers ?? [],
    discoveryStateByProvider,
    syncingProviderId,
    editing,
    setEditing,
    addProvider,
    updateProvider,
    removeProvider,
    syncProviderModels,
    retryProviderModels: syncProviderModels,
  } as const;
}
