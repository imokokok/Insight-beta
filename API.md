# OracleMonitor API Documentation

OracleMonitor API 文档

## 基础信息

- **Base URL**: `http://localhost:3000/api`
- **Content-Type**: `application/json`

## 认证

API 使用 API Key 进行认证。在请求头中添加：

```
Authorization: Bearer YOUR_API_KEY
```

## 端点

### 1. 统一预言机数据

#### GET /oracle/unified

获取统一预言机数据

**Query Parameters:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 是 | 数据类型: `comparison`, `history`, `stats`, `protocols` |
| symbol | string | 否 | 交易对 (例如: ETH/USD) |
| hours | number | 否 | 历史数据小时数 (默认: 24) |

**Response:**

```json
{
  "success": true,
  "data": {
    "symbol": "ETH/USD",
    "prices": [...],
    "avgPrice": 2500.50,
    "medianPrice": 2500.00,
    "maxDeviation": 5.00,
    "maxDeviationPercent": 0.20
  }
}
```

### 2. 价格偏差分析

#### GET /oracle/analytics/deviation

获取价格偏差分析

**Query Parameters:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 是 | 分析类型: `trend`, `report`, `anomalies`, `compare` |
| symbol | string | 条件 | 交易对 (trend/anomalies 必填) |
| symbols | string | 条件 | 多个交易对，逗号分隔 (compare 必填) |

**Response (trend):**

```json
{
  "success": true,
  "data": {
    "symbol": "ETH/USD",
    "trendDirection": "stable",
    "trendStrength": 0.15,
    "avgDeviation": 0.50,
    "maxDeviation": 2.00,
    "volatility": 0.30,
    "anomalyScore": 0.10,
    "recommendation": "Price deviation is within normal ranges."
  }
}
```

### 3. 健康检查

#### GET /health

检查服务健康状态

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0"
}
```

#### GET /health/db

检查数据库连接

#### GET /health/redis

检查 Redis 连接

### 4. WebSocket

**URL**: `ws://localhost:3001`

**消息格式:**

```json
// 订阅价格更新
{
  "type": "subscribe",
  "symbols": ["ETH/USD", "BTC/USD"]
}

// 取消订阅
{
  "type": "unsubscribe",
  "symbols": ["ETH/USD"]
}

// 心跳
{
  "type": "ping"
}
```

**响应消息:**

```json
// 价格更新
{
  "type": "price_update",
  "data": {
    "symbol": "ETH/USD",
    "protocol": "chainlink",
    "price": 2500.50,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}

// 对比更新
{
  "type": "comparison_update",
  "data": {
    "symbol": "ETH/USD",
    "prices": [...],
    "maxDeviation": 5.00
  }
}

// 心跳响应
{
  "type": "pong"
}
```

## 错误处理

### 错误响应格式

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

## 限流

API 限流: 100 请求/分钟

WebSocket 连接限流: 10 连接/IP

## 数据模型

### UnifiedPriceFeed

```typescript
{
  id: string;
  protocol: 'uma' | 'chainlink' | 'pyth' | 'band' | 'api3';
  chain: string;
  symbol: string;
  price: number;
  timestamp: string;
  confidence?: number;
  isStale: boolean;
}
```

### CrossOracleComparison

```typescript
{
  symbol: string;
  prices: PricePoint[];
  avgPrice: number;
  medianPrice: number;
  maxDeviation: number;
  maxDeviationPercent: number;
  recommendedPrice: number;
}
```

## 示例代码

### JavaScript/TypeScript

```typescript
// 获取价格对比
const response = await fetch('/api/oracle/unified?type=comparison&symbol=ETH/USD');
const data = await response.json();

// WebSocket 连接
const ws = new WebSocket('ws://localhost:3001');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'subscribe',
    symbols: ['ETH/USD', 'BTC/USD']
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Price update:', data);
};
```

### cURL

```bash
# 获取价格对比
curl "http://localhost:3000/api/oracle/unified?type=comparison&symbol=ETH/USD"

# 获取偏差报告
curl "http://localhost:3000/api/oracle/analytics/deviation?type=report"

# 健康检查
curl "http://localhost:3000/api/health"
```

## 变更日志

### v1.0.0 (2024-01-15)

- 初始版本发布
- 支持多协议价格聚合
- 添加价格偏差分析
- WebSocket 实时数据流
