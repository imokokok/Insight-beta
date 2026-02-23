# 删除重复无用代码 Spec

## Why

代码库中存在大量重复代码（约1700行），包括重复的类型定义、工具函数、组件和配置文件。这些重复代码降低了代码可维护性，增加了维护成本，容易导致不一致性问题。

## What Changes

- 删除重复的类型定义，统一到 `@/types` 目录
- 删除重复的工具函数，统一到 `@/shared/utils` 目录
- 删除重复的组件，使用通用基础组件
- 删除重复的配置文件
- **BREAKING** 部分导入路径将改变

## Impact

- Affected specs: 类型系统、工具函数、组件库
- Affected code:
  - `src/types/` - 类型定义整理
  - `src/shared/utils/` - 工具函数统一
  - `src/features/oracle/*/components/` - 组件重构
  - `src/app/api/alerts/` - API 路由重构

## ADDED Requirements

### Requirement: 统一类型定义

系统 SHALL 将所有重复的类型定义统一到 `@/types` 目录下的相应文件中。

#### Scenario: AlertRuleRow 类型统一

- **WHEN** 需要使用 AlertRuleRow 类型时
- **THEN** 从 `@/types/database/alert` 导入

#### Scenario: AlertSeverity/AlertStatus 类型统一

- **WHEN** 需要使用告警严重程度或状态类型时
- **THEN** 从 `@/types/common/status` 导入

### Requirement: 统一工具函数

系统 SHALL 将所有重复的工具函数统一到 `@/shared/utils` 目录下。

#### Scenario: 地址截断函数统一

- **WHEN** 需要截断区块链地址时
- **THEN** 使用 `truncateAddress` 函数从 `@/shared/utils/format/number` 导入

#### Scenario: 格式化函数统一

- **WHEN** 需要格式化日期或数字时
- **THEN** 从 `@/shared/utils/format` 导入相应函数

### Requirement: 组件复用

系统 SHALL 使用通用基础组件替代重复的特定组件。

#### Scenario: ExportButton 组件统一

- **WHEN** 需要导出功能时
- **THEN** 使用通用的 `ExportButton` 组件配合配置对象

#### Scenario: KpiOverview 组件统一

- **WHEN** 需要显示协议 KPI 概览时
- **THEN** 使用通用的 `ProtocolKpiOverview` 组件

## REMOVED Requirements

### Requirement: 删除 shortenAddress 函数

**Reason**: 与 truncateAddress 功能完全相同
**Migration**: 将所有 `shortenAddress` 调用替换为 `truncateAddress`

### Requirement: 删除重复的 exportConfig 文件

**Reason**: 与 ExportButton 组件中的代码重复
**Migration**: 保留 ExportButton 组件中的实现，删除独立的 exportConfig.ts 文件

### Requirement: 删除重复的 AlertRuleRow 定义

**Reason**: 在多个 API 路由文件中重复定义
**Migration**: 提取到共享模块 `@/types/database/alert`
