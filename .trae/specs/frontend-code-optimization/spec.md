# 前端代码优化 Spec

## Why

项目代码整体质量较高，但存在一些性能瓶颈、代码重复、组件过大等问题。通过优化可以提升应用性能、改善代码可维护性、减少潜在 bug。

## What Changes

- 拆分过大的组件文件（VirtualTable、EnhancedStatCard、colors.ts）
- 优化 Hook 职责，拆分过于复杂的 Hook
- 告警列表添加虚拟化渲染
- 消除重复的颜色配置定义
- 添加组件渲染优化（React.memo、useCallback）
- 改进懒加载错误边界
- 优化 Context 状态管理

## Impact

- Affected specs: 组件架构、状态管理、性能优化
- Affected code:
  - `src/features/comparison/components/VirtualTable.tsx` (拆分)
  - `src/components/common/StatCard/EnhancedStatCard.tsx` (拆分)
  - `src/lib/design-system/tokens/colors.ts` (重构)
  - `src/features/alerts/hooks/useAlertsPage.ts` (拆分)
  - `src/features/oracle/dashboard/hooks/useOracleDashboard.ts` (拆分)
  - `src/app/alerts/page.tsx` (虚拟化)
  - `src/features/wallet/contexts/WalletContext.tsx` (优化)
  - `src/components/common/ErrorBoundary.tsx` (国际化)

## ADDED Requirements

### Requirement: 组件文件拆分

系统应将过大的组件文件拆分为更小、更易维护的模块。

#### Scenario: VirtualTable 组件拆分

- **WHEN** 开发者维护 VirtualTable 组件
- **THEN** 组件被拆分为 VirtualTable.tsx、VirtualTableHeader.tsx、VirtualTableRow.tsx、VirtualTableToolbar.tsx、types.ts

#### Scenario: EnhancedStatCard 组件拆分

- **WHEN** 开发者维护 StatCard 组件
- **THEN** 组件被拆分为 StatCard.tsx、StatCardCompact.tsx、StatCardDetailed.tsx、StatCardInteractive.tsx、StatCardSkeleton.tsx

### Requirement: Hook 职责拆分

复杂 Hook 应按职责拆分为多个专用 Hook。

#### Scenario: useAlertsPage 拆分

- **WHEN** 开发者需要修改告警数据获取逻辑
- **THEN** 可以只修改 useAlertsData Hook，不影响过滤、选择、导出逻辑

#### Scenario: useOracleDashboard 拆分

- **WHEN** 开发者需要修改仪表盘图表配置
- **THEN** 可以只修改 useDashboardCharts Hook，不影响数据获取和统计逻辑

### Requirement: 列表虚拟化

大数据列表应使用虚拟化渲染，避免性能问题。

#### Scenario: 告警列表虚拟化

- **WHEN** 告警数据超过 100 条
- **THEN** 系统使用虚拟列表渲染，保持流畅滚动

### Requirement: 消除重复代码

重复的配置定义应合并为统一的配置对象。

#### Scenario: 颜色配置合并

- **WHEN** 开发者需要添加新的状态颜色
- **THEN** 只需在统一配置对象中添加一处定义，自动生成所有格式

### Requirement: 组件渲染优化

频繁渲染的组件应使用 React.memo 和 useCallback 优化。

#### Scenario: NavItemComponent 优化

- **WHEN** 侧边栏重新渲染
- **THEN** 未变化的 NavItem 不会重新渲染

### Requirement: 懒加载错误边界

异步加载的组件应有错误边界保护。

#### Scenario: 组件加载失败

- **WHEN** 懒加载组件加载失败
- **THEN** 显示友好的错误提示，而非白屏

### Requirement: Context 状态拆分

单一 Context 应拆分为状态和操作两个 Context。

#### Scenario: WalletContext 拆分

- **WHEN** 钱包连接状态变化
- **THEN** 只有依赖连接状态的组件重新渲染，依赖操作方法的组件不受影响

### Requirement: 错误处理国际化

错误边界应使用 i18n 显示错误信息。

#### Scenario: 错误边界显示

- **WHEN** 应用发生错误
- **THEN** 错误提示文案根据用户语言设置显示

## MODIFIED Requirements

无

## REMOVED Requirements

无
