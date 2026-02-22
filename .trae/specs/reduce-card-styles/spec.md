# UI 样式优化 - 减少卡片样式规范

## Why

当前项目中大量使用卡片（Card）组件来展示数据和内容，导致页面视觉上过于厚重、重复，缺乏层次感。通过减少卡片样式的使用，采用更多样化的展示形式，可以让页面更加美观、现代、有呼吸感。

## What Changes

- 减少独立卡片的使用，推广使用统计条（StatsBar）、统一面板（UnifiedStatsPanel）等替代方案
- 使用内容分组（ContentSection/ContentGrid）替代卡片网格布局
- 引入轻量级的数据展示组件（InlineDataDisplay、TableSection）
- 优化页面布局，增加视觉层次感
- 保留必要的卡片用于需要强调或交互的内容

## Impact

- Affected specs: UI 组件系统、页面布局
- Affected code:
  - `src/components/ui/Card.tsx` - 基础卡片组件（保留但减少使用）
  - `src/components/common/StatCard/` - 统计卡片组件
  - `src/components/common/StatsBar.tsx` - 统计条组件
  - `src/components/common/ContentGroup.tsx` - 内容分组组件
  - `src/app/oracle/*/page.tsx` - 各预言机页面
  - `src/app/alerts/page.tsx` - 告警页面

## ADDED Requirements

### Requirement: 轻量级数据展示组件

系统应提供轻量级的数据展示组件，减少对卡片的依赖。

#### Scenario: 使用 InlineDataDisplay 组件展示统计数据

- **WHEN** 页面需要展示多个统计数据项
- **THEN** 应使用 InlineDataDisplay 或 StatsBar 替代多个独立卡片

#### Scenario: 使用 TableSection 组件展示列表数据

- **WHEN** 页面需要展示列表或表格数据
- **THEN** 应使用 TableSection 或 ContentSection 替代卡片网格

### Requirement: 统计面板整合

系统应提供整合式的统计面板，将多个数据项合并展示。

#### Scenario: 使用 UnifiedStatsPanel 展示概览统计

- **WHEN** 页面顶部需要展示概览统计数据
- **THEN** 应使用 UnifiedStatsPanel 或 StatsBar 替代多个 StatCard

#### Scenario: 使用 ContentSection 组织内容区块

- **WHEN** 页面需要组织多个内容区块
- **THEN** 应使用 ContentSection 配合 ContentGrid 替代多个 Card

### Requirement: 卡片使用场景限制

卡片组件应仅用于特定场景，减少滥用。

#### Scenario: 保留卡片用于交互式内容

- **WHEN** 内容需要用户交互（如点击展开、悬停效果）
- **THEN** 可以使用 CardEnhanced 或 InteractiveStatCard

#### Scenario: 保留卡片用于强调内容

- **WHEN** 内容需要视觉强调或独立展示
- **THEN** 可以使用 Card 组件

#### Scenario: 禁止使用卡片网格展示简单数据

- **WHEN** 仅展示简单的键值对数据
- **THEN** 不应使用卡片网格，应使用 StatsBar 或 UnifiedStatsPanel

## MODIFIED Requirements

### Requirement: 页面布局优化

页面应采用更多样化的布局方式，减少卡片堆叠。

#### Scenario: 概览页面布局

- **WHEN** 用户访问预言机概览页面
- **THEN** 页面应使用以下布局结构：
  - 顶部：StatsBar 或 UnifiedStatsPanel 展示关键指标
  - 中部：ContentSection 组织图表和详细数据
  - 底部：TableSection 或列表展示明细数据

#### Scenario: 详情页面布局

- **WHEN** 用户查看具体数据详情
- **THEN** 应使用 ContentSection 配合分隔线，而非独立卡片

## REMOVED Requirements

### Requirement: 移除过度使用的卡片网格

**Reason**: 卡片网格导致页面视觉重复、厚重
**Migration**: 使用 StatsBar、UnifiedStatsPanel、ContentSection 等替代

### Requirement: 移除简单数据的卡片包装

**Reason**: 简单数据不需要卡片包装，增加视觉负担
**Migration**: 使用内联样式或轻量级组件展示
