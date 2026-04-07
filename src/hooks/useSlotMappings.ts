/**
 * Claude Code 槽位映射 Hook
 *
 * 已废弃：槽位映射能力由 cc-switch 接管，后续不再使用。
 * 保留文件仅为避免旧引用导致构建中断，所有调用方应逐步移除。
 */

export type SlotKey = 'main' | 'thinking' | 'opus' | 'sonnet' | 'haiku';

export interface SlotMappingDraft {
  readonly slot: SlotKey;
  readonly providerId: string;
  readonly modelId: string;
  readonly source: 'discovered' | 'custom';
}

export const SLOT_KEYS = ['main', 'thinking', 'opus', 'sonnet', 'haiku'] as const;

export function useSlotMappings() {
  throw new Error('useSlotMappings is deprecated and must not be used');
}
