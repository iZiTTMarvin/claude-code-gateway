/**
 * OpenAI-compatible Provider
 */

import axios, { type AxiosInstance } from 'axios';
import type { DiscoveredModel, Provider, ProviderRequest, ProviderResponse } from './types';
import {
  getOpenAICompatibleEndpointCandidates,
  isNotFoundStatusError,
  requestWithEndpointFallback,
} from './endpoint-utils';
import { ProviderError } from '../utils/errors';
import { logger } from '../utils/logger';

interface OpenAICompatibleProviderConfig {
  id: string;
  baseURL: string;
  apiKey: string;
}

export class OpenAICompatibleProvider implements Provider {
  readonly id: string;
  readonly protocol = 'openai' as const;
  private readonly client: AxiosInstance;
  private readonly baseURL: string;
  private readonly endpointCandidates: readonly string[];
  private readonly modelEndpointCandidates: readonly string[];

  constructor(config: OpenAICompatibleProviderConfig) {
    this.id = config.id;
    this.baseURL = config.baseURL.replace(/\/$/, '');
    this.endpointCandidates = getOpenAICompatibleEndpointCandidates(this.baseURL);
    this.modelEndpointCandidates = ['/v1/models', '/models'];

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 120000,
    });
  }

  async send(request: ProviderRequest): Promise<ProviderResponse> {
    if (request.protocol !== 'openai') {
      throw new ProviderError(this.id, 'Protocol mismatch for OpenAI provider');
    }

    const isStream = request.body.stream === true;

    try {
      return await requestWithEndpointFallback(this.endpointCandidates, async endpoint => {
        logger.debug(`[${this.id}] Sending request to ${this.baseURL}${endpoint}`);

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
        const message =
          (error.response?.data as Record<string, Record<string, string>>)?.error?.message ??
          error.message;
        const code =
          (error.response?.data as Record<string, Record<string, string>>)?.error?.code ??
          error.code;
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
      if (axios.isAxiosError(error)) {
        const message =
          (error.response?.data as Record<string, Record<string, string>>)?.error?.message ??
          error.message;
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

export function createOpenAICompatibleProvider(config: OpenAICompatibleProviderConfig): Provider {
  return new OpenAICompatibleProvider(config);
}
