/**
 * 本地网关鉴权配置卡片
 */

import { useEffect, useState, type FormEvent } from 'react';
import type { GatewayAuthConfig } from '../../shared/types';

interface GatewayAuthCardProps {
  auth: GatewayAuthConfig;
  generating: boolean;
  onSave: (auth: GatewayAuthConfig) => Promise<void>;
  onGenerate: () => Promise<string>;
}

export function GatewayAuthCard({ auth, generating, onSave, onGenerate }: GatewayAuthCardProps) {
  const [enabled, setEnabled] = useState(auth.enabled);
  const [apiKey, setApiKey] = useState(auth.apiKey);
  const [saving, setSaving] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'done'>('idle');

  useEffect(() => {
    setEnabled(auth.enabled);
    setApiKey(auth.apiKey);
  }, [auth]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave({ enabled, apiKey: apiKey.trim() });
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    const nextKey = await onGenerate();
    setApiKey(nextKey);
  };

  const handleCopy = async () => {
    if (!apiKey) return;
    await navigator.clipboard.writeText(apiKey);
    setCopyState('done');
    window.setTimeout(() => setCopyState('idle'), 1200);
  };

  return (
    <section className="rounded-lg border border-amber-200 bg-white">
      <div className="border-b border-amber-100 px-4 py-3">
        <h2 className="text-base font-semibold text-zinc-800">Claude Code 鉴权</h2>
        <p className="mt-1 text-sm text-zinc-500">
          为本地网关配置访问密钥。该密钥用于 Claude Code 访问 `localhost`，与上游服务商 API Key
          分离。
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        <label className="flex items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
          <input
            type="checkbox"
            checked={enabled}
            onChange={event => setEnabled(event.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 text-amber-600 focus:ring-amber-500"
          />
          <div>
            <div className="text-sm font-medium text-zinc-700">启用本地 API Key 校验</div>
            <div className="text-xs text-zinc-500">
              支持 `x-api-key` 和 `Authorization: Bearer &lt;key&gt;`
            </div>
          </div>
        </label>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
          <input
            type="text"
            value={apiKey}
            onChange={event => setApiKey(event.target.value)}
            placeholder="输入自定义网关 API Key，或点击右侧随机生成"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-60"
          >
            {generating ? '生成中...' : '随机生成'}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!apiKey}
            className="rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 disabled:opacity-50"
          >
            {copyState === 'done' ? '已复制' : '复制'}
          </button>
        </div>

        <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
          Claude Code 推荐基址：`http://localhost:1314/v1/messages`
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving || (enabled && !apiKey.trim())}
            className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存鉴权设置'}
          </button>
        </div>
      </form>
    </section>
  );
}
