/**
 * 代理相关类型定义
 */

import type { ProviderProtocol } from '../shared/types';

export type ChatMessageRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatMessageRole;
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stop?: string | string[];
  [key: string]: unknown;
}

export interface AnthropicMessage {
  role: Exclude<ChatMessageRole, 'system'>;
  content: string;
}

export interface AnthropicMessagesRequest {
  model: string;
  messages: AnthropicMessage[];
  system?: string;
  stream?: boolean;
  max_tokens: number;
  temperature?: number;
  top_p?: number;
  stop_sequences?: string[];
  [key: string]: unknown;
}

export type ClaudeSlot = 'main' | 'thinking' | 'opus' | 'sonnet' | 'haiku';

export type SlotMappingSource = 'discovered' | 'custom';

export interface SlotMappingLike {
  readonly slot?: string;
  readonly providerId: string;
  readonly modelId?: string;
  readonly source?: SlotMappingSource;
  readonly inputModel?: string;
  readonly logicalModel?: string;
  readonly actualModel?: string;
  readonly aliases?: readonly string[];
}

export interface DiscoveredModel {
  readonly id: string;
  readonly displayName: string;
  readonly raw?: unknown;
}

export interface ProviderModelDiscoveryResult {
  readonly providerId: string;
  readonly status: 'success' | 'failed';
  readonly models: readonly DiscoveredModel[];
  readonly syncedAt: string;
  readonly error?: string;
}

export type ProviderRequest =
  | { protocol: 'openai'; body: ChatCompletionRequest }
  | { protocol: 'anthropic'; body: AnthropicMessagesRequest };

export type ProviderResponse =
  | { stream: false; data: unknown }
  | { stream: true; body: NodeJS.ReadableStream };

export interface Provider {
  readonly id: string;
  readonly protocol: ProviderProtocol;
  send(request: ProviderRequest): Promise<ProviderResponse>;
  discoverModels?(): Promise<readonly DiscoveredModel[]>;
}
