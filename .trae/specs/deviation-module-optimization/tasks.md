# Tasks

## 阶段一：国际化完善

- [x] Task 1: 修复 DeviationSeverityBadge 国际化
  - [x] SubTask 1.1: 添加 useI18n hook 导入
  - [x] SubTask 1.2: 将硬编码的 'Low', 'Medium', 'High', 'Critical' 替换为翻译键

- [x] Task 2: 修复 TrendDirectionBadge 国际化
  - [x] SubTask 2.1: 添加 useI18n hook 导入
  - [x] SubTask 2.2: 将硬编码的 'Increasing', 'Decreasing', 'Stable' 替换为翻译键

## 阶段二：性能优化

- [x] Task 3: 优化 DeviationDistributionChart
  - [x] SubTask 3.1: 使用 useMemo 缓存 data 计算结果
  - [x] SubTask 3.2: 添加适当的依赖数组

- [x] Task 4: 优化 DeviationTrendChart
  - [x] SubTask 4.1: 使用 useMemo 缓存 data 计算结果
  - [x] SubTask 4.2: 添加适当的依赖数组

- [x] Task 5: 优化 ProtocolPriceComparison
  - [x] SubTask 5.1: 使用 useMemo 缓存 prices 计算结果
  - [x] SubTask 5.2: 使用 useMemo 缓存 maxPrice 和 minPrice 计算

## 阶段三：代码质量改进

- [x] Task 6: 修复 AnomalyList key 问题
  - [x] SubTask 6.1: 分析 PriceDeviationPoint 类型，确定可用作唯一标识符的字段
  - [x] SubTask 6.2: 使用唯一标识符替代 index 作为 key

- [x] Task 7: 添加请求取消机制
  - [x] SubTask 7.1: 在 useDeviationAnalytics 中添加 AbortController
  - [x] SubTask 7.2: 在 fetchSymbolTrend 中实现请求取消
  - [x] SubTask 7.3: 在 useEffect cleanup 中取消进行中的请求

- [x] Task 8: 统一 i18n 导入路径
  - [x] SubTask 8.1: 检查所有使用 i18n 的文件
  - [x] SubTask 8.2: 统一使用 `@/i18n` 或 `@/i18n/LanguageProvider`

## 阶段四：验证

- [x] Task 9: 验证优化效果
  - [x] SubTask 9.1: 运行 TypeScript 类型检查
  - [x] SubTask 9.2: 运行 ESLint 检查
  - [x] SubTask 9.3: 验证构建成功
  - [x] SubTask 9.4: 手动测试页面功能正常

# Task Dependencies
- [Task 2] depends on [Task 1] (国际化任务可并行)
- [Task 3, 4, 5] 可并行执行 (性能优化任务独立)
- [Task 6, 7, 8] 可并行执行 (代码质量任务独立)
- [Task 9] depends on [Task 1-8] (验证在所有优化后)
