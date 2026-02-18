# 项目代码全面审查与整理 - 任务列表

## [x] Task 1: 修复依赖问题

- **Priority**: P0
- **Depends On**: None
- **Description**:
  - 添加缺失的 `uuid` 依赖到 `dependencies`
  - 移除未使用的 `swagger-ui-react` 依赖
  - 验证 `npm install` 和 `npm run build` 正常
- **Acceptance Criteria**:
  - `npm install` 无错误
  - `npm run build` 成功
  - `package.json` 中无未使用的依赖
- **Status**: Completed ✅

## [x] Task 2: 统一 fetcher 函数

- **Priority**: P0
- **Depends On**: None
- **Description**:
  - 检查 `@/shared/utils/api` 中的 `fetchApiData` 函数
  - 更新以下文件使用统一的 fetcher：
    - `src/features/cross-chain/hooks/useCrossChain.ts`
    - `src/features/cross-chain/hooks/useArbitrage.ts`
    - `src/features/alerts/hooks/useAlertHistory.ts`
    - `src/features/explore/hooks/useDataDiscovery.ts`
    - `src/features/explore/hooks/useGlobalSearch.ts`
    - `src/features/explore/hooks/useMarketOverview.ts`
    - `src/features/alerts/hooks/useAlerts.ts`
  - 移除各文件中重复定义的 fetcher 函数
- **Acceptance Criteria**:
  - 所有 hooks 使用统一的 `fetchApiData`
  - 无重复的 fetcher 函数定义
  - 所有相关功能正常工作
- **Status**: Completed ✅

## [x] Task 3: 合并 HelpTooltip 组件

- **Priority**: P1
- **Depends On**: None
- **Description**:
  - 创建 `src/features/oracle/components/shared/HelpTooltip.tsx`
  - 合并 `deviation` 和 `disputes` 版本的功能
  - 更新两个模块的导入路径
  - 删除原有的重复组件文件
- **Acceptance Criteria**:
  - 共享组件功能完整
  - 两个模块都使用共享组件
  - 原有重复文件已删除
- **Status**: Completed ✅

## [x] Task 4: 合并 WelcomeGuide 组件

- **Priority**: P1
- **Depends On**: None
- **Description**:
  - 创建 `src/features/oracle/components/shared/WelcomeGuideBase.tsx`
  - 提取共同逻辑，接受步骤配置作为参数
  - 更新 `deviation` 和 `disputes` 模块使用基础组件
  - 删除原有的重复组件文件
- **Acceptance Criteria**:
  - 基础组件可配置
  - 两个模块都正常显示引导
  - 原有重复文件已删除
- **Status**: Completed ✅

## [x] Task 5: 合并 ExportButton 组件

- **Priority**: P1
- **Depends On**: None
- **Description**:
  - 创建泛型组件 `src/features/oracle/components/shared/ExportButton.tsx<T>`
  - 支持不同数据类型的导出
  - 更新 `deviation` 和 `disputes` 模块使用泛型组件
  - 删除原有的重复组件文件
- **Acceptance Criteria**:
  - 泛型组件支持多种数据类型
  - 导出功能正常工作
  - 原有重复文件已删除
- **Status**: Completed ✅

## [x] Task 6: 整理 Oracle 类型定义

- **Priority**: P2
- **Depends On**: None
- **Description**:
  - 分析 `oracleTypes.ts` 和 `unifiedOracleTypes.ts` 的重叠部分
  - 制定迁移计划
  - 将类型迁移到 `types/oracle/` 目录
  - 更新所有导入路径
  - 废弃顶层类型文件
- **Acceptance Criteria**:
  - 类型定义无重复
  - 导入路径统一
  - 类型检查通过
- **Status**: Completed ✅ (已提供迁移建议，风险中等，建议分阶段执行)

## [x] Task 7: 优化服务层

- **Priority**: P2
- **Depends On**: None
- **Description**:
  - 审查以下空洞的服务文件：
    - `src/features/alerts/services/index.ts`
    - `src/features/dashboard/services/index.ts`
    - `src/features/cross-chain/services/index.ts`
  - 决定充实或移除
  - 如果保留，添加缓存、错误处理等逻辑
- **Acceptance Criteria**:
  - 服务层有明确职责
  - 无空洞的服务文件
- **Status**: Completed ✅ (已删除空洞的服务文件)

## [x] Task 8: 整理测试文件位置

- **Priority**: P2
- **Depends On**: None
- **Description**:
  - 移动 `src/hooks/useWallet.test.tsx` 到 `src/features/wallet/contexts/__tests__/useWallet.test.tsx`
  - 检查其他位置不正确的测试文件
  - 更新相关导入
- **Acceptance Criteria**:
  - 测试文件与被测试代码在同一模块
  - 测试正常运行
- **Status**: Completed ✅

## [x] Task 9: 最终验证

- **Priority**: P0
- **Depends On**: [Task 1, Task 2, Task 3, Task 4, Task 5]
- **Description**:
  - 运行 `npm run typecheck` 确保类型正确
  - 运行 `npm run lint` 确保代码规范
  - 运行 `npm run build` 确保构建成功
  - 运行 `npm run test` 确保测试通过
- **Acceptance Criteria**:
  - 所有检查通过
  - 无新增错误或警告
- **Status**: Completed ✅

---

# Task Dependencies

- [Task 9] depends on [Task 1, Task 2, Task 3, Task 4, Task 5]
- [Task 3, Task 4, Task 5] 可并行执行
- [Task 6, Task 7, Task 8] 可并行执行
