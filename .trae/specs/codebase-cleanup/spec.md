# 项目代码全面整理规范

## Why

项目代码存在大量重复代码、类型定义分散、命名不一致等问题，影响代码可维护性和开发效率。需要进行全面整理以提高代码质量和可维护性。

## What Changes

- **统一类型定义**：合并重复的类型定义，建立清晰的类型层次结构
- **提取重复函数**：将重复的函数提取到共享模块
- **统一常量定义**：合并重复的常量和配置
- **清理空文件**：删除或补充空的工具文件
- **修复类型问题**：消除 any 类型使用，完善类型定义
- **优化目录结构**：整理类型导出，统一命名规范

## Impact

- Affected specs: 无直接影响
- Affected code:
  - `src/types/` - 类型定义重构
  - `src/features/alerts/` - 告警相关代码
  - `src/features/oracle/` - Oracle 相关代码
  - `src/shared/utils/` - 共享工具函数
  - `src/lib/design-system/` - 设计系统常量

## ADDED Requirements

### Requirement: 统一类型定义

系统 SHALL 将分散的类型定义统一到 `src/types/` 目录下，确保每个类型只有一个定义来源。

#### Scenario: 合并 AlertSeverity 类型

- **WHEN** 存在多个 AlertSeverity 类型定义时
- **THEN** 统一到 `src/types/common/status.ts`，删除其他重复定义

#### Scenario: 合并 Oracle 相关类型

- **WHEN** `oracleTypes.ts` 和 `unifiedOracleTypes.ts` 存在重复时
- **THEN** 保留 `unifiedOracleTypes.ts`，删除 `oracleTypes.ts` 中的重复部分

### Requirement: 提取重复函数

系统 SHALL 将重复的函数实现提取到共享模块中。

#### Scenario: 提取 normalize 函数

- **WHEN** `normalizeSeverity` 和 `normalizeStatus` 函数在多处重复定义时
- **THEN** 提取到 `src/features/alerts/utils/normalize.ts`

#### Scenario: 统一格式化函数

- **WHEN** `formatNumber` 函数在多处重复定义时
- **THEN** 统一使用 `src/shared/utils/format/number.ts` 中的实现

### Requirement: 统一常量定义

系统 SHALL 将重复的常量定义合并到统一位置。

#### Scenario: 合并状态颜色常量

- **WHEN** `STATUS_COLORS` 和 `SEVERITY_COLORS` 在多处定义时
- **THEN** 统一到 `src/lib/design-system/tokens/colors.ts`

#### Scenario: 合并 severity 配置

- **WHEN** `severityConfig` 在多处重复定义时
- **THEN** 提取到 `src/features/alerts/constants/severityConfig.ts`

### Requirement: 清理空文件

系统 SHALL 清理或补充空的导出文件。

#### Scenario: 清理空 hooks 文件

- **WHEN** `src/features/security/hooks/index.ts` 和 `src/features/dashboard/hooks/index.ts` 为空时
- **THEN** 删除这些文件或添加占位注释

### Requirement: 修复类型问题

系统 SHALL 消除代码中的 any 类型使用。

#### Scenario: 修复路由类型

- **WHEN** `QuickSearch.tsx` 中使用 `as any` 进行路由跳转时
- **THEN** 使用正确的类型定义

#### Scenario: 修复 WalletConnect 类型

- **WHEN** `walletConnect.ts` 中使用 `any` 类型时
- **THEN** 定义正确的 EthereumProvider 类型

## MODIFIED Requirements

无

## REMOVED Requirements

无
