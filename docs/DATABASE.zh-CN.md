[English](./DATABASE.md)

# 数据库设计

本文档详细描述了 Insight 项目的数据库架构、表结构设计以及索引优化策略。

## 1. Overview

The project uses PostgreSQL as the relational database, primarily for storing:

- On-chain synced oracle data (assertions, disputes, votes)
- System configuration and sync status
- Monitoring alerts and audit logs
- Internal KV storage and rate limiting data

## 2. Core Business Tables

### 2.1 Assertions

Stores all on-chain created assertion data.

| Field              | Type      | Description                         |
| ------------------ | --------- | ----------------------------------- |
| `id`               | TEXT (PK) | Assertion ID (Hash)                 |
| `chain`            | TEXT      | Chain name                          |
| `asserter`         | TEXT      | Creator address                     |
| `protocol`         | TEXT      | Protocol name                       |
| `market`           | TEXT      | Market identifier                   |
| `assertion_data`   | TEXT      | Assertion content                   |
| `bond_usd`         | NUMERIC   | Bond amount (USD)                   |
| `asserted_at`      | TIMESTAMP | Creation time                       |
| `liveness_ends_at` | TIMESTAMP | Challenge period end time           |
| `resolved_at`      | TIMESTAMP | Resolution time                     |
| `status`           | TEXT      | Status (Active, Disputed, Resolved) |
| `tx_hash`          | TEXT      | Creation transaction hash           |

### 2.2 Disputes

Stores disputes initiated against assertions.

| Field           | Type      | Description             |
| --------------- | --------- | ----------------------- |
| `id`            | TEXT (PK) | Dispute ID              |
| `assertion_id`  | TEXT (FK) | Related assertion ID    |
| `disputer`      | TEXT      | Challenger address      |
| `reason`        | TEXT      | Dispute reason          |
| `disputed_at`   | TIMESTAMP | Dispute initiation time |
| `status`        | TEXT      | Dispute status          |
| `votes_for`     | NUMERIC   | Votes in support        |
| `votes_against` | NUMERIC   | Votes against           |

### 2.3 Votes

Stores voting records during dispute governance.

| Field          | Type        | Description             |
| -------------- | ----------- | ----------------------- |
| `id`           | SERIAL (PK) | Auto-increment ID       |
| `assertion_id` | TEXT (FK)   | Related assertion ID    |
| `voter`        | TEXT        | Voter address           |
| `support`      | BOOLEAN     | Whether in support      |
| `weight`       | NUMERIC     | Voting weight           |
| `tx_hash`      | TEXT        | Voting transaction hash |

## 3. System Configuration and Status Tables

### 3.1 Oracle Config

Single-row table, stores global configuration.

- `rpc_url`: Chain RPC address
- `contract_address`: Contract address
- `voting_period_hours`: Voting period duration
- `start_block`: Index starting block

### 3.2 Sync State

Single-row table, tracks indexer sync progress.

- `last_processed_block`: Last processed block
- `safe_block`: Confirmed safe block height
- `lag_blocks`: Sync lag block count

## 4. Monitoring and Operations Tables

### 4.1 Alerts

Stores various alert information triggered by the system.

- `fingerprint`: Alert fingerprint (deduplication)
- `type`: Alert type (e.g., `slow_api_request`)
- `severity`: Severity level (`info`, `warning`, `critical`)
- `status`: Status (`Open`, `Acknowledged`, `Resolved`)

### 4.2 Audit Log

Records audit trails of key operations.

- `actor`: Operator (Admin ID)
- `action`: Action type
- `details`: Operation details JSON

## 5. Performance Optimization (Indexes)

To ensure query performance, we have created indexes on frequently queried fields.

### 5.1 Common Query Indexes

```sql
-- Assertions: Query by time, status, creator
CREATE INDEX idx_assertions_status_date ON assertions(status, asserted_at DESC);
CREATE INDEX idx_assertions_asserter_date ON assertions(LOWER(asserter), asserted_at DESC);

-- Disputes: Query by status, time
CREATE INDEX idx_disputes_status_date ON disputes(status, disputed_at DESC);

-- Alerts: Alert list filtering
CREATE INDEX idx_alerts_status_last_seen_at ON alerts(status, last_seen_at DESC);
```

### 5.2 Maintenance Recommendations

- Regularly check `pg_stat_statements` to discover slow queries.
- For the `alerts` table, regularly archive or clean up old `Resolved` alerts.
- The `sync_metrics` table grows rapidly over time, configure regular cleanup strategy (e.g., keep last 30 days).
