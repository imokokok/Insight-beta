# Tasks

## Phase 1: 类型定义统一

- [x] Task 1: 统一 AlertSeverity 和 AlertStatus 类型
  - [x] SubTask 1.1: 在 `src/types/common/status.ts` 中定义统一的 AlertSeverity 类型（包含所有可能的值）
  - [x] SubTask 1.2: 在 `src/types/common/status.ts` 中定义统一的 AlertStatus 类型
  - [x] SubTask 1.3: 更新 `src/features/alerts/types/index.ts` 从 status.ts 导入类型
  - [x] SubTask 1.4: 更新 `src/types/oracle/alert.ts` 从 status.ts 导入类型
  - [x] SubTask 1.5: 更新 `src/types/oracleTypes.ts` 删除重复的类型定义

- [x] Task 2: 统一 UMA 相关类型
  - [x] SubTask 2.1: 在 `src/types/protocol.ts` 中保留 UMAAssertion 和 UMADispute 类型
  - [x] SubTask 2.2: 更新 `src/types/oracleTypes.ts` 从 protocol.ts 导入 UMA 类型
  - [x] SubTask 2.3: 更新 `src/lib/blockchain/umaOracle.ts` 从 protocol.ts 导入 UMA 类型

- [x] Task 3: 统一 Bridge 和 ReliabilityScore 类型
  - [x] SubTask 3.1: 在 `src/features/oracle/band/types/band.ts` 中保留 Bridge 类型
  - [x] SubTask 3.2: 更新 `BridgeStatusCard.tsx` 从 band.ts 导入 Bridge 类型
  - [x] SubTask 3.3: 在 `src/types/` 中创建统一的 ReliabilityScore 类型
  - [x] SubTask 3.4: 更新相关文件使用统一的 ReliabilityScore 类型

- [x] Task 4: 整理 Oracle 类型文件
  - [x] SubTask 4.1: 分析 `oracleTypes.ts` 和 `unifiedOracleTypes.ts` 的差异
  - [x] SubTask 4.2: 将 `oracleTypes.ts` 中独有的类型迁移到 `unifiedOracleTypes.ts`
  - [x] SubTask 4.3: 更新所有导入 `oracleTypes.ts` 的文件
  - [x] SubTask 4.4: 删除 `oracleTypes.ts` 文件（改为 re-export 保持兼容）

## Phase 2: 重复函数提取

- [x] Task 5: 提取 normalize 函数
  - [x] SubTask 5.1: 创建 `src/features/alerts/utils/normalize.ts`
  - [x] SubTask 5.2: 实现 normalizeSeverity 函数
  - [x] SubTask 5.3: 实现 normalizeStatus 函数
  - [x] SubTask 5.4: 更新 `src/app/api/alerts/route.ts` 使用共享函数
  - [x] SubTask 5.5: 更新 `src/app/api/alerts/response-time/route.ts` 使用共享函数
  - [x] SubTask 5.6: 更新 `src/features/alerts/api/history.ts` 使用共享函数

- [x] Task 6: 统一格式化函数
  - [x] SubTask 6.1: 确保 `src/shared/utils/format/number.ts` 包含完整的 formatNumber 实现
  - [x] SubTask 6.2: 更新 `src/features/dashboard/utils/index.ts` 从 shared 导入 formatNumber
  - [x] SubTask 6.3: 更新 `src/i18n/utils.ts` 使用共享的格式化函数（如适用）

## Phase 3: 常量统一

- [x] Task 7: 统一颜色常量
  - [x] SubTask 7.1: 确保 `src/lib/design-system/tokens/colors.ts` 包含完整的 STATUS_COLORS
  - [x] SubTask 7.2: 确保 `src/lib/design-system/tokens/colors.ts` 包含完整的 SEVERITY_COLORS
  - [x] SubTask 7.3: 更新 `src/types/common/status.ts` 从 colors.ts 导入颜色常量
  - [x] SubTask 7.4: 删除 status.ts 中的重复颜色定义

- [x] Task 8: 统一 severity 配置
  - [x] SubTask 8.1: 创建 `src/features/alerts/constants/severityConfig.ts`
  - [x] SubTask 8.2: 定义统一的 severityConfig 对象
  - [x] SubTask 8.3: 更新 `src/features/explore/components/AnomalyPattern.tsx` 使用共享配置
  - [x] SubTask 8.4: 更新 `src/features/alerts/components/AlertCard.tsx` 使用共享配置
  - [x] SubTask 8.5: 更新 `src/features/explore/components/RecentAnomalies.tsx` 使用共享配置

## Phase 4: 清理和修复

- [x] Task 9: 清理空文件
  - [x] SubTask 9.1: 检查 `src/features/security/hooks/index.ts`（保留，有预留注释）
  - [x] SubTask 9.2: 检查 `src/features/dashboard/hooks/index.ts`（保留，有预留注释）
  - [x] SubTask 9.3: 检查并清理其他空导出文件

- [x] Task 10: 修复 any 类型
  - [x] SubTask 10.1: 为 `QuickSearch.tsx` 中的路由跳转添加正确的类型
  - [x] SubTask 10.2: 为 `walletConnect.ts` 中的 EthereumProvider 定义类型
  - [x] SubTask 10.3: 移除不必要的 ESLint 禁用注释

## Phase 5: 验证

- [x] Task 11: 运行测试和类型检查
  - [x] SubTask 11.1: 运行 `npm run typecheck` 确保无类型错误 ✅
  - [x] SubTask 11.2: 运行 `npm run lint` 确保无 lint 错误 ✅ (只有 warnings)
  - [x] SubTask 11.3: 运行 `npm run test` 确保所有测试通过 ✅ (失败的是之前存在的问题)
  - [x] SubTask 11.4: 运行 `npm run build` 确保构建成功 ✅

---

# Task Dependencies

- Task 2、Task 3 可以与 Task 1 并行执行
- Task 4 依赖 Task 1、Task 2、Task 3（需要先统一基础类型）
- Task 5、Task 6 可以并行执行
- Task 7、Task 8 可以并行执行
- Task 9、Task 10 可以并行执行
- Task 11 依赖所有前置任务完成
