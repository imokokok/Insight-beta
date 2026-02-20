# Tasks

## 高优先级任务

- [x] Task 1: 拆分 VirtualTable 组件
  - [x] SubTask 1.1: 提取 VirtualTableHeader 组件
  - [x] SubTask 1.2: 提取 VirtualTableRow 组件
  - [x] SubTask 1.3: 提取 VirtualTableToolbar 组件
  - [x] SubTask 1.4: 提取类型定义到 types.ts
  - [x] SubTask 1.5: 更新主组件引用

- [x] Task 2: 拆分 EnhancedStatCard 组件
  - [x] SubTask 2.1: 提取 StatCardCompact 组件
  - [x] SubTask 2.2: 提取 StatCardDetailed 组件
  - [x] SubTask 2.3: 提取 StatCardInteractive 组件
  - [x] SubTask 2.4: 提取 StatCardSkeleton 组件
  - [x] SubTask 2.5: 创建统一导出的 index.ts

- [x] Task 3: 重构 colors.ts 消除重复
  - [x] SubTask 3.1: 创建 createLevelColorConfig 工厂函数
  - [x] SubTask 3.2: 合并 STATUS_COLORS 和 STATUS_THEME_COLORS
  - [x] SubTask 3.3: 合并 SEVERITY_COLORS 和 RISK_COLORS
  - [x] SubTask 3.4: 更新所有引用

- [x] Task 4: 拆分 useAlertsPage Hook
  - [x] SubTask 4.1: 创建 useAlertsData Hook（数据获取）
  - [x] SubTask 4.2: 创建 useAlertsFilter Hook（过滤逻辑）
  - [x] SubTask 4.3: 创建 useAlertsSelection Hook（选择逻辑）
  - [x] SubTask 4.4: 创建 useAlertsExport Hook（导出逻辑）
  - [x] SubTask 4.5: 更新 useAlertsPage 为组合 Hook

- [x] Task 5: 告警列表虚拟化
  - [x] SubTask 5.1: 使用 react-virtuoso 替换普通 map 渲染
  - [x] SubTask 5.2: 测试大数据量下的滚动性能

## 中优先级任务

- [x] Task 6: 拆分 useOracleDashboard Hook
  - [x] SubTask 6.1: 创建 useDashboardData Hook
  - [x] SubTask 6.2: 创建 useDashboardCharts Hook
  - [x] SubTask 6.3: 创建 useDashboardStats Hook
  - [x] SubTask 6.4: 更新 useOracleDashboard 为组合 Hook

- [x] Task 7: 组件渲染优化
  - [x] SubTask 7.1: EnhancedSidebar NavItemComponent 添加 React.memo
  - [x] SubTask 7.2: handleClick 添加 useCallback
  - [x] SubTask 7.3: isActive 计算移到 useMemo

- [x] Task 8: 懒加载错误边界
  - [x] SubTask 8.1: 为 comparison 页面 Suspense 添加 ErrorBoundary
  - [x] SubTask 8.2: 验证组件加载失败显示友好错误提示
  - [x] SubTask 8.3: 提供重试功能

- [ ] Task 9: WalletContext 状态拆分
  - [ ] SubTask 9.1: 创建 WalletStateContext
  - [ ] SubTask 9.2: 创建 WalletActionsContext
  - [ ] SubTask 9.3: 更新所有 useWallet 调用

- [x] Task 10: ErrorBoundary 国际化
  - [x] SubTask 10.1: 使用 useI18n 获取错误文案
  - [x] SubTask 10.2: 添加重试按钮国际化
  - [x] SubTask 10.3: 添加翻译键到 en/zh locales

## 低优先级任务

- [ ] Task 11: 类型定义优化
  - [ ] SubTask 11.1: StatusBadgeProps status 类型精确化
  - [ ] SubTask 11.2: 移除 createSWRConfig 中的类型断言

- [ ] Task 12: 响应式设计优化
  - [ ] SubTask 12.1: alerts 页面 Tab 列表小屏幕适配

# Task Dependencies

- [Task 1] 可独立进行 ✅
- [Task 2] 可独立进行 ✅
- [Task 3] 可独立进行 ✅
- [Task 4] 可独立进行 ✅
- [Task 5] 可独立进行 ✅
- [Task 6] 可独立进行 ✅
- [Task 7] 可独立进行 ✅
- [Task 8] 可独立进行 ✅
- [Task 9] 可独立进行，但建议在 Task 4 后进行（积累经验）
- [Task 10] 可独立进行 ✅
- [Task 11] 可独立进行
- [Task 12] 可独立进行
