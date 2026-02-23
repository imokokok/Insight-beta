# Tasks

## 高优先级任务

- [x] Task 1: 统一API响应格式
  - [x] SubTask 1.1: 将 `src/app/api/alerts/history/route.ts` 改为使用 `ok()/error()` 辅助函数
  - [x] SubTask 1.2: 将 `src/app/api/comparison/[symbol]/history/route.ts` 改为使用 `ok()/error()` 辅助函数
  - [x] SubTask 1.3: 将 `src/app/api/oracle/history/prices/route.ts` 改为使用 `ok()/error()` 辅助函数
  - [x] SubTask 1.4: 将 `src/app/api/oracle/reliability/calculate/route.ts` 改为使用 `ok()/error()` 辅助函数
  - [x] SubTask 1.5: 检查并更新其他使用 `NextResponse.json()` 的API路由

- [x] Task 2: 删除组件内重复的 formatPrice 函数定义
  - [x] SubTask 2.1: 删除 `src/features/comparison/components/RealtimeComparison.tsx` 中的 formatPrice 定义
  - [x] SubTask 2.2: 删除 `src/features/oracle/api3/components/DapiList.tsx` 中的 formatPrice 定义
  - [x] SubTask 2.3: 删除 `src/features/oracle/api3/components/PriceComparisonChart.tsx` 中的 formatPrice 定义
  - [x] SubTask 2.4: 删除 `src/features/oracle/api3/components/Api3PriceChart.tsx` 中的 formatPrice 定义
  - [x] SubTask 2.5: 删除 `src/features/oracle/api3/components/CrossChainPriceChart.tsx` 中的 formatPrice 定义
  - [x] SubTask 2.6: 删除 `src/features/oracle/band/components/AggregationValidationCard.tsx` 中的 formatPrice 定义
  - [x] SubTask 2.7: 删除 `src/features/oracle/pyth/components/PriceHistoryChart.tsx` 中的 formatPrice 定义
  - [x] SubTask 2.8: 删除 `src/features/oracle/pyth/components/PriceUpdateStats.tsx` 中的 formatPrice 定义
  - [x] SubTask 2.9: 删除 `src/features/oracle/chainlink/components/FeedDetail.tsx` 中的 formatPrice 定义

- [x] Task 3: 删除组件内重复的 formatLatency 函数定义
  - [x] SubTask 3.1: 删除 `src/features/comparison/components/LatencyAnalysis.tsx` 中的 formatLatency 定义
  - [x] SubTask 3.2: 删除 `src/features/oracle/api3/components/CrossProtocolComparison.tsx` 中的 formatLatency 定义
  - [x] SubTask 3.3: 删除 `src/features/oracle/band/components/DataSourcePerformanceCard.tsx` 中的 formatLatency 定义
  - [x] SubTask 3.4: 删除 `src/app/oracle/pyth/page.tsx` 中的 formatLatency 定义
  - [x] SubTask 3.5: 删除 `src/features/oracle/pyth/components/dashboard/PythKpiOverview.tsx` 中的 formatLatency 定义

- [x] Task 4: 合并重复的 DashboardStats 类型定义
  - [x] SubTask 4.1: 检查 `src/features/dashboard/types/index.ts` 和 `src/features/oracle/dashboard/types/dashboard.ts` 中的 DashboardStats 定义
  - [x] SubTask 4.2: 合并类型定义，保留一个版本
  - [x] SubTask 4.3: 更新所有引用这些类型的文件

## 中优先级任务

- [x] Task 5: 创建集中的 Mock 数据服务
  - [x] SubTask 5.1: 创建 `src/lib/mock/oracleMockData.ts` 文件
  - [x] SubTask 5.2: 迁移 `src/app/api/oracle/chainlink/stats/route.ts` 中的 `getMockStats()` 函数
  - [x] SubTask 5.3: 迁移 `src/app/api/oracle/pyth/stats/route.ts` 中的 `getMockStats()` 函数
  - [x] SubTask 5.4: 迁移 `src/app/api/oracle/chainlink/feeds/route.ts` 中的 `getMockFeeds()` 函数
  - [x] SubTask 5.5: 迁移 `src/app/api/oracle/chainlink/overview/route.ts` 中的 `getMockOverview()` 函数
  - [x] SubTask 5.6: 迁移 `src/app/api/oracle/chainlink/operators/route.ts` 中的 `getMockOperators()` 函数
  - [x] SubTask 5.7: 迁移 `src/app/api/oracle/pyth/publishers/route.ts` 中的 `getMockPublishers()` 函数
  - [x] SubTask 5.8: 迁移 `src/app/api/oracle/pyth/hermes/route.ts` 中的 `getMockHermesServices()` 函数
  - [x] SubTask 5.9: 更新所有路由文件使用集中的 Mock 服务

- [x] Task 6: 简化工具函数导出链
  - [x] SubTask 6.1: 删除 `src/features/cross-chain/utils/format.ts` 中的重新导出
  - [x] SubTask 6.2: 简化 `src/features/oracle/chainlink/components/dashboard/formatters.ts`
  - [x] SubTask 6.3: 更新相关导入路径

- [x] Task 7: 合并 Alerts 相关 Hooks
  - [x] SubTask 7.1: 分析 `useAlerts` 和 `useAlertsData` 的功能差异
  - [x] SubTask 7.2: 统一使用 SWR 方案
  - [x] SubTask 7.3: 删除或重构冗余的 Hook

## 低优先级任务

- [x] Task 8: 统一 Stats 类型体系
  - [x] SubTask 8.1: 创建基础 Stats 类型
  - [x] SubTask 8.2: 重构各协议特定类型继承基础类型

- [x] Task 9: 检测并删除未使用的导出
  - [x] SubTask 9.1: 使用 TypeScript 编译器检测未使用的导出
  - [x] SubTask 9.2: 删除确认未使用的类型和函数

# Task Dependencies

- [Task 5] 可以并行执行
- [Task 6] 可以并行执行
- [Task 7] 可以并行执行
- [Task 2] 和 [Task 3] 可以并行执行
- [Task 4] 需要在 [Task 8] 之前完成
- [Task 8] 和 [Task 9] 可以并行执行
