# 架构改进文档

本文档记录了项目 P0 和 P1 级别的架构改进。

## P0 改进（已完成）

### 1. 统一区块链客户端架构

#### 新架构概览

```
src/lib/blockchain/
├── core/                          # 核心抽象层
│   ├── types.ts                  # 统一类型定义
│   ├── BaseOracleClient.ts       # 抽象基类
│   ├── OracleClientFactory.ts    # 工厂模式
│   └── index.ts                  # 统一导出
├── protocols/                     # 协议实现
│   └── pyth/
│       ├── PythOracleClient.ts   # Pyth 实现
│       └── index.ts
└── index.ts                      # 模块入口
```

#### 核心特性

- **统一接口**: 所有协议客户端实现 `IOracleClient` 接口
- **抽象基类**: `BaseOracleClient` 提供通用功能（重试、并发控制、日志）
- **工厂模式**: `OracleClientFactory` 管理客户端生命周期
- **结构化错误**: 定义了 `OracleClientError`, `PriceFetchError`, `HealthCheckError`

#### 使用示例

```typescript
import { createPythClient, oracleClientFactory } from '@/lib/blockchain';

// 方式1: 直接创建
const client = createPythClient('ethereum');

// 方式2: 使用工厂
const client = oracleClientFactory.create({
  protocol: 'pyth',
  chain: 'ethereum',
});

// 获取价格
const price = await client.getPrice('ETH/USD');

// 批量获取
const result = await client.getPrices(['BTC/USD', 'ETH/USD']);

// 健康检查
const health = await client.healthCheck();
```

### 2. 环境变量验证系统

#### 文件位置

- `src/lib/config/env.ts`

#### 特性

- **Zod Schema**: 使用 Zod 进行类型安全的验证
- **运行时检查**: 启动时验证所有必需的环境变量
- **类型推断**: 从 Schema 自动推断 TypeScript 类型
- **便捷函数**: 提供 `isDevelopment()`, `getRpcUrl()` 等辅助函数

#### 使用示例

```typescript
import { env, isDevelopment, getRpcUrl } from '@/lib/config/env';

// 直接访问
const dbUrl = env.DATABASE_URL;

// 使用便捷函数
if (isDevelopment()) {
  console.log('Development mode');
}

// 获取 RPC URL
const rpcUrl = getRpcUrl('ethereum');
```

## P1 改进（已完成）

### 1. 统一错误处理

#### 文件位置

- `src/lib/errors/AppError.ts`
- `src/lib/errors/index.ts`

#### 错误类型

| 错误类型               | HTTP 状态码 | 使用场景     |
| ---------------------- | ----------- | ------------ |
| `ValidationError`      | 400         | 输入验证失败 |
| `AuthenticationError`  | 401         | 未认证       |
| `AuthorizationError`   | 403         | 无权限       |
| `NotFoundError`        | 404         | 资源不存在   |
| `ConflictError`        | 409         | 资源冲突     |
| `RateLimitError`       | 429         | 限流         |
| `ExternalServiceError` | 502         | 外部服务错误 |
| `TimeoutError`         | 504         | 超时         |
| `DatabaseError`        | 500         | 数据库错误   |
| `OracleError`          | 502         | 预言机错误   |

#### 使用示例

```typescript
import { NotFoundError, ValidationError, createErrorResponse } from '@/lib/errors';

// 抛出错误
throw new NotFoundError('Assertion', '123');

throw new ValidationError('Invalid price format', {
  details: { field: 'price', value: 'invalid' },
});

// 错误处理
try {
  await fetchData();
} catch (error) {
  const response = createErrorResponse(error);
  return Response.json(response, { status: getHttpStatusCode(error) });
}
```

### 2. 智能缓存策略

#### 文件位置

- `src/lib/cache/strategies.ts`
- `src/lib/cache/CacheManager.ts`
- `src/lib/cache/index.ts`

#### 预定义策略

| 策略                     | 内存 TTL | Redis TTL | 适用场景 |
| ------------------------ | -------- | --------- | -------- |
| `priceCacheStrategy`     | 5s       | 30s       | 价格数据 |
| `configCacheStrategy`    | 5min     | 1h        | 配置数据 |
| `userCacheStrategy`      | 1min     | 15min     | 用户数据 |
| `assertionCacheStrategy` | 2min     | 1h        | 断言数据 |
| `statsCacheStrategy`     | 5min     | 30min     | 统计数据 |
| `apiCacheStrategy`       | 10s      | 1min      | API 响应 |
| `healthCacheStrategy`    | 1s       | -         | 健康检查 |

