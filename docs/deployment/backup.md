# 备份与恢复指南

本文档介绍如何备份和恢复 Insight 系统的数据，确保业务连续性和数据安全。

## 概述

Insight 系统使用 PostgreSQL 数据库（通过 Supabase 托管）存储所有关键数据。为了防止数据丢失，需要建立完善的备份策略。

## 备份策略

### 1. Supabase 自动备份（推荐）

Supabase 提供内置的自动备份功能：

#### 免费计划

- 每日自动备份
- 保留 7 天
- 仅限点-in-time 恢复（PITR）

#### Pro 及以上计划

- 每日自动备份
- 保留 30 天
- 支持点-in-time 恢复（PITR）
- 实时 WAL 归档

#### 启用自动备份

1. 进入 Supabase 项目仪表板
2. 导航至 "Database" → "Backups"
3. 确保自动备份已启用
4. 配置备份保留策略

### 2. 手动备份

除了自动备份外，建议定期进行手动备份，特别是在进行重大变更前。

#### 使用 pg_dump 备份

```bash
# 设置环境变量
export DATABASE_URL="postgresql://postgres:[password]@[project-ref].supabase.co:5432/postgres"

# 完整数据库备份
pg_dump $DATABASE_URL > insight_backup_$(date +%Y%m%d_%H%M%S).sql

# 仅备份数据（不包含 schema）
pg_dump --data-only $DATABASE_URL > insight_data_$(date +%Y%m%d_%H%M%S).sql

# 仅备份 schema（不包含数据）
pg_dump --schema-only $DATABASE_URL > insight_schema_$(date +%Y%m%d_%H%M%S).sql

# 压缩备份
pg_dump $DATABASE_URL | gzip > insight_backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

#### 使用 Supabase CLI 备份

```bash
# 链接到项目
supabase link --project-ref $SUPABASE_PROJECT_ID

# 拉取远程数据库
supabase db pull

# 创建本地备份
supabase db dump --db-url $DATABASE_URL > backup.sql
```

### 3. Drizzle 迁移备份

每次生成迁移文件时，Drizzle 会在 `./drizzle` 目录中保存迁移历史。这些迁移文件应该被提交到 Git 仓库中，作为 schema 变更的备份。

```bash
# 生成迁移
npm run db:generate

# 提交迁移文件到 Git
git add drizzle/
git commit -m "Add database migration for [feature]"
```

### 4. 备份频率建议

| 数据类型           | 备份频率        | 保留时间 |
| ------------------ | --------------- | -------- |
| 生产数据库（自动） | 每日            | 30 天    |
| 生产数据库（手动） | 每周/重大变更前 | 永久     |
| Drizzle 迁移       | 每次变更        | 永久     |
| 配置文件           | 每次变更        | 永久     |

## 备份存储

### 1. 多地点存储

- **主要存储**: Supabase 云备份
- **次要存储**: AWS S3 / Google Cloud Storage / Azure Blob Storage
- **异地备份**: 另一个地理区域的云存储
- **本地备份**: 定期下载到安全的本地存储

### 2. 上传备份到云存储

示例：使用 AWS CLI 上传到 S3

```bash
#!/bin/bash
BACKUP_FILE="insight_backup_$(date +%Y%m%d_%H%M%S).sql.gz"
S3_BUCKET="s3://your-insight-backups"

# 创建备份
pg_dump $DATABASE_URL | gzip > $BACKUP_FILE

# 上传到 S3
aws s3 cp $BACKUP_FILE $S3_BUCKET/

# 保留最近 30 天的备份
aws s3 ls $S3_BUCKET/ | while read -r line; do
  create_date=$(echo $line | awk '{print $1"T"$2}')
  create_date_seconds=$(date -j -f "%Y-%m-%dT%H:%M:%S" "$create_date" +%s)
  current_seconds=$(date +%s)
  age_days=$(( (current_seconds - create_date_seconds) / 86400 ))

  if [ $age_days -gt 30 ]; then
    filename=$(echo $line | awk '{print $4}')
    aws s3 rm $S3_BUCKET/$filename
  fi
done

# 清理本地文件
rm $BACKUP_FILE
```

## 数据恢复流程

### 1. 从 Supabase 备份恢复

#### 点-in-time 恢复（PITR）

1. 进入 Supabase 项目仪表板
2. 导航至 "Database" → "Backups"
3. 选择要恢复的时间点
4. 点击 "Restore"
5. 确认恢复操作

**注意**: PITR 会覆盖当前数据库，请确保先备份当前状态。

### 2. 从 SQL 备份文件恢复

#### 完整恢复

```bash
# 设置环境变量
export DATABASE_URL="postgresql://postgres:[password]@[project-ref].supabase.co:5432/postgres"

# 从备份文件恢复
psql $DATABASE_URL < insight_backup_20240101_120000.sql

# 从压缩备份恢复
gunzip -c insight_backup_20240101_120000.sql.gz | psql $DATABASE_URL
```

#### 恢复到新数据库

如果需要在不影响生产的情况下测试恢复：

```bash
# 创建临时数据库
createdb -h [project-ref].supabase.co -p 5432 -U postgres insight_temp

