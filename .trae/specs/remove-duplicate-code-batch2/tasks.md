# Tasks

- [x] Task 1: 统一符号和链相关常量
  - [x] SubTask 1.1: 检查 `src/config/constants.ts` 确保导出完整的符号和链常量
  - [x] SubTask 1.2: 更新 `src/features/cross-chain/components/CrossChainComparison.tsx` 使用统一常量
  - [x] SubTask 1.3: 更新 `src/features/cross-chain/components/CrossChainOverview.tsx` 使用统一常量
  - [x] SubTask 1.4: 更新 `src/features/cross-chain/components/CrossChainHistory.tsx` 使用统一常量
  - [x] SubTask 1.5: 更新 `src/features/oracle/band/components/QualityAnalysisTab.tsx` 使用统一常量
  - [x] SubTask 1.6: 更新 `src/features/oracle/band/components/PriceTrendTab.tsx` 使用统一常量
  - [x] SubTask 1.7: 更新 API 路由文件使用统一常量
  - [x] SubTask 1.8: 删除各文件中重复定义的常量

- [x] Task 2: 统一 getDeviationColor 函数
  - [x] SubTask 2.1: 确保 `src/shared/utils/format/percentage.ts` 中函数完整
  - [x] SubTask 2.2: 更新 `src/features/oracle/analytics/deviation/components/TrendList.tsx` 导入
  - [x] SubTask 2.3: 更新 `src/features/oracle/analytics/deviation/components/AnomalyList.tsx` 导入
  - [x] SubTask 2.4: 更新 `src/features/oracle/analytics/deviation/components/charts/DeviationHeatmap.tsx` 导入
  - [x] SubTask 2.5: 更新 `src/features/oracle/analytics/deviation/components/DeviationTrendChart.tsx` 导入
  - [x] SubTask 2.6: 更新 `src/features/comparison/components/types.ts` 导入
  - [x] SubTask 2.7: 删除各文件中重复定义的函数

- [x] Task 3: 统一 formatDuration 函数
  - [x] SubTask 3.1: 确保 `src/shared/utils/format/time.ts` 中函数完整
  - [x] SubTask 3.2: 更新 `src/features/oracle/chainlink/components/HeartbeatMonitor.tsx` 导入
  - [x] SubTask 3.3: 更新 `src/features/alerts/components/ResponseTimeStats.tsx` 导入
  - [x] SubTask 3.4: 删除各文件中重复定义的函数

- [x] Task 4: 统一 formatNumber 函数
  - [x] SubTask 4.1: 确保 `src/shared/utils/format/number.ts` 中函数完整
  - [x] SubTask 4.2: 更新 `src/i18n/utils.ts` 使用统一函数
  - [x] SubTask 4.3: 更新 `src/features/oracle/analytics/disputes/components/tvl/TVLOverviewCard.tsx` 导入
  - [x] SubTask 4.4: 删除各文件中重复定义的函数

- [x] Task 5: 统一类型定义
  - [x] SubTask 5.1: 创建 `src/types/common/overview.ts` 定义 OverviewStats 类型
  - [x] SubTask 5.2: 创建 `src/types/common/breadcrumb.ts` 定义 BreadcrumbItem 类型
  - [x] SubTask 5.3: 更新 `src/app/oracle/pyth/page.tsx` 使用统一类型
  - [x] SubTask 5.4: 更新 `src/app/oracle/chainlink/page.tsx` 使用统一类型
  - [x] SubTask 5.5: 更新 `src/app/oracle/api3/page.tsx` 使用统一类型
  - [x] SubTask 5.6: 更新 `src/features/alerts/components/AlertActionButtons.tsx` 使用统一类型
  - [x] SubTask 5.7: 更新 `src/features/alerts/components/AlertBatchActions.tsx` 使用统一类型
  - [x] SubTask 5.8: 更新 `src/components/common/Breadcrumb.tsx` 使用统一类型
  - [x] SubTask 5.9: 更新 `src/components/common/PageHeader.tsx` 使用统一类型
  - [x] SubTask 5.10: 更新所有使用 HealthStatus 的文件使用统一类型
  - [x] SubTask 5.11: 删除各文件中重复定义的类型

- [x] Task 6: 统一颜色配置
  - [x] SubTask 6.1: 确保 `src/lib/design-system/tokens/colors.ts` 导出完整的颜色配置
  - [x] SubTask 6.2: 更新 `src/components/common/StatsBar.tsx` 使用统一颜色配置
  - [x] SubTask 6.3: 更新 `src/components/common/InlineDataDisplay.tsx` 使用统一颜色配置
  - [x] SubTask 6.4: 更新 `src/components/common/CompactList.tsx` 使用统一颜色配置
  - [x] SubTask 6.5: 更新 `src/components/ui/Card.tsx` 使用统一颜色配置
  - [x] SubTask 6.6: 更新 `src/app/oracle/protocols/[protocol]/page.tsx` 使用统一颜色配置
  - [x] SubTask 6.7: 更新 `src/features/oracle/chainlink/components/dashboard/StatusIndicator.tsx` 使用统一颜色配置
  - [x] SubTask 6.8: 删除各文件中重复定义的颜色配置

- [x] Task 7: 统一动画配置
  - [x] SubTask 7.1: 确保 `src/lib/design-system/tokens/animation.ts` 导出完整的动画配置
  - [x] SubTask 7.2: 更新 `src/components/common/Breadcrumb.tsx` 使用统一动画配置
  - [x] SubTask 7.3: 更新 `src/components/common/EmptyState.tsx` 使用统一动画配置
  - [x] SubTask 7.4: 更新 `src/components/ui/Skeleton.tsx` 使用统一动画配置
  - [x] SubTask 7.5: 删除各文件中重复定义的动画配置

- [x] Task 8: 统一时间范围配置
  - [x] SubTask 8.1: 在 `src/config/constants.ts` 添加统一的 TIME_RANGES 常量
  - [x] SubTask 8.2: 更新 `src/features/comparison/components/ComparisonControls.tsx` 使用统一配置
  - [x] SubTask 8.3: 更新 `src/features/alerts/components/AlertTrendChart.tsx` 使用统一配置
  - [x] SubTask 8.4: 更新 `src/features/oracle/api3/components/Api3PriceChart.tsx` 使用统一配置
  - [x] SubTask 8.5: 删除各文件中重复定义的时间范围配置

- [x] Task 9: 运行 lint 和类型检查验证修改

# Task Dependencies

- [Task 9] depends on [Task 1, Task 2, Task 3, Task 4, Task 5, Task 6, Task 7, Task 8]
- [Task 1, Task 2, Task 3, Task 4, Task 5, Task 6, Task 7, Task 8] 可以并行执行
