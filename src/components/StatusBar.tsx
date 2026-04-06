/**
 * 底部状态栏
 */

import type { ProxyStatus } from '../../shared/types';

interface StatusBarProps {
  status: ProxyStatus;
  providerCount: number;
  slotMappedCount: number;
}

export function StatusBar({ status, providerCount, slotMappedCount }: StatusBarProps) {
  return (
    <footer className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-6 py-2 text-xs text-zinc-500">
      <div className="flex gap-4">
        <span>{providerCount} 个服务商</span>
        <span>{slotMappedCount} 个槽位已映射</span>
      </div>
      <div>
        {status.running && (
          <span>
            端点: http://localhost:{status.port}/v1/messages
          </span>
        )}
        {status.error && <span className="text-red-500">{status.error}</span>}
      </div>
    </footer>
  );
}
