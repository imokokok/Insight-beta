/**
 * Repository 实现 - 通用数据库仓储
 */

import { query } from '@/lib/database/db';
import { logger } from '@/shared/logger';

import type { Repository, SearchableRepository, FindOptions, Entity } from '../base/Entity';

type QueryParams = (string | number | boolean | Date | null | undefined | string[] | number[])[];

export interface DatabaseRow {
  [key: string]: unknown;
}

export interface RepositoryConfig {
  tableName: string;
  idColumn: string;
  defaultSort?: { field: string; order: 'asc' | 'desc' };
}

export abstract class BaseRepositoryClass<T extends Entity<string>, IdType extends string = string>
  implements Repository<T, IdType>
{
  protected readonly tableName: string;
  protected readonly idColumn: string;
  protected readonly defaultSort: { field: string; order: 'asc' | 'desc' };

  constructor(config: RepositoryConfig) {
    this.tableName = config.tableName;
    this.idColumn = config.idColumn;
    this.defaultSort = config.defaultSort || { field: 'created_at', order: 'desc' };
  }

  abstract mapRowToEntity(row: DatabaseRow): T;
  abstract mapEntityToRow(entity: T): DatabaseRow;

  async findById(id: IdType): Promise<T | null> {
    try {
      const result = await query(
        `SELECT * FROM ${this.tableName} WHERE ${this.idColumn} = $1 LIMIT 1`,
        [id],
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToEntity(result.rows[0] as DatabaseRow);
    } catch (error) {
      logger.error(`Failed to find ${this.tableName} by id`, {
        error: error instanceof Error ? error.message : String(error),
        id,
      });
      throw error;
    }
  }

  async findAll(): Promise<T[]> {
    try {
      const result = await query(
        `SELECT * FROM ${this.tableName} ORDER BY ${this.defaultSort.field} ${this.defaultSort.order.toUpperCase()}`,
      );

      return result.rows.map((row) => this.mapRowToEntity(row as DatabaseRow));
    } catch (error) {
      logger.error(`Failed to find all ${this.tableName}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async save(entity: T): Promise<void> {
    const exists = await this.exists(entity.id as unknown as IdType);
    if (exists) {
      await this.update(entity);
    } else {
      await this.insert(entity);
    }
  }

  protected async insert(entity: T): Promise<void> {
    const row = this.mapEntityToRow(entity);
    const columns = Object.keys(row);
    const values: QueryParams = Object.values(row) as QueryParams;
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

    try {
      await query(
        `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})`,
        values,
      );
    } catch (error) {
      logger.error(`Failed to insert ${this.tableName}`, {
        error: error instanceof Error ? error.message : String(error),
        entityId: entity.id,
      });
      throw error;
    }
  }

  protected async update(entity: T): Promise<void> {
    const row = this.mapEntityToRow(entity);
    const columns = Object.keys(row).filter((col) => col !== this.idColumn);
    const values: QueryParams = columns.map((col) => row[col]) as QueryParams;
    const setClause = columns.map((col, i) => `${col} = $${i + 2}`).join(', ');

    try {
      await query(
        `UPDATE ${this.tableName} SET ${setClause}, updated_at = NOW() WHERE ${this.idColumn} = $1`,
        [entity.id, ...values],
      );
    } catch (error) {
      logger.error(`Failed to update ${this.tableName}`, {
        error: error instanceof Error ? error.message : String(error),
        entityId: entity.id,
      });
      throw error;
    }
  }

  async delete(id: IdType): Promise<boolean> {
    try {
      const result = await query(`DELETE FROM ${this.tableName} WHERE ${this.idColumn} = $1`, [id]);
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      logger.error(`Failed to delete ${this.tableName}`, {
        error: error instanceof Error ? error.message : String(error),
        id,
      });
      throw error;
    }
  }

  async exists(id: IdType): Promise<boolean> {
    try {
      const result = await query(
        `SELECT 1 FROM ${this.tableName} WHERE ${this.idColumn} = $1 LIMIT 1`,
        [id],
      );
      return result.rows.length > 0;
    } catch (error) {
      logger.error(`Failed to check existence of ${this.tableName}`, {
        error: error instanceof Error ? error.message : String(error),
        id,
      });
      throw error;
    }
  }

  async count(): Promise<number> {
    try {
      const result = await query(`SELECT COUNT(*) as count FROM ${this.tableName}`);
      return parseInt(result.rows[0]?.count || '0', 10);
    } catch (error) {
      logger.error(`Failed to count ${this.tableName}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

export abstract class SearchableBaseRepositoryClass<
    T extends Entity<string>,
    IdType extends string = string,
    FilterType = Record<string, unknown>,
  >
  extends BaseRepositoryClass<T, IdType>
  implements SearchableRepository<T, IdType, FilterType>
{
  abstract buildWhereClause(filter: FilterType): { clause: string; params: QueryParams };

  async findByFilter(filter: FilterType, options?: FindOptions): Promise<T[]> {
    const { clause: whereClause, params } = this.buildWhereClause(filter);
    const limit = options?.limit || 100;
    const offset = options?.offset || 0;
    const sortField = options?.sort?.field || this.defaultSort.field;
    const sortOrder = options?.sort?.order || this.defaultSort.order;

    try {
      const result = await query(
        `SELECT * FROM ${this.tableName} ${whereClause} ORDER BY ${sortField} ${sortOrder.toUpperCase()} LIMIT ${limit} OFFSET ${offset}`,
        params,
      );

      return result.rows.map((row) => this.mapRowToEntity(row as DatabaseRow));
    } catch (error) {
      logger.error(`Failed to find ${this.tableName} by filter`, {
        error: error instanceof Error ? error.message : String(error),
        filter,
      });
      throw error;
    }
  }

  async count(filter?: FilterType): Promise<number> {
    if (!filter || Object.keys(filter).length === 0) {
      return this.count();
    }

    const { clause: whereClause, params } = this.buildWhereClause(filter);

    try {
      const result = await query(
        `SELECT COUNT(*) as count FROM ${this.tableName} ${whereClause}`,
        params,
      );
      return parseInt(result.rows[0]?.count || '0', 10);
    } catch (error) {
      logger.error(`Failed to count ${this.tableName} by filter`, {
        error: error instanceof Error ? error.message : String(error),
        filter,
      });
      throw error;
    }
  }
}

export interface BatchRepository<T> {
  saveBatch(entities: T[]): Promise<void>;
  deleteBatch(ids: string[]): Promise<number>;
}

export class BatchInserter<T extends Entity<string>> implements BatchRepository<T> {
  private readonly tableName: string;
  private readonly mapper: (entity: T) => DatabaseRow;
  private readonly batchSize: number;

  constructor(tableName: string, mapper: (entity: T) => DatabaseRow, batchSize: number = 100) {
    this.tableName = tableName;
    this.mapper = mapper;
    this.batchSize = batchSize;
  }

  async saveBatch(entities: T[]): Promise<void> {
    if (entities.length === 0) return;

    for (let i = 0; i < entities.length; i += this.batchSize) {
      const batch = entities.slice(i, i + this.batchSize);
      await this.insertBatch(batch);
    }
  }

  private async insertBatch(entities: T[]): Promise<void> {
    if (entities.length === 0) return;

    const rows = entities.map((e) => this.mapper(e));
    const columns = Object.keys(rows[0] as object);
    const placeholders: string[] = [];
    const values: unknown[] = [];

    let paramIndex = 1;
    for (const row of rows) {
      const rowPlaceholders = columns.map(() => {
        const placeholder = `$${paramIndex}`;
        paramIndex++;
        return placeholder;
      });
      placeholders.push(`(${rowPlaceholders.join(', ')})`);
      values.push(...Object.values(row as object));
    }

    const sql = `
      INSERT INTO ${this.tableName} (${columns.join(', ')})
      VALUES ${placeholders.join(', ')}
      ON CONFLICT DO NOTHING
    `;

    try {
      await query(sql, values as QueryParams);
    } catch (error) {
      logger.error(`Failed to batch insert into ${this.tableName}`, {
        error: error instanceof Error ? error.message : String(error),
        batchSize: entities.length,
      });
      throw error;
    }
  }

  async deleteBatch(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;

    try {
      const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
      const result = await query(
        `DELETE FROM ${this.tableName} WHERE id IN (${placeholders})`,
        ids,
      );
      return result.rowCount ?? 0;
    } catch (error) {
      logger.error(`Failed to batch delete from ${this.tableName}`, {
        error: error instanceof Error ? error.message : String(error),
        count: ids.length,
      });
      throw error;
    }
  }
}

export const BaseRepository = BaseRepositoryClass;
export const SearchableBaseRepository = SearchableBaseRepositoryClass;
