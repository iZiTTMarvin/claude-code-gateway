/**
 * 模型发现状态卡片
 */

import type { Provider } from '../../shared/types';
import type { ProviderDiscoveryState } from '../hooks/useProviders';

interface ModelDiscoveryCardProps {
  providers: readonly Provider[];
  discoveryStateByProvider: Readonly<Record<string, ProviderDiscoveryState>>;
  syncingProviderId: string | null;
  onRetry: (providerId: string) => void;
}

function formatSyncTime(timestamp?: number): string {
  if (!timestamp) {
    return '尚未同步';
  }
  const date = new Date(timestamp);
  return date.toLocaleString();
}

function getStatusText(status: ProviderDiscoveryState['status']): string {
  if (status === 'syncing') return '同步中';
  if (status === 'success') return '同步成功';
  if (status === 'failed') return '同步失败';
  return '未同步';
}

function getStatusClassName(status: ProviderDiscoveryState['status']): string {
  if (status === 'syncing') return 'bg-blue-100 text-blue-700';
  if (status === 'success') return 'bg-emerald-100 text-emerald-700';
  if (status === 'failed') return 'bg-red-100 text-red-700';
  return 'bg-zinc-100 text-zinc-600';
}

export function ModelDiscoveryCard({
  providers,
  discoveryStateByProvider,
  syncingProviderId,
  onRetry,
}: ModelDiscoveryCardProps) {
  return (
    <section className="rounded-lg border border-indigo-200 bg-white">
      <div className="border-b border-indigo-100 px-4 py-3">
        <h2 className="text-base font-semibold text-zinc-800">模型发现</h2>
        <p className="mt-1 text-sm text-zinc-500">
          保存服务商后自动同步模型。失败时可重试，也可在槽位映射里直接手填模型 ID。
        </p>
      </div>

      <div className="space-y-3 p-4">
        {providers.length === 0 && (
          <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500">
            请先添加服务商，再进行模型同步。
          </div>
        )}

        {providers.map(provider => {
          const state = discoveryStateByProvider[provider.id] ?? {
            status: 'idle',
            models: [],
          };

          return (
            <div key={provider.id} className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-800">{provider.name}</span>
                    <span
                      className={`rounded px-2 py-0.5 text-[11px] font-medium ${getStatusClassName(
                        state.status,
                      )}`}
                    >
                      {getStatusText(state.status)}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">{provider.baseUrl}</div>
                  <div className="mt-1 text-xs text-zinc-400">
                    最近同步: {formatSyncTime(state.fetchedAt)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onRetry(provider.id)}
                  disabled={syncingProviderId === provider.id}
                  className="rounded-md bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100 disabled:opacity-60"
                >
                  {syncingProviderId === provider.id ? '同步中...' : '重试获取'}
                </button>
              </div>

              {state.error && (
                <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
                  {state.error}
                </div>
              )}

              {state.models.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {state.models.map(model => (
                    <span
                      key={`${provider.id}-${model.id}`}
                      className="rounded bg-white px-2 py-0.5 text-xs text-zinc-700 ring-1 ring-zinc-200"
                    >
                      {model.displayName}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="mt-2 text-xs text-zinc-500">
                  当前无可用模型列表，可在槽位映射中直接输入模型 ID。
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
