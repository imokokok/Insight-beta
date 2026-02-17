# Checklist

## Hooks 合并
- [x] `useAutoRefresh` hook 已合并，dashboard 版本功能已整合
- [x] `useDashboard.ts` 已更新使用统一的 hook

## 类型定义统一
- [x] 价格类型已统一到 `src/types/unifiedOracleTypes.ts`
- [x] 偏差分析类型已合并到 `src/types/analytics/deviation.ts`
- [x] 所有导入路径已更新

## 组件合并
- [x] `PriceHistoryChart` 通用组件已创建
- [x] dashboard 和 protocol 页面已更新使用通用组件
- [x] 重复的 `PriceHistoryChart` 组件已删除
- [x] `SummaryStats` 通用组件已创建
- [x] disputes 和 deviation 页面已更新使用通用组件
- [x] 重复的 `SummaryStats` 组件已删除

## 错误处理统一
- [x] `http.ts` 中的 `TimeoutError` 已删除
- [x] `lib/errors/index.ts` 中的 `withRetry` 重复实现已删除
- [x] 所有错误处理导入已更新

## 数学函数统一
- [x] `engine.ts` 已改用 `shared/utils/math.ts` 中的函数
- [x] 重复的数学计算代码已删除

## 验证
- [x] TypeScript 类型检查通过（预先存在的错误与本次修改无关）
- [x] ESLint 检查通过（只有 warnings，无 errors）
- [x] 所有测试通过
- [x] 开发服务器正常运行
