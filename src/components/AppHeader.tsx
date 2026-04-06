/**
 * 顶部标题栏 + 代理控制按钮
 */

import type { ProxyStatus } from "../../shared/types"

interface AppHeaderProps {
  status: ProxyStatus
  loading: boolean
  onStart: () => void
  onStop: () => void
}

export function AppHeader({ status, loading, onStart, onStop }: AppHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-zinc-900">cc-gateway</h1>
        <span className="text-sm text-zinc-500">v2.0.0</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div
            className={`h-2.5 w-2.5 rounded-full ${
              status.running ? "bg-green-500" : "bg-zinc-300"
            }`}
          />
          <span className="text-sm text-zinc-600">
            {status.running
              ? `运行中 :${status.port}`
              : status.error
                ? "启动失败"
                : "已停止"}
          </span>
        </div>

        {status.running ? (
          <button
            onClick={onStop}
            disabled={loading}
            className="rounded-md bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
          >
            {loading ? "停止中..." : "停止"}
          </button>
        ) : (
          <button
            onClick={onStart}
            disabled={loading}
            className="rounded-md bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 transition-colors hover:bg-green-100 disabled:opacity-50"
          >
            {loading ? "启动中..." : "启动"}
          </button>
        )}
      </div>
    </header>
  )
}
