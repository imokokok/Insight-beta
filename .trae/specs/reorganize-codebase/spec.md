# 项目代码整理 - 消除重复与统一规范

## Why

项目经过多次迭代开发，存在以下问题需要整理：

1. **重复类型定义** - 多个协议模块中存在相同或相似的类型定义，维护困难
2. **重复工具函数** - 格式化函数在多处重复定义
3. **API 路由重复模式** - Mock 数据生成、错误处理等逻辑重复
4. **空模块占位** - 部分模块存在空占位文件
5. **类型定义分散** - 类型定义路径不一致

## What Changes

- 创建共享类型模块，统一重复的类型定义
- 统一格式化工具函数到 `src/shared/utils/format/`
- 创建 API 路由工具模块，减少重复代码
- 移除或合并空模块占位
- 统一类型导出入口

## Impact

- Affected specs: 所有协议模块
- Affected code:
  - `src/types/` - 新增共享类型
  - `src/features/oracle/*/types/` - 重构为扩展共享类型
  - `src/shared/utils/format/` - 统一格式化函数
  - `src/lib/api/` - 新增 API 工具模块
  - `src/features/dashboard/` - 移除或合并

---

## ADDED Requirements

### Requirement: 共享类型模块

系统 SHALL 创建共享类型模块，统一重复的类型定义。

#### Scenario: GasCostTrendPoint 类型统一

- **WHEN** 定义 GasCostTrendPoint 类型
- **THEN** 应在 `src/types/shared/oracle.ts` 中定义基础类型
- **AND** 各协议模块应扩展此基础类型

#### Scenario: CrossChainPrice 类型统一

- **WHEN** 定义 CrossChainPrice 类型
- **THEN** 应在 `src/types/shared/oracle.ts` 中定义基础类型
- **AND** 所有使用此类型的地方应从共享模块导入

### Requirement: 统一格式化工具函数

系统 SHALL 将格式化函数统一到共享模块。

#### Scenario: formatPrice 函数统一

- **WHEN** 需要格式化价格
- **THEN** 应使用 `src/shared/utils/format/number.ts` 中的 `formatPrice` 函数
- **AND** 移除各模块中的重复定义

#### Scenario: formatGas 和 formatLatency 函数统一

- **WHEN** 需要格式化 Gas 或延迟
- **THEN** 应使用共享模块中的统一函数
- **AND** 移除各模块中的重复定义

### Requirement: API 路由工具模块

系统 SHALL 创建 API 路由工具模块，减少重复代码。

#### Scenario: 查询参数解析

- **WHEN** API 路由需要解析查询参数
- **THEN** 应使用 `src/lib/api/routeUtils.ts` 中的 `parseQueryParams` 函数

#### Scenario: 错误处理

- **WHEN** API 路由需要处理错误
- **THEN** 应使用 `src/lib/api/routeUtils.ts` 中的 `handleApiError` 函数

### Requirement: 空模块清理

系统 SHALL 移除或合并空模块占位。

#### Scenario: dashboard 模块处理

- **WHEN** `src/features/dashboard/` 模块仅包含空占位文件
- **THEN** 应移除该模块
- **AND** 将实际功能合并到 `oracle/dashboard`

### Requirement: 类型导出统一

系统 SHALL 统一类型导出入口。

#### Scenario: 类型导出入口

- **WHEN** 需要导入类型
- **THEN** 应优先从 `src/types/index.ts` 导入
- **AND** 协议特定类型从各模块的 `types/index.ts` 导入

---

## MODIFIED Requirements

### Requirement: 类型定义结构

**原结构**（分散定义）：

```
src/types/
├── crossChainAnalysisTypes.ts  # CrossChainPrice 定义
├── oracle/
│   └── *.ts                    # 各协议类型
src/features/oracle/
├── api3/types/api3.ts          # GasCostTrendPoint 定义
├── chainlink/types/chainlink.ts # GasCostTrendPoint 定义（重复）
├── cross-chain/types/index.ts   # CrossChainPrice 定义（重复）
```

**新结构**（统一共享）：

