/**
 * 网关状态卡片
 */

import type { AppSettings, ProxyStatus } from '../../shared/types';

interface GatewayStatusCardProps {
  status: ProxyStatus;
  appSettings: AppSettings;
  savingSettings: boolean;
  onSaveAppSettings: (settings: AppSettings) => Promise<void>;
}

export function GatewayStatusCard({
  status,
  appSettings,
  savingSettings,
  onSaveAppSettings,
}: GatewayStatusCardProps) {
  return (
    <section className="rounded-lg border border-sky-200 bg-white">
      <div className="border-b border-sky-100 px-4 py-3">
        <h2 className="text-base font-semibold text-zinc-800">网关状态</h2>
        <p className="mt-1 text-sm text-zinc-500">Claude Code 推荐使用 Anthropic Base URL 指向本地 1314。</p>
      </div>

      <div className="space-y-2 p-4 text-sm text-zinc-700">
        <div className="flex items-center justify-between rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
          <span>运行状态</span>
          <span className={status.running ? 'text-emerald-600' : 'text-zinc-500'}>
            {status.running ? '运行中' : '已停止'}
          </span>
        </div>
        <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
          监听地址: <code>http://localhost:{status.port}</code>
        </div>
        <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
          Anthropic Endpoint: <code>/v1/messages</code>
        </div>
        <label className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
          <div>
            <div>关闭窗口最小化到托盘</div>
            <div className="text-xs text-zinc-500">保持本地 1314 网关继续运行</div>
          </div>
          <input
            type="checkbox"
            checked={appSettings.minimizeToTrayOnClose}
            disabled={savingSettings}
            onChange={event =>
              void onSaveAppSettings({
                ...appSettings,
                minimizeToTrayOnClose: event.target.checked,
              })
            }
            className="h-4 w-4 rounded border-zinc-300 text-sky-600 focus:ring-sky-500"
          />
        </label>
        <label className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
          <div>
            <div>开机自启</div>
            <div className="text-xs text-zinc-500">登录系统后自动启动桌面网关</div>
          </div>
          <input
            type="checkbox"
            checked={appSettings.autoLaunch}
            disabled={savingSettings}
            onChange={event =>
              void onSaveAppSettings({
                ...appSettings,
                autoLaunch: event.target.checked,
              })
            }
            className="h-4 w-4 rounded border-zinc-300 text-sky-600 focus:ring-sky-500"
          />
        </label>
        {status.error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {status.error}
          </div>
        )}
      </div>
    </section>
  );
}
