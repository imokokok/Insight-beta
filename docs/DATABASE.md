# 数据库设计

本文档详细描述了 Insight 项目的数据库架构、表结构设计以及索引优化策略。

## 1. 概览

项目使用 PostgreSQL 作为关系型数据库，主要用于存储：

- 链上同步的预言机数据（断言、争议、投票）
- 系统配置与同步状态
- 监控告警与审计日志
- 内部 KV 存储与限流数据

## 2. 核心业务表

### 2.1 Assertions (断言)

存储所有链上创建的断言数据。

| 字段名 | 类型 | 描述 |
|Ref|Type|Description|
|---|---|---|
| `id` | TEXT (PK) | 断言 ID (Hash) |
| `chain` | TEXT | 所在链名称 |
| `asserter` | TEXT | 创建者地址 |
| `protocol` | TEXT | 协议名称 |
| `market` | TEXT | 市场标识 |
| `assertion_data` | TEXT | 断言内容 |
| `bond_usd` | NUMERIC | 保证金金额 (USD) |
| `asserted_at` | TIMESTAMP | 创建时间 |
| `liveness_ends_at` | TIMESTAMP | 挑战期结束时间 |
| `resolved_at` | TIMESTAMP | 解决时间 |
| `status` | TEXT | 状态 (Active, Disputed, Resolved) |
| `tx_hash` | TEXT | 创建交易 Hash |

### 2.2 Disputes (争议)

存储针对断言发起的争议。

| 字段名          | 类型      | 描述         |
| --------------- | --------- | ------------ |
| `id`            | TEXT (PK) | 争议 ID      |
| `assertion_id`  | TEXT (FK) | 关联断言 ID  |
| `disputer`      | TEXT      | 挑战者地址   |
| `reason`        | TEXT      | 争议理由     |
| `disputed_at`   | TIMESTAMP | 争议发起时间 |
| `status`        | TEXT      | 争议状态     |
| `votes_for`     | NUMERIC   | 支持票数     |
| `votes_against` | NUMERIC   | 反对票数     |

### 2.3 Votes (投票)

存储争议治理过程中的投票记录。

| 字段名         | 类型        | 描述          |
| -------------- | ----------- | ------------- |
| `id`           | SERIAL (PK) | 自增 ID       |
| `assertion_id` | TEXT (FK)   | 关联断言 ID   |
| `voter`        | TEXT        | 投票者地址    |
| `support`      | BOOLEAN     | 是否支持      |
| `weight`       | NUMERIC     | 投票权重      |
| `tx_hash`      | TEXT        | 投票交易 Hash |

## 3. 系统配置与状态表

### 3.1 Oracle Config (预言机配置)

单行表，存储全局配置。

- `rpc_url`: 链 RPC 地址
- `contract_address`: 合约地址
- `voting_period_hours`: 投票期时长
- `start_block`: 索引起始区块

### 3.2 Sync State (同步状态)

单行表，追踪索引器的同步进度。

- `last_processed_block`: 最后处理的区块
- `safe_block`: 确认安全的区块高度
- `lag_blocks`: 同步延迟区块数

## 4. 监控与运维表

### 4.1 Alerts (告警)

存储系统触发的各类告警信息。

- `fingerprint`: 告警指纹（去重用）
- `type`: 告警类型 (e.g., `slow_api_request`)
- `severity`: 严重程度 (`info`, `warning`, `critical`)
- `status`: 状态 (`Open`, `Acknowledged`, `Resolved`)

### 4.2 Audit Log (审计日志)

记录关键操作的审计轨迹。

- `actor`: 操作者 (Admin ID)
- `action`: 动作类型
- `details`: 操作详情 JSON

## 5. 性能优化 (索引)

为了保证查询性能，我们在高频查询字段上建立了索引。

### 5.1 常用查询索引

```sql
-- Assertions: 按时间、状态、创建者查询
CREATE INDEX idx_assertions_status_date ON assertions(status, asserted_at DESC);
CREATE INDEX idx_assertions_asserter_date ON assertions(LOWER(asserter), asserted_at DESC);

-- Disputes: 按状态、时间查询
CREATE INDEX idx_disputes_status_date ON disputes(status, disputed_at DESC);

-- Alerts: 告警列表过滤
CREATE INDEX idx_alerts_status_last_seen_at ON alerts(status, last_seen_at DESC);
```

### 5.2 维护建议

- 定期检查 `pg_stat_statements` 以发现慢查询。
- 对于 `alerts` 表，建议定期归档或清理旧的 `Resolved` 告警。
- `sync_metrics` 表会随时间快速增长，建议配置定期清理策略（如保留最近 30 天）。
