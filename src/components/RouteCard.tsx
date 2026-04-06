/**
 * 模型路由管理卡片
 */

import { useState } from "react"
import type { Provider, RouteMapping } from "../../shared/types"
import { RouteForm } from "./RouteForm"

interface RouteCardProps {
  routes: readonly RouteMapping[]
  providers: readonly Provider[]
  editing: RouteMapping | null
  onEdit: (route: RouteMapping | null) => void
  onAdd: (route: Omit<RouteMapping, "id">) => void
  onUpdate: (route: RouteMapping) => void
  onRemove: (id: string) => void
}

function getProviderName(
  providerId: string,
  providers: readonly Provider[],
): string {
  return providers.find((p) => p.id === providerId)?.name ?? "未知"
}

export function RouteCard({
  routes,
  providers,
  editing,
  onEdit,
  onAdd,
  onUpdate,
  onRemove,
}: RouteCardProps) {
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
        <h2 className="text-base font-semibold text-zinc-800">模型路由</h2>
        <button
          onClick={() => {
            setShowForm(true)
            onEdit(null)
          }}
          className="rounded-md bg-zinc-100 px-2.5 py-1 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-200"
        >
          + 添加
        </button>
      </div>

      <div className="p-4 space-y-3">
        {showForm && !editing && (
          <RouteForm
            providers={providers}
            onSubmit={(r) => {
              onAdd(r as Omit<RouteMapping, "id">)
              setShowForm(false)
            }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {routes.length === 0 && !showForm && (
          <div className="py-8 text-center text-sm text-zinc-400">
            暂无路由映射，点击"添加"开始配置
          </div>
        )}

        {routes.map((route) => (
          <div key={route.id}>
            {editing?.id === route.id ? (
              <RouteForm
                providers={providers}
                initial={route}
                onSubmit={(r) => onUpdate(r as RouteMapping)}
                onCancel={() => onEdit(null)}
              />
            ) : (
              <div className="flex items-center justify-between rounded-md border border-zinc-100 bg-zinc-50 px-4 py-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <code className="rounded bg-zinc-200 px-2 py-0.5 text-sm font-mono text-zinc-800">
                    {route.logicalModel}
                  </code>
                  <span className="text-zinc-400">&rarr;</span>
                  <span className="text-sm text-zinc-600">
                    {getProviderName(route.providerId, providers)}
                  </span>
                  <span className="text-zinc-300">/</span>
                  <code className="text-sm font-mono text-zinc-700">
                    {route.actualModel}
                  </code>
                </div>
                <div className="flex gap-1.5 ml-4">
                  <button
                    onClick={() => {
                      onEdit(route)
                      setShowForm(false)
                    }}
                    className="rounded px-2 py-1 text-xs text-blue-600 transition-colors hover:bg-blue-50"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => onRemove(route.id)}
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
  )
}
