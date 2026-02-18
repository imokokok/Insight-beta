# 数据来源评估分析 Spec

## Why

用户想了解项目当前的数据来源是模拟数据还是真实数据，以便了解系统的实际运行状态和配置需求。

## What Changes

- 分析项目数据来源配置
- 评估模拟数据与真实数据的使用情况
- 提供数据源配置建议

## Impact

- Affected specs: 数据获取服务
- Affected code: `priceFetcher.ts`, `realDataService.ts`, `PriceAggregationEngine`

---

## 数据来源分析

### 1. 当前数据源配置

#### 环境变量控制

| 环境变量                           | 默认值  | 作用           |
| ---------------------------------- | ------- | -------------- |
| `INSIGHT_DEMO_MODE`                | `false` | 演示模式开关   |
| `INSIGHT_REFERENCE_PRICE_PROVIDER` | `mock`  | 参考价格数据源 |

#### 关键发现

**默认配置使用模拟数据！**

在 [priceFetcher.ts](file:///Users/imokokok/Documents/foresight-build/insight-beta/src/features/oracle/services/priceFetcher.ts) 中：

```typescript
const provider = (env.INSIGHT_REFERENCE_PRICE_PROVIDER || 'mock').trim().toLowerCase();
```

**默认值为 `mock`，意味着默认使用模拟数据。**

---

### 2. 数据源详细分析

#### A. 模拟数据模式 (默认)

当 `INSIGHT_REFERENCE_PRICE_PROVIDER = 'mock'` 时：

**位置**: [priceFetcher.ts:504-513](file:///Users/imokokok/Documents/foresight-build/insight-beta/src/features/oracle/services/priceFetcher.ts#L504-L513)

```typescript
function syntheticSpotUsd(sym: string) {
  const basePrice = (SYNTHETIC_PRICES[symbol] ?? SYNTHETIC_PRICES.DEFAULT) as number;
  const time = Date.now();
  const trend =
    Math.sin(time / SYNTHETIC_TREND_PERIOD_MS) * (basePrice * SYNTHETIC_TREND_AMPLITUDE);
  const noise = (secureRandom() - 0.5) * (basePrice * SYNTHETIC_NOISE_AMPLITUDE);
  const refPrice = basePrice + trend + noise;
  return Number(refPrice.toFixed(2));
}
```

**模拟数据特点**：

- BTC 基础价格: $65,000
- ETH 基础价格: $3,500
- 默认价格: $100
- 7天周期趋势波动 (±10%)
- 随机噪声 (±2%)

---

#### B. 真实数据模式

当配置了真实数据源时，系统支持以下真实数据来源：

**1. Binance API (推荐)**

- 现货价格: `https://api.binance.com/api/v3/ticker/price`
- 历史K线: `https://api.binance.com/api/v3/klines`

**2. Coinbase API (备用)**

- 现货价格: `https://api.exchange.coinbase.com/products/{symbol}-USD/ticker`
- 历史K线: `https://api.exchange.coinbase.com/products/{symbol}-USD/candles`

**3. DEX TWAP (链上数据)**

- 需要 RPC URL 配置
- 需要 Pool 地址配置 (`INSIGHT_DEX_TWAP_POOL`)

---

#### C. 预言机数据聚合

**位置**: [PriceAggregationEngine](file:///Users/imokokok/Documents/foresight-build/insight-beta/src/services/oracle/priceAggregation/engine.ts)

**数据来源**: 从数据库 `unified_price_feeds` 表读取

**关键代码**:

```sql
SELECT * FROM unified_price_feeds
WHERE symbol = $1
  AND timestamp > NOW() - INTERVAL '5 minutes'
  AND is_stale = false
```

**注意**: 这需要预言机同步服务将数据写入数据库！

---

### 3. 真实数据服务 (未充分使用)

**位置**: [realDataService.ts](file:///Users/imokokok/Documents/foresight-build/insight-beta/src/features/oracle/services/realDataService.ts)

**功能**:

- `fetchChainlinkPrices()`: 从 Chainlink 合约获取真实价格
- `fetchPythPrices()`: 从 Pyth API 获取真实价格
- `generateRealHeatmapData()`: 生成真实热力图数据

**问题**: 该服务存在但未被主要 API 路由使用！

---

### 4. 当前状态总结

| 数据类型           | 状态          | 数据源             |
| ------------------ | ------------- | ------------------ |
| **参考价格**       | ⚠️ 模拟数据   | `mock` 模式 (默认) |
| **预言机价格**     | ⚠️ 依赖数据库 | 需要同步服务       |
| **热力图数据**     | ⚠️ 依赖数据库 | 需要同步服务       |
| **实时对比**       | ⚠️ 依赖数据库 | 需要同步服务       |
| **Chainlink 数据** | ✅ 代码存在   | 需要配置 RPC       |
| **Pyth 数据**      | ✅ 代码存在   | HTTP API 可用      |

---

### 5. 切换到真实数据的配置

#### 方案 A: 使用交易所 API (最简单)

```env
# .env.local
INSIGHT_REFERENCE_PRICE_PROVIDER="binance"
# 或
INSIGHT_REFERENCE_PRICE_PROVIDER="coinbase"
```

**优点**: 无需额外配置，免费使用
**缺点**: 仅获取参考价格，无预言机数据

---

#### 方案 B: 使用预言机数据 (推荐)

```env
# .env.local
INSIGHT_REFERENCE_PRICE_PROVIDER="binance"

# RPC 配置
ALCHEMY_API_KEY="your-alchemy-key"
# 或
ETHEREUM_RPC_URL="https://eth-mainnet.g.alchemy.com/v2/your-key"
POLYGON_RPC_URL="https://polygon-mainnet.g.alchemy.com/v2/your-key"
ARBITRUM_RPC_URL="https://arb-mainnet.g.alchemy.com/v2/your-key"
```

**需要启动预言机同步服务**:

- Chainlink 同步
- Pyth 同步
- RedStone 同步

---

### 6. 结论

**当前状态**: 项目默认使用模拟数据

**原因**:

1. `INSIGHT_REFERENCE_PRICE_PROVIDER` 默认为 `mock`
2. 预言机同步服务可能未运行
3. 数据库中可能没有真实价格数据

**建议**:

1. **快速切换**: 设置 `INSIGHT_REFERENCE_PRICE_PROVIDER="binance"` 即可获取真实参考价格
2. **完整方案**: 配置 RPC + 启动预言机同步服务
3. **检查数据**: 查看 `unified_price_feeds` 表是否有数据
