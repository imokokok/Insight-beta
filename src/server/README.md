# Server 模块说明

本目录包含所有服务端逻辑，按功能域进行模块化组织。

## 目录结构

```
server/
├── alerts/                    # 告警服务
│   ├── alertRuleEngine.ts    # 告警规则引擎
│   ├── notificationConfigService.ts  # 通知配置服务
│   ├── notificationService.ts        # 通知服务
│   └── unifiedAlertRuleService.ts    # 统一告警规则服务
├── api-platform/             # API 平台服务
│   ├── developerAuth.ts     # 开发者认证
│   └── rateLimiter.ts       # 速率限制
├── apiResponse/              # API 响应处理
│   ├── admin.ts             # 管理员响应
│   ├── alerts.ts            # 告警响应
│   ├── cache.ts             # 缓存响应
│   ├── handleApi.ts         # API 处理
│   ├── rateLimit.ts         # 限流响应
│   └── response.ts          # 通用响应
├── auth/                     # 认证授权
│   ├── rbac.ts              # 基于角色的访问控制
│   └── ssoIntegration.ts    # SSO 集成
├── benchmark/                # 性能基准测试
│   ├── apiResponse.bench.ts
│   ├── load.test.ts
│   └── performance.bench.ts
├── monitoring/               # 监控服务
│   └── slaMonitor.ts        # SLA 监控
├── oracle/                   # 预言机核心服务
│   ├── config/              # 配置管理
│   │   ├── cache.ts
│   │   ├── database.ts
│   │   ├── index.ts
│   │   ├── types.ts
│   │   └── validation.ts
│   ├── alertService.ts      # 告警服务
│   ├── analysisScheduler.ts # 分析调度器
│   ├── api3Sync.ts          # API3 同步
│   ├── bandSync.ts          # Band 同步
│   ├── chainlinkSync.ts     # Chainlink 同步
│   ├── contract.ts          # 合约交互
│   ├── crossProtocolAnalysis.ts  # 跨协议分析
│   ├── diaSync.ts           # DIA 同步
│   ├── fluxSync.ts          # Flux 同步
│   ├── polymarket.ts        # Polymarket 监控
│   ├── priceAggregationService.ts  # 价格聚合服务
│   ├── priceDeviationAnalytics.ts  # 价格偏差分析
│   ├── priceFetcher.ts      # 价格获取器
│   ├── priceHealthCheck.ts  # 价格健康检查
│   ├── pythSync.ts          # Pyth 同步
│   ├── redstoneSync.ts      # RedStone 同步
│   ├── switchboardSync.ts   # Switchboard 同步
│   ├── umaConfig.ts         # UMA 配置
│   ├── umaRewards.ts        # UMA 奖励
│   ├── umaRewardsSync.ts    # UMA 奖励同步
│   ├── umaState.ts          # UMA 状态
│   ├── umaSync.ts           # UMA 同步
│   ├── umaSyncTask.ts       # UMA 同步任务
│   ├── umaSyncTasks.ts      # UMA 同步任务集
│   ├── umaTvl.ts            # UMA TVL
│   ├── unifiedConfig.ts     # 统一配置
│   └── unifiedService.ts    # 统一服务
├── oracleIndexer/            # 预言机索引器
│   ├── circuitBreaker.ts    # 熔断器
│   ├── constants.ts         # 常量
│   ├── env.ts               # 环境配置
│   ├── index.ts             # 入口
│   ├── rpcClient.ts         # RPC 客户端
│   ├── rpcStats.ts          # RPC 统计
│   ├── syncCore.ts          # 同步核心
│   └── types.ts             # 类型定义
├── oracleState/              # 预言机状态管理
│   ├── constants.ts         # 常量
│   ├── eventReplay.ts       # 事件回放
│   ├── index.ts             # 入口
│   ├── memory.ts            # 内存存储
│   ├── operations.ts        # 操作
│   ├── types.ts             # 类型定义
│   └── utils.ts             # 工具函数
├── timeline/                 # 时间线服务
│   └── eventHooks.ts        # 事件钩子
├── websocket/                # WebSocket 服务
│   ├── priceStream.ts       # 价格流
│   └── redisAdapter.ts      # Redis 适配器
└── [根目录文件]              # 核心服务文件
    ├── adminAuth.ts         # 管理员认证
    ├── apiOptimization.ts   # API 优化
    ├── apiResponse.ts       # API 响应
    ├── cacheOptimization.ts # 缓存优化
    ├── cacheWarmup.ts       # 缓存预热
    ├── db.ts                # 数据库连接
    ├── dbIndexes.ts         # 数据库索引
    ├── dbOptimization.ts    # 数据库优化
    ├── kvStore.ts           # KV 存储
    ├── lruCache.ts          # LRU 缓存
    ├── memoryBackend.ts     # 内存后端
    ├── notifications.ts     # 通知
    ├── observability.ts     # 可观测性
    ├── oracleConfig.ts      # 预言机配置
    ├── oracleConfigEnhanced.ts  # 增强配置
    ├── oracleConfigHistory.ts   # 配置历史
    ├── oracleIndexer.ts     # 预言机索引器
    ├── oracleState.ts       # 预言机状态
    ├── oracleStore.ts       # 预言机存储
    ├── oracleSyncOptimization.ts  # 同步优化
    ├── performance.ts       # 性能监控
    ├── redisCache.ts        # Redis 缓存
    ├── requestDedupe.ts     # 请求去重
    ├── schema.ts            # 数据库 Schema
    ├── unifiedSchema.ts     # 统一 Schema
    ├── webhookDeadLetterQueue.ts  # Webhook 死信队列
    └── worker.ts            # 工作进程
```

