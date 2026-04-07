# cc-gateway (Claude Code & Multi-LLM API Gateway)

cc-gateway 是一款专为开发者设计的本地模型路由网关桌面应用。它能够将分散的大语言模型 API（如 OpenAI, Anthropic, MiniMax, 智谱 GLM, DeepSeek 等）整合并代理为统一的本地接口。通过直观的图形化界面，用户可以轻松管理服务商、配置模型映射（Slot Mapping）并实时监控代理状态。本项目特别针对 Claude Code 及其生态进行了深度适配，是提升 AI 开发效率的理想工具。

## 核心特性

- **Claude Code 深度适配**：原生支持 Anthropic API 协议（`/v1/messages`）映射，通过槽位分发机制，让 Claude Code 能够无缝接入各类兼容或非兼容的后端模型。
- **全栈桌面化管理**：基于 Electron + React 19 构建，告别繁琐的 YAML 配置文件。所有操作均可在 UI 界面完成，包括服务商纳管、模型路由规则设置及代理热启停。
- **智能模型发现与映射**：支持动态同步服务商可用模型列表。用户可定义逻辑别名（如 sonnet, haiku），将其精准映射到实际后端的物理模型名。
- **生产级代理增强**：内置高可度的流式 SSE 转发架构，支持模型列表发现（`/v1/models`）、健康检查、网关级身份验证以及自动化 404 端点回退逻辑。
- **系统级集成体验**：支持系统托盘常驻、开机自启配置。实时展示流量转发日志与端口占用情况，确保本地服务的高可用性。

## 技术架构

- **UI 渲染层**：React 19, Vite 6, Tailwind CSS 3.
- **逻辑核心层**：Node.js, Express 4, Electron 33.
- **工程标准**：全量 TypeScript 开发，遵循严格的类型安全规范；采用四层解耦架构（主进程、渲染进程、代理服务层、共享定义层）。

## 快速开始

### 依赖环境
- Node.js 18.x 或更高版本
- npm 9.x 或更高版本

### 源码安装与启动
1. **克隆项目**：
   ```bash
   git clone https://github.com/your-username/cc-gateway.git
   cd cc-gateway
   ```
2. **安装依赖**：
   ```bash
   npm install
   ```
3. **开发模式运行**：
   ```bash
   npm run dev
   ```
   *提示：如需在启动时自动开启开发者工具，请指定环境变量 `CC_GATEWAY_OPEN_DEVTOOLS=1`。*

### 构建安装包
```bash
# 执行编译并打包为当前系统的安装程序
npm run electron:build
```
完成后，可在 `dist/` 目录下找到生成的安装镜像。

## 客户端接入指引

### Claude Code 接入
配置 Claude Code 环境变量，将 API 地址指向本地网关：
```bash
# 默认端口为 1314
export ANTHROPIC_BASE_URL=http://localhost:1314
```
在 cc-gateway 的管理界面中配置好对应的服务商与模型槽位后，Claude Code 即可通过本地网关进行消息转发。

### 通用 OpenAI-compatible 接入
网关提供了兼容 OpenAI 的标准端点：
- **API Base**: `http://localhost:1314/v1`
- **接口地址**: `/v1/chat/completions`
- **模型列表**: `/v1/models`

## 项目结构概览

- `electron/`：Electron 主进程代码，包含窗口 management 与 IPC 通信。
- `electron-proxy/`：核心代理逻辑，负责多协议转换与请求转发。
- `src/`：管理后台的前端代码，采用 React 19 实现。
- `shared/`：存放主进程与渲染进程公用的类型定义与工具函数。
- `tests/`：项目的单元测试与集成测试套件。

## 许可证
本项目采用 MIT 许可证。详见 LICENSE 文件（如果存在）或 package.json 中的描述。

