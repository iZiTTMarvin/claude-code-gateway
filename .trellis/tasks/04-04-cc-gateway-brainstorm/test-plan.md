# Test Plan

Generated for engineering planning on 2026-04-06

## Affected Surfaces

- 服务商管理界面
  - 添加、编辑、删除 Anthropic-compatible 服务商
- 模型发现
  - 自动拉取、重试、失败兜底
- Claude Code 槽位映射
  - `Main / Thinking / Opus / Sonnet / Haiku`
- 本地网关
  - `/v1/messages`
  - `/v1/messages/count_tokens`
- 桌面生命周期
  - 托盘常驻
  - 开机自启

## Critical Paths

1. 添加服务商 -> 自动发现模型 -> 选择模型填入槽位 -> Claude Code 成功请求 `localhost:1314`
2. 添加服务商 -> 模型发现失败 -> 用户手填模型 ID -> Claude Code 成功请求 `localhost:1314`
3. 关闭窗口 -> 应用进入托盘 -> 本地网关继续工作

## Required Tests

### Shared / Store

- 配置 schema 迁移测试
- 旧 `routes` 结构迁移或清理行为测试
- 服务商删除后槽位映射清理测试

### Discovery

- 成功发现模型并持久化
- 发现失败时写入失败状态
- 手动重试后恢复成功
- 发现失败时仍允许保存自定义模型 ID

### Slot Mapping

- 选择已发现模型保存成功
- 自定义模型 ID 保存成功
- 槽位未配置时返回明确错误

### Gateway

- `/v1/messages` 根据槽位解析到 provider + model
- 上游失败时返回 Anthropic-compatible 错误
- `count_tokens` 未完整实现时返回明确且一致的兼容性响应

### Desktop Lifecycle

- 关闭主窗口不退出应用
- 托盘菜单可恢复主窗口
- 开机自启配置可保存

## QA Notes

- 手动验证时优先用两个真实 Anthropic-compatible 服务商
- 至少覆盖一次“自动发现成功”和一次“只能手填”的场景
- 重点观察 Claude Code 侧体验是否有明显额外摩擦
