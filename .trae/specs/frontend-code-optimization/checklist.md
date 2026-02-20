# Checklist

## 组件文件拆分

- [x] VirtualTable 拆分为 5 个文件（Header、Row、Toolbar、types、主组件）
- [x] EnhancedStatCard 拆分为 5 个文件（Compact、Detailed、Interactive、Skeleton、主组件）
- [x] 所有拆分后的组件功能正常

## Hook 职责拆分

- [x] useAlertsPage 拆分为 4 个专用 Hook
- [x] useOracleDashboard 拆分为 3 个专用 Hook
- [x] 拆分后的 Hook 可独立测试
- [x] 页面功能不受影响

## 列表虚拟化

- [x] 告警列表使用 react-virtuoso 渲染
- [x] 1000 条数据滚动流畅（无明显卡顿）

## 消除重复代码

- [x] STATUS_COLORS 和 STATUS_THEME_COLORS 合并为统一配置
- [x] SEVERITY_COLORS 和 RISK_COLORS 使用工厂函数生成
- [x] 所有颜色引用正常工作

## 组件渲染优化

- [x] NavItemComponent 使用 React.memo 包装
- [x] handleClick 使用 useCallback 包装
- [x] 侧边栏展开/收起不触发所有 NavItem 重渲染

## 懒加载错误边界

- [x] comparison 页面懒加载组件有错误边界保护
- [x] 加载失败显示友好错误提示
- [x] 提供重试功能

## Context 状态拆分

- [ ] WalletContext 拆分为 State 和 Actions 两个 Context
- [ ] 状态变化不触发仅使用 Actions 的组件重渲染
- [ ] 所有 useWallet 调用正常工作

## 错误处理国际化

- [x] ErrorBoundary 使用 i18n 显示错误文案
- [x] 中英文切换时错误文案正确显示

## 类型定义优化

- [ ] StatusBadgeProps status 类型不包含 string
- [ ] createSWRConfig 不使用类型断言

## 响应式设计

- [ ] alerts 页面 Tab 列表在小屏幕上正常显示

## 代码质量

- [x] 无 TypeScript 类型错误
- [x] 无 ESLint 警告（除了无关的预先存在的问题）
- [x] 所有页面功能正常运行
