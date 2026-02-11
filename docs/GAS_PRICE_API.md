# Gas Price API

实时 Gas 价格查询和分析服务，支持多条区块链和多个数据源。

## 功能特性

### 核心功能
- **实时 Gas 价格** - 从多个数据源获取最新的 Gas 价格
- **多链支持** - 支持 20+ 条区块链
- **多 Provider** - 支持 Etherscan、GasNow、Blocknative、ETH Gas Station、GasPrice.io
- **智能降级** - 自动在多个 Provider 之间切换
- **重试机制** - 指数退避重试策略
- **缓存优化** - 30秒 TTL，减少 API 调用

### 高级功能
- **历史记录** - 保存 Gas 价格历史数据（最多 10000 条）
- **统计分析** - 计算最小值、最大值、平均值、中位数、标准差、百分位数
- **趋势分析** - 计算移动平均线、波动率、价格方向
- **健康检查** - 监控 Provider 的成功率和延迟
- **缓存预热** - 批量预热缓存，提升首次访问速度

## API 端点

### 1. 获取单条链的 Gas 价格

```
GET /api/gas/price?chain=ethereum&provider=etherscan
```

**参数：**
- `chain` (必需) - 区块链名称
- `provider` (可选) - 数据源，默认使用配置的默认 Provider

**响应：**
```json
{
  "ok": true,
  "data": {
    "chain": "ethereum",
    "provider": "etherscan",
    "slow": 15000000000,
    "average": 20000000000,
    "fast": 30000000000,
    "fastest": 50000000000,
    "baseFee": 15000000000,
    "timestamp": "2026-02-11T00:00:00.000Z",
    "currency": "Gwei"
  }
}
```

### 2. 批量获取多条链的 Gas 价格

```
GET /api/gas/prices?chains=ethereum,polygon,bsc,arbitrum
```

**参数：**
- `chains` (必需) - 逗号分隔的区块链列表

**响应：**
```json
{
  "ok": true,
  "data": [
    {
      "chain": "ethereum",
      "provider": "etherscan",
      "slow": 15000000000,
      "average": 20000000000,
      "fast": 30000000000,
      "fastest": 50000000000,
      "timestamp": "2026-02-11T00:00:00.000Z",
      "currency": "Gwei"
    },
    ...
  ]
}
```

### 3. 获取 Gas 价格历史

```
GET /api/gas/history?chain=ethereum&provider=etherscan&limit=100
```

**参数：**
- `chain` (必需) - 区块链名称
- `provider` (可选) - 数据源
- `limit` (可选) - 返回数量，默认 100，最大 1000

**响应：**
```json
{
  "ok": true,
  "data": [
    {
      "chain": "ethereum",
      "provider": "etherscan",
      "priceLevel": "average",
      "price": 20000000000,
      "timestamp": "2026-02-11T00:00:00.000Z"
    },
    ...
  ],
  "meta": {
    "count": 100,
    "chain": "ethereum",
    "provider": "etherscan"
  }
}
```

### 4. 获取 Gas 价格统计

```
GET /api/gas/statistics?chain=ethereum&provider=etherscan&priceLevel=average
```

**参数：**
- `chain` (必需) - 区块链名称
- `provider` (必需) - 数据源
- `priceLevel` (必需) - 价格级别：slow | average | fast | fastest

**响应：**
```json
{
  "ok": true,
  "data": {
    "chain": "ethereum",
    "provider": "etherscan",
    "priceLevel": "average",
    "min": 10000000000,
    "max": 50000000000,
    "avg": 20000000000,
    "median": 19000000000,
    "stdDev": 5000000000,
    "p25": 15000000000,
    "p75": 25000000000,
    "p90": 30000000000,
    "p95": 35000000000,
    "p99": 45000000000,
    "count": 1000,
    "startTime": "2026-02-10T00:00:00.000Z",
    "endTime": "2026-02-11T00:00:00.000Z"
  }
}
```

### 5. 获取 Gas 价格趋势

```
GET /api/gas/trend?chain=ethereum&priceLevel=average
```

**参数：**
- `chain` (必需) - 区块链名称
- `priceLevel` (必需) - 价格级别：slow | average | fast | fastest

**响应：**
```json
{
  "ok": true,
  "data": {
    "chain": "ethereum",
    "priceLevel": "average",
    "direction": "up",
    "changePercent": 15.5,
    "changeValue": 2500000000,
    "ma7": 19000000000,
    "ma24": 18500000000,
    "ma168": 18000000000,
    "volatility": 12.3,
    "timestamp": "2026-02-11T00:00:00.000Z"
  }
}
```

### 6. 获取 Provider 健康状态

```
GET /api/gas/health
```

