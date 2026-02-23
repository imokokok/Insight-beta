# 删除重复无用代码 Spec

## Why

代码库中存在大量重复的组件、函数、类型和常量定义，导致代码维护困难、容易产生不一致行为，并增加了代码体积。清理这些重复代码可以提高代码可维护性和一致性。

## What Changes

- 删除重复的 ExportButton 组件（6个文件合并为通用方案）
- 删除重复的 CHAIN_DISPLAY_NAMES 常量定义（5处合并为1处）
- 删除重复的 CHAIN_COLORS 常量定义（4处合并为1处）
- 统一 getLatencyColor 函数（3处合并为1处）
- 统一 getLatencyStatus 函数（3处合并为1处）
- 统一 formatRelativeTime 函数（4处合并为1处）
- 统一 getStatusConfig 函数（2处合并为1处）
- 清理页面内局部重复的类型定义

## Impact

- Affected specs: 无破坏性变更，所有功能保持不变
- Affected code:
  - `src/features/oracle/*/components/export/ExportButton.tsx` (6个文件)
  - `src/app/oracle/band/page.tsx`
  - `src/features/oracle/band/components/*.tsx`
  - `src/features/cross-chain/components/*.tsx`
  - `src/shared/utils/format/time.ts`
  - `src/shared/utils/format/date.ts`
  - `src/config/chains.ts`

## ADDED Requirements

### Requirement: 统一链相关常量

系统 SHALL 从 `src/config/chains.ts` 统一导出 `CHAIN_DISPLAY_NAMES` 和 `CHAIN_COLORS`，其他文件 SHALL 导入使用而非重复定义。

#### Scenario: 链名称显示一致性

- **WHEN** 任何组件需要显示链名称
- **THEN** 使用 `CHAIN_DISPLAY_NAMES` 从 `@/config/chains` 导入

### Requirement: 统一延迟相关工具函数

系统 SHALL 在 `src/shared/utils/format/time.ts` 中维护 `getLatencyColor` 和 `getLatencyStatus` 函数，其他位置 SHALL 导入使用。

#### Scenario: 延迟颜色显示一致性

- **WHEN** 任何组件需要显示延迟状态颜色
- **THEN** 使用 `getLatencyColor` 从 `@/shared/utils/format/time` 导入

### Requirement: 统一时间格式化函数

系统 SHALL 在 `src/shared/utils/format/date.ts` 中维护 `formatRelativeTime` 函数。

#### Scenario: 相对时间显示一致性

- **WHEN** 任何组件需要显示相对时间
- **THEN** 使用 `formatRelativeTime` 从 `@/shared/utils/format/date` 导入

### Requirement: 创建通用 ExportButton 工厂函数

系统 SHALL 提供一个通用的 ExportButton 工厂函数或泛型组件，支持不同协议的导出配置。

#### Scenario: 协议导出按钮创建

- **WHEN** 需要为新协议创建导出按钮
- **THEN** 使用工厂函数创建，无需创建新文件

## MODIFIED Requirements

### Requirement: Band 模块状态配置

Band 模块的状态配置函数 SHALL 统一提取到 `src/features/oracle/band/utils/statusConfig.ts`。

## REMOVED Requirements

### Requirement: 删除重复的 ExportButton 组件文件

**Reason**: 6个几乎相同的 ExportButton 组件文件可以合并为一个通用方案
**Migration**: 创建工厂函数后，更新导入路径

### Requirement: 删除局部定义的链常量

**Reason**: `CHAIN_DISPLAY_NAMES` 和 `CHAIN_COLORS` 在多处重复定义
**Migration**: 从 `@/config/chains` 导入

### Requirement: 删除重复的工具函数定义

**Reason**: `getLatencyColor`、`getLatencyStatus`、`formatRelativeTime` 在多处重复定义
**Migration**: 从 shared/utils 导入
