# UI显示问题修复（第三批）Spec

## Why

前端UI仍存在多处显示问题，包括文字溢出、响应式布局、图表标签重叠、表格单元格溢出等，影响用户体验和界面美观度。

## What Changes

- 修复文字溢出问题（8处）
- 修复元素溢出容器问题（3处）
- 修复响应式布局问题（4处）
- 修复flex/grid布局问题（2处）
- 修复固定宽度/高度问题（2处）
- 修复z-index层级问题（2处）
- 修复间距不一致问题（2处）
- 修复图表标签溢出问题（2处）
- 修复表格单元格溢出问题（2处）
- 修复交互状态问题（1处）

## Impact

- Affected specs: UI组件显示规范
- Affected code:
  - `src/components/common/AnimatedNumber.tsx`
  - `src/components/common/AppLayout.tsx`
  - `src/components/common/ChartToolbar.tsx`
  - `src/components/common/EnhancedSidebar.tsx`
  - `src/components/common/FavoritesPanel.tsx`
  - `src/components/common/LanguageSwitcher.tsx`
  - `src/components/common/TimeRangeSelector.tsx`
  - `src/features/alerts/components/AlertActionButtons.tsx`
  - `src/features/alerts/components/AlertBatchActions.tsx`
  - `src/features/alerts/components/ResponseTimeStats.tsx`
  - `src/features/comparison/components/ComparisonControls.tsx`
  - `src/features/comparison/components/VirtualTableToolbar.tsx`
  - `src/features/cross-chain/components/ChainStatusOverview.tsx`
  - `src/features/cross-chain/components/CorrelationMatrix.tsx`
  - `src/features/cross-chain/components/LiquidityAnalysis.tsx`
  - `src/features/cross-chain/components/RiskScore.tsx`
  - `src/features/explore/components/GlobalSearch.tsx`
  - `src/features/explore/components/MarketStats.tsx`
  - `src/features/oracle/analytics/deviation/components/DeviationDistributionChart.tsx`
  - `src/features/oracle/analytics/deviation/components/TrendDetails.tsx`
  - `src/features/oracle/components/AddressExplorer.tsx`
  - `src/features/oracle/components/AssertionList.tsx`
  - `src/features/oracle/components/SyncStatus.tsx`
  - `src/features/oracle/chainlink/components/HeartbeatMonitor.tsx`
  - `src/features/oracle/chainlink/components/OcrRoundMonitor.tsx`
  - `src/features/oracle/pyth/components/ConfidenceIntervalChart.tsx`
  - `src/features/wallet/components/ConnectWallet.tsx`

## ADDED Requirements

### Requirement: 文字溢出处理

系统应确保所有文本内容在容器空间不足时正确截断，不会溢出容器边界。

#### Scenario: 长文本正确截断

- **WHEN** 组件显示长文本
- **THEN** 文本正确截断显示省略号
- **AND** 不会溢出容器边界

### Requirement: 响应式布局一致性

系统应确保所有组件在不同屏幕尺寸下正确显示。

#### Scenario: 小屏幕正确显示

- **WHEN** 用户在小屏幕上查看页面
- **THEN** 组件正确适应屏幕宽度
- **AND** 内容不会被挤压或溢出

### Requirement: 图表标签可读性

系统应确保图表标签不会重叠，保持可读性。

#### Scenario: 图表标签正确显示

- **WHEN** 用户查看图表
- **THEN** 标签清晰可读
- **AND** 不会重叠或溢出
