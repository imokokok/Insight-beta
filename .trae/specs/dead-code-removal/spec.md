# 死代码清理 - Product Requirement Document

## Why

项目存在大量未使用的代码（约 3400+ 行），包括未使用的 hooks、组件、类型定义和整个目录。这些死代码增加了代码库的维护成本、影响代码可读性，并可能导致混淆。

## What Changes

- 删除 8 个未使用的 hooks
- 删除 18+ 个未使用的组件
- 删除整个 `features/protocol` 目录（所有组件均未被使用）
- 删除未使用的类型定义
- 删除重复的组件
- 删除未使用的工具函数
- **BREAKING**: 移除所有未导出或未引用的公共 API

## Impact

- Affected specs: 无
- Affected code:
  - `src/hooks/` - 4 个文件
  - `src/features/*/hooks/` - 4 个文件
  - `src/features/protocol/` - 整个目录
  - `src/components/` - 多个组件
  - `src/features/*/components/` - 多个组件
  - `src/types/` - 部分类型
  - `src/lib/analytics/` - deviation.ts

## ADDED Requirements

### Requirement: 死代码清理

系统 SHALL 不包含任何未使用的导出代码。

#### Scenario: 删除未使用的 hooks

- **WHEN** 一个 hook 仅在 index.ts 中导出但从未被其他文件引用
- **THEN** 该 hook 文件及其导出应被删除

#### Scenario: 删除未使用的组件

- **WHEN** 一个组件未被任何页面或其他组件引用
- **THEN** 该组件文件应被删除

#### Scenario: 删除未使用的目录

- **WHEN** 整个目录下的所有组件均未被使用
- **THEN** 该目录应被完全删除

#### Scenario: 删除重复组件

- **WHEN** 存在功能相同的重复组件
- **THEN** 保留一个，删除其他重复项

## MODIFIED Requirements

无

## REMOVED Requirements

### Requirement: 未使用的代码

**Reason**: 这些代码从未被使用或已被替代方案取代

**Migration**: 无需迁移，这些代码没有使用者

---

## 详细清理清单

### 高优先级（立即删除）

| 类型 | 文件路径                                             | 原因             |
| ---- | ---------------------------------------------------- | ---------------- |
| 目录 | `src/features/protocol/`                             | 整个目录未被使用 |
| Hook | `src/hooks/useWebSocket.ts`                          | 无引用           |
| Hook | `src/hooks/useSSE.ts`                                | 无引用           |
| Hook | `src/hooks/useQuery.ts`                              | 无引用           |
| Hook | `src/hooks/useAdminToken.ts`                         | 无引用           |
| Hook | `src/features/explore/hooks/usePreferences.ts`       | 无引用           |
| Hook | `src/features/oracle/hooks/useOracle.ts`             | 无引用           |
| Hook | `src/features/oracle/hooks/usePlatformStats.ts`      | 无引用           |
| Hook | `src/features/dashboard/hooks/useDashboard.ts`       | 无引用           |
| 组件 | `src/components/security/ThreatLevelBadge.tsx`       | 重复             |
| 组件 | `src/components/dashboard/ProfessionalDashboard.tsx` | 无引用           |
| 组件 | `src/components/charts/EnhancedChartComponents.tsx`  | 无引用           |

### 中优先级（确认后删除）

| 类型 | 文件路径                                                          | 原因       |
| ---- | ----------------------------------------------------------------- | ---------- |
| 组件 | `src/features/cross-chain/components/CrossChainDashboardCard.tsx` | 无外部引用 |
| 组件 | `src/features/oracle/components/ProtocolHealthGrid.tsx`           | 无外部引用 |
| 组件 | `src/features/oracle/components/ProtocolSidebar.tsx`              | 无外部引用 |
| 组件 | `src/features/oracle/components/Leaderboard.tsx`                  | 无外部引用 |
| 组件 | `src/features/oracle/components/PriceFeedList.tsx`                | 无外部引用 |
| 组件 | `src/features/oracle/dashboard/components/HealthStatusBadge.tsx`  | 无外部引用 |
| 组件 | `src/features/explore/components/FavoritesList.tsx`               | 无外部引用 |
| 组件 | `src/features/dashboard/components/KPICards.tsx`                  | 无引用     |
| 组件 | `src/features/dashboard/components/ProtocolBadge.tsx`             | 无引用     |
| 组件 | `src/features/dashboard/components/QuickActionsPanel.tsx`         | 无引用     |
| 工具 | `src/lib/analytics/deviation.ts`                                  | 无引用     |

### 类型定义清理

| 类型名称                         | 文件                         | 原因   |
| -------------------------------- | ---------------------------- | ------ |
| `CrossChainAnalysisType`         | `crossChainAnalysisTypes.ts` | 无引用 |
| `CrossChainArbitrageOpportunity` | `crossChainAnalysisTypes.ts` | 无引用 |
| `CrossProtocolComparison`        | `unifiedOracleTypes.ts`      | 无引用 |

### 重复组件清理

| 保留                                                    | 删除                                           |
| ------------------------------------------------------- | ---------------------------------------------- |
| `src/features/security/components/ThreatLevelBadge.tsx` | `src/components/security/ThreatLevelBadge.tsx` |
