# UI 样式优化 - 第二阶段卡片样式替换规范

## Why

在第一阶段优化后，项目中仍有多个页面使用卡片样式展示数据，包括 Disputes 分析页面、协议详情页面、地址详情页面、可靠性分析页面等。继续优化这些页面可以进一步提升整体视觉一致性和用户体验。

## What Changes

- 优化 Disputes 分析页面的 InsightCard 组件，替换为 StatsBar
- 优化协议详情页面的 StatCard 网格，替换为轻量级布局
- 优化地址详情页面的 UserStatsCard，使用更简洁的样式
- 优化可靠性分析页面的 Card 使用，减少视觉负担
- 优化 Band 页面的概览 Tab 中的 Card 使用

## Impact

- Affected specs: UI 组件系统、页面布局
- Affected code:
  - `src/app/oracle/analytics/disputes/page.tsx` - Disputes 分析页面
  - `src/app/oracle/protocols/[protocol]/page.tsx` - 协议详情页面
  - `src/app/oracle/address/[address]/page.tsx` - 地址详情页面
  - `src/app/oracle/reliability/page.tsx` - 可靠性分析页面
  - `src/app/oracle/band/page.tsx` - Band 页面
  - `src/features/wallet/components/UserStatsCard.tsx` - 用户统计卡片

## ADDED Requirements

### Requirement: Disputes 页面统计区域优化

Disputes 分析页面的统计卡片应使用 StatsBar 替代 InsightCard 网格。

#### Scenario: 使用 StatsBar 展示争议统计

- **WHEN** 用户访问 Disputes 分析页面
- **THEN** 页面顶部统计区域应使用 StatsBar 展示活跃争议、待处理保证金等数据

### Requirement: 协议详情页面优化

协议详情页面应减少卡片使用，采用更简洁的数据展示方式。

#### Scenario: 使用 StatsBar 展示协议统计

- **WHEN** 用户查看协议详情页面
- **THEN** 页面顶部统计区域应使用 StatsBar 展示价格源、活跃源、延迟等数据

#### Scenario: 使用 ContentSection 组织内容

- **WHEN** 协议详情页面需要展示价格源列表和节点列表
- **THEN** 应使用 ContentSection 配合轻量级列表展示

### Requirement: 地址详情页面优化

地址详情页面的用户统计卡片应使用更简洁的样式。

#### Scenario: 使用 InlineDataDisplay 展示用户统计

- **WHEN** 用户查看地址详情页面
- **THEN** 统计区域应使用 InlineDataDisplay 或 StatsBar 展示断言数、争议数等数据

### Requirement: 可靠性分析页面优化

可靠性分析页面应减少 Card 堆叠，使用更轻量的布局。

#### Scenario: 使用 ContentSection 组织方法论说明

- **WHEN** 页面需要展示方法论说明
- **THEN** 应使用 ContentSection 替代 Card

## MODIFIED Requirements

### Requirement: Band 页面概览优化

Band 页面概览 Tab 中的 Card 应优化为更轻量的布局。

#### Scenario: 使用 ContentSection 组织协议状态

- **WHEN** 用户查看 Band 页面概览 Tab
- **THEN** 协议状态摘要应使用 ContentSection 组织

## REMOVED Requirements

### Requirement: 移除 Disputes 页面的 InsightCard 组件

**Reason**: InsightCard 是基于 Card 的自定义组件，增加了视觉负担
**Migration**: 使用 StatsBar 替代
