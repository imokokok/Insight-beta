# 删除重复无用代码（第二批）Spec

## Why

代码库中仍存在大量重复的组件、函数、类型和常量定义，包括：

- 7组重复常量定义（涉及20+文件）
- 3组重复工具函数（涉及15+文件）
- 4组重复类型定义（涉及10+文件）
- 5组重复样式/配置对象（涉及15+文件）

清理这些重复代码可以提高代码可维护性、减少代码体积、避免不一致行为。

## What Changes

### 常量统一

- 统一 `AVAILABLE_SYMBOLS` / `VALID_SYMBOLS`（3处合并）
- 统一 `AVAILABLE_CHAINS`（2处合并）
- 统一 `TIME_RANGES`（3处合并）
- 统一 `SYMBOLS`（4处合并）
- 统一 `SUPPORTED_CHAINS`（5处合并）
- 统一 `CHAIN_COLORS`（6处合并）
- 统一 `CHART_COLORS`（2处合并）

### 函数统一

- 统一 `getDeviationColor` 函数（6处合并为1处）
- 统一 `formatDuration` 函数（5处合并为1处）
- 统一 `formatNumber` 函数（4处合并为1处）

### 类型统一

- 统一 `OverviewStats` 类型（3处合并）
- 统一 `ActionDialogProps` 类型（2处合并）
- 统一 `BreadcrumbItem` 类型（2处合并）
- 统一 `HealthStatus` 类型（4处合并）

### 样式/配置统一

- 统一 `statusColors` 配置（4处合并）
- 统一 `trendColors` 配置（3处合并）
- 统一 `STATUS_COLORS` 配置（4处合并）
- 统一动画配置 `itemVariants` / `containerVariants`（4处合并）
- 统一 `timeRangeOptions` 配置（3处合并）

## Impact

- Affected specs: 无破坏性变更，所有功能保持不变
- Affected code:
  - `src/config/constants.ts` - 统一常量
  - `src/shared/utils/format/percentage.ts` - getDeviationColor
  - `src/shared/utils/format/time.ts` - formatDuration
  - `src/shared/utils/format/number.ts` - formatNumber
  - `src/types/common/status.ts` - HealthStatus
  - `src/lib/design-system/tokens/colors.ts` - 颜色常量
  - `src/lib/design-system/tokens/animation.ts` - 动画配置
  - `src/features/cross-chain/components/*.tsx`
  - `src/features/oracle/*/components/*.tsx`
  - `src/app/oracle/*/page.tsx`

## ADDED Requirements

### Requirement: 统一符号和链相关常量

系统 SHALL 从 `src/config/constants.ts` 统一导出所有符号和链相关常量，其他文件 SHALL 导入使用而非重复定义。

#### Scenario: 符号常量使用一致性

- **WHEN** 任何组件需要使用符号列表
- **THEN** 使用 `VALID_SYMBOLS` 或 `AVAILABLE_SYMBOLS` 从 `@/config/constants` 导入

### Requirement: 统一偏差颜色函数

系统 SHALL 在 `src/shared/utils/format/percentage.ts` 中维护 `getDeviationColor` 函数，其他位置 SHALL 导入使用。

#### Scenario: 偏差颜色显示一致性

- **WHEN** 任何组件需要显示偏差颜色
- **THEN** 使用 `getDeviationColor` 从 `@/shared/utils/format/percentage` 导入

### Requirement: 统一持续时间格式化函数

系统 SHALL 在 `src/shared/utils/format/time.ts` 中维护 `formatDuration` 函数，其他位置 SHALL 导入使用。

#### Scenario: 持续时间显示一致性

- **WHEN** 任何组件需要显示持续时间
- **THEN** 使用 `formatDuration` 从 `@/shared/utils/format/time` 导入

### Requirement: 统一数字格式化函数

系统 SHALL 在 `src/shared/utils/format/number.ts` 中维护 `formatNumber` 函数，其他位置 SHALL 导入使用。

#### Scenario: 数字格式化一致性

- **WHEN** 任何组件需要格式化数字
- **THEN** 使用 `formatNumber` 从 `@/shared/utils/format/number` 导入

### Requirement: 统一健康状态类型

系统 SHALL 在 `src/types/common/status.ts` 中定义 `HealthStatus` 类型，其他位置 SHALL 导入使用。

#### Scenario: 健康状态类型一致性

- **WHEN** 任何组件需要使用健康状态类型
- **THEN** 使用 `HealthStatus` 从 `@/types/common/status` 导入

### Requirement: 统一颜色配置

系统 SHALL 在 `src/lib/design-system/tokens/colors.ts` 中维护所有颜色配置常量，包括 `STATUS_COLORS`、`statusColors`、`trendColors`。

#### Scenario: 颜色配置一致性

- **WHEN** 任何组件需要使用状态颜色或趋势颜色
- **THEN** 从 `@/lib/design-system/tokens/colors` 导入

### Requirement: 统一动画配置

系统 SHALL 在 `src/lib/design-system/tokens/animation.ts` 中维护动画配置，包括 `itemVariants` 和 `containerVariants`。

#### Scenario: 动画配置一致性

- **WHEN** 任何组件需要使用列表动画
- **THEN** 从 `@/lib/design-system/tokens/animation` 导入

## MODIFIED Requirements

无

## REMOVED Requirements

### Requirement: 删除局部定义的符号常量

**Reason**: `AVAILABLE_SYMBOLS`、`SYMBOLS` 在多处重复定义
**Migration**: 从 `@/config/constants` 导入

### Requirement: 删除局部定义的链常量

**Reason**: `AVAILABLE_CHAINS`、`SUPPORTED_CHAINS` 在多处重复定义
**Migration**: 从 `@/config/constants` 导入

### Requirement: 删除局部定义的时间范围常量

**Reason**: `TIME_RANGES`、`timeRangeOptions` 在多处重复定义
**Migration**: 从 `@/config/constants` 导入

### Requirement: 删除重复的工具函数定义

**Reason**: `getDeviationColor`、`formatDuration`、`formatNumber` 在多处重复定义
**Migration**: 从 shared/utils 导入

### Requirement: 删除重复的类型定义

**Reason**: `OverviewStats`、`ActionDialogProps`、`BreadcrumbItem`、`HealthStatus` 在多处重复定义
**Migration**: 从 types 目录导入

### Requirement: 删除重复的颜色配置

**Reason**: `statusColors`、`trendColors`、`STATUS_COLORS` 在多处重复定义
**Migration**: 从 design-system/tokens/colors 导入
