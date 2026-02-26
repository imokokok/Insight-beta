# Tasks

- [x] Task 1: 替换 console.error 为 logger.error
  - [x] SubTask 1.1: 替换 `src/app/oracle/band/page.tsx` 第 287 行的 console.error
  - [x] SubTask 1.2: 替换 `src/features/oracle/band/components/PriceTrendTab.tsx` 第 53 行的 console.error
  - [x] SubTask 1.3: 替换 `src/features/oracle/band/components/QualityAnalysisTab.tsx` 第 83 行的 console.error
  - [x] SubTask 1.4: 替换 `src/features/cross-chain/components/OracleCrossChainComparison.tsx` 第 112 行的 console.error
  - [x] SubTask 1.5: 替换 `src/features/oracle/band/components/PriceComparisonTab.tsx` 第 63 行的 console.error
  - [x] SubTask 1.6: 替换 `src/hooks/useFullscreen.ts` 第 70 和 78 行的 console.error

- [x] Task 2: 修复 eslint-disable 注释问题
  - [x] SubTask 2.1: 检查 `src/features/alerts/hooks/useAlertsPage.ts` 第 56 行的 eslint-disable，评估是否可以通过 useCallback 解决 - 已添加详细注释说明原因
  - [x] SubTask 2.2: 检查 `src/components/common/feedback/ErrorHandler.tsx` 第 282 行的 eslint-disable，评估是否可以移除 - 已有合理注释，保留

- [x] Task 3: 验证修改
  - [x] SubTask 3.1: 运行 lint 检查确保无错误
  - [x] SubTask 3.2: 运行类型检查确保无错误

# Task Dependencies

- Task 2 依赖 Task 1（可选，可并行执行）
- Task 3 依赖 Task 1 和 Task 2
