# UI显示问题修复（第二批）Spec

## Why

前端UI仍存在多处显示问题，包括文字溢出、元素溢出容器、响应式布局问题、z-index层级冲突等，影响用户体验和界面美观度。

## What Changes

- 修复文字溢出问题（9处）
- 修复元素溢出容器问题（5处）
- 修复响应式布局问题（6处）
- 修复Flex/Grid布局问题（7处）
- 修复固定宽度/高度问题（7处）
- 修复z-index层级问题（6处）
- 修复间距不一致问题（6处）
- 修复其他显示问题（6处）

## Impact

- Affected specs: UI组件显示规范
- Affected code:
  - `src/components/common/ChartCard.tsx`
  - `src/components/common/CompactList.tsx`
  - `src/components/common/GaugeGroup.tsx`
  - `src/components/common/MiniChart.tsx`
  - `src/components/common/MobileNav.tsx`
  - `src/components/common/QuickSearch.tsx`
  - `src/components/common/VirtualList.tsx`
  - `src/features/alerts/components/AlertGroup.tsx`
  - `src/features/alerts/components/AlertHeatmap.tsx`
  - `src/features/alerts/components/AlertRulesList.tsx`
  - `src/features/alerts/components/AlertTrendChart.tsx`
  - `src/features/alerts/components/NotificationChannels.tsx`
  - `src/features/comparison/components/ComparisonControls.tsx`
  - `src/features/comparison/components/VirtualTableHeader.tsx`
  - `src/features/cross-chain/components/BridgeStatusCard.tsx`
  - `src/features/cross-chain/components/CrossChainComparisonCard.tsx`
  - `src/features/explore/components/GlobalSearch.tsx`
  - `src/features/explore/components/TrendingFeedCard.tsx`
  - `src/features/oracle/analytics/deviation/components/AnomalyList.tsx`
  - `src/features/oracle/analytics/deviation/components/TrendList.tsx`
  - `src/features/oracle/api3/components/DapiList.tsx`
  - `src/features/oracle/chainlink/components/FeedDetail.tsx`
  - `src/features/oracle/chainlink/components/OperatorList.tsx`
  - `src/features/oracle/pyth/components/PublisherMonitor.tsx`
  - `src/features/wallet/components/UserMenu.tsx`

## ADDED Requirements

### Requirement: 文字溢出处理

系统应确保所有文本内容在容器空间不足时正确截断，不会溢出容器边界。

#### Scenario: 长标题正确截断

- **WHEN** 组件显示长标题或标签
- **THEN** 文本正确截断显示省略号
- **AND** 不会溢出容器边界

### Requirement: 元素溢出容器处理

系统应确保所有元素在容器空间不足时正确处理，不会溢出容器边界。

#### Scenario: SVG图表响应式显示

- **WHEN** SVG图表在小屏幕上显示
- **THEN** 图表正确适应容器宽度
- **AND** 不会溢出容器边界

### Requirement: 响应式布局一致性

系统应确保所有网格布局在不同屏幕尺寸下正确显示。

#### Scenario: 网格布局响应式显示

- **WHEN** 用户在不同屏幕尺寸下查看网格布局
- **THEN** 网格正确适应屏幕宽度
- **AND** 内容不会被挤压或溢出

### Requirement: z-index层级一致性

系统应确保模态框、下拉菜单等浮动元素的z-index层级正确，不会相互遮挡。

#### Scenario: 模态框层级正确

- **WHEN** 用户打开模态框
- **THEN** 模态框显示在其他元素之上
- **AND** 不会被其他固定元素遮挡
