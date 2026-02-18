# 代码清理优化 - The Implementation Plan (Decomposed and Prioritized Task List)

## [ ] Task 1: 修复 TypeScript 类型错误

- **Priority**: P0
- **Depends On**: None
- **Description**:
  - 修复 src/features/oracle/services/**tests**/priceDeviationAnalytics.test.ts 中的 2 个类型错误
  - 修复 src/hooks/**tests**/useAutoRefresh.test.ts 中的 9 个类型错误
- **Acceptance Criteria Addressed**: [AC-1, AC-5]
- **Test Requirements**:
  - `programmatic` TR-1.1: npm run typecheck 返回 0 错误
  - `programmatic` TR-1.2: 相关测试文件可以正常运行
- **Notes**: 重点是修复测试中的类型模拟问题，确保类型安全。

## [ ] Task 2: 自动修复 ESLint 警告

- **Priority**: P0
- **Depends On**: None
- **Description**:
  - 运行 eslint --fix 修复可自动修复的 40 个警告
  - 主要修复 import 顺序、类型导入等问题
- **Acceptance Criteria Addressed**: [AC-2, AC-5]
- **Test Requirements**:
  - `programmatic` TR-2.1: 运行 eslint --fix 后警告数减少
  - `programmatic` TR-2.2: 代码风格保持一致
- **Notes**: 先运行 --dry-run 查看会有什么变化，确认后再实际修改。

## [ ] Task 3: 处理剩余的 ESLint 警告

- **Priority**: P1
- **Depends On**: [Task 2]
- **Description**:
  - 手动修复剩余无法自动修复的 ESLint 警告
  - 主要是 @typescript-eslint/no-explicit-any 相关问题
- **Acceptance Criteria Addressed**: [AC-2, AC-5]
- **Test Requirements**:
  - `programmatic` TR-3.1: npm run lint 警告数 < 10
  - `human-judgement` TR-3.2: 类型定义合理，没有滥用 any 类型
- **Notes**: 需要为这些 any 类型定义合适的类型接口。

## [ ] Task 4: 分析并处理 TODO/FIXME 注释

- **Priority**: P1
- **Depends On**: None
- **Description**:
  - 检查 src/app/api/comparison/[symbol]/history/route.ts 中的 TODO 注释
  - 决定是否处理、保留或转换为 issue
- **Acceptance Criteria Addressed**: [AC-3]
- **Test Requirements**:
  - `human-judgement` TR-4.1: 所有 TODO/FIXME 都有明确的处理状态
- **Notes**: 某些 TODO 可能是正在进行的工作，需要谨慎处理。

## [ ] Task 5: 验证重复组件

- **Priority**: P2
- **Depends On**: None
- **Description**:
  - 检查多个位置重复的组件（如 PriceHistoryChart、ProfessionalDashboard、ThreatLevelBadge 等）
  - 确定这些组件是否真的重复，还是有细微差异
  - 决定是否需要合并或删除
- **Acceptance Criteria Addressed**: [AC-5]
- **Test Requirements**:
  - `human-judgement` TR-5.1: 重复组件已分析并做出处理决定
- **Notes**: 这些重复组件可能是故意的，需要仔细分析。

## [ ] Task 6: 分析未使用的翻译键

- **Priority**: P2
- **Depends On**: None
- **Description**:
  - 验证 unused-translations-report.json 中的 966 个未使用翻译键
  - 抽样检查确认这些键确实没有被使用
  - 准备删除或保留的策略
- **Acceptance Criteria Addressed**: [AC-4]
- **Test Requirements**:
  - `human-judgement` TR-6.1: 未使用翻译键已验证
- **Notes**: 这是高风险操作，删除前必须充分验证。

## [ ] Task 7: 最终验证和构建测试

- **Priority**: P0
- **Depends On**: [Task 1, Task 2, Task 3]
- **Description**:
  - 运行完整的类型检查、lint 检查和构建测试
  - 确保所有功能正常工作
- **Acceptance Criteria Addressed**: [AC-1, AC-2, AC-5]
- **Test Requirements**:
  - `programmatic` TR-7.1: npm run typecheck 通过
  - `programmatic` TR-7.2: npm run lint 通过（或警告在可接受范围内）
  - `programmatic` TR-7.3: npm run build 成功
