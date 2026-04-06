/**
 * 添加/编辑服务商表单
 */

import { useState, type FormEvent } from 'react';
import type { Provider, ProviderProtocol } from '../../shared/types';

interface ProviderFormProps {
  initial?: Provider;
  onSubmit: (provider: Omit<Provider, 'id'> | Provider) => void;
  onCancel: () => void;
}

export function ProviderForm({ initial, onSubmit, onCancel }: ProviderFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [protocol, setProtocol] = useState<ProviderProtocol>(initial?.protocol ?? 'anthropic');
  const [baseUrl, setBaseUrl] = useState(initial?.baseUrl ?? '');
  const [apiKey, setApiKey] = useState(initial?.apiKey ?? '');

  const isEdit = !!initial;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !baseUrl.trim() || !apiKey.trim()) return;

    if (isEdit) {
      onSubmit({
        id: initial.id,
        name: name.trim(),
        protocol,
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim(),
      });
    } else {
      onSubmit({ name: name.trim(), protocol, baseUrl: baseUrl.trim(), apiKey: apiKey.trim() });
    }
  };

  const baseUrlPlaceholder =
    protocol === 'anthropic'
      ? 'Base URL (如 https://api.anthropic.com 或 https://api.minimaxi.com/anthropic)'
      : 'Base URL (如 https://api.openai.com 或 https://api.openai.com/v1)';

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4"
    >
      <div className="text-sm font-medium text-blue-800">
        {isEdit ? '编辑服务商' : '添加服务商'}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="名称 (如 OpenAI)"
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
          required
        />
        <select
          value={protocol}
          onChange={e => setProtocol(e.target.value as ProviderProtocol)}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          <option value="anthropic">Anthropic / Claude</option>
          <option value="openai">OpenAI Compatible（兼容保留）</option>
        </select>
        <input
          type="url"
          value={baseUrl}
          onChange={e => setBaseUrl(e.target.value)}
          placeholder={baseUrlPlaceholder}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
          required
        />
        <div className="sm:col-span-4 text-xs text-zinc-500">
          {protocol === 'anthropic'
            ? '支持填写根地址或已带 /v1 的地址，程序会自动尝试兼容的消息端点。'
            : '当前产品主路径面向 Anthropic-compatible；OpenAI Compatible 仅保留兼容能力。'}
        </div>
        <input
          type="password"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder="API Key"
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
          required
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          {isEdit ? '保存' : '添加'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-200"
        >
          取消
        </button>
      </div>
    </form>
  );
}
