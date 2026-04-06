/**
 * 模型路由状态管理 Hook
 */

import { useState, useCallback } from "react"
import { randomUUID } from "../../shared/utils"
import type { RouteMapping, AppConfig } from "../../shared/types"
import * as ipc from "../lib/ipc"

export function useRoutes(
  config: AppConfig | null,
  setConfig: (config: AppConfig) => void,
) {
  const [editing, setEditing] = useState<RouteMapping | null>(null)

  const addRoute = useCallback(
    async (route: Omit<RouteMapping, "id">) => {
      if (!config) return
      const newRoute: RouteMapping = { ...route, id: randomUUID() }
      const updated = await ipc.saveConfig({
        routes: [...config.routes, newRoute],
      })
      setConfig(updated)
    },
    [config, setConfig],
  )

  const updateRoute = useCallback(
    async (route: RouteMapping) => {
      if (!config) return
      const routes = config.routes.map((r) =>
        r.id === route.id ? route : r,
      )
      const updated = await ipc.saveConfig({ routes })
      setConfig(updated)
      setEditing(null)
    },
    [config, setConfig],
  )

  const removeRoute = useCallback(
    async (id: string) => {
      if (!config) return
      const routes = config.routes.filter((r) => r.id !== id)
      const updated = await ipc.saveConfig({ routes })
      setConfig(updated)
    },
    [config, setConfig],
  )

  return {
    routes: config?.routes ?? [],
    editing,
    setEditing,
    addRoute,
    updateRoute,
    removeRoute,
  } as const
}
