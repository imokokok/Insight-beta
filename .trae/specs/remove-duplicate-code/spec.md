# 删除重复无用代码 Spec

## Why

项目中存在大量重复代码，包括工具函数、类型定义、组件和 API 模式。这些重复代码增加了维护成本，容易导致行为不一致，并使代码库膨胀。

## What Changes

- 统一重复的格式化工具函数（`formatPrice`、`formatNumber`、`formatEth`、`escapeCSV` 等）

- 合并重复的类型定义（`GasCostByChain` 等）

- 整合重复的导出组件

- 统一 API 路由中的查询参数解析和错误处理模式

- 删除未使用的导入和冗余导出

## Impact

- Affected specs: 格式化工具、类型系统、导出功能、API 路由

- Affected code:
  - `src/shared/utils/format/` - 格式化工具

  - `src/features/oracle/*/types/` - Oracle 类型定义

  - `src/components/common/ExportButton.tsx` - 导出组件

  - `src/app/api/` - API 路由

  - `src/features/*/utils/format.ts` - 各模块格式化工具

## ADDED Requirements

### Requirement: 统一格式化工具函数

系统 SHALL 在 `src/shared/utils/format/` 目录下提供统一的格式化工具函数，各 feature 模块应从该目录导入而非重复定义。

#### Scenario: formatPrice 函数统一

- **WHEN** 开发者需要格式化价格

- **THEN** 应使用 `src/shared/utils/format/number.ts` 中的 `formatPrice` 函数

- **AND** 删除 `features/oracle/chainlink/components/dashboard/formatters.ts` 中的重复定义

#### Scenario: escapeCSV 函数统一

- **WHEN** 开发者需要 CSV 转义功能

- **THEN** 应使用 `src/utils/chartExport.ts` 中的 `escapeCSV` 函数

- **AND** 删除 `components/common/ExportButton.tsx` 中的重复定义

### Requirement: 合并重复类型定义

系统 SHALL 在 `src/types/shared.ts` 中定义共享的 Oracle 类型，各协议特定类型应继承或复用这些基础类型。

#### Scenario: GasCostByChain 类型统一

- **WHEN** 定义 Gas 成本分析类型

- **THEN** 应使用 `src/types/shared.ts` 中的基础类型

- **AND** API3 和 Chainlink 的特定类型应继承基础类型

### Requirement: 统一导出组件

系统 SHALL 提供通用的 `ExportButton` 组件，各 feature 模块应通过配置复用该组件。

#### Scenario: Oracle 导出按钮统一

- **WHEN** 需要为特定 Oracle 协议提供导出功能

- **THEN** 应使用 `src/components/common/ExportButton.tsx` 并传入配置

- **AND** 删除各 feature 模块下的重复 ExportButton 组件

### Requirement: 统一 API 工具函数

系统 SHALL 提供统一的 API 工具函数用于查询参数解析和错误处理。

#### Scenario: 查询参数解析统一

- **WHEN** API 路由需要解析查询参数

- **THEN** 应使用 `src/lib/api/` 中的统一工具函数

- **AND** 删除各路由中的 `parseQueryParams` 重复定义

## MODIFIED Requirements

### Requirement: 格式化工具导出

`src/shared/utils/format/index.ts` SHALL 导出所有格式化工具函数，供各模块统一导入使用。

### Requirement: 类型导出

`src/types/shared.ts` SHALL 导出所有共享类型定义，包括 `GasCostAnalysisDataBase`、`GasCostByChainBase` 等。

## REMOVED Requirements

### Requirement: 删除重复的格式化函数

**Reason**: 已统一到 `src/shared/utils/format/`
**Migration**:

- 删除 `features/oracle/chainlink/components/dashboard/formatters.ts` 中的 `formatPrice`、`formatNumber`

- 删除 `features/cross-chain/utils/format.ts` 中的 `formatEth`、`formatPrice`（改为从 shared 导入）

- 删除 `components/common/ExportButton.tsx` 中的 `escapeCSV`、`escapeXML`（改为从 chartExport 导入）

### Requirement: 删除重复的 ExportButton 组件

**Reason**: 已有通用组件
**Migration**:

- 删除 `features/oracle/api3/components/export/ExportButton.tsx`

- 删除 `features/oracle/band/components/export/ExportButton.tsx`

- 删除 `features/oracle/analytics/deviation/components/export/ExportButton.tsx`

- 删除 `features/oracle/analytics/disputes/components/export/ExportButton.tsx`

### Requirement: 删除重复的类型定义

**Reason**: 已统一到共享类型文件
**Migration**:

- 删除 `features/oracle/api3/types/api3.ts` 中的 `GasCostByChain`

- 删除 `features/oracle/chainlink/types/chainlink.ts` 中的 `GasCostByChain`
