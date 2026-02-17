# Tasks

- [x] Task 1: 合并重复的 useAutoRefresh Hook
  - [x] SubTask 1.1: 分析两个 useAutoRefresh 的差异
  - [x] SubTask 1.2: 将 dashboard 中的倒计时功能添加到主 useAutoRefresh
  - [x] SubTask 1.3: 更新 useDashboard.ts 使用统一的 hook
  - [x] SubTask 1.4: 删除 useDashboard.ts 中的重复定义

- [x] Task 2: 统一价格相关类型定义
  - [x] SubTask 2.1: 检查 PriceData 和 UnifiedPriceFeed 的使用情况
  - [x] SubTask 2.2: 统一到 src/types/unifiedOracleTypes.ts
  - [x] SubTask 2.3: 更新所有导入路径
  - [x] SubTask 2.4: 合并 deviation.ts 和 analytics/deviation.ts 类型

- [x] Task 3: 合并重复的 PriceHistoryChart 组件
  - [x] SubTask 3.1: 分析两个组件的差异和共同点
  - [x] SubTask 3.2: 创建通用组件 src/components/charts/PriceHistoryChart.tsx
  - [x] SubTask 3.3: 更新 dashboard 和 protocol 的导入
  - [x] SubTask 3.4: 删除重复的组件文件

- [x] Task 4: 统一错误处理类层次
  - [x] SubTask 4.1: 删除 http.ts 中的 TimeoutError，使用 AppError.ts 版本
  - [x] SubTask 4.2: 删除 lib/errors/index.ts 中的 withRetry 重复实现
  - [x] SubTask 4.3: 更新所有相关导入

- [x] Task 5: 统一数学计算函数
  - [x] SubTask 5.1: 检查 engine.ts 中的 calculatePriceStats 实现
  - [x] SubTask 5.2: 改为调用 shared/utils/math.ts 中的函数
  - [x] SubTask 5.3: 删除 engine.ts 中的重复实现

- [x] Task 6: 合并重复的 SummaryStats 组件
  - [x] SubTask 6.1: 分析两个 SummaryStats 组件的差异
  - [x] SubTask 6.2: 创建通用组件 src/components/common/SummaryStats.tsx
  - [x] SubTask 6.3: 更新 disputes 和 deviation 的导入
  - [x] SubTask 6.4: 删除重复的组件文件

- [x] Task 7: 验证构建和测试
  - [x] SubTask 7.1: 运行 TypeScript 类型检查
  - [x] SubTask 7.2: 运行 ESLint 检查
  - [x] SubTask 7.3: 运行所有测试
  - [x] SubTask 7.4: 验证开发服务器正常运行

# Task Dependencies
- [Task 4] depends on [Task 2] (类型统一后再处理错误类)
- [Task 6] depends on [Task 2] (类型统一后再合并组件)
- [Task 7] depends on [Task 1, Task 2, Task 3, Task 4, Task 5, Task 6]