```
src/types/
├── shared/
│   ├── oracle.ts               # 共享 Oracle 类型
│   └── index.ts
├── oracle/
│   ├── api3.ts                 # API3 特定类型（扩展共享类型）
│   ├── chainlink.ts            # Chainlink 特定类型（扩展共享类型）
│   └── index.ts
├── crossChainAnalysisTypes.ts  # 保留，导入共享类型
└── index.ts                    # 统一导出入口
```

### Requirement: 格式化函数结构

**原结构**（分散定义）：

```
src/features/oracle/chainlink/components/dashboard/formatters.ts  # formatPrice
src/features/cross-chain/utils/format.ts                          # formatPrice（重复）
```

**新结构**（统一共享）：

```
src/shared/utils/format/
├── number.ts      # formatPrice, formatNumber, formatPercentage
├── time.ts        # formatLatency, formatTimestamp, formatDuration
├── blockchain.ts  # formatGas, formatAddress, formatHash
└── index.ts
```

---

## 详细规格

### 1. 共享类型定义

```typescript
// src/types/shared/oracle.ts

export interface GasCostTrendPoint {
  timestamp: string;
  gasUsed: number;
  costEth: number;
  costUsd: number;
  transactionCount: number;
}

export interface GasCostAnalysisDataBase {
  timeRange: '1h' | '24h' | '7d' | '30d';
  trend: GasCostTrendPoint[];
  totalGasUsed: number;
  totalCostEth: number;
  totalCostUsd: number;
  totalTransactions: number;
  generatedAt: string;
}

export interface CrossChainPriceBase {
  chain: string;
  price: number;
  timestamp: string;
  deviation: number;
  confidence?: number;
}
```

### 2. 格式化函数统一

```typescript
// src/shared/utils/format/number.ts

export function formatPrice(price: number, decimals: number = 2): string {
  if (price === null || price === undefined) return 'N/A';
  if (price >= 1_000_000) {
    return `${(price / 1_000_000).toFixed(decimals)}M`;
  }
  if (price >= 1_000) {
    return `${(price / 1_000).toFixed(decimals)}K`;
  }
  return price.toFixed(decimals);
}

// src/shared/utils/format/blockchain.ts

export function formatGas(gwei: number): string {
  if (gwei === null || gwei === undefined) return 'N/A';
  return `${gwei.toFixed(2)} Gwei`;
}

// src/shared/utils/format/time.ts

export function formatLatency(ms: number): string {
  if (ms === null || ms === undefined) return 'N/A';
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}
```

### 3. API 路由工具

```typescript
// src/lib/api/routeUtils.ts

import { NextRequest } from 'next/server';
import { z } from 'zod';

export function parseQueryParams<T extends Record<string, string>>(
  request: NextRequest,
  schema: z.ZodSchema<T>,
): T | { error: string } {
  const { searchParams } = new URL(request.url);
  const params = Object.fromEntries(searchParams.entries());

  const result = schema.safeParse(params);
  if (!result.success) {
    return { error: result.error.message };
  }
  return result.data;
}

export function handleApiError(error: unknown): Response {
  console.error('API Error:', error);

  if (error instanceof Error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ error: 'Internal Server Error' }, { status: 500 });
}

export function createJsonResponse<T>(data: T, status: number = 200): Response {
  return Response.json(data, { status });
}
```

---

## 迁移策略

### Phase 1: 创建共享模块（无破坏性）

1. 创建 `src/types/shared/` 目录和共享类型文件
2. 创建 `src/shared/utils/format/` 目录和格式化函数
3. 创建 `src/lib/api/routeUtils.ts` 工具模块

### Phase 2: 更新导入路径

1. 更新各协议模块的类型导入
2. 更新格式化函数的导入
3. 更新 API 路由使用新工具

### Phase 3: 清理重复代码

1. 移除各模块中重复的类型定义
2. 移除各模块中重复的格式化函数
3. 移除空的模块占位文件

### Phase 4: 验证和测试

1. 运行 TypeScript 类型检查
2. 运行所有测试
3. 验证功能正常

---

## 风险评估

| 风险         | 影响 | 缓解措施                     |
| ------------ | ---- | ---------------------------- |
| 类型不兼容   | 高   | 使用 TypeScript 扩展而非替换 |
| 导入路径错误 | 中   | 使用 TypeScript 自动导入     |
| 功能回归     | 高   | 运行完整测试套件             |
| 构建失败     | 中   | 增量迁移，每步验证构建       |
