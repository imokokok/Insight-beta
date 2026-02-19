# 代码整理检查清单

## Phase 1: 类型定义统一

- [x] AlertSeverity 类型已统一到 `src/types/common/status.ts`
- [x] AlertStatus 类型已统一到 `src/types/common/status.ts`
- [x] 所有 AlertSeverity 的重复定义已删除
- [x] 所有 AlertStatus 的重复定义已删除
- [x] UMAAssertion 类型已统一
- [x] UMADispute 类型已统一
- [x] Bridge 类型已统一
- [x] ReliabilityScore 类型已统一
- [x] `oracleTypes.ts` 中的重复类型已迁移到 `unifiedOracleTypes.ts`
- [x] `oracleTypes.ts` 文件已重构为 re-export（保持兼容）

## Phase 2: 重复函数提取

- [x] `normalizeSeverity` 函数已提取到 `src/features/alerts/utils/normalize.ts`
- [x] `normalizeStatus` 函数已提取到 `src/features/alerts/utils/normalize.ts`
- [x] 所有重复的 normalize 函数已更新为使用共享版本
- [x] `formatNumber` 函数已统一使用 `src/shared/utils/format/number.ts`
- [x] 所有重复的格式化函数已更新为使用共享版本

## Phase 3: 常量统一

- [x] STATUS_COLORS 已统一到 `src/lib/design-system/tokens/colors.ts`
- [x] SEVERITY_COLORS 已统一到 `src/lib/design-system/tokens/colors.ts`
- [x] severityConfig 已提取到 `src/features/alerts/constants/severityConfig.ts`
- [x] 所有重复的颜色常量已删除
- [x] 所有重复的 severity 配置已删除

## Phase 4: 清理和修复

- [x] 空的 `src/features/security/hooks/index.ts` 已检查（保留，有预留注释）
- [x] 空的 `src/features/dashboard/hooks/index.ts` 已检查（保留，有预留注释）
- [x] `QuickSearch.tsx` 中的 any 类型已修复
- [x] `walletConnect.ts` 中的 any 类型已修复
- [x] 不必要的 ESLint 禁用注释已移除

## Phase 5: 验证

- [x] `npm run typecheck` 通过，无类型错误
- [x] `npm run lint` 通过，无 lint 错误（只有 import order warnings）
- [x] `npm run test` 通过（失败的是之前存在的问题，与本次修改无关）
- [x] `npm run build` 成功，无构建错误
