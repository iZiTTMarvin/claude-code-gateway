/**
 * electron-store 配置管理
 * 持久化存储 providers、appSettings 等配置
 */

import { randomBytes, randomUUID } from 'node:crypto';
import type {
  AppConfig,
  AppSettings,
  DiscoveredModel,
  GatewayAuthConfig,
  ProviderConfig,
  ProviderDiscoveryState,
  ProviderProtocol,
  RouteMapping,
} from '../../shared/types';

const DEFAULT_APP_SETTINGS: AppSettings = {
  port: 1314,
  minimizeToTrayOnClose: true,
  autoLaunch: false,
};

const DEFAULT_GATEWAY_AUTH: GatewayAuthConfig = {
  enabled: false,
  apiKey: '',
};

const DEFAULT_CONFIG: AppConfig = {
  providers: [],
  appSettings: DEFAULT_APP_SETTINGS,
  gatewayAuth: DEFAULT_GATEWAY_AUTH,
  // 兼容字段：新代码请使用 appSettings.port
  port: DEFAULT_APP_SETTINGS.port,
  routes: [],
};

interface StoreSchema {
  providers: readonly ProviderConfig[];
  appSettings: AppSettings;
  gatewayAuth: GatewayAuthConfig;
  // deprecated compatibility fields
  routes: readonly RouteMapping[];
  port: number;
}

interface LegacyProvider {
  readonly id?: string;
  readonly name?: string;
  readonly baseUrl?: string;
  readonly apiKey?: string;
  readonly protocol?: ProviderProtocol;
  readonly discovery?: Partial<ProviderDiscoveryState>;
}

interface LegacyDiscoveredModel {
  readonly id?: string;
  readonly displayName?: string;
  readonly providerId?: string;
  readonly raw?: Readonly<Record<string, unknown>>;
}

interface ConfigStore {
  readonly path: string;
  get<Key extends keyof StoreSchema>(key: Key): StoreSchema[Key];
  set<Key extends keyof StoreSchema>(key: Key, value: StoreSchema[Key]): void;
}

// Dynamic import for ESM-only electron-store
let store: ConfigStore | null = null;

async function initStore(): Promise<void> {
  if (store) return;
  const Store = (await import('electron-store')).default;
  store = new Store<StoreSchema>({
    name: 'cc-gateway-config',
    defaults: {
      // StoreSchema 内部保持 ProviderConfig（discovery 必填）
      providers: [],
      appSettings: DEFAULT_CONFIG.appSettings,
      gatewayAuth: DEFAULT_CONFIG.gatewayAuth,
      routes: DEFAULT_CONFIG.routes,
      port: DEFAULT_CONFIG.port,
    },
  });
}

function requireStore(): ConfigStore {
  if (!store) {
    throw new Error('Config store is not initialized');
  }
  return store;
}

function isValidPort(port: number | undefined): port is number {
  return typeof port === 'number' && Number.isInteger(port) && port >= 1 && port <= 65535;
}

function normalizeGatewayAuth(auth: Partial<GatewayAuthConfig> | undefined): GatewayAuthConfig {
  return {
    enabled: auth?.enabled ?? DEFAULT_GATEWAY_AUTH.enabled,
    apiKey: auth?.apiKey ?? DEFAULT_GATEWAY_AUTH.apiKey,
  };
}

function normalizeAppSettings(
  appSettings: Partial<AppSettings> | undefined,
  legacyPort: number | undefined
): AppSettings {
  const fallbackPort = isValidPort(legacyPort) ? legacyPort : DEFAULT_APP_SETTINGS.port;
  const port = isValidPort(appSettings?.port) ? appSettings.port : fallbackPort;
  return {
    port,
    minimizeToTrayOnClose:
      appSettings?.minimizeToTrayOnClose ?? DEFAULT_APP_SETTINGS.minimizeToTrayOnClose,
    autoLaunch: appSettings?.autoLaunch ?? DEFAULT_APP_SETTINGS.autoLaunch,
  };
}

function normalizeDiscoveredModel(
  providerId: string,
  model: LegacyDiscoveredModel | string
): DiscoveredModel | null {
  if (typeof model === 'string') {
    const modelId = model.trim();
    if (!modelId) return null;
    return {
      id: modelId,
      displayName: modelId,
      providerId,
    };
  }

  const modelId = model.id?.trim();
  if (!modelId) return null;

  return {
    id: modelId,
    displayName: model.displayName?.trim() || modelId,
    providerId: model.providerId?.trim() || providerId,
    raw: model.raw,
  };
}

