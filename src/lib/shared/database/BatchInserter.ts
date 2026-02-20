/**
 * BatchInserter - 通用数据库批量插入工具
 *
 * 封装批量插入逻辑，支持：
 * - 自动分批处理
 * - 冲突处理（ON CONFLICT）
 * - 类型安全
 * - SQL 占位符自动生成
 * - 表名和列名白名单验证
 */

import { query } from '@/lib/database/db';

const ALLOWED_TABLES = new Set([
  'price_history',
  'price_updates',
  'reliability_scores',
  'protocol_rankings',
  'alerts',
  'alert_rules',
  'notification_channels',
  'price_deviations',
  'oracle_health_checks',
]);

const ALLOWED_COLUMNS = new Set([
  'id',
  'symbol',
  'price',
  'timestamp',
  'protocol',
  'chain',
  'source',
  'status',
  'severity',
  'title',
  'description',
  'metadata',
  'deviation',
  'latency_ms',
  'success_count',
  'total_count',
  'score',
  'rank',
  'period',
  'created_at',
  'updated_at',
]);

export interface BatchInserterConfig {
  /** 每批大小 */
  batchSize: number;
  /** 表名 */
  tableName: string;
  /** 列名数组 */
  columns: string[];
  /** 冲突处理语句 */
  onConflict?: string;
}

function validateIdentifier(identifier: string, allowedSet: Set<string>, type: string): void {
  if (!allowedSet.has(identifier)) {
    throw new Error(`Invalid ${type}: ${identifier}. Must be in whitelist.`);
  }
}

function validateIdentifiers(tableName: string, columns: string[]): void {
  validateIdentifier(tableName, ALLOWED_TABLES, 'table name');
  for (const column of columns) {
    validateIdentifier(column, ALLOWED_COLUMNS, 'column name');
  }
}

export class BatchInserter<T extends Record<string, unknown>> {
  private readonly config: BatchInserterConfig;

  constructor(config: BatchInserterConfig) {
    validateIdentifiers(config.tableName, config.columns);
    this.config = config;
  }

  /**
   * 批量插入数据
   */
  async insert(items: T[]): Promise<number> {
    if (items.length === 0) return 0;

    let totalInserted = 0;

    for (let i = 0; i < items.length; i += this.config.batchSize) {
      const batch = items.slice(i, i + this.config.batchSize);
      const inserted = await this.insertBatch(batch);
      totalInserted += inserted;
    }

    return totalInserted;
  }

  /**
   * 单批插入
   */
  private async insertBatch(batch: T[]): Promise<number> {
    const { sql, values } = this.buildInsertQuery(batch);
    const result = await query(
      sql,
      values as (string | number | boolean | Date | string[] | number[] | null | undefined)[],
    );
    return result.rowCount || 0;
  }

  /**
   * 构建插入 SQL
   */
  private buildInsertQuery(batch: T[]): { sql: string; values: unknown[] } {
    const placeholders = this.buildPlaceholders(batch.length, this.config.columns.length);
    const values = batch.flatMap((item) => this.extractValues(item));

    const sql = `
      INSERT INTO ${this.config.tableName} (${this.config.columns.join(', ')})
      VALUES ${placeholders}
      ${this.config.onConflict || ''}
    `.trim();

    return { sql, values };
  }

  /**
   * 构建 SQL 占位符字符串
   * @example
   * buildPlaceholders(2, 3) => "($1,$2,$3),($4,$5,$6)"
   */
  private buildPlaceholders(rowCount: number, columnCount: number): string {
    const rows: string[] = [];
    let paramIndex = 1;

    for (let i = 0; i < rowCount; i++) {
      const params: string[] = [];
      for (let j = 0; j < columnCount; j++) {
        params.push(`$${paramIndex++}`);
      }
      rows.push(`(${params.join(',')})`);
    }

    return rows.join(',');
  }

  /**
   * 从对象中提取列值
   */
  private extractValues(item: T): unknown[] {
    return this.config.columns.map((col) => {
      const value = item[col];
      if (Array.isArray(value)) {
        return value;
      }
      return value ?? null;
    });
  }
}

/**
 * 创建批量插入器的工厂函数
 */
export function createBatchInserter<T extends Record<string, unknown>>(
  config: BatchInserterConfig,
): BatchInserter<T> {
  return new BatchInserter<T>(config);
}
