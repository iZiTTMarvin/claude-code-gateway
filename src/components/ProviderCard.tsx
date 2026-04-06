/**
 * 服务商管理卡片
 */

import { useState } from 'react';
import type { Provider } from '../../shared/types';
import { ProviderForm } from './ProviderForm';

interface ProviderCardProps {
  providers: readonly Provider[];
  editing: Provider | null;
  onEdit: (provider: Provider | null) => void;
  onAdd: (provider: Omit<Provider, 'id'>) => void;
  onUpdate: (provider: Provider) => void;
  onRemove: (id: string) => void;
}

export function ProviderCard({
  providers,
  editing,
  onEdit,
  onAdd,
  onUpdate,
  onRemove,
}: ProviderCardProps) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
        <h2 className="text-base font-semibold text-zinc-800">服务商</h2>
        <button
          onClick={() => {
            setShowForm(true);
            onEdit(null);
          }}
          className="rounded-md bg-zinc-100 px-2.5 py-1 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-200"
        >
          + 添加
        </button>
      </div>

      <div className="p-4 space-y-3">
        {showForm && !editing && (
          <ProviderForm
            onSubmit={p => {
              onAdd(p as Omit<Provider, 'id'>);
              setShowForm(false);
            }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {providers.length === 0 && !showForm && (
          <div className="py-8 text-center text-sm text-zinc-400">
            暂无服务商，点击"添加"开始配置
          </div>
        )}

        {providers.map(provider => (
          <div key={provider.id}>
            {editing?.id === provider.id ? (
              <ProviderForm
                initial={provider}
                onSubmit={p => onUpdate(p as Provider)}
                onCancel={() => onEdit(null)}
              />
            ) : (
              <div className="flex items-center justify-between rounded-md border border-zinc-100 bg-zinc-50 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 font-medium text-zinc-800">
                    {provider.name}
                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-500 ring-1 ring-zinc-200">
                      {provider.protocol === 'anthropic' ? 'Anthropic' : 'OpenAI'}
                    </span>
                  </div>
                  <div className="truncate text-xs text-zinc-500">{provider.baseUrl}</div>
                </div>
                <div className="flex gap-1.5 ml-4">
                  <button
                    onClick={() => {
                      onEdit(provider);
                      setShowForm(false);
                    }}
                    className="rounded px-2 py-1 text-xs text-blue-600 transition-colors hover:bg-blue-50"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => onRemove(provider.id)}
                    className="rounded px-2 py-1 text-xs text-red-600 transition-colors hover:bg-red-50"
                  >
                    删除
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
