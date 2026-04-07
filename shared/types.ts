/**
 * 主进程与渲染进程共享的类型定义
 */

export type ProviderProtocol = 'anthropic' | 'openai';

export type ModelDiscoveryStatus = 'idle' | 'syncing' | 'success' | 'failed';

export interface DiscoveredModel {
  /** 上游模型 ID */
  readonly id: string;
  /** 展示名，缺省时可回落到 id */
  readonly displayName: string;
  /** 所属 provider */
  readonly providerId: string;
  /** 可选元数据，便于后续扩展而不破坏 schema */
  readonly raw?: Readonly<Record<string, unknown>>;
}

export interface ProviderDiscoveryState {
  readonly status: ModelDiscoveryStatus;
  readonly syncedAt: string | null;
  readonly error: string | null;
  readonly models: readonly DiscoveredModel[];
}

export interface Provider {
  readonly id: string;
  readonly name: string;
  readonly protocol: ProviderProtocol;
  readonly baseUrl: string;
  readonly apiKey: string;
  /**
   * 新模型中的 provider 发现状态。
   * 旧调用方可不关心该字段。
   */
  readonly discovery?: ProviderDiscoveryState;
}

export type ProviderConfig = Omit<Provider, 'discovery'> & {
  readonly discovery: ProviderDiscoveryState;
};

export interface GatewayAuthConfig {
  readonly enabled: boolean;
  readonly apiKey: string;
}

export interface AppSettings {
  readonly port: number;
  readonly minimizeToTrayOnClose: boolean;
  readonly autoLaunch: boolean;
}

export interface GatewayRuntimeState {
  readonly running: boolean;
  readonly port: number;
  readonly lastRequestSummary: string | null;
  readonly lastRequestAt: string | null;
  readonly lastSyncSummary: string | null;
  readonly lastSyncAt: string | null;
  readonly error: string | null;
}

/** @deprecated 兼容旧路由模型，后续由 SlotMapping 完全替代 */
export interface RouteMapping {
  readonly id: string;
  /** 逻辑模型名，如 "claude-3-5-sonnet" */
  readonly logicalModel: string;
  /** 对应 Provider.id */
  readonly providerId: string;
  /** 实际模型名，如 "glm-4-flash" */
  readonly actualModel: string;
}

export interface AppConfig {
  readonly providers: readonly Provider[];

  readonly appSettings: AppSettings;
  readonly gatewayAuth: GatewayAuthConfig;
  /**
   * @deprecated 兼容旧代码路径。新代码应使用 appSettings.port。
   */
  readonly port: number;
  /**
   * @deprecated 兼容旧代码路径。新代码应使用直接模型名路由。
   */
  readonly routes: readonly RouteMapping[];
}

export interface ProxyStatus {
  readonly running: boolean;
  readonly port: number;
  readonly error?: string;
}

/** IPC 通信结果包装 */
export type IPCResult<T> = { ok: true; data: T } | { ok: false; error: string };

// ============================================================
// Token 用量统计相关类型（W1 后端定义，W2 前端消费）
// ============================================================

/** 单次请求的 token 用量记录 */
export interface UsageRecord {
  readonly id: number;
  readonly timestamp: string;
  readonly providerId: string;
  readonly providerName: string;
  readonly modelId: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly protocol: ProviderProtocol;
}

/** 用量汇总概览 */
export interface UsageSummary {
  readonly totalRequests: number;
  readonly totalInputTokens: number;
  readonly totalOutputTokens: number;
  readonly totalCost: number;
  readonly providerBreakdown: readonly ProviderUsageSummary[];
  readonly modelBreakdown: readonly ModelUsageSummary[];
}

/** 按厂商维度汇总 */
export interface ProviderUsageSummary {
  readonly providerId: string;
  readonly providerName: string;
  readonly totalRequests: number;
  readonly totalInputTokens: number;
  readonly totalOutputTokens: number;
  readonly totalCost: number;
}

/** 按模型维度汇总 */
export interface ModelUsageSummary {
  readonly modelId: string;
  readonly providerId: string;
  readonly providerName: string;
  readonly totalRequests: number;
  readonly totalInputTokens: number;
  readonly totalOutputTokens: number;
  readonly totalCost: number;
}

/** 按天汇总（趋势图表用） */
export interface DailyUsageSummary {
  readonly date: string;
  readonly totalInputTokens: number;
  readonly totalOutputTokens: number;
  readonly totalCost: number;
}

/** 模型定价配置 */
export interface ModelPricing {
  readonly modelId: string;
  readonly inputPricePerMillion: number;
  readonly outputPricePerMillion: number;
}

/** 用量记录查询参数 */
export interface UsageQueryParams {
  readonly providerId?: string;
  readonly modelId?: string;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly page?: number;
  readonly pageSize?: number;
}

/** 用量记录查询结果（分页） */
export interface UsageQueryResult {
  readonly records: readonly UsageRecord[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}
