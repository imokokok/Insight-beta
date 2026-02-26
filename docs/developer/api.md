# API 使用指南

本文档详细介绍 Insight API 的使用方法和最佳实践。

## 目录

- [概述](#概述)
- [认证](#认证)
- [API 端点](#api-端点)
- [Swagger UI](#swagger-ui)
- [请求示例](#请求示例)
- [错误处理](#错误处理)
- [速率限制](#速率限制)

---

## 概述

Insight 提供完整的 RESTful API，支持程序化访问预言机数据和分析功能。

### 基础 URL

```
开发环境: http://localhost:3000/api
生产环境: https://your-domain.com/api
```

### API 版本

当前 API 版本: v1 (未在 URL 中显式表示)

---

## 认证

### API Key 认证

部分 API 端点需要 API Key 认证：

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" https://your-domain.com/api/alerts/rules
```

### 管理员令牌

管理操作需要管理员令牌：

```bash
curl -H "X-Admin-Token: YOUR_ADMIN_TOKEN" https://your-domain.com/api/admin/config
```

### 公开端点

以下端点无需认证：

- `/api/health`
- `/api/oracle/*` (大部分预言机数据端点)
- `/api/comparison/*`
- `/api/explore/*`
- `/api/docs/*`

---

## API 端点

### 健康检查

| 端点          | 方法 | 描述                       |
| ------------- | ---- | -------------------------- |
| `/api/health` | GET  | 健康检查，支持多种探针类型 |

**查询参数**:

- `probe`: 探针类型 (`liveness`, `readiness`, `validation`)

**响应示例**:

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected",
  "environment": "development"
}
```

### 告警系统

| 端点                             | 方法           | 描述              |
| -------------------------------- | -------------- | ----------------- |
| `/api/alerts`                    | GET            | 获取告警列表      |
| `/api/alerts/[id]`               | GET            | 获取告警详情      |
| `/api/alerts/batch`              | POST           | 批量告警操作      |
| `/api/alerts/history`            | GET            | 告警历史          |
| `/api/alerts/response-time`      | GET            | 响应时间统计      |
| `/api/alerts/rules`              | GET/POST       | 获取/创建告警规则 |
| `/api/alerts/rules/[id]`         | GET/PUT/DELETE | 告警规则 CRUD     |
| `/api/alerts/channels`           | GET/POST       | 获取/创建通知渠道 |
| `/api/alerts/channels/[id]`      | GET/PUT/DELETE | 通知渠道 CRUD     |
| `/api/alerts/channels/[id]/test` | POST           | 测试通知渠道      |

### 预言机数据

#### Chainlink

| 端点                                   | 方法 | 描述                      |
| -------------------------------------- | ---- | ------------------------- |
| `/api/oracle/chainlink/feeds`          | GET  | 获取 Chainlink 价格源列表 |
| `/api/oracle/chainlink/feed/[address]` | GET  | 获取指定价格源详情        |
| `/api/oracle/chainlink/deviation`      | GET  | 获取偏差分析数据          |
| `/api/oracle/chainlink/ocr`            | GET  | 获取 OCR 轮次数据         |
| `/api/oracle/chainlink/operators`      | GET  | 获取节点运营商列表        |
| `/api/oracle/chainlink/overview`       | GET  | Chainlink 概览            |
| `/api/oracle/chainlink/gas`            | GET  | Gas 价格分析              |
| `/api/oracle/chainlink/heartbeat`      | GET  | 心跳状态                  |
| `/api/oracle/chainlink/quality`        | GET  | 数据质量分析              |
| `/api/oracle/chainlink/stats`          | GET  | 统计数据                  |

#### Pyth

| 端点                                  | 方法 | 描述                |
| ------------------------------------- | ---- | ------------------- |
| `/api/oracle/pyth/prices`             | GET  | 获取 Pyth 价格数据  |
| `/api/oracle/pyth/publishers`         | GET  | 获取 Publisher 列表 |
| `/api/oracle/pyth/publisher-history`  | GET  | Publisher 历史      |
| `/api/oracle/pyth/confidence-history` | GET  | 置信区间历史        |
| `/api/oracle/pyth/stats`              | GET  | 统计数据            |
| `/api/oracle/pyth/hermes`             | GET  | Hermes 数据         |
| `/api/oracle/pyth/updates`            | GET  | 更新数据            |

#### API3

| 端点                                 | 方法 | 描述              |
| ------------------------------------ | ---- | ----------------- |
| `/api/oracle/api3/dapis`             | GET  | 获取 dAPIs 列表   |
| `/api/oracle/api3/airnodes`          | GET  | 获取 Airnode 列表 |
| `/api/oracle/api3/airnode/[address]` | GET  | Airnode 详情      |
| `/api/oracle/api3/prices`            | GET  | 价格数据          |
| `/api/oracle/api3/oev`               | GET  | OEV 数据          |
| `/api/oracle/api3/frequency`         | GET  | 频率分析          |
| `/api/oracle/api3/alerts`            | GET  | 告警数据          |
| `/api/oracle/api3/verify`            | GET  | 验证数据          |

#### Band Protocol

| 端点                              | 方法 | 描述               |
| --------------------------------- | ---- | ------------------ |
| `/api/oracle/band/prices`         | GET  | 获取 Band 价格数据 |
| `/api/oracle/band/prices/history` | GET  | 价格历史           |
| `/api/oracle/band/sources`        | GET  | 获取数据源列表     |
| `/api/oracle/band/validators`     | GET  | 获取验证者列表     |
| `/api/oracle/band/bridges`        | GET  | 跨链桥状态         |
| `/api/oracle/band/comparison`     | GET  | 比较分析           |
| `/api/oracle/band/freshness`      | GET  | 数据新鲜度         |
| `/api/oracle/band/quality`        | GET  | 数据质量           |
| `/api/oracle/band/aggregation`    | GET  | 聚合数据           |
| `/api/oracle/band/ibc`            | GET  | IBC 数据           |
| `/api/oracle/band/cosmos`         | GET  | Cosmos 数据        |
| `/api/oracle/band/transfers`      | GET  | 转账记录           |

#### UMA

| 端点                         | 方法 | 描述           |
| ---------------------------- | ---- | -------------- |
| `/api/oracle/uma/assertions` | GET  | 获取断言列表   |
| `/api/oracle/uma/votes`      | GET  | 获取投票记录   |
| `/api/oracle/uma/voters`     | GET  | 获取投票者列表 |
| `/api/oracle/uma/health`     | GET  | 健康状态       |
| `/api/oracle/uma/tvl`        | GET  | TVL 数据       |

#### 通用预言机端点

| 端点                                | 方法 | 描述         |
| ----------------------------------- | ---- | ------------ |
| `/api/oracle/config`                | GET  | 预言机配置   |
| `/api/oracle/stats`                 | GET  | 统计数据     |
| `/api/oracle/sync`                  | GET  | 同步状态     |
| `/api/oracle/protocols/[protocol]`  | GET  | 特定协议数据 |
| `/api/oracle/reliability`           | GET  | 可靠性评分   |
| `/api/oracle/reliability/calculate` | POST | 计算可靠性   |
| `/api/oracle/history/prices`        | GET  | 历史价格     |
| `/api/oracle/history/collect`       | POST | 收集历史数据 |

### 价格比较

| 端点                               | 方法 | 描述                   |
| ---------------------------------- | ---- | ---------------------- |
| `/api/comparison/realtime`         | GET  | 实时价格比较           |
| `/api/comparison/heatmap`          | GET  | 价格偏差热力图         |
| `/api/comparison/latency`          | GET  | 延迟分析               |
| `/api/comparison/metrics`          | GET  | 指标数据               |
| `/api/comparison/api3-chainlink`   | GET  | API3 与 Chainlink 比较 |
| `/api/comparison/[symbol]/history` | GET  | 指定交易对历史比较     |

### 跨链分析

| 端点                            | 方法 | 描述         |
| ------------------------------- | ---- | ------------ |
| `/api/cross-chain/comparison`   | GET  | 跨链价格比较 |
| `/api/cross-chain/correlation`  | GET  | 相关性分析   |
| `/api/cross-chain/liquidity`    | GET  | 流动性分析   |
| `/api/cross-chain/bridges`      | GET  | 跨链桥状态   |
| `/api/cross-chain/dashboard`    | GET  | 跨链仪表板   |
| `/api/cross-chain/history`      | GET  | 跨链历史     |
| `/api/cross-chain/chain-status` | GET  | 链状态       |

### 数据探索

| 端点                           | 方法 | 描述       |
| ------------------------------ | ---- | ---------- |
| `/api/explore/market-overview` | GET  | 市场概览   |
| `/api/explore/trending`        | GET  | 热门价格源 |
| `/api/explore/search`          | GET  | 搜索       |
| `/api/explore/discovery`       | GET  | 数据发现   |

### 实时数据

| 端点             | 方法 | 描述             |
| ---------------- | ---- | ---------------- |
| `/api/sse/price` | GET  | SSE 实时价格推送 |

### Cron 任务

| 端点                                | 方法 | 描述           |
| ----------------------------------- | ---- | -------------- |
| `/api/cron/price-collection`        | POST | 价格收集任务   |
| `/api/cron/reliability-calculation` | POST | 可靠性计算任务 |

### API 文档

| 端点                     | 方法 | 描述              |
| ------------------------ | ---- | ----------------- |
| `/api/docs`              | GET  | API 文档主页      |
| `/api/docs/swagger`      | GET  | Swagger UI 界面   |
| `/api/docs/openapi.json` | GET  | OpenAPI 规范 JSON |

### 指标

| 端点           | 方法 | 描述            |
| -------------- | ---- | --------------- |
| `/api/metrics` | GET  | Prometheus 指标 |

---

## Swagger UI

Insight 提供交互式 API 文档，使用 Swagger UI：

```
http://localhost:3000/api/docs/swagger
```

功能：

- 查看所有 API 端点
- 在线测试 API
- 查看请求/响应示例
- 导出 OpenAPI 规范
- 查看请求参数和响应 schema

### 生成 API 文档

```bash
npm run docs:api
```

---

## 请求示例

### 健康检查

```bash
# 基础健康检查
curl http://localhost:3000/api/health

# Liveness 探针
curl "http://localhost:3000/api/health?probe=liveness"

# Readiness 探针
curl "http://localhost:3000/api/health?probe=readiness"

# Validation 探针
curl "http://localhost:3000/api/health?probe=validation"
```

### 获取 Chainlink 价格源列表

```bash
curl https://your-domain.com/api/oracle/chainlink/feeds
```

响应示例：

```json
{
  "feeds": [
    {
      "address": "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
      "symbol": "ETH/USD",
      "price": "2000.50",
      "decimals": 8,
      "lastUpdated": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 创建告警规则

```bash
curl -X POST https://your-domain.com/api/alerts/rules \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "name": "ETH 价格偏差告警",
    "symbol": "ETH/USD",
    "condition": "deviation",
    "threshold": 1.0,
    "channels": ["email", "telegram"]
  }'
```

### 订阅实时价格

```javascript
const eventSource = new EventSource('/api/sse/price?symbol=ETH/USD');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Price update:', data);
};

eventSource.onerror = (error) => {
  console.error('SSE Error:', error);
  eventSource.close();
};
```

### 获取告警历史

```bash
curl "https://your-domain.com/api/alerts/history?limit=100&offset=0"
```

### 搜索价格源

```bash
curl "https://your-domain.com/api/explore/search?q=ETH"
```

---

## 错误处理

### 错误响应格式

```json
{
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "Invalid symbol parameter",
    "details": {
      "parameter": "symbol",
      "expected": "Valid trading pair symbol (e.g., ETH/USD)"
    }
  }
}
```

### 错误码

| 错误码                | HTTP 状态码 | 描述           |
| --------------------- | ----------- | -------------- |
| `UNAUTHORIZED`        | 401         | 未授权访问     |
| `FORBIDDEN`           | 403         | 权限不足       |
| `NOT_FOUND`           | 404         | 资源不存在     |
| `INVALID_PARAMETER`   | 400         | 参数无效       |
| `RATE_LIMIT_EXCEEDED` | 429         | 请求频率超限   |
| `INTERNAL_ERROR`      | 500         | 服务器内部错误 |
| `NOT_READY`           | 503         | 服务未就绪     |

---

## 速率限制

### 限制规则

| 端点类型 | 限制          |
| -------- | ------------- |
| 公开端点 | 240 请求/分钟 |
| 认证端点 | 500 请求/分钟 |
| 实时数据 | 10 连接/IP    |
| 健康检查 | 240 请求/分钟 |

### 响应头

```
X-RateLimit-Limit: 240
X-RateLimit-Remaining: 235
X-RateLimit-Reset: 1704067200
```

### 超限响应

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded",
    "details": {
      "limit": 240,
      "resetIn": 45
    }
  }
}
```

---

**返回 [文档总索引](../README.md)**
