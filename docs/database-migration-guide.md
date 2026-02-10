# 数据库表结构统一迁移指南

## 概述

本文档描述了如何将现有的两套价格数据表结构统一为一套优化的时序存储方案。

## 迁移前后的对比

### 迁移前（多套表）

```
┌─────────────────────────────────────────────────────────┐
│  unified_price_feeds    - 当前价格快照（~10万条）         │
├─────────────────────────────────────────────────────────┤
│  unified_price_updates  - 价格更新历史（~100万条）        │
├─────────────────────────────────────────────────────────┤
│  price_history_raw      - 原始历史（~1000万条）           │
├─────────────────────────────────────────────────────────┤
│  price_history_min1     - 1分钟K线（~500万条）            │
├─────────────────────────────────────────────────────────┤
│  price_history_min5     - 5分钟K线（~100万条）            │
├─────────────────────────────────────────────────────────┤
│  price_history_hour1    - 1小时K线（~50万条）             │
├─────────────────────────────────────────────────────────┤
│  price_history_day1     - 1天K线（~10万条）               │
└─────────────────────────────────────────────────────────┘
总计：~6760万条记录，存储空间约 50-100GB
```

### 迁移后（统一表）

```
┌─────────────────────────────────────────────────────────┐
│  price_history          - 统一时序表（分区）              │
│  （替代所有历史表，~1000万条原始数据）                    │
├─────────────────────────────────────────────────────────┤
│  price_history_1min     - 1分钟物化视图                  │
├─────────────────────────────────────────────────────────┤
│  price_history_5min     - 5分钟物化视图                  │
├─────────────────────────────────────────────────────────┤
│  price_history_1hour    - 1小时物化视图                  │
├─────────────────────────────────────────────────────────┤
│  price_history_1day     - 1天物化视图                    │
├─────────────────────────────────────────────────────────┤
│  current_price_feeds    - 当前价格视图                   │
├─────────────────────────────────────────────────────────┤
│  price_update_events    - 更新事件表                     │
└─────────────────────────────────────────────────────────┘
总计：~1000万条记录 + 物化视图，存储空间约 15-25GB
节省：约 60-70% 存储空间
```

## 迁移步骤

### 阶段1：准备工作（约30分钟）

#### 1.1 备份数据

```bash
# 使用 supabase CLI 导出数据
supabase db dump -f backup_pre_migration.sql

# 或者使用 pg_dump
pg_dump $DATABASE_URL > backup_pre_migration.sql
```

#### 1.2 检查磁盘空间

确保数据库磁盘空间充足（至少剩余50%空间用于迁移过程中的临时数据）。

#### 1.3 停止写入操作

在迁移期间，建议暂停价格同步服务，或切换到只读模式。

```bash
# 暂停同步服务
npm run sync:pause

# 或者设置维护模式
# 在 .env 中添加 MAINTENANCE_MODE=true
```

### 阶段2：执行迁移（约2-4小时，取决于数据量）

#### 2.1 应用新的数据库结构

```bash
# 使用 supabase CLI
supabase db push

# 或者手动执行迁移脚本
psql $DATABASE_URL -f supabase/migrations/20250210000002_unified_schema_refactor.sql
```

#### 2.2 执行数据迁移

```bash
# 先进行干运行（dry-run）检查
DRY_RUN=true npx tsx scripts/migrate-price-data.ts --dry-run

# 执行实际迁移
npx tsx scripts/migrate-price-data.ts

# 或者只迁移特定表
npx tsx scripts/migrate-price-data.ts --skip-history
npx tsx scripts/migrate-price-data.ts --skip-feeds
npx tsx scripts/migrate-price-data.ts --skip-updates
```

#### 2.3 验证数据一致性

```bash
# 验证迁移结果
npx tsx scripts/migrate-price-data.ts --verify-only
```

### 阶段3：切换应用（约15分钟）

#### 3.1 更新代码

将应用代码从旧表切换到新表：

**旧代码：**

```typescript
// 使用 unified_price_feeds
const { data } = await supabase.from('unified_price_feeds').select('*');

// 使用 price_history_raw
const { data } = await supabase.from('price_history_raw').select('*').eq('symbol', 'ETH/USD');
```

**新代码：**

```typescript
// 使用统一的服务
import { getUnifiedPriceService } from '@/server/oracle/unifiedPriceService';

const priceService = getUnifiedPriceService();

// 获取当前价格
const currentPrices = await priceService.getCurrentPrices();

// 获取历史数据
const history = await priceService.getPriceHistory({
  symbol: 'ETH/USD',
  startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
  endTime: new Date(),
  interval: '1hour',
});
```

#### 3.2 部署新版本

```bash
# 构建并部署
npm run build
npm run deploy

# 或者使用 Vercel
vercel --prod
```

#### 3.3 验证应用功能

- [ ] 价格查询正常
- [ ] 历史数据查询正常
- [ ] K线数据查询正常
- [ ] 价格更新事件记录正常
- [ ] 性能符合预期

