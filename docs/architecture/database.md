# 数据库设计

本文档详细描述 Insight 系统的数据库设计。

## 目录

- [ER 图](#er-图)
- [主要表结构](#主要表结构)
- [索引设计](#索引设计)
- [数据迁移策略](#数据迁移策略)

---

## ER 图

```mermaid
erDiagram
    oracle_config ||--|| oracle_instances : "配置"
    oracle_instances ||--o{ oracle_sync_state : "同步状态"
    oracle_instances ||--o{ oracle_sync_metrics : "同步指标"
    oracle_instances ||--o{ assertions : "断言"
    oracle_instances ||--o{ oracle_events : "事件"

    assertions ||--o{ disputes : "争议"
    assertions ||--o{ votes : "投票"

    sync_state ||--o{ sync_metrics : "指标"

    oracle_config {
        integer id PK
        text rpc_url
        text contract_address
        text chain
        bigint start_block
    }

    oracle_instances {
        text id PK
        text name
        boolean enabled
        text chain
        timestamp created_at
        timestamp updated_at
    }

    sync_state {
        integer id PK
        bigint last_processed_block
        bigint latest_block
        integer consecutive_failures
        jsonb rpc_stats
    }

    oracle_sync_state {
        text instance_id PK FK
        bigint last_processed_block
        bigint latest_block
    }

    sync_metrics {
        bigserial id PK
        timestamp recorded_at
        bigint last_processed_block
        bigint lag_blocks
        integer duration_ms
        text error
    }

    oracle_sync_metrics {
        bigserial id PK
        text instance_id FK
        timestamp recorded_at
        bigint lag_blocks
    }

    assertions {
        text id PK
        text instance_id FK
        text chain
        text asserter
        text protocol
        text market
        timestamp asserted_at
        timestamp liveness_ends_at
        bigint block_number
        text status
        numeric bond_usd
    }

    disputes {
        text id PK
        text assertion_id FK
        text market
        text reason
        text disputer
        timestamp disputed_at
        text status
        numeric votes_for
        numeric votes_against
    }

    votes {
        bigserial id PK
        text assertion_id FK
        text voter
        boolean support
        numeric weight
        text tx_hash
        bigint block_number
    }

    oracle_events {
        bigserial id PK
        text instance_id FK
        text chain
        text event_type
        text assertion_id
        text tx_hash
        bigint block_number
        jsonb payload
        timestamp created_at
    }
```

---

## 主要表结构

### 核心表

#### oracle_config

预言机全局配置表（单行配置）。

| 字段                  | 类型    | 说明           |
| --------------------- | ------- | -------------- |
| `id`                  | INTEGER | 主键，固定为 1 |
| `rpc_url`             | TEXT    | RPC 节点 URL   |
| `contract_address`    | TEXT    | 合约地址       |
| `chain`               | TEXT    | 区块链网络     |
| `start_block`         | BIGINT  | 起始区块号     |
| `max_block_range`     | INTEGER | 最大区块范围   |
| `voting_period_hours` | INTEGER | 投票期（小时） |
| `confirmation_blocks` | INTEGER | 确认区块数     |

---

#### oracle_instances

预言机实例表。

| 字段               | 类型        | 说明          |
| ------------------ | ----------- | ------------- |
| `id`               | TEXT        | 主键，实例 ID |
| `name`             | TEXT        | 实例名称      |
| `enabled`          | BOOLEAN     | 是否启用      |
| `rpc_url`          | TEXT        | RPC 节点 URL  |
| `contract_address` | TEXT        | 合约地址      |
| `chain`            | TEXT        | 区块链网络    |
| `start_block`      | BIGINT      | 起始区块号    |
| `created_at`       | TIMESTAMPTZ | 创建时间      |
| `updated_at`       | TIMESTAMPTZ | 更新时间      |

---

#### sync_state

全局同步状态表（单行）。

| 字段                           | 类型        | 说明               |
| ------------------------------ | ----------- | ------------------ |
| `id`                           | INTEGER     | 主键，固定为 1     |
| `last_processed_block`         | BIGINT      | 上次处理的区块     |
| `latest_block`                 | BIGINT      | 最新区块           |
| `safe_block`                   | BIGINT      | 安全区块           |
| `last_success_processed_block` | BIGINT      | 上次成功处理的区块 |
| `consecutive_failures`         | INTEGER     | 连续失败次数       |
| `rpc_active_url`               | TEXT        | 当前活跃的 RPC URL |
| `rpc_stats`                    | JSONB       | RPC 统计数据       |
| `last_attempt_at`              | TIMESTAMPTZ | 上次尝试时间       |
| `last_success_at`              | TIMESTAMPTZ | 上次成功时间       |
| `last_duration_ms`             | INTEGER     | 上次耗时（毫秒）   |
| `last_error`                   | TEXT        | 上次错误           |

---

#### oracle_sync_state

每个预言机实例的同步状态。

| 字段                           | 类型    | 说明                  |
| ------------------------------ | ------- | --------------------- |
| `instance_id`                  | TEXT    | 主键，实例 ID（外键） |
| `last_processed_block`         | BIGINT  | 上次处理的区块        |
| `latest_block`                 | BIGINT  | 最新区块              |
| `safe_block`                   | BIGINT  | 安全区块              |
| `last_success_processed_block` | BIGINT  | 上次成功处理的区块    |
| `consecutive_failures`         | INTEGER | 连续失败次数          |
| `rpc_active_url`               | TEXT    | 当前活跃的 RPC URL    |
| `rpc_stats`                    | JSONB   | RPC 统计数据          |

---

#### sync_metrics

全局同步指标历史。

| 字段                   | 类型        | 说明           |
| ---------------------- | ----------- | -------------- |
| `id`                   | BIGSERIAL   | 主键           |
| `recorded_at`          | TIMESTAMPTZ | 记录时间       |
| `last_processed_block` | BIGINT      | 上次处理的区块 |
| `latest_block`         | BIGINT      | 最新区块       |
| `safe_block`           | BIGINT      | 安全区块       |
| `lag_blocks`           | BIGINT      | 滞后区块数     |
| `duration_ms`          | INTEGER     | 耗时（毫秒）   |
| `error`                | TEXT        | 错误信息       |

---

#### oracle_sync_metrics

每个预言机实例的同步指标历史。

| 字段                   | 类型        | 说明            |
| ---------------------- | ----------- | --------------- |
| `id`                   | BIGSERIAL   | 主键            |
| `instance_id`          | TEXT        | 实例 ID（外键） |
| `recorded_at`          | TIMESTAMPTZ | 记录时间        |
| `last_processed_block` | BIGINT      | 上次处理的区块  |
| `latest_block`         | BIGINT      | 最新区块        |
| `lag_blocks`           | BIGINT      | 滞后区块数      |
| `duration_ms`          | INTEGER     | 耗时（毫秒）    |
| `error`                | TEXT        | 错误信息        |

---

### UMA 相关表

#### assertions

断言表（UMA 乐观预言机）。

| 字段                    | 类型        | 说明           |
| ----------------------- | ----------- | -------------- |
| `id`                    | TEXT        | 主键，断言 ID  |
| `instance_id`           | TEXT        | 实例 ID        |
| `chain`                 | TEXT        | 区块链网络     |
| `asserter`              | TEXT        | 断言者地址     |
| `protocol`              | TEXT        | 协议名称       |
| `market`                | TEXT        | 市场标识       |
| `assertion_data`        | TEXT        | 断言数据       |
| `asserted_at`           | TIMESTAMPTZ | 断言时间       |
| `liveness_ends_at`      | TIMESTAMPTZ | 活跃期结束时间 |
| `block_number`          | BIGINT      | 区块号         |
| `log_index`             | INTEGER     | 日志索引       |
| `resolved_at`           | TIMESTAMPTZ | 解决时间       |
| `settlement_resolution` | BOOLEAN     | 结算结果       |
| `status`                | TEXT        | 状态           |
| `bond_usd`              | NUMERIC     | 保证金（USD）  |
| `disputer`              | TEXT        | 争议者地址     |
| `tx_hash`               | TEXT        | 交易哈希       |

---

#### disputes

争议表。

| 字段             | 类型        | 说明            |
| ---------------- | ----------- | --------------- |
| `id`             | TEXT        | 主键，争议 ID   |
| `instance_id`    | TEXT        | 实例 ID         |
| `chain`          | TEXT        | 区块链网络      |
| `assertion_id`   | TEXT        | 断言 ID（外键） |
| `market`         | TEXT        | 市场标识        |
| `reason`         | TEXT        | 争议原因        |
| `disputer`       | TEXT        | 争议者地址      |
| `disputed_at`    | TIMESTAMPTZ | 争议时间        |
| `voting_ends_at` | TIMESTAMPTZ | 投票结束时间    |
| `tx_hash`        | TEXT        | 交易哈希        |
| `block_number`   | BIGINT      | 区块号          |
| `log_index`      | INTEGER     | 日志索引        |
| `status`         | TEXT        | 状态            |
| `votes_for`      | NUMERIC     | 赞成票数        |
| `votes_against`  | NUMERIC     | 反对票数        |
| `total_votes`    | NUMERIC     | 总票数          |

---

#### votes

投票表。

| 字段           | 类型        | 说明            |
| -------------- | ----------- | --------------- |
| `id`           | BIGSERIAL   | 主键            |
| `instance_id`  | TEXT        | 实例 ID         |
| `chain`        | TEXT        | 区块链网络      |
| `assertion_id` | TEXT        | 断言 ID（外键） |
| `voter`        | TEXT        | 投票者地址      |
| `support`      | BOOLEAN     | 是否赞成        |
| `weight`       | NUMERIC     | 投票权重        |
| `tx_hash`      | TEXT        | 交易哈希        |
| `block_number` | BIGINT      | 区块号          |
| `log_index`    | INTEGER     | 日志索引        |
| `created_at`   | TIMESTAMPTZ | 创建时间        |

---

#### oracle_events

预言机事件表。

| 字段               | 类型        | 说明       |
| ------------------ | ----------- | ---------- |
| `id`               | BIGSERIAL   | 主键       |
| `instance_id`      | TEXT        | 实例 ID    |
| `chain`            | TEXT        | 区块链网络 |
| `event_type`       | TEXT        | 事件类型   |
| `assertion_id`     | TEXT        | 断言 ID    |
| `tx_hash`          | TEXT        | 交易哈希   |
| `block_number`     | BIGINT      | 区块号     |
| `log_index`        | INTEGER     | 日志索引   |
| `payload`          | JSONB       | 事件负载   |
| `payload_checksum` | TEXT        | 负载校验和 |
| `created_at`       | TIMESTAMPTZ | 创建时间   |

---

## 索引设计

### 核心索引

| 索引名                             | 表                    | 字段                       | 用途               |
| ---------------------------------- | --------------------- | -------------------------- | ------------------ |
| `idx_oracle_instances_enabled`     | `oracle_instances`    | `enabled`                  | 快速筛选启用的实例 |
| `idx_oracle_instances_chain`       | `oracle_instances`    | `chain`                    | 按链筛选实例       |
| `idx_sync_metrics_recorded_at`     | `sync_metrics`        | `recorded_at`              | 按时间查询同步指标 |
| `idx_oracle_sync_metrics_instance` | `oracle_sync_metrics` | `instance_id, recorded_at` | 实例的时序指标     |
| `idx_assertions_instance_chain`    | `assertions`          | `instance_id, chain`       | 实例和链的断言     |
| `idx_assertions_status`            | `assertions`          | `status`                   | 按状态筛选断言     |
| `idx_assertions_asserted_at`       | `assertions`          | `asserted_at`              | 按时间查询断言     |
| `idx_disputes_assertion`           | `disputes`            | `assertion_id`             | 查询断言的争议     |
| `idx_votes_assertion`              | `votes`               | `assertion_id`             | 查询断言的投票     |
| `idx_oracle_events_instance_chain` | `oracle_events`       | `instance_id, chain`       | 实例和链的事件     |
| `idx_oracle_events_type`           | `oracle_events`       | `event_type`               | 按事件类型筛选     |
| `idx_oracle_events_created_at`     | `oracle_events`       | `created_at`               | 按时间查询事件     |

---

## 数据迁移策略

### 迁移框架

使用自定义迁移系统，主要组件：

- `ensureSchema()` - 主入口函数
- `createCoreTables()` - 创建核心表
- `createCoreIndexes()` - 创建核心索引
- `runCoreMigrations()` - 运行迁移

### 迁移流程

1. **检查表是否存在**
   - 使用 `CREATE TABLE IF NOT EXISTS`
   - 避免重复创建

2. **创建索引**
   - 使用 `CREATE INDEX IF NOT EXISTS`
   - 按需添加新索引

3. **运行迁移**
   - 版本化迁移脚本
   - 事务保证原子性
   - 失败时自动回滚

4. **插入初始数据**
   - 配置数据
   - 参考数据

### 迁移最佳实践

- **向后兼容**: 迁移不应破坏现有功能
- **可回滚**: 重要迁移应有回滚方案
- **测试**: 在测试环境验证迁移
- **备份**: 迁移前备份数据库
- **小步迭代**: 拆分大型迁移为小步骤

---

**返回 [文档总索引](../README.md)**
