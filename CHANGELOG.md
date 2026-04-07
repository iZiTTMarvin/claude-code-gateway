# Changelog

All notable changes to this project will be documented in this file.

## 2026-04-08
- **feat(ui)**: 新增侧边栏导航 + 统计页面 + Recharts 图表
  - `App.tsx` 布局增加左侧 56px 窄侧边栏，支持配置/统计页面切换
  - 新增 `StatsPage` 页面，包含汇总概览卡片、Token 趋势折线图、厂商对比柱状图、分页明细表格、模型定价 CRUD、数据清理功能
  - 新增 `useUsage` hook，封装所有 usage 相关 IPC 调用
  - 新增 `src/lib/ipc.ts` 中 usage 相关 IPC 函数（当前使用 mock 数据）
  - 安装 `recharts` 依赖
  - 任务详情见 `.trellis/tasks/04-08-frontend-stats-page/prd.md`

## 2026-04-07
- **ui**：UI 布局重构为左右双栏，新增一键复制功能
  - `App.tsx` 主区域从垂直单栏改为左栏（服务商+模型发现）+ 右栏（槽位映射+状态+鉴权）双栏布局
  - `electron/main/index.ts` 默认窗口从 900×700 扩大至 1200×780，minWidth 从 700 调整为 900
  - `GatewayStatusCard`：监听地址和 API Endpoint 行各增加一键复制按钮，复制后显示"✓ 已复制"反馈
  - `ModelDiscoveryCard`：模型名称 tag 改为可点击按钮，点击复制对应模型 ID，有颜色反馈
  - `SlotMappingCard`：每个槽位模型 ID 输入框旁新增"复制"按钮，复制当前输入的模型 ID

## 2026-04-07
- **docs**：重写 README.md 以适配 Electron v2.0.0 升级
  - 移除所有 emoji，提升文档专业度与 GitHub 兼容性
  - 补充 Claude Code 接入指引、技术架构说明与桌面端特性描述
  - 更新快速开始步骤与构建流程

## 2026-04-07
- **refactor**：将产品核心从通用模型路由重构为 Claude Code 本地网关
  - 引入服务商模型发现、Claude Code 槽位映射、Anthropic-compatible 主路径与 discovery 持久化
  - 新增托盘常驻、开机自启设置与桌面运行时控制
  - 任务详情已归档至 `.trellis/tasks/04-04-cc-gateway-brainstorm/engineering-plan.md`
- **fix**：修复真实联调中暴露的模型发现与客户端兼容问题
  - 新增 `/v1/models` / `/models` 列表接口，并允许按真实模型 ID 直接解析请求
  - MiniMax Anthropic 兼容接口在模型列表 404 时回退到官方支持模型静态目录

## 2026-04-06
- **fix**：修复 Provider 端点拼接导致的上游 404
  - OpenAI / Anthropic Provider 改为自动兼容根地址与已带 `/v1` 的 Base URL，并在 404 时尝试候选端点回退
  - Provider 配置表单补充 Base URL 输入说明，减少常见误配
- **fix**：收敛开发环境 Electron DevTools 控制台噪音
  - 改为仅在显式设置 `CC_GATEWAY_OPEN_DEVTOOLS=1` 时自动打开 DevTools

## 2026-04-05
- **fix**: 修复 Electron 主进程 ESM 路径解析异常
  - 使用 `import.meta.url` 派生主进程目录，避免 `__dirname` 在 ESM 下未定义
  - 生产模式加载路径切换为 `dist/index.html`
- **feat**: 从 Node.js CLI 重写为 Electron 桌面应用 (v2.0.0)
  - 新增 Electron 主进程（electron/main/）：窗口管理、IPC、config-store、proxy-manager
  - 新增 React 渲染进程（src/）：服务商管理、模型路由配置、代理启停控制 UI
  - 迁移代理逻辑至 electron-proxy/，去除硬编码 provider，改为纯配置驱动
  - 配置持久化从 YAML 改为 electron-store，UI 修改即时保存
- **docs**: 填充前端开发规范文件
  - 完成 directory-structure.md（渲染进程目录结构、命名约定）
  - 完成 component-guidelines.md（卡片组件模式、受控表单、IPC 封装规则）
  - 完成 state-management.md（useState + IPC 同步、事件订阅 cleanup）
  - 完成 type-safety.md（共享类型、electronAPI 类型声明、禁止 any）
- **docs**: 填充后端开发规范文件
  - 完成 directory-structure.md（V2 Electron 四层目录结构、V1 迁移指南）
  - 完成 error-handling.md（错误类体系、IPC 错误序列化、流式错误处理）
  - 完成 logging-guidelines.md（electron-log 适配、日志转发、脱敏规范）

## [0.1.0] - 2026-04-04

### Added
- 初始版本
- 多服务商支持（Minimax、GLM、OpenAI-compatible）
- 模型路由映射
- OpenAI-compatible API (`/v1/chat/completions`)
- 流式输出支持（SSE）
- YAML 配置文件
- 结构化日志
