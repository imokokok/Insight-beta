# Database Indexes Suggestions

## Overview

This document provides index suggestions for the Insight Oracle database tables based on the query patterns found in the codebase. These indexes will improve the performance of database operations.

## Table: rate_limits

### Queries Found:

```sql
SELECT key FROM rate_limits WHERE reset_at <= NOW() LIMIT 2000;
INSERT INTO rate_limits (key, reset_at, count) VALUES (...) ON CONFLICT (key) DO UPDATE;
```

### Index Suggestions:

```sql
-- Primary key on key column (already exists based on ON CONFLICT clause)
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON rate_limits(reset_at);
```

## Table: kv_store

### Queries Found:

```sql
SELECT key FROM kv_store WHERE key LIKE 'rate_limit/v1/%' AND COALESCE((value->>'resetAtMs')::bigint, 0) <= $1 LIMIT 2000;
INSERT INTO kv_store (key, value, updated_at) VALUES (...) ON CONFLICT (key) DO UPDATE;
```

### Index Suggestions:

```sql
-- Primary key on key column (already exists based on ON CONFLICT clause)
CREATE INDEX IF NOT EXISTS idx_kv_store_value_resetatms ON kv_store((value->>'resetAtMs')::bigint);
CREATE INDEX IF NOT EXISTS idx_kv_store_key_prefix ON kv_store(key text_pattern_ops);
```

## Table: alerts

### Queries Found:

```sql
SELECT status FROM alerts WHERE fingerprint = $1;
INSERT INTO alerts (...) VALUES (...) ON CONFLICT (fingerprint) DO UPDATE;
SELECT COUNT(*) as total FROM alerts WHERE ...;
SELECT * FROM alerts WHERE ... ORDER BY status ASC, last_seen_at DESC LIMIT ... OFFSET ...;
```

### Index Suggestions:

```sql
-- Primary key on fingerprint column (already exists based on ON CONFLICT clause)
CREATE INDEX IF NOT EXISTS idx_alerts_status_last_seen_at ON alerts(status, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_updated_at ON alerts(updated_at);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
```

## Implementation

To implement these indexes, run the following SQL commands in your database:

```sql
-- Create indexes for rate_limits table
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON rate_limits(reset_at);

-- Create indexes for kv_store table
CREATE INDEX IF NOT EXISTS idx_kv_store_value_resetatms ON kv_store((value->>'resetAtMs')::bigint);
CREATE INDEX IF NOT EXISTS idx_kv_store_key_prefix ON kv_store(key text_pattern_ops);

-- Create indexes for alerts table
CREATE INDEX IF NOT EXISTS idx_alerts_status_last_seen_at ON alerts(status, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_updated_at ON alerts(updated_at);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
```

## Monitoring

After implementing these indexes, monitor the database performance using tools like:

- PostgreSQL pg_stat_statements extension
- pgAdmin or DBeaver query analysis
- OpenTelemetry database metrics

This will help you verify the effectiveness of the indexes and identify any further optimizations needed.

## Maintenance

Regularly review and maintain the indexes:

- Remove unused indexes that consume resources
- Rebuild indexes if they become fragmented
- Update indexes as query patterns change
- Monitor index size and performance impact
