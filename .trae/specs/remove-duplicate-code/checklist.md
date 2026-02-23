# 删除重复无用代码检查清单

## API响应格式统一

- [x] `src/app/api/alerts/history/route.ts` 使用 `ok()/error()` 辅助函数
- [x] `src/app/api/comparison/[symbol]/history/route.ts` 使用 `ok()/error()` 辅助函数
- [x] `src/app/api/oracle/history/prices/route.ts` 使用 `ok()/error()` 辅助函数
- [x] `src/app/api/oracle/reliability/calculate/route.ts` 使用 `ok()/error()` 辅助函数
- [x] 所有API路由响应格式一致

## 工具函数去重

### formatPrice 函数

- [x] `src/features/comparison/components/RealtimeComparison.tsx` 从共享位置导入 formatPrice
- [x] `src/features/oracle/api3/components/DapiList.tsx` 从共享位置导入 formatPrice
- [x] `src/features/oracle/api3/components/PriceComparisonChart.tsx` 从共享位置导入 formatPrice
- [x] `src/features/oracle/api3/components/Api3PriceChart.tsx` 从共享位置导入 formatPrice
- [x] `src/features/oracle/api3/components/CrossChainPriceChart.tsx` 从共享位置导入 formatPrice
- [x] `src/features/oracle/band/components/AggregationValidationCard.tsx` 从共享位置导入 formatPrice
- [x] `src/features/oracle/pyth/components/PriceHistoryChart.tsx` 从共享位置导入 formatPrice
- [x] `src/features/oracle/pyth/components/PriceUpdateStats.tsx` 从共享位置导入 formatPrice
- [x] `src/features/oracle/chainlink/components/FeedDetail.tsx` 从共享位置导入 formatPrice

### formatLatency 函数

- [x] `src/features/comparison/components/LatencyAnalysis.tsx` 从共享位置导入 formatLatency
- [x] `src/features/oracle/api3/components/CrossProtocolComparison.tsx` 从共享位置导入 formatLatency
- [x] `src/features/oracle/band/components/DataSourcePerformanceCard.tsx` 从共享位置导入 formatLatency
- [x] `src/app/oracle/pyth/page.tsx` 从共享位置导入 formatLatency
- [x] `src/features/oracle/pyth/components/dashboard/PythKpiOverview.tsx` 从共享位置导入 formatLatency

## 类型定义去重

- [x] DashboardStats 类型只在一个文件中定义
- [x] 所有引用 DashboardStats 的文件使用正确的导入路径
- [ ] Stats 类型体系使用继承或组合扩展（低优先级，未执行）

## Mock数据管理

- [x] 创建集中的 Mock 数据服务文件 `src/lib/mock/oracleMockData.ts`
- [x] 所有 Mock 函数从集中服务导入
- [x] 删除各路由文件中的重复 Mock 函数定义

## 工具函数导出链简化

- [x] 删除 `src/features/cross-chain/utils/format.ts` 中的重新导出
- [x] 删除 `src/features/oracle/chainlink/components/dashboard/formatters.ts`（未使用的文件）
- [x] 所有组件直接从 `@/shared/utils/format` 导入

## Hooks合并

- [x] Alerts hooks 使用统一的数据获取方式
- [x] 删除冗余的 Hook 实现（useAlertsData 已删除）

## 验证

- [x] TypeScript 编译无错误
- [ ] 所有测试通过（需要运行测试验证）
- [ ] 应用正常运行（需要手动验证）
