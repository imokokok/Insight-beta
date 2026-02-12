# Database Schema Unified Migration Guide

This document describes how to unify the existing two sets of price data table structures into one optimized time-series storage solution.

## Overview

## Comparison Before and After Migration

### Before Migration (Multiple Tables)

```
┌─────────────────────────────────────────────────────────┐
│  unified_price_feeds    - Current price snapshots (~100k records)  │
├─────────────────────────────────────────────────────────┤
│  unified_price_updates  - Price update history (~1M records)       │
├─────────────────────────────────────────────────────────┤
│  price_history_raw      - Raw history (~10M records)              │
├─────────────────────────────────────────────────────────┤
│  price_history_min1     - 1-minute K-lines (~5M records)        │
├─────────────────────────────────────────────────────────┤
│  price_history_min5     - 5-minute K-lines (~1M records)        │
├─────────────────────────────────────────────────────────┤
│  price_history_hour1    - 1-hour K-lines (~500k records)        │
├─────────────────────────────────────────────────────────┤
│  price_history_day1     - 1-day K-lines (~100k records)         │
└─────────────────────────────────────────────────────────┘
Total: ~67.6M records, storage space ~50-100GB
```

### After Migration (Unified Table)

```
┌─────────────────────────────────────────────────────────┐
│  price_history          - Unified time-series table (partitioned)│
│  (~10M records replacing all history tables)            │
├─────────────────────────────────────────────────────────┤
│  price_history_1min     - 1-minute materialized view   │
├─────────────────────────────────────────────────────────┤
│  price_history_5min     - 5-minute materialized view   │
├─────────────────────────────────────────────────────────┤
│  price_history_1hour    - 1-hour materialized view    │
├─────────────────────────────────────────────────────────┤
│  price_history_1day     - 1-day materialized view    │
├─────────────────────────────────────────────────────────┤
│  current_price_feeds    - Current price view          │
├─────────────────────────────────────────────────────────┤
│  price_update_events    - Update events table         │
└─────────────────────────────────────────────────────────┘
Total: ~10M records + materialized views, storage ~15-25GB
Savings: ~60-70% storage space
```

## Migration Steps

### Phase 1: Preparation (~30 minutes)

#### 1.1 Backup Data

```bash
# Export data using supabase CLI
supabase db dump -f backup_pre_migration.sql

# Or use pg_dump
pg_dump $DATABASE_URL > backup_pre_migration.sql
```

#### 1.2 Check Disk Space

Ensure sufficient disk space (at least 50% free space for temporary data during migration).

#### 1.3 Stop Write Operations

During migration, it's recommended to pause the price sync service or switch to read-only mode.

```bash
# Pause sync service
npm run sync:pause

# Or set maintenance mode
# Add MAINTENANCE_MODE=true in .env
```

### Phase 2: Execute Migration (~2-4 hours depending on data volume)

#### 2.1 Apply New Database Structure

```bash
# Using supabase CLI
supabase db push

# Or manually execute migration script
psql $DATABASE_URL -f supabase/migrations/20250210000002_unified_schema_refactor.sql
```

#### 2.2 Execute Data Migration

```bash
# First perform dry-run to check
DRY_RUN=true npx tsx scripts/migrate-price-data.ts --dry-run

# Execute actual migration
npx tsx scripts/migrate-price-data.ts

# Or only migrate specific tables
npx tsx scripts/migrate-price-data.ts --skip-history
npx tsx scripts/migrate-price-data.ts --skip-feeds
npx tsx scripts/migrate-price-data.ts --skip-updates
```

#### 2.3 Verify Data Consistency

```bash
# Verify migration results
npx tsx scripts/migrate-price-data.ts --verify-only
```

### Phase 3: Switch Application (~15 minutes)

#### 3.1 Update Code

Switch application code from old tables to new tables:

**Old Code:**

```typescript
// Using unified_price_feeds
const { data } = await supabase.from('unified_price_feeds').select('*');

// Using price_history_raw
const { data } = await supabase.from('price_history_raw').select('*').eq('symbol', 'ETH/USD');
```

**New Code:**

```typescript
// Using unified service
import { getUnifiedPriceService } from '@/server/oracle/unifiedPriceService';

const priceService = getUnifiedPriceService();

// Get current prices
const currentPrices = await priceService.getCurrentPrices();

// Get historical data
const history = await priceService.getPriceHistory({
  symbol: 'ETH/USD',
  startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
  endTime: new Date(),
  interval: '1hour',
});
```

#### 3.2 Deploy New Version

```bash
# Build and deploy
npm run build
npm run deploy

# Or use Vercel
vercel --prod
```

#### 3.3 Verify Application Functionality

- [ ] Price query works
- [ ] Historical data query works
- [ ] K-line data query works
- [ ] Price update event recording works
- [ ] Performance meets expectations

