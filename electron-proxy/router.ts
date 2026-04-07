/**
 * 通用路由解析
 */

import type { AppConfig, Provider as ProviderConfig, RouteMapping } from '../shared/types';
import type { Provider, ProviderModelDiscoveryResult } from './types';
import { createAnthropicProvider } from './providers/anthropic';
import { createOpenAICompatibleProvider } from './providers/openai-compatible';
import { ModelNotFoundError, ProviderNotFoundError } from './utils/errors';
import { logger } from './utils/logger';

const providerCache = new Map<string, Provider>();

interface AppConfigLike {
  readonly providers: readonly ProviderConfig[];
  readonly routes?: readonly RouteMapping[];
}

export interface ResolvedRoute {
  provider: Provider;
  actualModel: string;
  resolvedBy: 'direct-model' | 'legacy-route';
  resolvedKey: string;
}

function getProviderCacheKey(providerConfig: ProviderConfig): string {
  return [
    providerConfig.id,
    providerConfig.protocol,
    providerConfig.baseUrl,
    providerConfig.apiKey,
  ].join(':');
}

function createProvider(providerConfig: ProviderConfig): Provider {
  if (providerConfig.protocol === 'anthropic') {
    return createAnthropicProvider({
      id: providerConfig.id,
      baseURL: providerConfig.baseUrl,
      apiKey: providerConfig.apiKey,
    });
  }

  return createOpenAICompatibleProvider({
    id: providerConfig.id,
    baseURL: providerConfig.baseUrl,
    apiKey: providerConfig.apiKey,
  });
}

function getOrCreateProvider(providerConfig: ProviderConfig): Provider {
  const cacheKey = getProviderCacheKey(providerConfig);
  let provider = providerCache.get(cacheKey);
  if (!provider) {
    provider = createProvider(providerConfig);
    providerCache.set(cacheKey, provider);
    logger.debug(`Provider instance created: ${providerConfig.id} (${providerConfig.protocol})`);
  }
  return provider;
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function resolveByDirectDiscoveredModels(
  requestModel: string,
  config: AppConfigLike,
  requiredProtocol?: ProviderConfig['protocol']
): ResolvedRoute | null {
  const normalizedModel = normalizeKey(requestModel);
  const matches = config.providers
    .filter(provider => !requiredProtocol || provider.protocol === requiredProtocol)
    .flatMap(provider => {
      const discoveryModels = provider.discovery?.models ?? [];
      return discoveryModels
        .filter(model => normalizeKey(model.id) === normalizedModel)
        .map(model => ({
          provider,
          modelId: model.id,
        }));
    });

  if (matches.length !== 1) {
    return null;
  }

  const match = matches[0];
  logger.route(requestModel, match.provider.id, match.modelId);
  return {
    provider: getOrCreateProvider(match.provider),
    actualModel: match.modelId,
    resolvedBy: 'direct-model',
    resolvedKey: requestModel,
  };
}

function resolveByLegacyRoutes(
  requestModel: string,
  config: AppConfigLike,
  requiredProtocol?: ProviderConfig['protocol']
): ResolvedRoute | null {
  const routes = Array.isArray(config.routes) ? config.routes : [];
  const route = routes.find(item => normalizeKey(item.logicalModel) === normalizeKey(requestModel));
  if (!route) {
    return null;
  }

  const providerConfig = config.providers.find(provider => provider.id === route.providerId);
  if (!providerConfig) {
    throw new ProviderNotFoundError(route.providerId);
  }

  if (requiredProtocol && providerConfig.protocol !== requiredProtocol) {
    return null;
  }

  logger.route(requestModel, providerConfig.id, route.actualModel);
  return {
    provider: getOrCreateProvider(providerConfig),
    actualModel: route.actualModel,
    resolvedBy: 'legacy-route',
    resolvedKey: route.logicalModel,
  };
}

export function resolveRoute(
  requestModel: string,
  config: AppConfig,
  requiredProtocol?: ProviderConfig['protocol']
): ResolvedRoute {
  const configLike = config as AppConfigLike;

  const directResolved = resolveByDirectDiscoveredModels(
    requestModel,
    configLike,
    requiredProtocol
  );
  if (directResolved) {
    return directResolved;
  }

  const legacyResolved = resolveByLegacyRoutes(requestModel, configLike, requiredProtocol);
  if (legacyResolved) {
    return legacyResolved;
  }

  throw new ModelNotFoundError(requestModel);
}

export async function discoverProviderModels(
  providerConfig: ProviderConfig
): Promise<ProviderModelDiscoveryResult> {
  const provider = getOrCreateProvider(providerConfig);
  const syncedAt = new Date().toISOString();

  if (!provider.discoverModels) {
    return {
      providerId: providerConfig.id,
      status: 'failed',
      models: [],
      syncedAt,
      error: 'Provider does not implement model discovery',
    };
  }

  try {
    const models = await provider.discoverModels();
    return {
      providerId: providerConfig.id,
      status: 'success',
      models,
      syncedAt,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      providerId: providerConfig.id,
      status: 'failed',
      models: [],
      syncedAt,
      error: message,
    };
  }
}

export async function discoverAllProviderModels(
  providers: readonly ProviderConfig[]
): Promise<readonly ProviderModelDiscoveryResult[]> {
  const results: ProviderModelDiscoveryResult[] = [];
  for (const provider of providers) {
    results.push(await discoverProviderModels(provider));
  }
  return results;
}

export function clearProviderCache(): void {
  providerCache.clear();
}