# 恢复到临时数据库
psql "postgresql://postgres:[password]@[project-ref].supabase.co:5432/insight_temp" < insight_backup_20240101_120000.sql
```

### 3. 使用 Drizzle 迁移重建数据库

如果需要从零开始重建数据库：

```bash
# 1. 确保有最新的迁移文件
ls -la drizzle/

# 2. 设置数据库连接
export DATABASE_URL="postgresql://postgres:[password]@[project-ref].supabase.co:5432/postgres"

# 3. 应用所有迁移
npm run db:migrate

# 4. （可选）如果需要重置数据库
npm run db:push
```

### 4. 灾难恢复步骤

#### 场景 1: 数据库意外删除或损坏

1. **立即停止应用**

   ```bash
   # 在 Vercel 中禁用部署或暂停应用
   ```

2. **创建当前状态快照**（如果可能）

   ```bash
   pg_dump $DATABASE_URL > before_recovery_$(date +%Y%m%d_%H%M%S).sql
   ```

3. **从最近的备份恢复**

   ```bash
   # 选择最近的完整备份
   psql $DATABASE_URL < insight_backup_latest.sql
   ```

4. **验证数据完整性**

   ```bash
   # 运行健康检查
   curl https://insight.yourdomain.com/api/health?probe=readiness

   # 验证关键表
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM oracle_instances;"
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM alerts;"
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM price_history;"
   ```

5. **重启应用并监控**

#### 场景 2: 误删除数据

1. **立即创建当前状态备份**

   ```bash
   pg_dump $DATABASE_URL > before_restore_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **恢复到临时数据库**

   ```bash
   createdb -h [project-ref].supabase.co -p 5432 -U postgres insight_temp
   psql "postgresql://postgres:[password]@[project-ref].supabase.co:5432/insight_temp" < insight_backup_before_delete.sql
   ```

3. **从临时数据库导出被删除的数据**

   ```bash
   pg_dump --data-only --table=oracle_instances "postgresql://postgres:[password]@[project-ref].supabase.co:5432/insight_temp" > recovered_data.sql
   ```

4. **将数据导入生产数据库**
   ```bash
   psql $DATABASE_URL < recovered_data.sql
   ```

## 备份验证

定期验证备份的完整性和可恢复性至关重要。

### 1. 自动验证脚本

```bash
#!/bin/bash
BACKUP_FILE=$1
TEST_DB="insight_test_$(date +%Y%m%d_%H%M%S)"

# 创建测试数据库
createdb -h [project-ref].supabase.co -p 5432 -U postgres $TEST_DB

# 恢复备份
gunzip -c $BACKUP_FILE | psql "postgresql://postgres:[password]@[project-ref].supabase.co:5432/$TEST_DB"

# 运行验证查询
psql "postgresql://postgres:[password]@[project-ref].supabase.co:5432/$TEST_DB" -c "
  SELECT
    'oracle_instances' as table_name, COUNT(*) as row_count FROM oracle_instances
  UNION ALL
  SELECT 'alerts', COUNT(*) FROM alerts
  UNION ALL
  SELECT 'price_history', COUNT(*) FROM price_history
  UNION ALL
  SELECT 'audit_log', COUNT(*) FROM audit_log;
"

# 清理测试数据库
dropdb -h [project-ref].supabase.co -p 5432 -U postgres $TEST_DB

echo "Backup verification completed successfully"
```

### 2. 验证检查表

- [ ] 备份文件可以成功解压
- [ ] 备份可以恢复到测试数据库
- [ ] 关键表存在且有数据
- [ ] 索引和约束完整
- [ ] 应用可以连接到恢复的数据库
- [ ] 基本功能正常工作

## 灾难恢复计划

### 1. 恢复时间目标（RTO）和恢复点目标（RPO）

| 场景           | RTO       | RPO     |
| -------------- | --------- | ------- |
| 小数据损坏     | < 1 小时  | 15 分钟 |
| 完全数据库故障 | < 4 小时  | 1 小时  |
| 区域故障       | < 24 小时 | 24 小时 |

### 2. 角色和职责

- **数据库管理员**: 执行备份和恢复操作
- **开发团队**: 验证应用功能
- **DevOps**: 协调基础设施恢复
- **产品经理**: 沟通状态和影响

### 3. 沟通计划

1. 立即通知相关团队
2. 建立状态更新频率（每 30 分钟）
3. 更新外部利益相关者（如适用）
4. 恢复后进行事后复盘

## 最佳实践

1. **测试恢复流程**: 定期（至少每季度）进行完整的恢复演练
2. **加密备份**: 使用 AES-256 或类似算法加密备份文件
3. **版本控制**: 将 Drizzle 迁移文件提交到 Git
4. **监控备份**: 设置备份失败告警
5. **文档变更**: 记录所有备份和恢复操作
6. **异地备份**: 在不同地理区域存储备份
7. **访问控制**: 限制对备份的访问权限

## 相关工具

- **Supabase Backups**: 内置备份解决方案
- **pg_dump/pg_restore**: PostgreSQL 标准备份工具
- **Drizzle Kit**: 数据库迁移管理
- **AWS S3 / GCS**: 云存储备份目标
- **Cron / GitHub Actions**: 自动化备份调度

---

**返回 [文档总索引](../README.md)**