### Phase 4: Clean Up Old Data (Optional, ~1-2 hours)

After confirming the new system runs stably (recommend waiting 1-7 days), you can clean up old tables:

```sql
-- Rename old tables (keep for a while first)
ALTER TABLE unified_price_feeds RENAME TO unified_price_feeds_backup;
ALTER TABLE unified_price_updates RENAME TO unified_price_updates_backup;
ALTER TABLE price_history_raw RENAME TO price_history_raw_backup;
ALTER TABLE price_history_min1 RENAME TO price_history_min1_backup;
ALTER TABLE price_history_min5 RENAME TO price_history_min5_backup;
ALTER TABLE price_history_hour1 RENAME TO price_history_hour1_backup;
ALTER TABLE price_history_day1 RENAME TO price_history_day1_backup;

-- Delete old tables (confirm first)
-- DROP TABLE unified_price_feeds_backup;
-- DROP TABLE unified_price_updates_backup;
-- DROP TABLE price_history_raw_backup;
-- DROP TABLE price_history_min1_backup;
-- DROP TABLE price_history_min5_backup;
-- DROP TABLE price_history_hour1_backup;
-- DROP TABLE price_history_day1_backup;
```

## Rollback Plan

If problems are encountered during migration, you can roll back as follows:

### Step 1: Switch Back to Old Code

```bash
# Revert to previous version
git revert HEAD
npm run deploy
```

### Step 2: Restore Data (if needed)

```bash
# Restore from backup
psql $DATABASE_URL < backup_pre_migration.sql
```

### Step 3: Clean Up New Tables (Optional)

```sql
-- Delete new tables
DROP TABLE IF EXISTS price_history CASCADE;
DROP TABLE IF EXISTS price_update_events CASCADE;
DROP TABLE IF EXISTS price_feed_latest CASCADE;
DROP MATERIALIZED VIEW IF EXISTS price_history_1min;
DROP MATERIALIZED VIEW IF EXISTS price_history_5min;
DROP MATERIALIZED VIEW IF EXISTS price_history_1hour;
DROP MATERIALIZED VIEW IF EXISTS price_history_1day;
```

## Performance Optimization Suggestions

### 1. Partition Management

Regularly create new partitions:

```sql
-- Create partition for next month
CREATE TABLE IF NOT EXISTS price_history_2025_04 PARTITION OF price_history
    FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
```

### 2. Materialized View Refresh

Set up scheduled tasks to refresh materialized views:

```sql
-- Use pg_cron extension (if available)
SELECT cron.schedule('refresh-1min', '*/1 * * * *', 'SELECT refresh_price_history_1min()');
SELECT cron.schedule('refresh-5min', '*/5 * * * *', 'SELECT refresh_price_history_5min()');
SELECT cron.schedule('refresh-1hour', '0 * * * *', 'SELECT refresh_price_history_1hour()');
SELECT cron.schedule('refresh-1day', '0 0 * * *', 'SELECT refresh_price_history_1day()');
```

Or refresh at application layer:

```typescript
// Refresh materialized views every hour
setInterval(
  async () => {
    await priceService.refreshAllMaterializedViews();
  },
  60 * 60 * 1000,
);
```

### 3. Data Cleanup

Regularly clean up expired data:

```sql
-- Clean raw data older than 90 days
SELECT cleanup_old_price_history();

-- Clean update events older than 30 days
SELECT cleanup_old_price_events();
```

## Monitoring Metrics

After migration, monitor the following metrics:

| Metric                         | Normal Range | Alert Threshold |
| ------------------------------ | ------------ | --------------- |
| Query response time            | < 100ms      | > 500ms         |
| Materialized view refresh time | < 30s        | > 60s           |
| Table storage growth           | < 1GB/day    | > 5GB/day       |
| Price data latency             | < 1 minute   | > 5 minutes     |

## FAQ

### Q1: Will data be lost during migration?

No. Migration scripts use INSERT operations and do not delete or modify source data. It's recommended to perform a full backup before migration.

### Q2: Is service available during migration?

It's recommended to perform migration during a maintenance window or switch to read-only mode. After new tables are created, traffic can be gradually switched.

### Q3: How real-time is materialized view data?

Materialized views need to be manually refreshed. Default recommendations:

- 1-minute view: Refresh every minute
- 5-minute view: Refresh every 5 minutes
- 1-hour view: Refresh every hour
- 1-day view: Refresh daily

If real-time data is needed, query `price_history` table directly.

### Q4: How to verify data consistency?

Use the verification function provided by the migration script:

```bash
npx tsx scripts/migrate-price-data.ts --verify-only
```

This checks:

- Record counts match
- Views have data
- Data time range is correct

## Contact Support

If problems are encountered during migration, please contact:

- Technical Lead: [Name]
- DBA Team: [Contact]
- Emergency Hotline: [Phone]