#### 使用示例

```typescript
import { getCacheManager, priceCacheStrategy } from '@/lib/cache';

// 创建缓存管理器
const priceCache = getCacheManager('prices', priceCacheStrategy);

// 获取或设置缓存
const price = await priceCache.getOrSet('ETH/USD', async () => {
  return await fetchPriceFromAPI('ETH/USD');
});

// 获取缓存统计
const metrics = priceCache.getMetrics();
console.log(`Hit rate: ${metrics.hitRate * 100}%`);
```

## P2 改进（已完成）

### 1. WebSocket 连接池

#### 文件位置

- `src/lib/websocket/ConnectionPool.ts`
- `src/lib/websocket/index.ts`

#### 核心特性

- **连接复用**: 多个订阅共享同一个 WebSocket 连接
- **自动重连**: 指数退避重连策略
- **订阅管理**: 自动订阅/取消订阅
- **心跳检测**: 保持连接活跃
- **连接限制**: 最大连接数和订阅数限制

#### 使用示例

```typescript
import { wsConnectionPool } from '@/lib/websocket';

// 订阅价格流
const subscriptionId = await wsConnectionPool.subscribe(
  'wss://api.example.com/ws',
  'price-feeds',
  (data) => {
    console.log('Price update:', data);
  },
  { symbols: ['BTC/USD', 'ETH/USD'] },
);

// 取消订阅
wsConnectionPool.unsubscribe(subscriptionId);

// 获取统计
const stats = wsConnectionPool.getStats();
console.log(`Connections: ${stats.connections}, Subscriptions: ${stats.subscriptions}`);
```

### 2. 性能监控系统

#### 文件位置

- `src/lib/monitoring/PerformanceMonitor.ts`

#### 监控指标

| 指标类型   | 说明                        |
| ---------- | --------------------------- |
| API 延迟   | 按路由统计 P50/P95/P99 延迟 |
| 缓存命中率 | 各缓存的命中/未命中统计     |
| 预言机响应 | 各协议的响应时间和成功率    |
| WebSocket  | 连接数和消息量              |
| 系统资源   | 内存使用和运行时间          |

#### 使用示例

```typescript
import { performanceMonitor } from '@/lib/monitoring/PerformanceMonitor';

// 记录 API 延迟
performanceMonitor.recordApiLatency('/api/prices', 45);

// 记录缓存命中
performanceMonitor.recordCacheHit('prices');

// 记录预言机请求
performanceMonitor.recordOracleLatency('pyth', 120, { chain: 'ethereum' });

// 生成报告
const report = performanceMonitor.generateReport();
console.log('Avg API latency:', report.summary.avgApiLatency);

// 自动上报
performanceMonitor.startAutoFlush(60000, (report) => {
  // 发送到监控系统
  sendToMonitoring(report);
});
```

## 下一步改进计划

### P3 优先级

1. **其他协议迁移**
   - Chainlink 客户端
   - UMA 客户端
   - Band 客户端

2. **API 版本化中间件**
   - 请求版本解析
   - 版本路由分发

3. **高级缓存功能**
   - Redis 缓存层实现
   - 缓存预热
   - 批量失效

## 迁移指南

### 从旧架构迁移

#### 旧代码

```typescript
import { PythOracle } from '@/lib/blockchain/pythOracle';

const client = new PythOracle(config);
const price = await client.getPrice('ETH/USD');
```

#### 新代码

```typescript
import { createPythClient } from '@/lib/blockchain';

const client = createPythClient('ethereum');
const price = await client.getPrice('ETH/USD');
```

### 错误处理迁移

#### 旧代码

```typescript
try {
  await fetchData();
} catch (error) {
  return Response.json({ error: error.message }, { status: 500 });
}
```

#### 新代码

```typescript
import { createErrorResponse, getHttpStatusCode } from '@/lib/errors';

try {
  await fetchData();
} catch (error) {
  const response = createErrorResponse(error);
  return Response.json(response, { status: getHttpStatusCode(error) });
}
```
