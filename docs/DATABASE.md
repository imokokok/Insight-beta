# Database Design

This document describes the database schema for Insight.

## Overview

- **Database**: PostgreSQL 16+
- **ORM**: Prisma
- **Primary Data**: Price history from multiple oracle protocols

## Core Tables

### Price History

#### `price_history_raw`

Raw price data from all protocols.

| Field          | Type           | Description                           |
| -------------- | -------------- | ------------------------------------- |
| `id`           | BigInt (PK)    | Auto-increment ID                     |
| `symbol`       | String         | Trading pair (e.g., ETH/USD)          |
| `protocol`     | String         | Protocol name (chainlink, pyth, etc.) |
| `chain`        | String         | Blockchain network                    |
| `price`        | Decimal(36,18) | Price value                           |
| `price_raw`    | String         | Raw price string                      |
| `decimals`     | Int            | Price decimals                        |
| `timestamp`    | DateTime       | Price timestamp                       |
| `block_number` | BigInt         | Block number                          |
| `confidence`   | Decimal(5,4)   | Confidence score                      |
| `volume_24h`   | Decimal(36,18) | 24h volume                            |
| `change_24h`   | Decimal(10,4)  | 24h change percentage                 |
| `created_at`   | DateTime       | Record creation time                  |

**Indexes**:

- `(symbol, timestamp DESC)`
- `(protocol, timestamp DESC)`
- `(chain, timestamp DESC)`
- `(symbol, protocol, chain, timestamp DESC)`

#### `price_history_min1` / `price_history_min5` / `price_history_hour1` / `price_history_day1`

Aggregated price data at different time intervals (OHLCV format).

| Field          | Type           | Description          |
| -------------- | -------------- | -------------------- |
| `id`           | BigInt (PK)    | Auto-increment ID    |
| `symbol`       | String         | Trading pair         |
| `protocol`     | String         | Protocol name        |
| `chain`        | String         | Blockchain network   |
| `price_open`   | Decimal(36,18) | Opening price        |
| `price_high`   | Decimal(36,18) | High price           |
| `price_low`    | Decimal(36,18) | Low price            |
| `price_close`  | Decimal(36,18) | Closing price        |
| `volume`       | BigInt         | Trading volume       |
| `timestamp`    | DateTime       | Candle timestamp     |
| `sample_count` | Int            | Number of samples    |
| `created_at`   | DateTime       | Record creation time |

**Indexes**:

- `(symbol, timestamp DESC)`
- Unique: `(symbol, protocol, chain, timestamp)`

### Solana Data

#### `solana_price_feeds`

Solana price feed metadata.

| Field        | Type           | Description           |
| ------------ | -------------- | --------------------- |
| `id`         | String (PK)    | UUID                  |
| `symbol`     | String         | Trading pair          |
| `name`       | String         | Feed name             |
| `price`      | Decimal(36,18) | Current price         |
| `confidence` | Decimal(5,4)   | Confidence score      |
| `timestamp`  | DateTime       | Last update           |
| `slot`       | BigInt         | Solana slot           |
| `signature`  | String         | Transaction signature |
| `source`     | String         | Data source           |
| `status`     | String         | active/inactive       |
| `created_at` | DateTime       | Creation time         |
| `updated_at` | DateTime       | Last update           |

#### `solana_price_history`

Solana price history records.

| Field        | Type           | Description           |
| ------------ | -------------- | --------------------- |
| `id`         | String (PK)    | UUID                  |
| `feed_id`    | String         | Reference to feed     |
| `price`      | Decimal(36,18) | Price value           |
| `confidence` | Decimal(5,4)   | Confidence score      |
| `timestamp`  | DateTime       | Record time           |
| `slot`       | BigInt         | Solana slot           |
| `signature`  | String         | Transaction signature |

## Database Operations

### Migrations

```bash
# Development
npm run db:migrate

# Production
npm run db:migrate:prod
```

### Studio (GUI)

```bash
npm run db:studio
```

### Backup Strategy

1. **Automated Backups**: Daily full backups
2. **Point-in-Time Recovery**: Enable PITR on PostgreSQL
3. **Retention**: 30 days minimum

## Performance Optimization

- Partition large tables by timestamp
- Use appropriate indexes for query patterns
- Connection pooling via PgBouncer or Supabase Transaction Mode
