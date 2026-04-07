# 优化添加/编辑服务商交互为居中悬浮窗口

## Goal

将服务商的添加和编辑操作从内联表单改为全局居中 Modal 悬浮窗口，提升视觉体验和交互一致性。

## Requirements

- 新建通用 `Modal` 组件（遮罩层、居中容器、关闭按钮、ESC 关闭、点击遮罩关闭）
- 点击"+ 添加"弹出居中 Modal
- 点击服务商"编辑"也弹出居中 Modal（预填数据）
- `ProviderForm` 保留表单逻辑，移除外层蓝色边框样式
- Modal 状态管理在 `ProviderCard` 内部
- Modal 渲染在 `App.tsx` 层级（Portal），确保全局居中而非相对于左栏

## Acceptance Criteria

- [ ] 点击"+ 添加"弹出居中 Modal
- [ ] 点击服务商"编辑"弹出居中 Modal（预填当前数据）
- [ ] Modal 有关闭按钮（右上角 X）
- [ ] 按 ESC 关闭 Modal
- [ ] 点击遮罩层关闭 Modal
- [ ] 提交后自动关闭 Modal
- [ ] Modal 在视口全局居中（不受左栏 420px 限制）
- [ ] 编辑服务商不再使用内联表单
- [ ] 动画过渡自然（淡入淡出）

## Definition of Done

- Lint / typecheck 通过
- 视觉效果符合现有设计风格（Tailwind CSS）
- 无多余依赖引入

## Technical Approach

1. 新建 `src/components/Modal.tsx` — 通用 Modal 组件，使用 React Portal 渲染到 body
2. 修改 `ProviderCard.tsx` — 移除内联表单，改用 Modal 包裹 ProviderForm
3. 修改 `ProviderForm.tsx` — 移除外层蓝色边框/背景样式（由 Modal 承载）
4. Modal 状态（showModal, editingMode）管理在 ProviderCard 内

## Out of Scope

- 其他卡片（ModelDiscovery、GatewayAuth 等）的交互改造
- 表单验证逻辑变更
- 删除确认对话框（后续可复用 Modal）

## Technical Notes

- 技术栈：React 19 + Tailwind CSS 3 + TypeScript
- 无现有 UI 组件库，Modal 为全新手写组件
- React 19 支持 `createPortal`
- 现有颜色主题：服务商使用蓝色（blue）
