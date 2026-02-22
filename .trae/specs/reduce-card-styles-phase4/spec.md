# UI 样式优化 - 第四阶段卡片样式替换规范

## Why

经过前三个阶段的优化，项目中仍有约 100 个文件使用 Card 组件。虽然部分功能性卡片需要保留（如 ChartCard、AlertRulesList 等有交互功能的组件），但仍有很多简单数据展示场景可以使用更轻量的布局。

## What Changes

- 优化功能模块中的简单卡片展示，替换为 ContentSection
- 优化 Tab 内容区域的卡片包装
- 保留功能性卡片组件（有交互、表单、全屏等功能）

## Impact

- Affected specs: UI 组件系统、功能模块布局
- Affected code:
  - `src/features/oracle/api3/components/` - API3 功能组件
  - `src/features/oracle/chainlink/components/` - Chainlink 功能组件
  - `src/features/oracle/pyth/components/` - Pyth 功能组件
  - `src/features/oracle/band/components/` - Band 功能组件
  - `src/features/cross-chain/components/` - 跨链功能组件
  - `src/features/alerts/components/` - 告警功能组件

## ADDED Requirements

### Requirement: 功能模块卡片优化

功能模块中的简单数据展示应使用轻量级布局。

#### Scenario: API3 功能组件优化

- **WHEN** 用户查看 API3 的 Gas 成本分析、偏差分析等功能
- **THEN** 简单数据展示区域应使用 ContentSection 替代 Card

#### Scenario: Chainlink 功能组件优化

- **WHEN** 用户查看 Chainlink 的 OCR 轮次、心跳监控等功能
- **THEN** 简单数据展示区域应使用 ContentSection 替代 Card

### Requirement: 保留功能性卡片

以下卡片组件应保留，因为它们具有交互功能：

- `ChartCard` - 图表卡片（全屏、导出功能）
- `AlertRulesList` - 告警规则列表（表单交互）
- `AlertRuleForm` - 告警规则表单
- `ValidatorHealthCard` - 验证者健康卡片（刷新交互）
- `CrossChainComparisonCard` - 跨链对比卡片（链选择交互）
- `DeviationMetricsCard` - 偏差指标卡片（数据展示）

## MODIFIED Requirements

### Requirement: Tab 内容区域优化

Tab 内容区域的外层 Card 包装应替换为 ContentSection。

#### Scenario: 使用 ContentSection 组织 Tab 内容

- **WHEN** 组件使用 Tab 组织内容
- **THEN** 每个 Tab 内容应使用 ContentSection 替代 Card 包装

## REMOVED Requirements

### Requirement: 移除不必要的 Tab Card 包装

**Reason**: Tab 内容不需要额外的 Card 包装
**Migration**: 使用 ContentSection 组织