## 模块职责

### 1. alerts/ - 告警服务

负责告警规则的评估、触发和通知发送。

**核心文件：**

- `alertRuleEngine.ts` - 告警规则引擎，评估规则条件
- `notificationService.ts` - 通知服务，发送各类通知
- `unifiedAlertRuleService.ts` - 统一管理告警规则

### 2. api-platform/ - API 平台

开发者平台相关服务，包括认证和限流。

**核心文件：**

- `developerAuth.ts` - 开发者 API Key 认证
- `rateLimiter.ts` - API 速率限制

### 3. apiResponse/ - API 响应

统一处理 API 响应格式和错误处理。

**核心文件：**

- `handleApi.ts` - 统一的 API 请求处理
- `response.ts` - 标准响应格式
- `rateLimit.ts` - 限流响应处理

### 4. auth/ - 认证授权

用户认证和权限管理。

**核心文件：**

- `rbac.ts` - 基于角色的访问控制
- `ssoIntegration.ts` - 单点登录集成

### 5. oracle/ - 预言机核心

最核心的模块，包含所有预言机协议的同步和数据处理。

**核心文件：**

- `unifiedService.ts` - 统一服务入口
- `priceAggregationService.ts` - 价格聚合服务
- `priceFetcher.ts` - 价格获取器
- `priceHealthCheck.ts` - 价格健康检查
- `{protocol}Sync.ts` - 各协议同步服务（Chainlink、Pyth、Band、API3、RedStone、Flux、DIA）

### 6. oracleIndexer/ - 预言机索引器

区块链事件索引服务。

**核心文件：**

- `syncCore.ts` - 同步核心逻辑
- `rpcClient.ts` - RPC 客户端（支持故障转移）
- `circuitBreaker.ts` - 熔断器模式

### 7. oracleState/ - 预言机状态

内存状态管理和事件回放。

**核心文件：**

- `memory.ts` - 内存存储
- `eventReplay.ts` - 事件回放机制
- `operations.ts` - 状态操作

### 8. timeline/ - 时间线服务

时间线事件管理。

**核心文件：**

- `eventHooks.ts` - 事件钩子处理

### 9. websocket/ - WebSocket

实时数据推送服务。

**核心文件：**

- `priceStream.ts` - 价格数据流
- `redisAdapter.ts` - Redis 适配器（多实例支持）

## 根目录核心文件

### 数据层

- `db.ts` - PostgreSQL 连接池
- `kvStore.ts` - Redis KV 存储
- `schema.ts` - 数据库 Schema 定义
- `unifiedSchema.ts` - 统一 Schema 定义

### 缓存层

- `lruCache.ts` - 内存 LRU 缓存
- `redisCache.ts` - Redis 缓存
- `cacheWarmup.ts` - 缓存预热
- `cacheOptimization.ts` - 缓存优化

### 配置层

- `oracleConfig.ts` - 基础配置管理
- `oracleConfigEnhanced.ts` - 增强配置功能
- `oracleConfigHistory.ts` - 配置版本历史
- `unifiedConfig.ts` - 统一配置

### 优化层

- `apiOptimization.ts` - API 性能优化
- `dbOptimization.ts` - 数据库优化
- `oracleSyncOptimization.ts` - 同步优化
- `requestDedupe.ts` - 请求去重

### 监控层

- `observability.ts` - 可观测性（日志、指标、追踪）
- `performance.ts` - 性能监控

### 工具层

- `adminAuth.ts` - 管理员认证
- `apiResponse.ts` - API 响应工具
- `notifications.ts` - 通知服务
- `webhookDeadLetterQueue.ts` - Webhook 死信队列
- `worker.ts` - 工作进程

## 代码规范

1. **单一职责**：每个文件只负责一个功能
2. **测试覆盖**：核心文件必须配套 `.test.ts` 文件
3. **类型安全**：所有函数必须标注返回类型
4. **错误处理**：使用统一的错误处理模式
5. **日志记录**：关键操作必须记录日志

## 依赖关系

```
                    ┌─────────────┐
                    │   API 层    │
                    │  (app/api)  │
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │  oracle/    │ │oracleIndexer│ │oracleState  │
    │  (同步服务)  │ │  (索引器)    │ │  (状态管理) │
    └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
           │               │               │
           └───────────────┼───────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  数据层     │
                    │ db/kvStore  │
                    └─────────────┘
```

## 使用示例

### 启动协议同步

```typescript
import { startChainlinkSync, startPythSync } from '@/server/oracle';

// 启动 Chainlink 同步
await startChainlinkSync('ethereum', 'https://eth-mainnet.g.alchemy.com/v2/...');

// 启动 Pyth 同步
await startPythSync('mainnet', 'https://api.mainnet.pyth.network');
```

### 使用 API 响应工具

```typescript
import { handleApi, cachedJson, requireAdmin } from '@/server/apiResponse';

export async function GET(request: Request) {
  return handleApi(request, async () => {
    const data = await cachedJson('cache-key', 60000, async () => {
      return await fetchData();
    });
    return { data };
  });
}
```

### 发送通知

```typescript
import { notificationService } from '@/server/alerts/notificationService';

await notificationService.send({
  type: 'price_alert',
  severity: 'warning',
  message: 'Price deviation detected',
  channels: ['slack', 'telegram'],
});
```

## 相关文档

- [架构文档](../../docs/ARCHITECTURE.md)
- [API 文档](../../docs/API.md)
- [数据库文档](../../docs/DATABASE.md)
