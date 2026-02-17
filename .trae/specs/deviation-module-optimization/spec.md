# Deviation 模块代码优化 Spec

## Why
当前 deviation 模块存在国际化不完整、性能优化空间、代码一致性问题，需要优化以提升代码质量和用户体验。

## What Changes
- 修复 `DeviationSeverityBadge` 和 `TrendDirectionBadge` 的硬编码文本，添加国际化支持
- 为图表组件添加 `useMemo` 优化，避免不必要的重新计算
- 统一 i18n 导入路径
- 修复 `AnomalyList` 的 key 使用问题
- 为 `useDeviationAnalytics` 添加请求取消机制

## Impact
- Affected specs: 无
- Affected code: 
  - `src/features/oracle/analytics/deviation/components/DeviationSeverityBadge.tsx`
  - `src/features/oracle/analytics/deviation/components/TrendDirectionBadge.tsx`
  - `src/features/oracle/analytics/deviation/components/DeviationDistributionChart.tsx`
  - `src/features/oracle/analytics/deviation/components/DeviationTrendChart.tsx`
  - `src/features/oracle/analytics/deviation/components/ProtocolPriceComparison.tsx`
  - `src/features/oracle/analytics/deviation/components/AnomalyList.tsx`
  - `src/features/oracle/analytics/deviation/hooks/useDeviationAnalytics.ts`

## ADDED Requirements

### Requirement: 国际化完善
系统 SHALL 为所有用户可见的文本提供国际化支持。

#### Scenario: Badge 文本国际化
- **WHEN** 用户查看偏差严重程度徽章或趋势方向徽章
- **THEN** 文本应显示用户所选择语言的翻译

### Requirement: 性能优化
系统 SHALL 使用 React 性能优化最佳实践避免不必要的重新渲染。

#### Scenario: 图表数据计算优化
- **WHEN** 组件重新渲染但数据未变化
- **THEN** 图表数据不应重新计算

### Requirement: 请求生命周期管理
系统 SHALL 正确管理异步请求的生命周期。

#### Scenario: 组件卸载时取消请求
- **WHEN** 组件在请求进行中卸载
- **THEN** 请求应被取消，不应更新已卸载组件的状态

### Requirement: 列表渲染最佳实践
系统 SHALL 使用稳定的唯一标识符作为列表项的 key。

#### Scenario: 异常列表渲染
- **WHEN** 渲染异常列表
- **THEN** 每个列表项应使用唯一标识符而非数组索引作为 key
