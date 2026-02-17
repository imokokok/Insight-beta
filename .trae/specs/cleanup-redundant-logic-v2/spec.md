# 清理项目冗余逻辑 V2 Spec

## Why
项目中仍存在多处重复的代码、类型定义、组件和工具函数，这些冗余增加了维护成本、代码体积和潜在的不一致性风险。需要进一步清理以提高代码质量和可维护性。

## What Changes
- 合并重复的 Hooks (`useAutoRefresh`)
- 统一重复的类型定义（价格类型、协议类型、UMA类型）
- 合并重复的组件 (`PriceHistoryChart`, `SummaryStats`)
- 统一重复的工具函数（重试逻辑、错误处理类、数学计算）
- 合并重复的常量定义（偏差阈值、协议颜色）
- 简化服务层架构
- 清理未使用的模块和过长的导出链

## Impact
- Affected specs: 无影响（这些是代码重构，不改变功能）
- Affected code:
  - `src/hooks/useAutoRefresh.ts` - 合并目标
  - `src/features/dashboard/hooks/useDashboard.ts` - 需更新导入
  - `src/types/price.ts`, `src/types/unifiedOracleTypes.ts` - 类型统一
  - `src/features/oracle/analytics/*/types/` - 类型整合
  - `src/features/dashboard/components/PriceHistoryChart.tsx` - 合并目标
  - `src/features/protocol/components/PriceHistoryChart.tsx` - 待删除
  - `src/features/oracle/analytics/*/components/SummaryStats.tsx` - 待合并
  - `src/lib/errors/`, `src/shared/utils/resilience.ts` - 错误处理统一
  - `src/shared/utils/math.ts` - 数学函数统一
  - `src/services/oracle/priceAggregation/` - 服务层重构

## ADDED Requirements

### Requirement: 合并重复的 useAutoRefresh Hook
系统 SHALL 将两个 `useAutoRefresh` hook 合并为一个统一的实现。

#### Scenario: 合并 dashboard 中的 useAutoRefresh
- **WHEN** `src/features/dashboard/hooks/useDashboard.ts` 中定义了独立的 `useAutoRefresh`
- **THEN** 删除该定义，改为从 `src/hooks/useAutoRefresh.ts` 导入并扩展

### Requirement: 统一价格相关类型定义
系统 SHALL 将分散的价格类型定义统一到单一位置。

#### Scenario: 统一 PriceData 和 UnifiedPriceFeed
- **WHEN** 存在多个相似的价格类型定义
- **THEN** 保留 `src/types/unifiedOracleTypes.ts` 作为单一来源，其他文件通过 re-export 导出

#### Scenario: 统一偏差分析类型
- **WHEN** `deviation.ts` 和 `analytics/deviation.ts` 存在重复类型
- **THEN** 合并到 `src/types/analytics/deviation.ts`

### Requirement: 合并重复的 PriceHistoryChart 组件
系统 SHALL 将两个 `PriceHistoryChart` 组件合并为通用组件。

#### Scenario: 创建通用价格历史图表组件
- **WHEN** dashboard 和 protocol 都有独立的 `PriceHistoryChart`
- **THEN** 创建 `src/components/charts/PriceHistoryChart.tsx` 通用组件，支持多协议和单资产两种模式

### Requirement: 统一错误处理类层次
系统 SHALL 建立统一的错误类层次结构。

#### Scenario: 删除重复的 TimeoutError
- **WHEN** `http.ts` 和 `AppError.ts` 都定义了 `TimeoutError`
- **THEN** 删除 `http.ts` 中的定义，统一使用 `AppError.ts` 中的版本

#### Scenario: 统一重试逻辑
- **WHEN** `lib/errors/index.ts` 和 `shared/utils/resilience.ts` 都有重试逻辑
- **THEN** 保留 `shared/utils/resilience.ts` 中的实现，删除重复代码

### Requirement: 统一数学计算函数
系统 SHALL 将数学计算函数集中到 `shared/utils/math.ts`。

#### Scenario: 删除 engine.ts 中的重复数学函数
- **WHEN** `priceAggregation/engine.ts` 重新实现了中位数和平均值计算
- **THEN** 改为调用 `shared/utils/math.ts` 中的函数

### Requirement: 合并重复的 SummaryStats 组件
系统 SHALL 将两个 `SummaryStats` 组件合并为通用组件。

#### Scenario: 创建通用统计摘要组件
- **WHEN** disputes 和 deviation 都有独立的 `SummaryStats`
- **THEN** 创建 `src/components/common/SummaryStats.tsx` 通用组件，通过 props 配置

## MODIFIED Requirements
无

## REMOVED Requirements
无
