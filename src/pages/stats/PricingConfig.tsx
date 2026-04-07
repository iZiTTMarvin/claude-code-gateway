/**
 * 模型定价配置
 *
 * 可折叠的配置区域，表格形式展示已配置的模型定价，支持 CRUD
 */

import { useState, useCallback, type FormEvent } from 'react';
import type { ModelPricing } from '../../../shared/types';
import { Modal } from '../../components/ui/Modal';

interface PricingConfigProps {
  readonly pricingList: readonly ModelPricing[];
  readonly loading: boolean;
  readonly onSave: (pricing: ModelPricing) => Promise<void>;
  readonly onDelete: (modelId: string) => Promise<void>;
}

interface PricingFormData {
  modelId: string;
  inputPricePerMillion: string;
  outputPricePerMillion: string;
}

const EMPTY_FORM: PricingFormData = {
  modelId: '',
  inputPricePerMillion: '',
  outputPricePerMillion: '',
};

export function PricingConfig({
  pricingList,
  loading,
  onSave,
  onDelete,
}: PricingConfigProps) {
  const [expanded, setExpanded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ModelPricing | null>(null);
  const [form, setForm] = useState<PricingFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const openAddModal = useCallback(() => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback((pricing: ModelPricing) => {
    setEditing(pricing);
    setForm({
      modelId: pricing.modelId,
      inputPricePerMillion: String(pricing.inputPricePerMillion),
      outputPricePerMillion: String(pricing.outputPricePerMillion),
    });
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  }, []);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const inputPrice = parseFloat(form.inputPricePerMillion);
      const outputPrice = parseFloat(form.outputPricePerMillion);
      if (!form.modelId.trim() || Number.isNaN(inputPrice) || Number.isNaN(outputPrice)) return;

      setSaving(true);
      try {
        const pricing: ModelPricing = {
          modelId: form.modelId.trim(),
          inputPricePerMillion: inputPrice,
          outputPricePerMillion: outputPrice,
        };
        await onSave(pricing);
        closeModal();
      } finally {
        setSaving(false);
      }
    },
    [form, onSave, closeModal],
  );

  const handleDelete = useCallback(
    async (modelId: string) => {
      setSaving(true);
      try {
        await onDelete(modelId);
        setConfirmDeleteId(null);
      } finally {
        setSaving(false);
      }
    },
    [onDelete],
  );

  const modalTitle = editing ? '编辑模型定价' : '添加模型定价';

  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <h3 className="text-base font-semibold text-zinc-800">模型定价配置</h3>
        <svg
          className={`h-4 w-4 text-zinc-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-zinc-100 p-4">
          <div className="mb-3 flex items-center justify-end">
            <button
              onClick={openAddModal}
              className="rounded-md bg-zinc-100 px-2.5 py-1 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-200"
            >
              + 添加定价
            </button>
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-zinc-400">加载中...</div>
          ) : pricingList.length === 0 ? (
            <div className="py-8 text-center text-sm text-zinc-400">
              暂无定价配置，点击"添加定价"开始配置
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-100">
                    <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-zinc-500">
                      模型 ID
                    </th>
                    <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-zinc-500">
                      Input 价格 ($/1M)
                    </th>
                    <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-zinc-500">
                      Output 价格 ($/1M)
                    </th>
                    <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-zinc-500">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pricingList.map(pricing => (
                    <tr
                      key={pricing.modelId}
                      className="border-b border-zinc-50 transition-colors hover:bg-zinc-50"
                    >
                      <td className="max-w-[200px] truncate px-3 py-2 text-xs font-mono text-zinc-700">
                        {pricing.modelId}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-zinc-600">
                        ${pricing.inputPricePerMillion}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-zinc-600">
                        ${pricing.outputPricePerMillion}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {confirmDeleteId === pricing.modelId ? (
                          <span className="text-xs text-zinc-500">
                            确认？
                            <button
                              onClick={() => handleDelete(pricing.modelId)}
                              disabled={saving}
                              className="ml-1 text-red-600 hover:text-red-700 disabled:opacity-50"
                            >
                              删除
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="ml-1 text-zinc-500 hover:text-zinc-700"
                            >
                              取消
                            </button>
                          </span>
                        ) : (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => openEditModal(pricing)}
                              className="rounded px-2 py-1 text-xs text-blue-600 transition-colors hover:bg-blue-50"
                            >
                              编辑
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(pricing.modelId)}
                              className="rounded px-2 py-1 text-xs text-red-600 transition-colors hover:bg-red-50"
                            >
                              删除
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Modal open={modalOpen} onClose={closeModal} title={modalTitle}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">模型 ID</label>
            <input
              type="text"
              value={form.modelId}
              onChange={e => setForm(prev => ({ ...prev, modelId: e.target.value }))}
              placeholder="如 claude-sonnet-4-20250514"
              disabled={!!editing}
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-zinc-50 disabled:text-zinc-500"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">
                Input 价格 ($/1M tokens)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.inputPricePerMillion}
                onChange={e =>
                  setForm(prev => ({ ...prev, inputPricePerMillion: e.target.value }))
                }
                placeholder="3.00"
                className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">
                Output 价格 ($/1M tokens)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.outputPricePerMillion}
                onChange={e =>
                  setForm(prev => ({ ...prev, outputPricePerMillion: e.target.value }))
                }
                placeholder="15.00"
                className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                required
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存'}
            </button>
            <button
              type="button"
              onClick={closeModal}
              className="rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-200"
            >
              取消
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
