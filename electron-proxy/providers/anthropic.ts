/**
 * Anthropic-compatible Provider
 */

import axios, { type AxiosInstance } from 'axios';
import type { DiscoveredModel, Provider, ProviderRequest, ProviderResponse } from './types';
import {
  getAnthropicEndpointCandidates,
  isNotFoundStatusError,
  requestWithEndpointFallback,
} from './endpoint-utils';
import { ProviderError } from '../utils/errors';
import { logger } from '../utils/logger';

interface AnthropicProviderConfig {
  id: string;
  baseURL: string;
  apiKey: string;
}

const MINIMAX_STATIC_MODEL_CATALOG: readonly string[] = [
  'MiniMax-M2.7',
  'MiniMax-M2.7-highspeed',
  'MiniMax-M2.5',
  'MiniMax-M2.5-highspeed',
  'MiniMax-M2.1',
  'MiniMax-M2.1-highspeed',
  'MiniMax-M2',
];

function getStaticModelCatalog(baseURL: string): readonly DiscoveredModel[] | null {
  const normalized = baseURL.toLowerCase();
  if (!normalized.includes('api.minimaxi.com/anthropic')) {
    return null;
  }

  return MINIMAX_STATIC_MODEL_CATALOG.map(modelId => ({
    id: modelId,
    displayName: modelId,
    providerId: '',
    raw: {
      source: 'minimax-static-catalog',
    },
  }));
}

export class AnthropicProvider implements Provider {
  readonly id: string;
  readonly protocol = 'anthropic' as const;
  private readonly client: AxiosInstance;
  private readonly baseURL: string;
  private readonly endpointCandidates: readonly string[];
  private readonly modelEndpointCandidates: readonly string[];

  constructor(config: AnthropicProviderConfig) {
    this.id = config.id;
    this.baseURL = config.baseURL.replace(/\/$/, '');
    this.endpointCandidates = getAnthropicEndpointCandidates(this.baseURL);
    this.modelEndpointCandidates = ['/v1/models', '/models'];

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      timeout: 120000,
    });
  }

  async send(request: ProviderRequest): Promise<ProviderResponse> {
    if (request.protocol !== 'anthropic') {
      throw new ProviderError(this.id, 'Protocol mismatch for Anthropic provider');
    }

    const isStream = request.body.stream === true;

    try {
      return await requestWithEndpointFallback(this.endpointCandidates, async endpoint => {
        logger.debug(`[${this.id}] Sending Anthropic request to ${this.baseURL}${endpoint}`);

        try {
          if (isStream) {
            const response = await this.client.post(endpoint, request.body, {
              responseType: 'stream',
              headers: {
                Accept: 'text/event-stream',
              },
            });

            return {
              stream: true,
              body: response.data as NodeJS.ReadableStream,
            };
          }

          const response = await this.client.post(endpoint, request.body);
          return {
            stream: false,
            data: response.data,
          };
        } catch (error) {
          if (isNotFoundStatusError(error)) {
            logger.warn(`[${this.id}] Upstream 404 on ${this.baseURL}${endpoint}, trying fallback`);
          }
          throw error;
        }
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const responseData = error.response?.data as
          | Record<string, Record<string, string>>
          | undefined;
        const message = responseData?.error?.message ?? responseData?.error?.type ?? error.message;
        const code = responseData?.error?.type ?? error.code;
        throw new ProviderError(this.id, message, code);
      }
      throw error;
    }
  }

  async discoverModels(): Promise<readonly DiscoveredModel[]> {
    try {
      return await requestWithEndpointFallback(this.modelEndpointCandidates, async endpoint => {
        logger.debug(`[${this.id}] Discovering models from ${this.baseURL}${endpoint}`);
        try {
          const response = await this.client.get(endpoint);
          const data = response.data as { data?: unknown };
          return parseDiscoveryData(data.data);
        } catch (error) {
          if (isNotFoundStatusError(error)) {
            logger.warn(`[${this.id}] Model endpoint 404 on ${this.baseURL}${endpoint}, trying fallback`);
          }
          throw error;
        }
      });
    } catch (error) {
      const staticCatalog = getStaticModelCatalog(this.baseURL);
      if (staticCatalog) {
        logger.warn(
          `[${this.id}] Upstream model list unavailable, fallback to static MiniMax catalog`,
        );
        return staticCatalog.map(model => ({
          ...model,
          providerId: this.id,
        }));
      }

      if (axios.isAxiosError(error)) {
        const responseData = error.response?.data as
          | Record<string, Record<string, string>>
          | undefined;
        const message = responseData?.error?.message ?? responseData?.error?.type ?? error.message;
        throw new ProviderError(this.id, `Model discovery failed: ${message}`, error.code);
      }
      throw error;
    }
  }
}

function parseDiscoveryData(data: unknown): readonly DiscoveredModel[] {
  if (!Array.isArray(data)) {
    return [];
  }

  const models: DiscoveredModel[] = [];
  for (const item of data) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const record = item as Record<string, unknown>;
    const id = typeof record.id === 'string' ? record.id : null;
    if (!id) {
      continue;
    }

    const displayName =
      typeof record.display_name === 'string'
        ? record.display_name
        : typeof record.name === 'string'
          ? record.name
          : id;

    models.push({
      id,
      displayName,
      raw: record,
    });
  }

  return models;
}

export function createAnthropicProvider(config: AnthropicProviderConfig): Provider {
  return new AnthropicProvider(config);
}