### 阶段4：清理旧数据（可选，约1-2小时）

确认新系统运行稳定后（建议等待1-7天），可以清理旧表：

```sql
-- 清理旧表（请确保已备份！）
-- 注意：此操作不可逆！

-- 重命名旧表（先保留一段时间）
ALTER TABLE unified_price_feeds RENAME TO unified_price_feeds_backup;
ALTER TABLE unified_price_updates RENAME TO unified_price_updates_backup;
ALTER TABLE price_history_raw RENAME TO price_history_raw_backup;
ALTER TABLE price_history_min1 RENAME TO price_history_min1_backup;
ALTER TABLE price_history_min5 RENAME TO price_history_min5_backup;
ALTER TABLE price_history_hour1 RENAME TO price_history_hour1_backup;
ALTER TABLE price_history_day1 RENAME TO price_history_day1_backup;

-- 删除旧表（确认无误后执行）
-- DROP TABLE unified_price_feeds_backup;
-- DROP TABLE unified_price_updates_backup;
-- DROP TABLE price_history_raw_backup;
-- DROP TABLE price_history_min1_backup;
-- DROP TABLE price_history_min5_backup;
-- DROP TABLE price_history_hour1_backup;
-- DROP TABLE price_history_day1_backup;
```

## 回滚方案

如果在迁移过程中遇到问题，可以按以下步骤回滚：

### 步骤1：切换回旧代码

```bash
# 回滚到上一个版本
git revert HEAD
npm run deploy
```

### 步骤2：恢复数据（如果需要）

```bash
# 从备份恢复
psql $DATABASE_URL < backup_pre_migration.sql
```

### 步骤3：清理新表（可选）

```sql
-- 删除新表
DROP TABLE IF EXISTS price_history CASCADE;
DROP TABLE IF EXISTS price_update_events CASCADE;
DROP TABLE IF EXISTS price_feed_latest CASCADE;
DROP MATERIALIZED VIEW IF EXISTS price_history_1min;
DROP MATERIALIZED VIEW IF EXISTS price_history_5min;
DROP MATERIALIZED VIEW IF EXISTS price_history_1hour;
DROP MATERIALIZED VIEW IF EXISTS price_history_1day;
```

## 性能优化建议

### 1. 分区管理

定期创建新的分区：

```sql
-- 创建下个月的分区
CREATE TABLE IF NOT EXISTS price_history_2025_04 PARTITION OF price_history
    FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
```

### 2. 物化视图刷新

设置定时任务刷新物化视图：

```sql
-- 使用 pg_cron 扩展（如果可用）
SELECT cron.schedule('refresh-1min', '*/1 * * * *', 'SELECT refresh_price_history_1min()');
SELECT cron.schedule('refresh-5min', '*/5 * * * *', 'SELECT refresh_price_history_5min()');
SELECT cron.schedule('refresh-1hour', '0 * * * *', 'SELECT refresh_price_history_1hour()');
SELECT cron.schedule('refresh-1day', '0 0 * * *', 'SELECT refresh_price_history_1day()');
```

或者在应用层定时刷新：

```typescript
// 每小时刷新物化视图
setInterval(
  async () => {
    await priceService.refreshAllMaterializedViews();
  },
  60 * 60 * 1000,
);
```

### 3. 数据清理

定期清理过期数据：

```sql
-- 清理90天前的原始数据
SELECT cleanup_old_price_history();

-- 清理30天前的更新事件
SELECT cleanup_old_price_events();
```

## 监控指标

迁移后需要监控以下指标：

| 指标             | 正常范围 | 告警阈值 |
| ---------------- | -------- | -------- |
| 查询响应时间     | < 100ms  | > 500ms  |
| 物化视图刷新时间 | < 30s    | > 60s    |
| 表存储空间增长   | < 1GB/天 | > 5GB/天 |
| 价格数据延迟     | < 1分钟  | > 5分钟  |

## 常见问题

### Q1: 迁移过程中数据是否会丢失？

不会。迁移脚本使用 INSERT 操作，不会删除或修改源数据。建议在迁移前进行完整备份。

### Q2: 迁移期间服务是否可用？

建议在维护窗口期间进行迁移，或切换到只读模式。新表创建后可以逐步切换流量。

### Q3: 物化视图的数据有多实时？

物化视图需要手动刷新，默认建议：

- 1分钟视图：每分钟刷新
- 5分钟视图：每5分钟刷新
- 1小时视图：每小时刷新
- 1天视图：每天刷新

如果需要实时数据，请直接查询 `price_history` 表。

### Q4: 如何验证数据一致性？

使用迁移脚本提供的验证功能：

```bash
npx tsx scripts/migrate-price-data.ts --verify-only
```

这会检查：

- 记录数量是否匹配
- 视图是否有数据
- 数据时间范围是否正确

## 联系支持

如果在迁移过程中遇到问题，请联系：

- 技术负责人：[姓名]
- DBA 团队：[联系方式]
- 紧急热线：[电话]
