/**
 * Claude Code 槽位映射卡片
 * - 模型 ID 输入框旁新增一键复制按钮
 */

import { useEffect, useState } from 'react';
import type { Provider } from '../../shared/types';
import type { SlotKey, SlotMappingDraft } from '../hooks/useSlotMappings';

interface SlotMappingCardProps {
  providers: readonly Provider[];
  slotMappings: Readonly<Record<SlotKey, SlotMappingDraft>>;
  discoveredModelsByProvider: Readonly<Record<string, readonly string[]>>;
  savingSlot: SlotKey | null;
  onSaveSlot: (slot: SlotKey, draft: Omit<SlotMappingDraft, 'slot'>) => Promise<void>;
  onClearSlot: (slot: SlotKey) => Promise<void>;
}

const SLOT_LABELS: Record<SlotKey, string> = {
  main: 'Main',
  thinking: 'Thinking',
  opus: 'Opus',
  sonnet: 'Sonnet',
  haiku: 'Haiku',
};

export function SlotMappingCard({
  providers,
  slotMappings,
  discoveredModelsByProvider,
  savingSlot,
  onSaveSlot,
  onClearSlot,
}: SlotMappingCardProps) {
  const [drafts, setDrafts] = useState<Record<SlotKey, SlotMappingDraft>>(slotMappings);
  const [copiedSlot, setCopiedSlot] = useState<SlotKey | null>(null);

  useEffect(() => {
    setDrafts(slotMappings);
  }, [slotMappings]);

  const handleProviderChange = (slot: SlotKey, providerId: string) => {
    setDrafts(previous => ({
      ...previous,
      [slot]: { ...previous[slot], providerId },
    }));
  };

  const handleModelChange = (slot: SlotKey, modelId: string) => {
    setDrafts(previous => ({
      ...previous,
      [slot]: { ...previous[slot], modelId, source: 'custom' },
    }));
  };

  const handleCopyModelId = async (slot: SlotKey, modelId: string) => {
    if (!modelId.trim()) return;
    await navigator.clipboard.writeText(modelId.trim());
    setCopiedSlot(slot);
    window.setTimeout(() => setCopiedSlot(null), 1200);
  };

  return (
    <section className="rounded-lg border border-emerald-200 bg-white">
      <div className="border-b border-emerald-100 px-4 py-3">
        <h2 className="text-base font-semibold text-zinc-800">Claude Code 槽位映射</h2>
        <p className="mt-1 text-sm text-zinc-500">
          把上游模型映射到 Main / Thinking / Opus / Sonnet / Haiku。支持下拉选择已发现模型，也支持手填自定义模型
          ID。
        </p>
      </div>

      <div className="space-y-3 p-4">
        {providers.length === 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            请先添加至少一个服务商。
          </div>
        )}

        {(Object.keys(SLOT_LABELS) as SlotKey[]).map(slot => {
          const draft = drafts[slot];
          const models = draft.providerId ? discoveredModelsByProvider[draft.providerId] ?? [] : [];
          const dataListId = `slot-models-${slot}`;
          const canCopy = Boolean(draft.modelId.trim());

          return (
            <div key={slot} className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
              <div className="mb-2 text-sm font-semibold text-zinc-700">{SLOT_LABELS[slot]}</div>
              {/* 服务商选择 */}
              <div className="grid gap-2 sm:grid-cols-[160px_minmax(0,1fr)]">
                <select
                  value={draft.providerId}
                  onChange={event => handleProviderChange(slot, event.target.value)}
                  className="rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                >
                  <option value="">选择服务商</option>
                  {providers.map(provider => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>

                {/* 模型 ID 输入 + 复制按钮 */}
                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <input
                      list={dataListId}
                      value={draft.modelId}
                      onChange={event => handleModelChange(slot, event.target.value)}
                      placeholder="输入模型 ID（可手填）"
                      className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                    <datalist id={dataListId}>
                      {models.map(modelId => (
                        <option key={`${slot}-${modelId}`} value={modelId} />
                      ))}
                    </datalist>
                  </div>

                  {/* 复制模型 ID */}
                  <button
                    type="button"
                    title="复制模型 ID"
                    onClick={() => void handleCopyModelId(slot, draft.modelId)}
                    disabled={!canCopy}
                    className={`shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${
                      copiedSlot === slot
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    {copiedSlot === slot ? '✓' : '复制'}
                  </button>

                  {/* 保存 */}
                  <button
                    type="button"
                    onClick={() =>
                      onSaveSlot(slot, {
                        providerId: draft.providerId,
                        modelId: draft.modelId,
                        source: models.includes(draft.modelId) ? 'discovered' : 'custom',
                      })
                    }
                    disabled={savingSlot === slot || !draft.providerId || !draft.modelId.trim()}
                    className="shrink-0 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {savingSlot === slot ? '保存中...' : '保存'}
                  </button>

                  {/* 清空 */}
                  <button
                    type="button"
                    onClick={() => onClearSlot(slot)}
                    disabled={savingSlot === slot}
                    className="shrink-0 rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-200 disabled:opacity-60"
                  >
                    清空
                  </button>
                </div>
              </div>

              {models.length === 0 && draft.providerId && (
                <div className="mt-2 text-xs text-zinc-500">
                  该服务商暂无可用模型列表，请直接输入自定义模型 ID。
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
