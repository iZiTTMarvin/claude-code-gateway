# Directory Structure

> cc-gateway V2 Electron 桌面应用的目录结构规范。

---

## 概览

cc-gateway V2 从 Node.js CLI 工具重构为 Electron 桌面应用，采用四层目录结构：

- **electron/** - Electron 主进程 + 预加载脚本
- **src/** - React 渲染进程（前端 UI）
- **src-proxy/** - 代理服务器（从 V1 `src/` 迁移）
- **shared/** - 跨进程共享的类型和常量

---

## 目录布局

```
cc-gateway/
├── electron/                    # Electron 主进程
│   ├── main/
│   │   ├── index.ts             # 主进程入口（BrowserWindow 创建、生命周期）
│   │   ├── ipc-handlers.ts      # IPC 消息处理（主进程侧）
│   │   ├── proxy-manager.ts     # 代理服务器生命周期管理（启动/停止/重启）
│   │   ├── store.ts             # electron-store 配置持久化（替代 V1 YAML）
│   │   └── tray.ts              # 系统托盘（可选）
│   └── preload/
│       └── index.ts             # contextBridge 暴露安全 API 给渲染进程
│
├── src/                         # React 渲染进程（前端）
│   ├── components/              # UI 组件
│   ├── hooks/                   # 自定义 hooks
│   ├── pages/                   # 页面组件
│   ├── stores/                  # 前端状态管理
│   ├── types/                   # 前端专用类型
│   ├── App.tsx
│   └── main.tsx                 # 渲染进程入口
│
├── src-proxy/                   # 代理服务器（独立于 Electron，可单独运行）
│   ├── index.ts                 # Express 服务器入口
│   ├── server.ts                # 请求处理器（复用 V1）
│   ├── router.ts                # 路由解析（重写，去掉硬编码）
│   ├── config.ts                # 配置管理（重写，使用注入式配置）
│   ├── types.ts                 # 代理层类型（复用 V1）
│   ├── utils/
│   │   ├── errors.ts            # 错误类（复用 V1）
│   │   └── logger.ts            # 日志工具（重写，适配 Electron）
│   └── providers/
│       ├── types.ts             # Provider 接口（复用 V1）
│       ├── openai-compatible.ts # 通用 OpenAI 实现（复用 V1）
│       ├── registry.ts          # Provider 注册表（新增，替代硬编码 if-else）
│       └── ...                  # 其他特殊 provider
│
├── shared/                      # 跨进程共享
│   ├── types.ts                 # IPC 消息类型、配置类型（GatewayConfig 等）
│   └── constants.ts             # IPC channel 名称常量、默认值
│
├── package.json
├── tsconfig.json                # 基础 tsconfig
├── tsconfig.node.json           # 主进程 + 代理服务器编译
├── tsconfig.web.json            # 渲染进程编译
├── electron-builder.yml         # 打包配置
└── vite.config.ts               # Vite 配置（渲染进程构建）
```

---

## V1 迁移指南

### 可直接复用的文件

以下 V1 文件的核心逻辑可直接迁移到 `src-proxy/`，仅需调整 import 路径：

| V1 文件 | V2 位置 | 说明 |
|---------|---------|------|
| `src/types.ts` | `src-proxy/types.ts` | OpenAI 兼容类型定义，原封不动 |
| `src/providers/types.ts` | `src-proxy/providers/types.ts` | Provider 接口，原封不动 |
| `src/providers/openai-compatible.ts` | `src-proxy/providers/openai-compatible.ts` | 通用 Provider 实现，原封不动 |
| `src/server.ts` | `src-proxy/server.ts` | Express handler，原封不动 |
| `src/utils/errors.ts` | `src-proxy/utils/errors.ts` | 错误类，原封不动 |

### 需要重写的文件

| V1 文件 | V2 位置 | 重写原因 |
|---------|---------|---------|
| `src/config.ts` | `src-proxy/config.ts` + `electron/main/store.ts` | V1 使用 YAML 文件 + Zod 校验；V2 配置由 `electron-store` 管理，代理层通过注入获取配置，不再自行读取文件 |
| `src/router.ts` | `src-proxy/router.ts` + `src-proxy/providers/registry.ts` | V1 中 `getProviderInstance()` 硬编码了 `minimax`/`glm` 的 if-else 分支；V2 改为 Provider 注册表模式 |
| `src/utils/logger.ts` | `src-proxy/utils/logger.ts` | V1 直接写 `console.error`；V2 需要支持文件日志和 IPC 传递 |
| `src/index.ts` | `src-proxy/index.ts` + `electron/main/proxy-manager.ts` | V1 是 CLI 入口；V2 代理由主进程管理生命周期 |

---

## 模块职责边界

### `electron/main/` - 主进程

负责 Electron 生命周期和系统级功能，**不包含业务逻辑**：

```typescript
// electron/main/store.ts - 配置持久化
import Store from "electron-store";
import type { GatewayConfig } from "../../shared/types";

// electron-store 自动处理文件读写和变更监听
const store = new Store<GatewayConfig>({
  defaults: {
    providers: [],
    routes: {},
    port: 1314,
    logLevel: "info",
  },
});

export { store };
```

### `src-proxy/` - 代理服务器

纯 Node.js 层，**不依赖 Electron API**。配置通过函数参数注入：

```typescript
// src-proxy/config.ts - 注入式配置管理（替代 V1 文件读取）
import type { GatewayConfig } from "../shared/types";

let currentConfig: GatewayConfig | null = null;

/** 由主进程调用，注入配置 */
export function setConfig(config: GatewayConfig): void {
  // 使用 Zod 校验后再赋值
  currentConfig = config;
}

