/**
 * Express HTTP 服务处理
 */

import type { Request, Response } from 'express';
import type { AppConfig, ProviderProtocol } from '../shared/types';
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

/** usage 采集回调的类型签名 */
export interface UsageRecordInput {
  readonly providerId: string;
  readonly providerName: string;
  readonly modelId: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly protocol: ProviderProtocol;
}

/** usage 采集回调（由主进程注入） */
export type UsageCollector = (record: UsageRecordInput) => void;

/** 当前注入的 usage 采集回调 */
let usageCollector: UsageCollector | null = null;

/** 注入 usage 采集回调（主进程在启动时调用） */
export function setUsageCollector(collector: UsageCollector): void {
  usageCollector = collector;
}

/** 采集 usage（在流结束后调用，不阻塞响应转发） */
function collectUsage(record: UsageRecordInput): void {
  if (!usageCollector) return;
  try {
    usageCollector(record);
  } catch (error) {
    // usage 采集失败不影响请求响应
    logger.error(`Usage collection failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function getHttpStatusCode(error: unknown): number {
  if (error instanceof AuthenticationError) return 401;
  if (error instanceof ModelNotFoundError) return 404;
  if (error instanceof ProviderNotFoundError) return 404;
  if (error instanceof ProviderError) return 502;
  return 500;
}

/**
 * 逐行解析 SSE 流，在转发的同时提取 usage 信息
 *
 * Anthropic 协议：从 message_delta 事件中提取 usage
 * OpenAI 协议：从最后一个 chunk 中提取 usage，以 data: [DONE] 标记结束
 */
function writeStreamResponse(
  res: Response,
  body: NodeJS.ReadableStream,
  usageContext: UsageRecordInput
): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const { protocol } = usageContext;

  // 累积 usage（流式响应中 usage 可能在中间和最终事件中分批给出）
  let accInputTokens = 0;
  let accOutputTokens = 0;

  if (protocol === 'anthropic') {
    // Anthropic SSE 协议：逐行解析 event / data 对
    let currentEvent = '';
    let buffer = '';

    const readable = body as NodeJS.ReadableStream & { on(event: string, fn: (...args: unknown[]) => void): unknown };

    readable.on('data', (chunk: unknown) => {
      const text = typeof chunk === 'string' ? chunk : Buffer.from(chunk as Uint8Array).toString('utf-8');
      buffer += text;

      // 按双换行分割 SSE 事件块
      const parts = buffer.split('\n\n');
      // 保留最后一段（可能不完整）
      buffer = parts.pop() ?? '';

      for (const part of parts) {
        // 转发原始数据
        res.write(part + '\n\n');

        // 解析 event / data 行
        for (const line of part.split('\n')) {
          const trimmed = line.trim();
          if (trimmed.startsWith('event:')) {
            currentEvent = trimmed.slice(6).trim();
          } else if (trimmed.startsWith('data:')) {
            const dataStr = trimmed.slice(5).trim();
            if (!dataStr) continue;

            try {
              const data = JSON.parse(dataStr);

              // Anthropic 协议：message_start 包含 input_tokens，message_delta 包含 output_tokens
              if (currentEvent === 'message_start' && data.message?.usage) {
                accInputTokens += data.message.usage.input_tokens ?? 0;
              } else if (currentEvent === 'message_delta' && data.usage) {
                accOutputTokens += data.usage.output_tokens ?? 0;
              }
            } catch {
              // JSON 解析失败时忽略（可能是非 JSON 的 data 行）
            }
          }
        }
      }
    });

    readable.on('end', () => {
      // 写入剩余 buffer
      if (buffer.trim()) {
        res.write(buffer);
      }
      res.end();

      // 流结束时采集 usage
      if (accInputTokens > 0 || accOutputTokens > 0) {
        collectUsage({
          ...usageContext,
          inputTokens: accInputTokens,
          outputTokens: accOutputTokens,
        });
      }

      logger.response(200, true);
    });

    readable.on('error', (err: Error) => {
      logger.error(`Stream error: ${err.message}`);
      res.end();
    });
  } else {
    // OpenAI SSE 协议：data: { ... } 行，最终以 data: [DONE] 结束
    let buffer = '';

    const readable = body as NodeJS.ReadableStream & { on(event: string, fn: (...args: unknown[]) => void): unknown };

    readable.on('data', (chunk: unknown) => {
      const text = typeof chunk === 'string' ? chunk : Buffer.from(chunk as Uint8Array).toString('utf-8');
      buffer += text;

      // 按双换行分割 SSE 事件块（与 Anthropic 分支保持一致）
      const parts = buffer.split('\n\n');
      buffer = parts.pop() ?? '';

      for (const part of parts) {
        // 转发原始数据
        res.write(part + '\n\n');

        for (const line of part.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;

          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6).trim();
            if (dataStr === '[DONE]') continue;

            try {
              const data = JSON.parse(dataStr);
              if (data.usage) {
                // 使用累加（+=）而非赋值，防御某些 OpenAI 兼容厂商在中间 chunk 也发送 usage
                accInputTokens += data.usage.prompt_tokens ?? 0;
                accOutputTokens += data.usage.completion_tokens ?? 0;
              }
            } catch {
              // 忽略 JSON 解析失败
            }
          }
        }
      }
    });

    readable.on('end', () => {
      if (buffer.trim()) {
        res.write(buffer + '\n');
      }
      res.end();

      if (accInputTokens > 0 || accOutputTokens > 0) {
        collectUsage({
          ...usageContext,
          inputTokens: accInputTokens,
          outputTokens: accOutputTokens,
        });
      }

      logger.response(200, true);
    });

    readable.on('error', (err: Error) => {
      logger.error(`Stream error: ${err.message}`);
      res.end();
    });
  }
}

/** 从非流式响应中提取 usage 并采集 */
function extractAndCollectNonStreamUsage(
  data: unknown,
  usageContext: UsageRecordInput
): void {
  let inputTokens = 0;
  let outputTokens = 0;

  if (usageContext.protocol === 'anthropic') {
    // Anthropic 非流式：{ usage: { input_tokens, output_tokens } }
    const resp = data as { usage?: { input_tokens?: number; output_tokens?: number } };
    if (resp.usage) {
      inputTokens = resp.usage.input_tokens ?? 0;
      outputTokens = resp.usage.output_tokens ?? 0;
    }
  } else {
    // OpenAI 非流式：{ usage: { prompt_tokens, completion_tokens } }
    const resp = data as { usage?: { prompt_tokens?: number; completion_tokens?: number } };
    if (resp.usage) {
      inputTokens = resp.usage.prompt_tokens ?? 0;
      outputTokens = resp.usage.completion_tokens ?? 0;
    }
  }

  if (inputTokens > 0 || outputTokens > 0) {
    collectUsage({
      ...usageContext,
      inputTokens,
      outputTokens,
    });
  }
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

    // 查找 provider 显示名
    const providerConfig = config.providers.find(p => p.id === provider.id);
    const providerName = providerConfig?.name ?? provider.id;

    // 构建 usage 采集上下文
    const usageContext: UsageRecordInput = {
      providerId: provider.id,
      providerName,
      modelId: actualModel,
      inputTokens: 0,
      outputTokens: 0,
      protocol: providerRequest.protocol,
    };

    const requestBody = { ...providerRequest.body, model: actualModel };
    const result: ProviderResponse = await provider.send({
      protocol: providerRequest.protocol,
      body: requestBody as never,
    });

    if (result.stream) {
      writeStreamResponse(
        res,
        result.body,
        usageContext
      );
      return;
    }

    // 非流式：从响应中提取 usage
    extractAndCollectNonStreamUsage(result.data, usageContext);

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
