# cc-gateway

本地模型路由网关 —— 将多个 LLM API 服务商整合为统一的 OpenAI-compatible 接口。

## 功能特点

- **多服务商支持** — Minimax、GLM、OpenAI 等，统一管理
- **模型路由映射** — 一个模型名对应任意服务商的实际模型
- **OpenAI-compatible** — 完全兼容 OpenAI API 格式
- **流式输出** — 支持 SSE 流式响应
- **轻量本地工具** — 无需部署到服务器，本地运行更安全

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置

复制示例配置文件并填入你的 API Keys：

```bash
cp config.yaml.example config.yaml
```

编辑 `config.yaml`：

```yaml
providers:
  - id: minimax
    baseURL: https://api.minimax.chat/v1
    apiKey: YOUR_MINIMAX_API_KEY
    openAICompatible: true

  - id: glm
    baseURL: https://open.bigmodel.cn/api/paas/v4
    apiKey: YOUR_GLM_API_KEY
    openAICompatible: true

routes:
  glm-5-turbo: glm/glm-5-turbo
  haiku: minimax/minimax-2.7
  sonnet: minimax/minimax-2.7

port: 1314
logLevel: info
```

### 3. 启动

开发模式（热重载）：

```bash
npm run dev
```

生产模式：

```bash
npm run build
npm start
```

服务将在 `http://localhost:1314` 启动。

## 配置说明

### Providers（服务商）

| 字段 | 说明 |
|------|------|
| `id` | 服务商标识符，用于 routes 中引用 |
| `baseURL` | API Base URL |
| `apiKey` | API 密钥 |
| `openAICompatible` | 是否兼容 OpenAI 格式（默认 true） |

### Routes（路由）

格式：`"逻辑模型名": "providerId/实际模型名"`

例如：
- `glm-5-turbo: glm/glm-5-turbo` — 请求 `glm-5-turbo` 时，调用 GLM 的 `glm-5-turbo` 模型
- `haiku: minimax/minimax-2.7` — 请求 `haiku` 时，调用 Minimax 的 `minimax-2.7` 模型

### 服务器配置

| 字段 | 说明 |
|------|------|
| `port` | 监听端口（默认 1314） |
| `logLevel` | 日志级别：debug / info / warn / error |

## API 端点

### Chat Completions

```
POST /v1/chat/completions
```

请求格式与 OpenAI 完全相同：

```json
{
  "model": "glm-5-turbo",
  "messages": [
    { "role": "user", "content": "你好" }
  ],
  "stream": false
}
```

### Health Check

```
GET /health
```

## 接入 Claude Code

配置 Claude Code 的 API endpoint 指向 cc-gateway：

```bash
export OPENAI_API_BASE=http://localhost:1314
```

然后在 Claude Code 配置中使用 `glm-5-turbo`、`haiku`、`sonnet` 等逻辑模型名。

## 项目结构

```
cc-gateway/
├── src/
│   ├── index.ts          # 入口
│   ├── config.ts         # 配置加载
│   ├── types.ts          # 类型定义
│   ├── server.ts         # HTTP 服务器
│   ├── router.ts         # 路由逻辑
│   ├── utils/
│   │   ├── errors.ts     # 错误处理
│   │   └── logger.ts     # 日志工具
│   └── providers/
│       ├── types.ts      # Provider 接口
│       ├── openai-compatible.ts  # 通用实现
│       ├── minimax.ts    # Minimax
│       └── glm.ts        # GLM
├── config.yaml.example   # 配置模板
├── config.yaml           # 实际配置（不提交）
└── package.json
```

## 开发

```bash
# 类型检查
npm run typecheck

# Lint
npm run lint

# 格式化
npm run format

# 构建
npm run build
```

## License

MIT
