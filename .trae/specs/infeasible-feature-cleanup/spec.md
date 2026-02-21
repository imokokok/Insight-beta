# 不可行功能代码清理 Spec

## Why

项目中存在两个技术上难以实现的功能（OEV 分析、流动性分析），之前只做了"软性调整"，现在需要将功能完整转型为可行的监控功能。

## What Changes

### OEV 分析 → 价格更新监控

- 移除：OEV 金额估算（totalOev, oevAmount, avgOevPerEvent）
- 移除：按 dAPI 分布的 OEV 价值图表
- 移除：按链分布的 OEV 价值图表
- 移除：OEV 趋势图
- 保留：价格更新事件列表
- 新增：更新频率统计
- 新增：更新延迟监控

### 流动性分析 → 链状态概览

- 移除：流动性金额展示（totalLiquidity, avgLiquidity）
- 移除：流动性分布图表
- 移除：TVL、交易量等 mock 数据
- 保留：链健康状态
- 新增：链响应时间监控
- 新增：预言机数据新鲜度

## Impact

- Affected specs: oracle-feasibility-analysis
- Affected code:
  - `src/features/oracle/api3/components/OevOverview.tsx` → 重命名为 `PriceUpdateMonitor.tsx`
  - `src/features/cross-chain/components/LiquidityDistribution.tsx` → 重命名为 `ChainStatusOverview.tsx`
  - `src/app/api/oracle/api3/oev/route.ts` → 重命名为 `price-updates/route.ts`
  - `src/app/api/cross-chain/liquidity/route.ts` → 重命名为 `chain-status/route.ts`
  - 相关类型定义文件
  - 国际化文件

---

## 详细需求

### Requirement 1: 价格更新监控（原 OEV）

OevOverview 组件 SHALL 转型为 PriceUpdateMonitor 组件，提供以下功能：

#### Scenario: 显示价格更新统计

- **WHEN** 用户访问 API3 页面的"价格更新"标签
- **THEN** 显示价格更新频率统计（每分钟更新次数）
- **AND** 显示平均更新延迟
- **AND** 显示各 dAPI 的更新状态

#### Scenario: 显示价格更新事件列表

- **WHEN** 用户查看价格更新事件
- **THEN** 显示最近的价格更新事件
- **AND** 每个事件包含：dAPI 名称、链、更新时间、价格值
- **AND** 不显示 OEV 金额

### Requirement 2: 链状态概览（原流动性）

LiquidityDistribution 组件 SHALL 转型为 ChainStatusOverview 组件，提供以下功能：

#### Scenario: 显示链健康状态

- **WHEN** 用户访问跨链分析页面
- **THEN** 显示各链的健康状态
- **AND** 显示各链的响应时间
- **AND** 显示数据新鲜度（最后更新时间）

#### Scenario: 不显示流动性数据

- **WHEN** 用户查看链状态概览
- **THEN** 不显示流动性金额
- **AND** 不显示 TVL 数据
- **AND** 不显示交易量数据

---

## REMOVED Requirements

### Requirement: OEV 金额估算

**Reason**: OEV 数据本质不透明，无法准确获取
**Migration**: 移除所有 OEV 金额相关展示，保留价格更新事件

### Requirement: 流动性金额分析

**Reason**: 需要接入多个 DEX API，基础设施成本高
**Migration**: 移除流动性金额展示，保留链健康状态
