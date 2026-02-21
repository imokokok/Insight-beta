# API 使用指南

本文档详细介绍 Insight API 的使用方法和最佳实践。

## 目录

- [概述](#概述)
- [认证](#认证)
- [API 端点](#api-端点)
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

### API 文档

访问 Swagger UI 获取交互式 API 文档：

```
/api/docs/swagger
```

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

---

## API 端点

### 健康检查

| 端点          | 方法 | 描述     |
| ------------- | ---- | -------- |
| `/api/health` | GET  | 健康检查 |

### 预言机数据

| 端点                                   | 方法 | 描述                      |
| -------------------------------------- | ---- | ------------------------- |
| `/api/oracle/chainlink/feeds`          | GET  | 获取 Chainlink 价格源列表 |
| `/api/oracle/chainlink/feed/[address]` | GET  | 获取指定价格源详情        |
| `/api/oracle/chainlink/deviation`      | GET  | 获取偏差分析数据          |
| `/api/oracle/chainlink/ocr`            | GET  | 获取 OCR 轮次数据         |
| `/api/oracle/chainlink/operators`      | GET  | 获取节点运营商列表        |
| `/api/oracle/pyth/prices`              | GET  | 获取 Pyth 价格数据        |
| `/api/oracle/pyth/publishers`          | GET  | 获取 Publisher 列表       |
| `/api/oracle/pyth/confidence-history`  | GET  | 获取置信区间历史          |
| `/api/oracle/api3/dapis`               | GET  | 获取 dAPIs 列表           |
| `/api/oracle/api3/airnodes`            | GET  | 获取 Airnode 列表         |
| `/api/oracle/api3/oev`                 | GET  | 获取 OEV 数据             |
| `/api/oracle/band/prices`              | GET  | 获取 Band 价格数据        |
| `/api/oracle/band/sources`             | GET  | 获取数据源列表            |
| `/api/oracle/band/validators`          | GET  | 获取验证者列表            |
| `/api/oracle/uma/assertions`           | GET  | 获取 UMA 断言列表         |
| `/api/oracle/uma/votes`                | GET  | 获取投票记录              |
| `/api/oracle/reliability`              | GET  | 获取可靠性评分            |

### 价格比较

| 端点                             | 方法 | 描述                   |
| -------------------------------- | ---- | ---------------------- |
| `/api/comparison/realtime`       | GET  | 实时价格比较           |
| `/api/comparison/heatmap`        | GET  | 价格偏差热力图         |
| `/api/comparison/latency`        | GET  | 延迟分析               |
| `/api/comparison/api3-chainlink` | GET  | API3 与 Chainlink 比较 |

### 跨链分析

| 端点                           | 方法 | 描述                   |
| ------------------------------ | ---- | ---------------------- |
| `/api/cross-chain/comparison`  | GET  | 跨链价格比较           |
| `/api/cross-chain/correlation` | GET  | 相关性分析             |
| `/api/cross-chain/liquidity`   | GET  | 流动性分析（模拟数据） |
| `/api/cross-chain/bridges`     | GET  | 跨链桥状态             |

> **注意**: 流动性分析端点当前返回模拟数据（mock data），非实时流动性数据。

### 告警系统

| 端点                             | 方法           | 描述              |
| -------------------------------- | -------------- | ----------------- |
| `/api/alerts`                    | GET            | 获取告警列表      |
| `/api/alerts/[id]`               | GET            | 获取告警详情      |
| `/api/alerts/rules`              | GET/POST       | 获取/创建告警规则 |
| `/api/alerts/rules/[id]`         | GET/PUT/DELETE | 告警规则 CRUD     |
| `/api/alerts/channels`           | GET/POST       | 获取/创建通知渠道 |
| `/api/alerts/channels/[id]/test` | POST           | 测试通知渠道      |
| `/api/alerts/history`            | GET            | 告警历史          |

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

---

## 请求示例

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

---

## 速率限制

### 限制规则

| 端点类型 | 限制          |
| -------- | ------------- |
| 公开端点 | 100 请求/分钟 |
| 认证端点 | 500 请求/分钟 |
| 实时数据 | 10 连接/IP    |

### 响应头

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067200
```

---

**返回 [文档总索引](../README.md)**
