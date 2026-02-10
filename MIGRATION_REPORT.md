# Prisma Schema 迁移到 Supabase SQL 完整报告

## 迁移状态：✅ 完整迁移

## Prisma Schema 中的模型

### 1. 价格历史数据模型 (5个表)

| Prisma 模型       | SQL 表名            | 状态      |
| ----------------- | ------------------- | --------- |
| PriceHistoryRaw   | price_history_raw   | ✅ 已迁移 |
| PriceHistoryMin1  | price_history_min1  | ✅ 已迁移 |
| PriceHistoryMin5  | price_history_min5  | ✅ 已迁移 |
| PriceHistoryHour1 | price_history_hour1 | ✅ 已迁移 |
| PriceHistoryDay1  | price_history_day1  | ✅ 已迁移 |

### 2. Solana 数据模型 (5个表)

| Prisma 模型          | SQL 表名                | 状态      |
| -------------------- | ----------------------- | --------- |
| SolanaPriceFeed      | solana_price_feeds      | ✅ 已迁移 |
| SolanaPriceHistory   | solana_price_histories  | ✅ 已迁移 |
| SolanaOracleInstance | solana_oracle_instances | ✅ 已迁移 |
| SolanaSyncStatus     | solana_sync_status      | ✅ 已迁移 |
| SolanaAlert          | solana_alerts           | ✅ 已迁移 |

### 3. SLO 数据模型 (3个表)

| Prisma 模型   | SQL 表名        | 状态      |
| ------------- | --------------- | --------- |
| SloDefinition | slo_definitions | ✅ 已迁移 |
| SloMetric     | slo_metrics     | ✅ 已迁移 |
| ErrorBudget   | error_budgets   | ✅ 已迁移 |

### 4. 事件时间线数据模型 (2个表)

| Prisma 模型      | SQL 表名           | 状态      |
| ---------------- | ------------------ | --------- |
| EventTimeline    | event_timeline     | ✅ 已迁移 |
| DeploymentRecord | deployment_records | ✅ 已迁移 |

## 之前已迁移的表 (Unified Schema)

### 5. 统一预言机核心表 (11个表)

- unified_oracle_instances
- unified_price_feeds
- unified_price_updates
- unified_assertions
- unified_disputes
- unified_sync_state
- unified_statistics
- cross_oracle_comparisons
- unified_alert_rules
- unified_alerts
- unified_config_templates

### 6. 价格操纵检测表 (5个表)

- manipulation_detections
- detection_config
- blocked_feeds
- monitoring_logs
- detection_metrics

### 7. 监控和指标表 (3个表)

- oracle_protocols_info
- oracle_health_checks
- oracle_network_metrics
- oracle_liquidity

## 总计：34 个表

## 迁移文件清单

1. `20250203000001_create_manipulation_detection_tables.sql` - 价格操纵检测表
2. `20250203000002_add_detection_config.sql` - 检测配置表
3. `20250203000003_create_unified_schema_tables.sql` - 统一预言机核心表
4. `20250203000004_migrate_prisma_schema.sql` - Prisma Schema 迁移

## 字段对比检查

### PriceHistoryRaw

- ✅ id: BigInt -> BIGSERIAL
- ✅ symbol: String -> VARCHAR(50)
- ✅ protocol: String -> VARCHAR(50)
- ✅ chain: String -> VARCHAR(50)
- ✅ price: Decimal -> DECIMAL(36, 18)
- ✅ priceRaw -> price_raw: VARCHAR(78)
- ✅ decimals: Int -> INTEGER
- ✅ timestamp: DateTime -> TIMESTAMPTZ
- ✅ blockNumber -> block_number: BIGINT
- ✅ confidence: Decimal -> DECIMAL(5, 4)
- ✅ volume24h -> volume_24h: DECIMAL(36, 18)
- ✅ change24h -> change_24h: DECIMAL(10, 4)
- ✅ createdAt -> created_at: TIMESTAMPTZ
- ✅ 所有索引已创建

### SolanaPriceFeed

- ✅ id: String @id @default(uuid) -> UUID PRIMARY KEY DEFAULT gen_random_uuid()
- ✅ symbol: String -> VARCHAR(50)
- ✅ name: String -> VARCHAR(100)
- ✅ price: Decimal -> DECIMAL(36, 18)
- ✅ confidence: Decimal -> DECIMAL(5, 4)
- ✅ timestamp: DateTime -> TIMESTAMPTZ
- ✅ slot: BigInt -> BIGINT
- ✅ signature: String -> VARCHAR(100)
- ✅ source: String -> VARCHAR(50)
- ✅ status: String @default("active") -> VARCHAR(20) DEFAULT 'active'
- ✅ createdAt -> created_at: TIMESTAMPTZ
- ✅ updatedAt -> updated_at: TIMESTAMPTZ
- ✅ 关系: histories SolanaPriceHistory[] -> FOREIGN KEY 约束

### SloDefinition

