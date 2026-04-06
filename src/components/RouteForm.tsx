/**
 * 添加/编辑路由映射表单
 */

import { useState, type FormEvent } from "react"
import type { Provider, RouteMapping } from "../../shared/types"

interface RouteFormProps {
  providers: readonly Provider[]
  initial?: RouteMapping
  onSubmit: (route: Omit<RouteMapping, "id"> | RouteMapping) => void
  onCancel: () => void
}

export function RouteForm({
  providers,
  initial,
  onSubmit,
  onCancel,
}: RouteFormProps) {
  const [logicalModel, setLogicalModel] = useState(
    initial?.logicalModel ?? "",
  )
  const [providerId, setProviderId] = useState(
    initial?.providerId ?? providers[0]?.id ?? "",
  )
  const [actualModel, setActualModel] = useState(initial?.actualModel ?? "")

  const isEdit = !!initial

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!logicalModel.trim() || !providerId || !actualModel.trim()) return

    const data = {
      logicalModel: logicalModel.trim(),
      providerId,
      actualModel: actualModel.trim(),
    }

    if (isEdit) {
      onSubmit({ id: initial.id, ...data })
    } else {
      onSubmit(data)
    }
  }

  if (providers.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
        请先添加至少一个服务商
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4"
    >
      <div className="text-sm font-medium text-emerald-800">
        {isEdit ? "编辑路由" : "添加路由"}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input
          type="text"
          value={logicalModel}
          onChange={(e) => setLogicalModel(e.target.value)}
          placeholder="逻辑模型名 (如 claude-3-5-sonnet)"
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
          required
        />
        <select
          value={providerId}
          onChange={(e) => setProviderId(e.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
          required
        >
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={actualModel}
          onChange={(e) => setActualModel(e.target.value)}
          placeholder="实际模型名 (如 gpt-4)"
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
          required
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
        >
          {isEdit ? "保存" : "添加"}
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
  )
}
