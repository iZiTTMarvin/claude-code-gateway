/**
 * Express HTTP 服务处理
 */

import type { Request, Response } from 'express';
import type { AppConfig } from '../shared/types';
import type {
  AnthropicMessagesRequest,
  ChatCompletionRequest,
  ProviderRequest,
  ProviderResponse,
} from './types';
import { resolveRoute } from './router';
import {
  AuthenticationError,
  ProviderError,
  ProviderNotFoundError,
  ModelNotFoundError,
  toAnthropicError,
  toOpenAIError,
} from './utils/errors';
import { logger } from './utils/logger';

type ConfigGetter = () => Promise<AppConfig>;

interface ForwardOptions {
  protocol: 'openai' | 'anthropic';
  path: string;
}

interface ListedModel {
  readonly id: string;
  readonly source: 'discovery' | 'slot-mapping' | 'legacy-route';
}

function getHttpStatusCode(error: unknown): number {
  if (error instanceof AuthenticationError) return 401;
  if (error instanceof ModelNotFoundError) return 404;
  if (error instanceof ProviderNotFoundError) return 404;
  if (error instanceof ProviderError) return 502;
  return 500;
}

function writeStreamResponse(
  res: Response,
  body: NodeJS.ReadableStream,
  contentType: string
): void {
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  body.pipe(res);

  body.on('error', (err: Error) => {
    logger.error(`Stream error: ${err.message}`);
    res.end();
  });

  body.on('end', () => {
    logger.response(200, true);
  });
}

async function forwardRequest(
  req: Request,
  res: Response,
  getConfig: ConfigGetter,
  providerRequest: ProviderRequest,
  logicalModel: string,
  options: ForwardOptions
): Promise<void> {
  logger.request(req.method, options.path, logicalModel);

  try {
    const config = await getConfig();
    const { provider, actualModel, resolvedBy, resolvedKey } = resolveRoute(
      logicalModel,
      config,
      providerRequest.protocol
    );
    logger.debug(
      `Resolver: source=${resolvedBy} key=${resolvedKey} protocol=${providerRequest.protocol}`
    );

    if (provider.protocol !== providerRequest.protocol) {
      throw new ProviderError(
        provider.id,
        `Route protocol mismatch: expected ${provider.protocol}, got ${providerRequest.protocol}`
      );
    }

    const requestBody = { ...providerRequest.body, model: actualModel };
    const result: ProviderResponse = await provider.send({
      protocol: providerRequest.protocol,
      body: requestBody as never,
    });

    if (result.stream) {
      writeStreamResponse(
        res,
        result.body,
        options.protocol === 'anthropic' ? 'text/event-stream' : 'text/event-stream'
      );
      return;
    }

    res.json(result.data);
    logger.response(200, false);
  } catch (error) {
    const statusCode = getHttpStatusCode(error);
    if (options.protocol === 'anthropic') {
      res.status(statusCode).json(toAnthropicError(error));
      logger.error(`Request failed: ${toAnthropicError(error).error.message}`);
      return;
    }

    res.status(statusCode).json(toOpenAIError(error));
    logger.error(`Request failed: ${toOpenAIError(error).error.message}`);
  }
}

export async function handleChatCompletion(
  req: Request,
  res: Response,
  getConfig: ConfigGetter
): Promise<void> {
  const request = req.body as ChatCompletionRequest;
  await forwardRequest(
    req,
    res,
    getConfig,
    {
      protocol: 'openai',
      body: request,
    },
    request.model,
    {
      protocol: 'openai',
      path: '/v1/chat/completions',
    }
  );
}

export async function handleAnthropicMessages(
  req: Request,
  res: Response,
  getConfig: ConfigGetter
): Promise<void> {
  const request = req.body as AnthropicMessagesRequest;
  await forwardRequest(
    req,
    res,
    getConfig,
    {
      protocol: 'anthropic',
      body: request,
    },
    request.model,
    {
      protocol: 'anthropic',
      path: '/v1/messages',
    }
  );
}

export async function handleCountTokens(_req: Request, res: Response): Promise<void> {
  res.status(501).json({
    type: 'error',
    error: {
      type: 'not_implemented_error',
      message: 'count_tokens is not implemented yet',
    },
  });
}

export function buildAdvertisedModels(config: AppConfig): readonly ListedModel[] {
  const byId = new Map<string, ListedModel>();

  for (const provider of config.providers) {
    for (const model of provider.discovery?.models ?? []) {
      const modelId = model.id.trim();
      if (!modelId) {
        continue;
      }
      byId.set(modelId, {
        id: modelId,
        source: 'discovery',
      });
    }
  }

  for (const mapping of config.slotMappings) {
    const modelId = mapping.modelId.trim();
    if (!modelId || byId.has(modelId)) {
      continue;
    }
    byId.set(modelId, {
      id: modelId,
      source: 'slot-mapping',
    });
  }

  for (const route of config.routes) {
    const modelId = route.actualModel.trim();
    if (!modelId || byId.has(modelId)) {
      continue;
    }
    byId.set(modelId, {
      id: modelId,
      source: 'legacy-route',
    });
  }

  return [...byId.values()].sort((left, right) => left.id.localeCompare(right.id));
}

export async function handleListModels(res: Response, getConfig: ConfigGetter): Promise<void> {
  const config = await getConfig();
  const models = buildAdvertisedModels(config);

  res.json({
    object: 'list',
    data: models.map(model => ({
      id: model.id,
      object: 'model',
      created: 0,
      owned_by: 'cc-gateway',
      source: model.source,
    })),
  });
}

export function handleHealthCheck(_req: Request, res: Response): void {
  res.json({
    status: 'ok',
    service: 'cc-gateway',
    timestamp: new Date().toISOString(),
  });
}

export function handleRoot(_req: Request, res: Response): void {
  res.json({
    name: 'cc-gateway',
    description: 'Claude Code 本地网关（Anthropic-compatible 优先）',
    version: '2.0.0',
    endpoints: {
      anthropic: '/v1/messages',
      models: '/v1/models',
      countTokens: '/v1/messages/count_tokens',
      health: '/health',
      compatibility: {
        openai: '/v1/chat/completions',
      },
    },
  });
}
