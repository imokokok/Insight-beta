# 项目代码全面整理 Spec

## Why

项目经过多轮开发迭代，积累了技术债务，包括类型定义冲突、组件重复、模块结构不一致等问题，影响代码可维护性和开发效率，需要进行系统性整理。

## What Changes

### 高优先级

- **类型定义整合**：解决 `Dispute` 等类型的重复定义和冲突，简化类型导出链
- **组件重复消除**：合并 `PriceHistoryChart`、`ExportButton`、`SummaryStats` 等重复组件
- **空文件清理**：删除或充实空的 services、utils、components 文件

### 中优先级

- **模块结构标准化**：为 `assertion`、`charts`、`dashboard`、`security` 模块补充完整结构
- **命名规范化**：统一组件和类型命名，消除不一致

### 低优先级

- **测试覆盖补充**：为缺少测试的核心模块添加测试
- **翻译完善**：提高中文翻译覆盖率

## Impact

- Affected specs: `project-code-reorganization`（已完成部分）
- Affected code:
  - `src/types/` - 类型整合
  - `src/features/oracle/analytics/` - 组件合并
  - `src/features/*/services/` - 空文件清理
  - `src/components/` - 组件重组

---

## ADDED Requirements

### Requirement: 类型定义统一

系统 SHALL 保持类型定义的唯一性和一致性。

#### Scenario: Dispute 类型冲突解决

- **WHEN** `oracleTypes.ts` 和 `disputes.ts` 都定义了 `Dispute` 类型
- **THEN** 应统一为一个定义，其他位置使用类型别名或重新导出

#### Scenario: 类型导出链简化

- **WHEN** 类型通过多层重导出
- **THEN** 应简化为直接导出，避免循环依赖风险

#### Scenario: 类型文件组织

- **WHEN** 类型定义分散在多个位置
- **THEN** 应按领域组织到 `types/` 目录下，feature 内仅保留特定类型

---

### Requirement: 组件重复消除

系统 SHALL 避免功能相同或相似的组件重复。

#### Scenario: PriceHistoryChart 统一

- **WHEN** 存在 3 个 PriceHistoryChart 文件
- **THEN** 应保留 `features/oracle/components/` 中的实现，删除其他重新导出文件

#### Scenario: ExportButton 合并

- **WHEN** deviation 和 disputes 模块有相似的 ExportButton
- **THEN** 应提取公共导出逻辑到共享组件，特定模块继承扩展

#### Scenario: SummaryStats 统一

- **WHEN** deviation 和 disputes 模块有功能相似的 SummaryStats
- **THEN** 应创建统一的 SummaryStats 组件，支持不同配置

---

### Requirement: 空文件处理

系统 SHALL 确保所有文件都有明确的职责和实现。

#### Scenario: 空组件清理

- **WHEN** `components/security/index.ts` 是空导出
- **THEN** 应删除该文件

#### Scenario: 空洞服务处理

- **WHEN** services 文件仅包含简单封装或空实现
- **THEN** 应充实业务逻辑或删除文件

#### Scenario: 简单 utils 合并

- **WHEN** utils 文件仅包含 1-2 个简单函数
- **THEN** 应合并到相关模块或 shared/utils

---

### Requirement: 模块结构标准化

系统 SHALL 保持各功能模块结构的一致性。

#### Scenario: 补充缺失目录

- **WHEN** 模块缺少 hooks、types、utils 目录
- **THEN** 应根据需要创建或明确不需要

#### Scenario: assertion 模块处理

- **WHEN** assertion 模块仅有一个组件
- **THEN** 应考虑合并到相关模块或扩展功能

---

### Requirement: 命名规范化

系统 SHALL 使用一致的命名约定。

#### Scenario: 组件命名统一

- **WHEN** 功能相似的组件使用不同名称
- **THEN** 应使用统一命名模式

#### Scenario: 目录命名规范

- **WHEN** 目录使用不同命名风格
- **THEN** 应统一使用 kebab-case

---

## MODIFIED Requirements

无

---

## REMOVED Requirements

无
