/**
 * QueryBuilder - 增强版 SQL 查询构建器
 *
 * 消除数据库操作中的重复查询构建逻辑
 */

// ============================================================================
// 类型定义
// ============================================================================

export interface QueryCondition {
  field: string;
  operator:
    | '='
    | '!='
    | '>'
    | '<'
    | '>='
    | '<='
    | 'LIKE'
    | 'ILIKE'
    | 'IN'
    | 'IS NULL'
    | 'IS NOT NULL';
  value?: unknown;
}

export interface QueryOptions {
  table: string;
  columns?: string[];
  conditions?: QueryCondition[];
  orderBy?: { field: string; direction: 'ASC' | 'DESC' }[];
  limit?: number;
  offset?: number;
  groupBy?: string[];
}

export interface BuiltQuery {
  sql: string;
  values: unknown[];
}

// 分页结果接口
export interface PaginatedQueryResult<T> {
  items: T[];
  total: number;
  nextCursor: number | null;
  hasMore: boolean;
}

// ============================================================================
// QueryBuilder 类
// ============================================================================

export class QueryBuilder {
  private conditions: string[] = [];
  private values: unknown[] = [];
  private paramIndex = 1;

  /**
   * 添加条件
   */
  addCondition(condition: QueryCondition): this {
    const { field, operator, value } = condition;

    switch (operator) {
      case 'IS NULL':
      case 'IS NOT NULL':
        this.conditions.push(`${field} ${operator}`);
        break;
      case 'IN':
        if (Array.isArray(value) && value.length > 0) {
          const placeholders = value.map(() => `$${this.paramIndex++}`).join(', ');
          this.conditions.push(`${field} IN (${placeholders})`);
          this.values.push(...value);
        }
        break;
      default:
        this.conditions.push(`${field} ${operator} $${this.paramIndex++}`);
        this.values.push(value);
        break;
    }

    return this;
  }

  /**
   * 添加多个条件（AND 关系）
   */
  addConditions(conditions: QueryCondition[]): this {
    for (const condition of conditions) {
      this.addCondition(condition);
    }
    return this;
  }

  /**
   * 添加可选条件（仅在值不为 null/undefined 时添加）
   */
  addOptionalCondition(field: string, operator: QueryCondition['operator'], value: unknown): this {
    if (value !== undefined && value !== null) {
      this.addCondition({ field, operator, value });
    }
    return this;
  }

  /**
   * 添加搜索条件（多字段模糊搜索）
   */
  addSearchCondition(
    fields: string[],
    searchTerm: string | null | undefined,
    operator: 'LIKE' | 'ILIKE' = 'ILIKE',
  ): this {
    if (!searchTerm?.trim()) return this;

    const term =
      operator === 'LIKE' || operator === 'ILIKE' ? `%${searchTerm.trim()}%` : searchTerm;

    // 为多字段创建 OR 条件
    if (fields.length > 1) {
      const orConditions = fields.map((field) => {
        const paramIdx = this.paramIndex++;
        this.values.push(term);
        return `${field} ${operator} $${paramIdx}`;
      });
      this.conditions.push(`(${orConditions.join(' OR ')})`);
    } else {
      this.conditions.push(`${fields[0]} ${operator} $${this.paramIndex++}`);
      this.values.push(term);
    }

    return this;
  }

  /**
   * 构建 WHERE 子句
   */
  buildWhere(): { clause: string; values: unknown[] } {
    if (this.conditions.length === 0) {
      return { clause: '', values: [] };
    }
    return {
      clause: `WHERE ${this.conditions.join(' AND ')}`,
      values: [...this.values],
    };
  }

  /**
   * 构建完整的 SELECT 查询
   */
  buildSelect(options: QueryOptions): BuiltQuery {
    const columns = options.columns?.join(', ') ?? '*';
    let sql = `SELECT ${columns} FROM ${options.table}`;

    // WHERE 子句
    if (options.conditions && options.conditions.length > 0) {
      this.addConditions(options.conditions);
      const where = this.buildWhere();
      sql += ` ${where.clause}`;
    }

    // GROUP BY 子句
    if (options.groupBy && options.groupBy.length > 0) {
      sql += ` GROUP BY ${options.groupBy.join(', ')}`;
    }

    // ORDER BY 子句
    if (options.orderBy && options.orderBy.length > 0) {
      const orderClauses = options.orderBy.map((o) => `${o.field} ${o.direction}`);
      sql += ` ORDER BY ${orderClauses.join(', ')}`;
    }

    // LIMIT 和 OFFSET
    if (options.limit !== undefined) {
      sql += ` LIMIT $${this.paramIndex++}`;
      this.values.push(options.limit);
    }
    if (options.offset !== undefined) {
      sql += ` OFFSET $${this.paramIndex++}`;
      this.values.push(options.offset);
    }

    return { sql, values: [...this.values] };
  }