- ✅ id: String @id @default(uuid) -> UUID PRIMARY KEY DEFAULT gen_random_uuid()
- ✅ name: String -> VARCHAR(100)
- ✅ description: String? -> TEXT
- ✅ protocol: String -> VARCHAR(50)
- ✅ chain: String -> VARCHAR(50)
- ✅ metricType -> metric_type: VARCHAR(50)
- ✅ targetValue -> target_value: DECIMAL(10, 4)
- ✅ thresholdValue -> threshold_value: DECIMAL(10, 4)
- ✅ evaluationWindow -> evaluation_window: VARCHAR(20)
- ✅ errorBudgetPolicy -> error_budget_policy: VARCHAR(20) DEFAULT 'monthly'
- ✅ conditionConfig -> condition_config: JSONB
- ✅ isActive -> is_active: BOOLEAN DEFAULT true
- ✅ createdAt -> created_at: TIMESTAMPTZ
- ✅ updatedAt -> updated_at: TIMESTAMPTZ
- ✅ 关系: metrics SloMetric[] -> FOREIGN KEY 约束
- ✅ 关系: errorBudgets ErrorBudget[] -> FOREIGN KEY 约束

## 索引迁移检查

### PriceHistoryRaw 索引

- ✅ @@index([symbol, timestamp(sort: Desc)])
- ✅ @@index([protocol, timestamp(sort: Desc)])
- ✅ @@index([chain, timestamp(sort: Desc)])
- ✅ @@index([timestamp(sort: Desc)])
- ✅ @@index([symbol, protocol, chain, timestamp(sort: Desc)])
- ✅ @@index([protocol, chain, timestamp(sort: Desc)])
- ✅ @@index([symbol, protocol, timestamp(sort: Desc)])

### 其他表的索引

- ✅ 所有 Prisma 中定义的索引都已在 SQL 中创建

## 约束和关系检查

### 外键关系

- ✅ solana_price_histories.feed_id -> solana_price_feeds.id (ON DELETE CASCADE)
- ✅ slo_metrics.slo_id -> slo_definitions.id (ON DELETE CASCADE)
- ✅ error_budgets.slo_id -> slo_definitions.id (ON DELETE CASCADE)

### 唯一约束

- ✅ price_history_min1: UNIQUE(symbol, protocol, chain, timestamp)
- ✅ price_history_min5: UNIQUE(symbol, protocol, chain, timestamp)
- ✅ price_history_hour1: UNIQUE(symbol, protocol, chain, timestamp)
- ✅ price_history_day1: UNIQUE(symbol, protocol, chain, timestamp)
- ✅ solana_sync_status: UNIQUE(instance_id, feed_symbol)

### 默认值

- ✅ 所有 @default 值都已在 SQL 中设置

## 触发器检查

### updated_at 自动更新

- ✅ solana_price_feeds
- ✅ solana_oracle_instances
- ✅ solana_sync_status
- ✅ slo_definitions
- ✅ error_budgets

## RLS (Row Level Security) 检查

### 所有表都已启用 RLS

- ✅ 15 个 Prisma 迁移的表
- ✅ 19 个之前创建的表

### RLS 策略

- ✅ SELECT: 所有用户可读
- ✅ INSERT/UPDATE: 仅认证用户可写

## 类型定义检查

### src/types/supabase.ts

- ✅ 所有 34 个表的类型定义
- ✅ Row/Insert/Update 类型
- ✅ 外键关系类型
- ✅ 便捷类型导出

## 数据库访问层检查

### src/lib/db/index.ts

- ✅ QueryBuilder 通用 CRUD 类
- ✅ 表特定的查询构建器
- ✅ 价格历史: priceHistory.raw/min1/min5/hour1/day1
- ✅ Solana: solana.priceFeeds/histories/instances/syncStatus/alerts
- ✅ SLO: slo.definitions/metrics/errorBudgets
- ✅ 统一预言机: unified.\*
- ✅ 价格操纵: manipulation.\*
- ✅ 事件: events.\*

## 初始化数据检查

### src/server/unifiedSchema.ts

- ✅ initializeDefaultProtocols() - 5 个协议
- ✅ initializeDefaultConfigTemplates() - 2 个模板
- ✅ initializeDetectionConfig() - 检测配置
- ✅ initializeSolanaDefaults() - 2 个 Solana 实例
- ✅ initializeSloDefaults() - 3 个 SLO 定义

## 下一步操作

1. 推送 migrations 到 Supabase:

   ```bash
   npm run supabase:push
   ```

2. 验证表是否创建成功:

   ```bash
   npm run supabase:status
   ```

3. 启动应用初始化数据:
   ```bash
   npm run dev
   ```

## 结论

✅ **所有 Prisma Schema 中的表都已完整迁移到 SQL Migrations**
✅ **所有字段、索引、约束、关系都已正确迁移**
✅ **类型定义完整**
✅ **数据库访问层已封装**
✅ **初始化逻辑已更新**

迁移完成！符合"Supabase 作为唯一真源"的原则。
