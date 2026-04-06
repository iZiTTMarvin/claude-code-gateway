# Directory Structure

> cc-gateway Electron 桌面应用前端目录结构规范。

---

## Overview

前端代码位于 `src/renderer/` 目录下，采用 React + TypeScript + Vite 构建，运行在 Electron 渲染进程中。目录按职责划分，保持扁平化结构（项目规模较小，不需要按 feature 拆分）。

---

## Directory Layout

```
src/
├── main/                     # Electron 主进程代码
│   ├── index.ts              # 主进程入口
│   ├── proxy/                # Express 代理服务器
│   └── store/                # electron-store 配置管理
├── renderer/                 # Electron 渲染进程代码（React 应用）
│   ├── App.tsx               # 根组件，组装页面布局
│   ├── main.tsx              # 渲染进程入口（ReactDOM.createRoot）
│   ├── index.css             # 全局样式 / Tailwind 入口
│   ├── components/           # UI 组件
│   │   ├── AppHeader.tsx     # 顶部标题栏 + 启动/停止按钮
│   │   ├── StatusBar.tsx     # 底部状态栏
│   │   ├── ProviderCard.tsx  # 服务商管理卡片
│   │   ├── ProviderForm.tsx  # 服务商添加/编辑表单
│   │   ├── RouteCard.tsx     # 模型路由卡片
│   │   ├── RouteForm.tsx     # 路由添加/编辑表单
│   │   └── ui/               # 通用基础 UI 组件（Button, Card, Input 等）
│   ├── hooks/                # 自定义 Hooks
│   │   ├── useProxyStatus.ts # 代理状态订阅（IPC 事件监听）
│   │   ├── useProviders.ts   # 服务商 CRUD 操作（IPC 调用封装）
│   │   └── useRoutes.ts      # 路由映射 CRUD 操作（IPC 调用封装）
│   ├── lib/                  # 工具函数和 IPC 封装
│   │   ├── ipc.ts            # IPC 调用的类型安全封装
│   │   └── utils.ts          # 通用工具函数（cn 等）
│   └── types/                # 渲染进程专用类型定义
│       └── electron.d.ts     # window.electronAPI 类型声明
├── shared/                   # 主进程与渲染进程共享
│   └── types.ts              # 共享类型（Provider, Route, ProxyStatus 等）
└── preload/                  # Preload 脚本
    └── index.ts              # contextBridge 暴露 electronAPI
```

---

## Module Organization

### components/ — UI 组件

存放所有 React 组件。每个组件一个文件，不需要为单个组件创建文件夹（除非组件有局部子组件）。

```
components/
├── ProviderCard.tsx       # 独立组件，单文件
├── ProviderForm.tsx       # 独立组件，单文件
└── ui/                    # 基础组件目录（来自 Shadcn 或自建）
    ├── Button.tsx
    ├── Card.tsx
    └── Input.tsx
```

### hooks/ — 自定义 Hooks

**所有 IPC 交互逻辑必须封装在 hooks 中**，组件不直接调用 `window.electronAPI`。

每个 hook 聚焦一个业务领域：
- `useProxyStatus` — 代理运行状态
- `useProviders` — 服务商数据的增删改查
- `useRoutes` — 路由映射的增删改查

### lib/ — 工具层

存放非 React 的纯函数工具：
- `ipc.ts` — 对 `window.electronAPI` 的类型安全封装
- `utils.ts` — 通用工具（classname merge 等）

### types/ — 类型定义

- `electron.d.ts` — `window.electronAPI` 的全局类型声明
- 组件私有类型直接写在组件文件内，不需要单独抽出

### shared/ — 跨进程共享

- `types.ts` — 主进程和渲染进程共享的数据类型（Provider, Route, AppConfig 等）
- **只放类型和常量**，不放运行时代码（避免 Node.js 模块泄漏到渲染进程）

---

## Naming Conventions

| 类别 | 规则 | 示例 |
|------|------|------|
| 组件文件 | PascalCase.tsx | `ProviderCard.tsx` |
| Hook 文件 | camelCase，以 `use` 开头 | `useProviders.ts` |
| 工具文件 | camelCase.ts | `ipc.ts`, `utils.ts` |
| 类型文件 | camelCase.ts 或 .d.ts | `electron.d.ts` |
| 组件导出名 | 与文件名一致，PascalCase | `export function ProviderCard()` |
| Hook 导出名 | 与文件名一致，camelCase | `export function useProviders()` |
| 接口/类型名 | PascalCase | `Provider`, `RouteMapping` |
| CSS class | kebab-case（Tailwind 除外） | `status-bar` |

---

## Examples

### 典型组件文件结构

```typescript
// src/renderer/components/ProviderCard.tsx

import { useState } from 'react'
import { useProviders } from '../hooks/useProviders'
import { ProviderForm } from './ProviderForm'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import type { Provider } from '../../shared/types'

interface ProviderCardProps {
  // 无外部 props，数据从 hook 获取
}

export function ProviderCard() {
  const { providers, addProvider, updateProvider, removeProvider } = useProviders()
  const [editing, setEditing] = useState<Provider | null>(null)

  // ... 组件逻辑
}
```

### 典型 Hook 文件结构

```typescript
// src/renderer/hooks/useProviders.ts

import { useState, useEffect, useCallback } from 'react'
import { ipc } from '../lib/ipc'
import type { Provider } from '../../shared/types'

export function useProviders() {
  const [providers, setProviders] = useState<Provider[]>([])

  // 初始化加载
  useEffect(() => {
    ipc.getConfig().then((config) => {
      setProviders(config.providers)
    })
  }, [])

  const addProvider = useCallback(async (provider: Provider) => {
    // ... IPC 调用
  }, [])

  return { providers, addProvider, updateProvider, removeProvider }
}
```

---

## Forbidden Patterns

### 1. 不要在 components/ 中创建 index.ts barrel 文件

```typescript
// WRONG: components/index.ts
export { ProviderCard } from './ProviderCard'
export { RouteCard } from './RouteCard'

// CORRECT: 直接从具体文件导入
import { ProviderCard } from '../components/ProviderCard'
```

理由：barrel 文件在小项目中增加间接层，且影响 tree-shaking。

### 2. 不要为单个组件创建文件夹

```
// WRONG
components/
├── ProviderCard/
│   ├── index.tsx
│   ├── ProviderCard.tsx
│   └── ProviderCard.module.css

// CORRECT
components/
├── ProviderCard.tsx
```

理由：项目规模小，文件夹嵌套增加导航成本。