export function getConfig(): GatewayConfig {
  if (!currentConfig) {
    throw new ConfigError("配置尚未初始化，请先调用 setConfig()");
  }
  return currentConfig;
}
```

### `shared/` - 共享类型

仅包含类型定义和常量，**零运行时代码**：

```typescript
// shared/constants.ts
export const IPC_CHANNELS = {
  CONFIG_GET: "config:get",
  CONFIG_SET: "config:set",
  PROXY_START: "proxy:start",
  PROXY_STOP: "proxy:stop",
  PROXY_STATUS: "proxy:status",
  LOG_MESSAGE: "log:message",
} as const;
```

---

## 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 文件名 | kebab-case | `proxy-manager.ts`, `ipc-handlers.ts` |
| 目录名 | kebab-case | `src-proxy/`, `electron/` |
| 类名 | PascalCase | `OpenAICompatibleProvider` |
| 接口名 | PascalCase | `Provider`, `GatewayConfig` |
| 函数名 | camelCase | `resolveRoute`, `handleChatCompletion` |
| 常量 | UPPER_SNAKE_CASE | `IPC_CHANNELS`, `LOG_LEVEL_PRIORITY` |
| 类型别名 | PascalCase | `ModelMapping`, `ProviderResponse` |

---

## 禁止的模式

### 1. 禁止 src-proxy 直接依赖 Electron API

```typescript
// WRONG: 代理服务器中直接使用 Electron API
import { app } from "electron";
const configPath = app.getPath("userData");

// CORRECT: 通过注入获取配置，保持代理层独立
export function createProxyServer(config: GatewayConfig): Express {
  // 配置由调用方（主进程）传入
}
```

### 2. 禁止渲染进程直接访问 Node.js API

```typescript
// WRONG: 渲染进程直接 require Node 模块
import fs from "node:fs";
fs.readFileSync("/some/path");

// CORRECT: 通过 preload 暴露的安全 API
const config = await window.electronAPI.getConfig();
```

### 3. 禁止跨层直接 import

```typescript
// WRONG: 渲染进程直接 import 主进程代码
import { store } from "../../electron/main/store";

// CORRECT: 通过 IPC 通信
// 渲染进程 -> preload -> IPC -> 主进程
```

### 4. 禁止 shared/ 中包含运行时逻辑

```typescript
// WRONG: shared/ 中引入运行时依赖
import axios from "axios";
export function fetchData() { ... }

// CORRECT: shared/ 仅包含类型和常量
export interface GatewayConfig { ... }
export const DEFAULT_PORT = 1314;
```

### 5. 禁止在 router 中硬编码 Provider 分支

```typescript
// WRONG: V1 的硬编码模式
if (providerId === "minimax") {
  provider = createMinimaxProvider(config);
} else if (providerId === "glm") {
  provider = createGLMProvider(config);
} else {
  provider = createOpenAICompatibleProvider(config);
}

// CORRECT: V2 使用注册表模式
const registry = new ProviderRegistry();
registry.register("minimax", createMinimaxProvider);
registry.register("glm", createGLMProvider);
registry.setDefault(createOpenAICompatibleProvider);

const provider = registry.create(providerId, config);
```
