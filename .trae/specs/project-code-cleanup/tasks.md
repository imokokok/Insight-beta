# 项目代码清理 - 实现计划（分解和优先任务列表）

## [x] 任务 1: 分析代码库，识别重复和未使用代码

- **Priority**: P0
- **Depends On**: None
- **Description**:
  - 使用 ESLint 和项目工具扫描整个项目
  - 识别重复的组件、Hook 和工具函数
  - 找出未使用的文件、import 和变量
- **Acceptance Criteria Addressed**: [AC-1, AC-2]
- **Test Requirements**:
  - `programmatic` TR-1.1: 运行 lint 和 typecheck 命令获取当前状态
  - `human-judgement` TR-1.2: 分析报告，生成待清理的代码清单
- **Notes**: 保留分析结果作为后续清理的参考

## [x] 任务 2: 清理未使用的 import 和变量

- **Priority**: P0
- **Depends On**: 任务 1
- **Description**:
  - 运行 ESLint --fix 自动清理未使用的 import
  - 手动检查并清理未使用的变量
- **Acceptance Criteria Addressed**: [AC-2, AC-4, AC-5]
- **Test Requirements**:
  - `programmatic` TR-2.1: ESLint 检查警告减少
  - `programmatic` TR-2.2: TypeScript 类型检查通过

## [x] 任务 3: 合并重复的 Hook（如 useAlertSelection 相关）

- **Priority**: P1
- **Depends On**: 任务 1
- **Description**:
  - 分析 alerts 模块下的 Hook，识别重复功能
  - 合并重复的 Hook，保留功能最完整的一个
  - 更新所有使用点
- **Acceptance Criteria Addressed**: [AC-1, AC-3, AC-4, AC-6]
- **Test Requirements**:
  - `programmatic` TR-3.1: 合并后类型检查通过
  - `programmatic` TR-3.2: 相关测试通过

## [x] 任务 4: 合并重复的 StatCard 组件

- **Priority**: P1
- **Depends On**: 任务 1
- **Description**:
  - 分析 StatCard 和 EnhancedStatCard 组件的功能差异
  - 合并为一个功能完整的组件
  - 更新所有使用点
- **Acceptance Criteria Addressed**: [AC-1, AC-3, AC-4, AC-6]
- **Test Requirements**:
  - `programmatic` TR-4.1: 合并后类型检查通过
  - `programmatic` TR-4.2: 组件相关测试通过

## [x] 任务 5: 清理未使用的文件

- **Priority**: P2
- **Depends On**: 任务 1
- **Description**:
  - 根据分析结果删除未使用的文件
  - 确保删除的文件没有被其他地方引用
- **Acceptance Criteria Addressed**: [AC-2, AC-3, AC-4]
- **Test Requirements**:
  - `programmatic` TR-5.1: 项目构建成功
  - `programmatic` TR-5.2: 类型检查通过

## [x] 任务 6: 运行完整构建和测试验证

- **Priority**: P0
- **Depends On**: 任务 2, 3, 4, 5
- **Description**:
  - 运行完整的项目构建
  - 运行所有测试
  - 验证 ESLint 和类型检查
- **Acceptance Criteria Addressed**: [AC-3, AC-4, AC-5, AC-6]
- **Test Requirements**:
  - `programmatic` TR-6.1: npm run build 成功
  - `programmatic` TR-6.2: npm run test:ci 通过
  - `programmatic` TR-6.3: npm run lint 通过（警告 &lt;= 500）
  - `programmatic` TR-6.4: npm run typecheck 通过
