# UI 样式优化 - 第三阶段卡片样式替换规范

## Why

在前两阶段优化后，项目中仍有一些功能组件和页面使用卡片样式展示数据。继续优化这些组件可以进一步提升整体视觉一致性，特别是 Explore 页面的市场概览和实时对比组件。

## What Changes

- 优化 MarketOverview 组件的 Card 使用，替换为 ContentSection
- 优化 MarketStats 组件的 Card 使用，替换为轻量级布局
- 优化 RealtimeComparisonView 组件的 Card 使用
- 保留功能性卡片组件（TrendingFeedCard、AlertCard、ReliabilityScoreCard、BridgeStatusCard）

## Impact

- Affected specs: UI 组件系统、页面布局
- Affected code:
  - `src/features/explore/components/MarketOverview.tsx` - 市场概览组件
  - `src/features/explore/components/MarketStats.tsx` - 市场统计组件
  - `src/features/comparison/components/RealtimeComparison.tsx` - 实时对比组件

## ADDED Requirements

### Requirement: MarketOverview 组件优化

MarketOverview 组件应减少 Card 使用，采用更轻量的布局。

#### Scenario: 使用 ContentSection 组织市场概览

- **WHEN** 用户查看 Explore 页面
- **THEN** 市场概览区域应使用 ContentSection 替代多个 Card

### Requirement: MarketStats 组件优化

MarketStats 组件应使用更简洁的数据展示方式。

#### Scenario: 使用 ContentGrid 展示统计数据

- **WHEN** MarketStats 展示协议覆盖率和偏差分布
- **THEN** 应使用 ContentGrid 替代多个 Card

### Requirement: RealtimeComparisonView 组件优化

RealtimeComparisonView 组件应减少外层 Card 包装。

#### Scenario: 使用 ContentSection 替代 Card 包装

- **WHEN** 用户查看实时价格对比
- **THEN** 组件应使用 ContentSection 替代 Card 包装

## MODIFIED Requirements

### Requirement: 保留功能性卡片组件

以下组件应保留卡片样式，因为它们具有交互功能或需要视觉强调：

- TrendingFeedCard - 可点击、可收藏的热门交易对卡片
- AlertCard - 告警列表项，需要视觉区分
- ReliabilityScoreCard - 可靠性评分卡片，需要排名展示
- BridgeStatusCard - 数据桥状态卡片，需要交互功能

## REMOVED Requirements

### Requirement: 移除不必要的 Card 包装

**Reason**: 简单数据展示不需要 Card 包装
**Migration**: 使用 ContentSection、ContentGrid 等轻量级组件