  /**
   * 构建 COUNT 查询
   */
  buildCount(table: string, conditions?: QueryCondition[]): BuiltQuery {
    let sql = `SELECT COUNT(*) as count FROM ${table}`;

    if (conditions && conditions.length > 0) {
      this.addConditions(conditions);
      const where = this.buildWhere();
      sql += ` ${where.clause}`;
    }

    return { sql, values: [...this.values] };
  }

  /**
   * 重置构建器状态
   */
  reset(): this {
    this.conditions = [];
    this.values = [];
    this.paramIndex = 1;
    return this;
  }
}

// ============================================================================
// Repository 基类
// ============================================================================

import { query } from './connectionManager';

import type { QueryResultRow } from 'pg';

export abstract class BaseRepository<T, RowType extends QueryResultRow = Record<string, unknown>> {
  protected abstract tableName: string;
  protected abstract mapRow(row: RowType): T;

  protected queryBuilder = new QueryBuilder();

  /**
   * 构建列表查询
   */
  protected buildListQuery(params: {
    conditions?: QueryCondition[];
    orderBy?: { field: string; direction: 'ASC' | 'DESC' }[];
    limit?: number;
    offset?: number;
    columns?: string[];
  }): { sql: string; countSql: string; values: unknown[] } {
    const qb = this.queryBuilder.reset();

    const queryResult = qb.buildSelect({
      table: this.tableName,
      columns: params.columns,
      conditions: params.conditions,
      orderBy: params.orderBy,
      limit: params.limit,
      offset: params.offset,
    });

    const countQb = new QueryBuilder();
    const countResult = countQb.buildCount(this.tableName, params.conditions);

    return {
      sql: queryResult.sql,
      countSql: countResult.sql,
      values: queryResult.values,
    };
  }

  /**
   * 执行分页查询
   */
  protected async executePaginatedQuery(
    sql: string,
    countSql: string,
    values: unknown[],
    limit: number,
    offset: number,
  ): Promise<PaginatedQueryResult<T>> {
    // 计算 count 查询需要的参数数量（去掉 limit 和 offset）
    const countValues = values.slice(0, -2);

    const [dataResult, countResult] = await Promise.all([
      query<RowType>(sql, values),
      query<{ count: string }>(countSql, countValues),
    ]);

    const total = Number(countResult.rows[0]?.count || 0);
    const items = dataResult.rows.map((row) => this.mapRow(row));

    return {
      items,
      total,
      nextCursor: offset + items.length < total ? offset + limit : null,
      hasMore: offset + items.length < total,
    };
  }

  /**
   * 根据 ID 查找单条记录
   */
  async findById(id: string | number): Promise<T | null> {
    const { sql, values } = this.queryBuilder
      .reset()
      .addCondition({ field: 'id', operator: '=', value: id })
      .buildSelect({ table: this.tableName, limit: 1 });

    const result = await query<RowType>(sql, values);
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    if (!row) return null;
    return this.mapRow(row);
  }

  /**
   * 根据条件查找单条记录
   */
  async findOne(conditions: QueryCondition[]): Promise<T | null> {
    const { sql, values } = this.queryBuilder
      .reset()
      .addConditions(conditions)
      .buildSelect({ table: this.tableName, limit: 1 });

    const result = await query<RowType>(sql, values);
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    if (!row) return null;
    return this.mapRow(row);
  }

  /**
   * 根据条件查找多条记录
   */
  async findMany(params: {
    conditions?: QueryCondition[];
    orderBy?: { field: string; direction: 'ASC' | 'DESC' }[];
    limit?: number;
    offset?: number;
  }): Promise<T[]> {
    const { sql, values } = this.queryBuilder.reset().buildSelect({
      table: this.tableName,
      conditions: params.conditions,
      orderBy: params.orderBy,
      limit: params.limit,
      offset: params.offset,
    });

    const result = await query<RowType>(sql, values);
    return result.rows.map((row) => this.mapRow(row));
  }

  /**
   * 统计记录数
   */
  async count(conditions?: QueryCondition[]): Promise<number> {
    const { sql, values } = this.queryBuilder.reset().buildCount(this.tableName, conditions);

    const result = await query<{ count: string }>(sql, values);
    return Number(result.rows[0]?.count || 0);
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

export function createQueryBuilder(): QueryBuilder {
  return new QueryBuilder();
}

export function buildSelectQuery(options: QueryOptions): BuiltQuery {
  return createQueryBuilder().buildSelect(options);
}

export function buildCountQuery(table: string, conditions?: QueryCondition[]): BuiltQuery {
  return createQueryBuilder().buildCount(table, conditions);
}
