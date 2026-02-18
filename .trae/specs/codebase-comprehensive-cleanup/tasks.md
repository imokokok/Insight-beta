# 项目代码全面整理 - 任务列表

## [x] Task 1: 类型定义整合 ✅

- **Priority**: P0
- **Depends On**: None
- **Description**:
  - 分析 `src/types/oracleTypes.ts` 和 `src/features/oracle/analytics/disputes/types/disputes.ts` 中的 `Dispute` 类型差异
  - 统一 `Dispute` 类型定义到 `src/types/oracle/dispute.ts`
  - 更新所有导入路径
  - 简化 `src/types/index.ts` 和 `src/types/domain/index.ts` 的重导出链
  - 检查并修复潜在的循环依赖
- **Acceptance Criteria**:
  - `Dispute` 类型只有一个定义
  - 无循环依赖警告
  - `npm run typecheck` 通过

## [x] Task 2: PriceHistoryChart 组件统一 ✅

- **Priority**: P0
- **Depends On**: None
- **Description**:
  - 保留 `src/features/oracle/components/PriceHistoryChart.tsx` 作为唯一实现
  - 删除 `src/components/charts/PriceHistoryChart.tsx`（重新导出文件）
  - 删除 `src/features/dashboard/components/PriceHistoryChart.tsx`（重新导出文件）
  - 更新所有导入路径指向 `features/oracle/components/PriceHistoryChart`
  - 更新相关 index.ts 导出
- **Acceptance Criteria**:
  - 只有一个 PriceHistoryChart 实现文件
  - 所有导入路径正确
  - 图表功能正常

## [ ] Task 3: ExportButton 组件合并

- **Priority**: P1
- **Depends On**: None
- **Description**:
  - 分析 `deviation/ExportButton` 和 `disputes/ExportButton` 的公共逻辑
  - 创建 `src/features/oracle/components/shared/DataExportButton.tsx` 包含公共导出逻辑
  - 更新 deviation 和 disputes 模块使用共享组件
  - 明确区分 `components/common/ExportButton.tsx`（图表导出）和新的数据导出组件职责
- **Acceptance Criteria**:
  - 公共导出逻辑提取到共享组件
  - deviation 和 disputes 模块正常工作
  - 导出功能完整

## [x] Task 4: SummaryStats 组件统一 ✅

- **Priority**: P1
- **Depends On**: None
- **Description**:
  - 分析 deviation 和 disputes 的 SummaryStats 组件差异
  - 创建统一的 `SummaryStatsBase` 组件
  - 支持通过配置切换底层组件（StatCard 或 SummaryStatsGrid）
  - 更新两个模块使用统一组件
- **Acceptance Criteria**:
  - 统一组件支持不同配置
  - 两个模块显示正常

## [ ] Task 5: 空文件清理

- **Priority**: P1
- **Depends On**: None
- **Description**:
  - 删除 `src/components/security/index.ts`（空导出）
  - 审查并处理空洞 services 文件：
    - `src/features/comparison/services/index.ts` - 充实或删除
    - `src/features/explore/services/index.ts` - 充实或删除
    - `src/features/wallet/services/index.ts` - 实现空函数或删除
  - 审查并处理简单 utils 文件：
    - `src/features/comparison/utils/index.ts`
    - `src/features/explore/utils/index.ts`
    - `src/features/cross-chain/utils/index.ts`
- **Acceptance Criteria**:
  - 无空导出文件
  - 无空洞服务文件
  - utils 文件有实际内容或已合并

## [ ] Task 6: TimeRangeSelector 和 ProtocolFilter 整理

- **Priority**: P2
- **Depends On**: None
- **Description**:
  - 分析 `components/common/TimeRangeSelector` 和 `features/oracle/analytics/deviation/filters/TimeRangeSelector` 的差异
  - 决定是否合并或保持分离（可能需要不同功能）
  - 同样处理 ProtocolFilter 组件
- **Acceptance Criteria**:
  - 组件职责明确
  - 无不必要的重复

## [ ] Task 7: 模块结构标准化

- **Priority**: P2
- **Depends On**: None
- **Description**:
  - 审查 `features/assertion/` 模块，决定是否合并到其他模块
  - 为 `features/charts/` 添加缺失的 hooks（如需要）
  - 为 `features/dashboard/` 添加缺失的 hooks（如需要）
  - 为 `features/security/` 添加缺失的 types 和 hooks（如需要）
- **Acceptance Criteria**:
  - 模块结构一致或有明确理由不一致
  - 无孤立的单文件模块

## [x] Task 8: 命名规范化 ✅

- **Priority**: P2
- **Depends On**: None
- **Description**:
  - 统一组件命名模式
  - 确保目录使用 kebab-case
  - 更新不一致的命名
- **Acceptance Criteria**:
  - 命名一致
  - 无命名冲突

## [x] Task 9: 最终验证 ✅

- **Priority**: P0
- **Depends On**: [Task 1, Task 2, Task 3, Task 4, Task 5]
- **Description**:
  - 运行 `npm run typecheck` 确保类型正确
  - 运行 `npm run lint` 确保代码规范
  - 运行 `npm run build` 确保构建成功
  - 运行 `npm run test` 确保测试通过
  - 手动测试关键功能
- **Acceptance Criteria**:
  - 所有检查通过
  - 无新增错误或警告
  - 功能正常工作

---

# Task Dependencies

- [Task 9] depends on [Task 1, Task 2, Task 3, Task 4, Task 5]
- [Task 1, Task 2, Task 3, Task 4, Task 5, Task 6] 可并行执行
- [Task 7, Task 8] 可并行执行
