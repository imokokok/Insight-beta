# 清理项目多余逻辑 Spec

## Why
项目中存在一些未使用的代码、已弃用的重导出文件、空模块和多余的类型定义，这些代码增加了维护成本和代码库体积，需要清理以提高代码质量和可维护性。

## What Changes
- 删除空导出模块 `src/features/common/index.ts`
- 删除已弃用的重导出文件（保留实际实现，删除转发层）
- 删除未使用的类型定义文件
- 删除未使用的组件文件
- 清理 eslint-disable 和 @ts-ignore 注释（在可能的情况下）

## Impact
- Affected specs: 无影响（这些是未使用的代码）
- Affected code:
  - `src/features/common/index.ts` - 空模块
  - `src/lib/api/openapi.ts` - 已弃用的重导出
  - `src/shared/utils/format.ts` - 已弃用的重导出
  - `src/types/oracle/chain.ts` - 已弃用的重导出
  - `src/features/oracle/analytics/anomalies/types/anomalies.ts` - 未使用
  - `src/features/oracle/monitoring/types/monitoring.ts` - 未使用
  - `src/features/oracle/services/types/serviceTypes.ts` - 未使用
  - `src/features/assertion/components/CommonParamsInputs.tsx` - 未使用
  - `src/features/assertion/components/EventParamsInputs.tsx` - 未使用

## ADDED Requirements

### Requirement: 删除空模块
系统 SHALL 删除没有任何实际导出的空模块文件。

#### Scenario: 删除 features/common 空模块
- **WHEN** 模块文件只包含 `export {};` 和注释
- **THEN** 删除该文件

### Requirement: 删除已弃用的重导出文件
系统 SHALL 删除标记为 `@deprecated` 的重导出文件，并更新导入路径。

#### Scenario: 删除 lib/api/openapi.ts 重导出
- **WHEN** 文件仅重导出其他模块的内容且标记为弃用
- **THEN** 删除该文件，更新所有导入路径指向实际模块

#### Scenario: 删除 shared/utils/format.ts 重导出
- **WHEN** 文件仅重导出其他模块的内容且标记为弃用
- **THEN** 删除该文件，更新所有导入路径指向实际模块

#### Scenario: 删除 types/oracle/chain.ts 重导出
- **WHEN** 文件仅重导出其他模块的内容且标记为弃用
- **THEN** 删除该文件，更新所有导入路径指向实际模块

### Requirement: 删除未使用的类型定义
系统 SHALL 删除未被任何文件导入的类型定义文件。

#### Scenario: 删除未使用的 anomalies 类型
- **WHEN** 类型文件未被任何其他文件导入
- **THEN** 删除该类型文件

#### Scenario: 删除未使用的 monitoring 类型
- **WHEN** 类型文件未被任何其他文件导入
- **THEN** 删除该类型文件

#### Scenario: 删除未使用的 serviceTypes 类型
- **WHEN** 类型文件未被任何其他文件导入
- **THEN** 删除该类型文件

### Requirement: 删除未使用的组件
系统 SHALL 删除未被任何文件导入的组件文件。

#### Scenario: 删除未使用的 CommonParamsInputs 组件
- **WHEN** 组件文件未被任何其他文件导入
- **THEN** 删除该组件文件

#### Scenario: 删除未使用的 EventParamsInputs 组件
- **WHEN** 组件文件未被任何其他文件导入
- **THEN** 删除该组件文件

## MODIFIED Requirements
无

## REMOVED Requirements
无
