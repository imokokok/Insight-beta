# Checklist

## 空模块清理
- [x] `src/features/common/index.ts` 空模块文件已删除

## 已弃用重导出文件清理
- [x] `src/lib/api/openapi.ts` 已删除，相关导入已更新到 `@/lib/api/openapi/index`
- [x] `src/shared/utils/format.ts` 已删除，相关导入已更新到 `@/shared/utils/format/index`
- [x] `src/types/oracle/chain.ts` 已删除，相关导入已更新到 `@/types/chains`

## 未使用类型定义清理
- [x] `src/features/oracle/analytics/anomalies/types/anomalies.ts` 已删除
- [x] `src/features/oracle/monitoring/types/monitoring.ts` 已删除
- [x] `src/features/oracle/services/types/serviceTypes.ts` 已删除

## 未使用组件清理
- [x] `src/features/assertion/components/CommonParamsInputs.tsx` 已删除
- [x] `src/features/assertion/components/EventParamsInputs.tsx` 已删除
- [x] `src/features/assertion/components/index.ts` 导出已更新

## 验证
- [x] TypeScript 类型检查通过 (`npm run typecheck` 或 `tsc --noEmit`)
- [x] ESLint 检查通过 (`npm run lint`)
- [x] 所有测试通过 (`npm run test`)
- [x] 开发服务器正常启动 (`npm run dev`)