function normalizeDiscovery(
  providerId: string,
  discovery: Partial<ProviderDiscoveryState> | undefined
): ProviderDiscoveryState {
  const status = discovery?.status;
  const normalizedStatus =
    status === 'idle' || status === 'syncing' || status === 'success' || status === 'failed'
      ? status
      : 'idle';

  const normalizedModels = (discovery?.models ?? [])
    .map(model => normalizeDiscoveredModel(providerId, model as LegacyDiscoveredModel | string))
    .filter((model): model is DiscoveredModel => model !== null);

  return {
    status: normalizedStatus,
    syncedAt: discovery?.syncedAt ?? null,
    error: discovery?.error ?? null,
    models: normalizedModels,
  };
}

function mergeProviderDiscovery(
  provider: ProviderConfig,
  discovery: Partial<ProviderDiscoveryState>
): ProviderConfig {
  return {
    ...provider,
    discovery: normalizeDiscovery(provider.id, {
      ...provider.discovery,
      ...discovery,
    }),
  };
}

function normalizeProvider(provider: LegacyProvider | ProviderConfig): ProviderConfig {
  const id = provider.id?.trim() || randomUUID();
  const name = provider.name?.trim() || id;
  const baseUrl = provider.baseUrl?.trim() || '';
  const apiKey = provider.apiKey?.trim() || '';
  const protocol = provider.protocol === 'openai' ? 'openai' : 'anthropic';

  return {
    id,
    name,
    protocol,
    baseUrl,
    apiKey,
    discovery: normalizeDiscovery(id, provider.discovery),
  };
}

function normalizeRoute(route: RouteMapping): RouteMapping {
  return {
    id: route.id || randomUUID(),
    logicalModel: route.logicalModel.trim(),
    providerId: route.providerId.trim(),
    actualModel: route.actualModel.trim(),
  };
}

export function generateGatewayApiKey(): string {
  return `ccg_${randomBytes(24).toString('base64url')}`;
}

/** 获取完整配置 */
export async function getConfig(): Promise<AppConfig> {
  await initStore();
  const currentStore = requireStore();

  const providers = currentStore.get('providers').map(provider => normalizeProvider(provider));
  const routes = currentStore.get('routes').map(route => normalizeRoute(route));
  const appSettings = normalizeAppSettings(
    currentStore.get('appSettings') as Partial<AppSettings> | undefined,
    currentStore.get('port')
  );
  const gatewayAuth = normalizeGatewayAuth(
    currentStore.get('gatewayAuth') as Partial<GatewayAuthConfig> | undefined
  );

  if (currentStore.get('port') !== appSettings.port) {
    currentStore.set('port', appSettings.port);
  }

  return {
    providers,

    appSettings,
    gatewayAuth,
    // 兼容字段
    port: appSettings.port,
    routes,
  };
}

/** 保存配置（局部更新） */
export async function saveConfig(partial: Partial<AppConfig>): Promise<AppConfig> {
  await initStore();
  const currentStore = requireStore();
  const existing = await getConfig();

  const providers: readonly ProviderConfig[] =
    partial.providers !== undefined
      ? partial.providers.map(provider => normalizeProvider(provider))
      : existing.providers.map(provider => normalizeProvider(provider));

  const routes =
    partial.routes !== undefined
      ? partial.routes.map(route => normalizeRoute(route))
      : existing.routes;

  const appSettings = normalizeAppSettings(
    partial.appSettings ?? existing.appSettings,
    partial.port ?? existing.port
  );

  const gatewayAuth =
    partial.gatewayAuth !== undefined
      ? normalizeGatewayAuth(partial.gatewayAuth)
      : existing.gatewayAuth;

  currentStore.set('providers', providers);
  currentStore.set('routes', routes);
  currentStore.set('appSettings', appSettings);
  currentStore.set('gatewayAuth', gatewayAuth);
  currentStore.set('port', appSettings.port);

  return getConfig();
}

export async function saveProviderDiscovery(
  providerId: string,
  discovery: Partial<ProviderDiscoveryState>
): Promise<AppConfig> {
  await initStore();
  const currentStore = requireStore();
  const existing = await getConfig();

  const providers = existing.providers.map(provider => {
    const normalizedProvider = normalizeProvider(provider);
    return provider.id === providerId
      ? mergeProviderDiscovery(normalizedProvider, discovery)
      : normalizedProvider;
  });

  currentStore.set('providers', providers);
  return getConfig();
}

/** 获取配置文件路径（调试用） */
export async function getConfigPath(): Promise<string> {
  await initStore();
  return requireStore().path;
}
