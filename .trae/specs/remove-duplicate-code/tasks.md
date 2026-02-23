# Tasks

- [x] Task 1: 统一链相关常量（CHAIN_DISPLAY_NAMES 和 CHAIN_COLORS）
  - [x] SubTask 1.1: 检查 `src/config/chains.ts` 确保导出完整
  - [x] SubTask 1.2: 更新 `src/app/oracle/band/page.tsx` 导入链常量
  - [x] SubTask 1.3: 更新 `src/features/oracle/band/components/BridgeStatusCard.tsx` 导入链常量
  - [x] SubTask 1.4: 更新 `src/features/oracle/band/components/TransferHistory.tsx` 导入链常量
  - [x] SubTask 1.5: 更新 `src/features/cross-chain/components/OracleCrossChainComparison.tsx` 导入链常量
  - [x] SubTask 1.6: 更新 `src/features/cross-chain/components/ChainStatusOverview.tsx` 导入链常量
  - [x] SubTask 1.7: 删除各文件中重复定义的链常量

- [x] Task 2: 统一延迟相关工具函数（getLatencyColor 和 getLatencyStatus）
  - [x] SubTask 2.1: 确保 `src/shared/utils/format/time.ts` 中函数完整
  - [x] SubTask 2.2: 更新 `src/features/comparison/components/types.ts` 导入（保留原函数，语义不同）
  - [x] SubTask 2.3: 更新 `src/app/oracle/pyth/page.tsx` 导入
  - [x] SubTask 2.4: 更新 `src/features/oracle/pyth/components/dashboard/PythKpiOverview.tsx` 导入
  - [x] SubTask 2.5: 更新 `src/features/oracle/band/components/DataSourcePerformanceCard.tsx` 导入
  - [x] SubTask 2.6: 删除各文件中重复定义的函数

- [x] Task 3: 统一 formatRelativeTime 函数
  - [x] SubTask 3.1: 确保 `src/shared/utils/format/date.ts` 中函数完整
  - [x] SubTask 3.2: 更新 `src/components/common/FavoritesPanel.tsx` 导入
  - [x] SubTask 3.3: 更新 `src/features/oracle/band/components/DataFreshnessCard.tsx` 导入
  - [x] SubTask 3.4: 删除各文件中重复定义的函数

- [x] Task 4: 统一 Band 模块 getStatusConfig 函数
  - [x] SubTask 4.1: 创建 `src/features/oracle/band/utils/statusConfig.ts`
  - [x] SubTask 4.2: 更新 `src/features/oracle/band/components/BridgeStatusCard.tsx` 导入
  - [x] SubTask 4.3: 更新 `src/features/oracle/band/components/TransferHistory.tsx` 导入
  - [x] SubTask 4.4: 删除各文件中重复定义的函数

- [x] Task 5: 创建通用 ExportButton 工厂函数
  - [x] SubTask 5.1: 创建 `src/components/common/ExportButtonFactory.tsx`
  - [x] SubTask 5.2: 更新 `src/features/oracle/pyth/components/export/ExportButton.tsx` 使用工厂函数
  - [x] SubTask 5.3: 更新 `src/features/oracle/chainlink/components/export/ExportButton.tsx` 使用工厂函数
  - [x] SubTask 5.4: 更新 `src/features/oracle/band/components/export/ExportButton.tsx` 使用工厂函数
  - [x] SubTask 5.5: 更新 `src/features/oracle/api3/components/export/ExportButton.tsx` 使用工厂函数
  - [x] SubTask 5.6: 更新 `src/features/oracle/analytics/disputes/components/export/ExportButton.tsx` 使用工厂函数
  - [x] SubTask 5.7: 更新 `src/features/oracle/analytics/deviation/components/export/ExportButton.tsx` 使用工厂函数

- [x] Task 6: 运行 lint 和类型检查验证修改

# Task Dependencies

- [Task 6] depends on [Task 1, Task 2, Task 3, Task 4, Task 5]
- [Task 1, Task 2, Task 3, Task 4, Task 5] 可以并行执行
