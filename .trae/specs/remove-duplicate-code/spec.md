# 删除重复无用代码规范

## Why

代码库中存在大量重复代码，包括类型定义、组件、工具函数和常量配置，导致维护困难、代码膨胀和潜在的不一致问题。

## What Changes

- 删除 4 个完全相同的 TopStatusBar 组件，创建统一共享组件
- 删除 4 个相似的 KpiOverview 组件，创建通用组件
- 统一 AlertSeverity 和 AlertStatus 类型定义（4 处重复）
- 统一 SupportedChain 和 ChainInfo 类型定义（4 处重复）
- 统一 OracleProtocol 相关常量（3 处重复）
- 整合价格相关类型定义（10+ 处重复）
- 统一 SUPPORTED_CHAINS 常量（3 处重复）
- 整合缓存模块（3 处重叠）
- **BREAKING** 部分导入路径将变更

## Impact

- Affected specs: 类型系统、Oracle 组件、API 路由
- Affected code:
  - `src/features/oracle/*/components/dashboard/` - 组件重复
  - `src/types/` - 类型重复
  - `src/config/constants.ts` - 常量重复
  - `src/lib/cache/` 和 `src/lib/api/` - 缓存模块重叠

## ADDED Requirements

### Requirement: 统一 TopStatusBar 组件

系统 SHALL 提供单一的共享 TopStatusBar 组件，位于 `src/features/oracle/components/shared/TopStatusBar.tsx`。

#### Scenario: 组件重构成功

- **WHEN** 删除 4 个重复的 TopStatusBar 组件
- **THEN** 所有 Oracle 协议（Chainlink、Pyth、API3、Band）使用统一的共享组件

### Requirement: 统一 KpiOverview 组件

系统 SHALL 提供通用的 KpiOverview 组件，接受配置对象作为 props。

#### Scenario: 组件重构成功

- **WHEN** 删除 4 个相似的 KpiOverview 组件
- **THEN** 所有 Oracle 协议使用统一的通用组件

### Requirement: 统一类型定义

系统 SHALL 从单一来源导出所有共享类型。

#### Scenario: 类型导入统一

- **WHEN** 重构类型导入
- **THEN** AlertSeverity/AlertStatus 从 `@/types/common/status` 导入
- **AND** SupportedChain/ChainInfo 从 `@/types/chains` 导入
- **AND** OracleProtocol 相关类型从 `@/types/oracle/protocol` 导入

### Requirement: 统一价格类型

系统 SHALL 在 `src/types/price.ts` 中定义所有价格相关类型。

#### Scenario: 价格类型整合

- **WHEN** 创建统一价格类型文件
- **THEN** PricePoint、PriceHistoryRecord、PriceUpdate 等类型从该文件导入

## MODIFIED Requirements

### Requirement: 更新导入路径

所有受影响的文件 SHALL 更新导入路径以使用统一的类型和组件来源。

## REMOVED Requirements

### Requirement: 删除重复组件

**Reason**: 代码重复，维护成本高
**Migration**: 使用统一的共享组件替代

删除以下文件：

- `src/features/oracle/chainlink/components/dashboard/TopStatusBar.tsx`
- `src/features/oracle/pyth/components/dashboard/PythTopStatusBar.tsx`
- `src/features/oracle/api3/components/dashboard/Api3TopStatusBar.tsx`
- `src/features/oracle/band/components/dashboard/BandTopStatusBar.tsx`

### Requirement: 删除重复类型定义

**Reason**: 类型重复定义导致混乱
**Migration**: 从统一位置导入

删除/修改以下文件中的重复定义：

- `src/config/constants.ts` 中的 SupportedChain 和 ChainInfo
- `src/types/unifiedOracleTypes.ts` 中的重复类型
- `src/lib/blockchain/walletConnect.ts` 中的 SUPPORTED_CHAINS