**响应：**
```json
{
  "ok": true,
  "data": [
    {
      "provider": "etherscan",
      "status": "healthy",
      "successRate": 98.5,
      "avgLatencyMs": 150,
      "lastSuccessTime": "2026-02-11T00:00:00.000Z",
      "consecutiveFailures": 0,
      "totalRequests": 1000,
      "totalSuccesses": 985,
      "totalFailures": 15
    },
    ...
  ],
  "meta": {
    "totalProviders": 5,
    "healthyCount": 4,
    "degradedCount": 1,
    "unhealthyCount": 0
  }
}
```

### 7. 预热缓存

```
POST /api/gas/warmup
```

**请求体：**
```json
{
  "chains": ["ethereum", "polygon", "bsc"]
}
```

**响应：**
```json
{
  "ok": true,
  "message": "Gas price cache warmed up successfully"
}
```

## 支持的区块链

- ethereum
- bsc
- polygon
- avalanche
- arbitrum
- optimism
- base
- solana
- near
- fantom
- celo
- gnosis
- linea
- scroll
- mantle
- mode
- blast
- aptos

## 支持的数据源

| Provider | 支持的链 | 说明 |
|----------|-----------|------|
| etherscan | ETH, BSC, Polygon, Avalanche, Arbitrum, Optimism, Base, FTM, Celo, Gnosis, Blast | 需要配置 API Key |
| gasnow | Ethereum | 免费，无需 API Key |
| blocknative | Ethereum | 免费，无需 API Key |
| ethgasstation | Ethereum | 免费，无需 API Key |
| gasprice.io | 多链 | 可选 API Key |

## 环境变量配置

```bash
# Etherscan API Key (用于获取实时 Gas 价格)
ETHERSCAN_API_KEY=""

# Blocknative API Key (可选)
BLOCKNATIVE_API_KEY=""

# GasPrice.io API Key (可选)
GASPRICE_API_KEY=""
```

## 重试机制配置

默认重试配置：
- 最大重试次数：3
- 初始延迟：1000ms
- 最大延迟：10000ms
- 退避倍数：2

重试延迟计算：
```
delay = min(initialDelay * backoffMultiplier ^ attempt, maxDelay)
```

## 缓存策略

- **缓存 TTL**：30 秒（可配置）
- **最大历史记录**：10000 条
- **Provider 统计**：保留最近 100 次请求的延迟数据

## Provider 健康状态

- **healthy**：成功率 >= 80% 且连续失败 < 3 次
- **degraded**：成功率 < 80% 或连续失败 >= 3 次
- **unhealthy**：成功率 < 50% 或连续失败 >= 5 次

## 使用示例

### 前端使用

```typescript
import { gasPriceService } from '@/server/gas';

// 获取单条链的 Gas 价格
const gasPrice = await gasPriceService.getGasPrice('ethereum');

// 批量获取多条链的 Gas 价格
const gasPrices = await gasPriceService.getGasPricesForChains(['ethereum', 'polygon', 'bsc']);

// 获取历史记录
const history = gasPriceService.getHistory('ethereum', 'etherscan', 100);

// 获取统计数据
const stats = gasPriceService.getStatistics('ethereum', 'etherscan', 'average');

// 获取趋势
const trend = gasPriceService.getTrend('ethereum', 'average');

// 获取 Provider 健康状态
const health = gasPriceService.getProviderHealth();

// 预热缓存
await gasPriceService.warmCache(['ethereum', 'polygon', 'bsc']);
```

### API 调用

```bash
# 获取 Ethereum 的 Gas 价格
curl "http://localhost:3000/api/gas/price?chain=ethereum"

# 批量获取多条链的 Gas 价格
curl "http://localhost:3000/api/gas/prices?chains=ethereum,polygon,bsc"

# 获取历史记录
curl "http://localhost:3000/api/gas/history?chain=ethereum&limit=100"

# 获取统计数据
curl "http://localhost:3000/api/gas/statistics?chain=ethereum&provider=etherscan&priceLevel=average"

# 获取趋势
curl "http://localhost:3000/api/gas/trend?chain=ethereum&priceLevel=average"

# 获取 Provider 健康状态
curl "http://localhost:3000/api/gas/health"

# 预热缓存
curl -X POST "http://localhost:3000/api/gas/warmup" \
  -H "Content-Type: application/json" \
  -d '{"chains": ["ethereum", "polygon", "bsc"]}'
```

## 集成到跨链分析

Gas 价格服务已集成到跨链分析服务中，用于：
- 计算跨链套利的 Gas 成本
- 提供更准确的套利利润估算
- 自动降级到估算值（当所有 Provider 失败时）

## 注意事项

1. **API 限流**：某些 Provider 有 API 限流，建议配置多个 Provider
2. **缓存预热**：应用启动时建议预热缓存，提升首次访问速度
3. **历史记录**：历史记录保存在内存中，服务重启后会丢失
4. **Provider 选择**：建议根据实际使用情况选择合适的 Provider
5. **重试策略**：网络不稳定时，重试机制可以提升成功率
