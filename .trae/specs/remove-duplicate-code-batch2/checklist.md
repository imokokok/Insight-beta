# Checklist

## 符号和链常量统一

- [x] `src/config/constants.ts` 导出完整的符号和链常量
- [x] `src/features/cross-chain/components/CrossChainComparison.tsx` 使用统一常量
- [x] `src/features/cross-chain/components/CrossChainOverview.tsx` 使用统一常量
- [x] `src/features/cross-chain/components/CrossChainHistory.tsx` 使用统一常量
- [x] `src/features/oracle/band/components/QualityAnalysisTab.tsx` 使用统一常量
- [x] `src/features/oracle/band/components/PriceTrendTab.tsx` 使用统一常量
- [x] API 路由文件使用统一常量

## getDeviationColor 函数统一

- [x] `src/shared/utils/format/percentage.ts` 导出 getDeviationColor 函数
- [x] `src/features/oracle/analytics/deviation/components/TrendList.tsx` 使用统一函数
- [x] `src/features/oracle/analytics/deviation/components/AnomalyList.tsx` 使用统一函数
- [x] `src/features/oracle/analytics/deviation/components/charts/DeviationHeatmap.tsx` 使用统一函数
- [x] `src/features/oracle/analytics/deviation/components/DeviationTrendChart.tsx` 使用统一函数
- [x] `src/features/comparison/components/types.ts` 使用统一函数

## formatDuration 函数统一

- [x] `src/shared/utils/format/time.ts` 导出 formatDuration 函数
- [x] `src/features/oracle/chainlink/components/HeartbeatMonitor.tsx` 使用统一函数
- [x] `src/features/alerts/components/ResponseTimeStats.tsx` 使用统一函数

## formatNumber 函数统一

- [x] `src/shared/utils/format/number.ts` 导出 formatNumber 函数
- [x] `src/i18n/utils.ts` 使用统一函数
- [x] `src/features/oracle/analytics/disputes/components/tvl/TVLOverviewCard.tsx` 使用统一函数

## 类型定义统一

- [x] `src/types/common/overview.ts` 创建 OverviewStats 类型
- [x] `src/types/common/breadcrumb.ts` 创建 BreadcrumbItem 类型
- [x] `src/types/common/status.ts` 导出 HealthStatus 类型
- [x] `src/app/oracle/pyth/page.tsx` 使用统一类型
- [x] `src/app/oracle/chainlink/page.tsx` 使用统一类型
- [x] `src/app/oracle/api3/page.tsx` 使用统一类型
- [x] `src/features/alerts/components/AlertActionButtons.tsx` 使用统一类型
- [x] `src/features/alerts/components/AlertBatchActions.tsx` 使用统一类型
- [x] `src/components/common/Breadcrumb.tsx` 使用统一类型
- [x] `src/components/common/PageHeader.tsx` 使用统一类型

## 颜色配置统一

- [x] `src/lib/design-system/tokens/colors.ts` 导出完整的颜色配置
- [x] `src/components/common/StatsBar.tsx` 使用统一颜色配置
- [x] `src/components/common/InlineDataDisplay.tsx` 使用统一颜色配置
- [x] `src/components/common/CompactList.tsx` 使用统一颜色配置
- [x] `src/components/ui/Card.tsx` 使用统一颜色配置
- [x] `src/app/oracle/protocols/[protocol]/page.tsx` 使用统一颜色配置
- [x] `src/features/oracle/chainlink/components/dashboard/StatusIndicator.tsx` 使用统一颜色配置

## 动画配置统一

- [x] `src/lib/design-system/tokens/animation.ts` 导出完整的动画配置
- [x] `src/components/common/Breadcrumb.tsx` 使用统一动画配置
- [x] `src/components/common/EmptyState.tsx` 使用统一动画配置
- [x] `src/components/ui/Skeleton.tsx` 使用统一动画配置

## 时间范围配置统一

- [x] `src/config/constants.ts` 导出 TIME_RANGES 常量
- [x] `src/features/comparison/components/ComparisonControls.tsx` 使用统一配置
- [x] `src/features/alerts/components/AlertTrendChart.tsx` 使用统一配置
- [x] `src/features/oracle/api3/components/Api3PriceChart.tsx` 使用统一配置

## 验证

- [x] 运行 `npm run lint` 无错误
- [x] 运行 `npm run typecheck` 无错误
- [x] 开发服务器正常运行
