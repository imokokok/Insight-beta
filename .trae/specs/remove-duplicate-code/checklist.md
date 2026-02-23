# Checklist

## 链常量统一

- [x] `src/app/oracle/band/page.tsx` 使用 `@/config/chains` 导入链常量
- [x] `src/features/oracle/band/components/BridgeStatusCard.tsx` 使用 `@/config/chains` 导入链常量
- [x] `src/features/oracle/band/components/TransferHistory.tsx` 使用 `@/config/chains` 导入链常量
- [x] `src/features/cross-chain/components/OracleCrossChainComparison.tsx` 使用 `@/config/chains` 导入链常量
- [x] `src/features/cross-chain/components/ChainStatusOverview.tsx` 使用 `@/config/chains` 导入链常量

## 延迟函数统一

- [x] `src/features/comparison/components/types.ts` 保留原函数（语义不同）
- [x] `src/features/oracle/pyth/components/dashboard/PythKpiOverview.tsx` 使用 `@/shared/utils/format/time` 导入延迟函数
- [x] `src/features/oracle/band/components/DataSourcePerformanceCard.tsx` 使用 `@/shared/utils/format/time` 导入延迟函数

## 时间格式化函数统一

- [x] `src/shared/utils/format/date.ts` 添加 formatRelativeTime 函数
- [x] `src/components/common/FavoritesPanel.tsx` 使用 `@/shared/utils/format/date` 导入 formatRelativeTime
- [x] `src/features/oracle/band/components/DataFreshnessCard.tsx` 使用 `@/shared/utils/format/date` 导入 formatRelativeTime

## Band 模块状态配置统一

- [x] `src/features/oracle/band/utils/statusConfig.ts` 创建并导出 getStatusConfig 函数
- [x] `src/features/oracle/band/components/BridgeStatusCard.tsx` 使用统一的状态配置
- [x] `src/features/oracle/band/components/TransferHistory.tsx` 使用统一的状态配置

## ExportButton 工厂函数

- [x] `src/components/common/ExportButtonFactory.tsx` 创建工厂函数
- [x] 所有 ExportButton 组件使用工厂函数创建

## 验证

- [x] 运行 `npm run lint` 无错误（只有 import order 警告）
- [x] 运行 `npm run typecheck` 无错误
- [x] 开发服务器正常运行
