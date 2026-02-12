/**
 * Oracle Repository - 仓储实现
 */

import { query } from '@/lib/database/db';
import { logger } from '@/shared/logger';

import { OracleEntity, PriceFeedEntity } from './OracleAggregate';
import { BaseRepositoryClass, SearchableBaseRepositoryClass } from '../repositories/BaseRepository';

import type { OracleStatus } from './Events';
import type { OracleEntityProps } from './OracleAggregate';
import type { DatabaseRow, RepositoryConfig } from '../repositories/BaseRepository';

type QueryParams = (string | number | boolean | Date | null | undefined | string[] | number[])[];

export interface OracleFilter {
  protocol?: string;
  chain?: string;
  status?: OracleStatus;
  search?: string;
}

export interface OracleRepositoryConfig extends RepositoryConfig {
  tableName: 'oracles';
  idColumn: 'id';
}

const DEFAULT_CONFIG: OracleRepositoryConfig = {
  tableName: 'oracles',
  idColumn: 'id',
  defaultSort: { field: 'created_at', order: 'desc' },
};

export class OracleRepository extends SearchableBaseRepositoryClass<
  OracleEntity,
  string,
  OracleFilter
> {
  constructor(config: Partial<OracleRepositoryConfig> = {}) {
    super({ ...DEFAULT_CONFIG, ...config });
  }

  mapRowToEntity(row: DatabaseRow): OracleEntity {
    const props: OracleEntityProps = {
      id: row.id as string,
      protocol: row.protocol as string,
      name: row.name as string,
      chain: row.chain as string,
      address: row.address as string,
      status: (row.status as OracleStatus) || 'active',
      config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
    };
    return OracleEntity.create(props);
  }

  mapEntityToRow(entity: OracleEntity): DatabaseRow {
    const obj = entity.toPlainObject();
    return {
      id: obj.id,
      protocol: obj.protocol,
      name: obj.name,
      chain: obj.chain,
      address: obj.address,
      status: obj.status,
      config: JSON.stringify(obj.config),
      metadata: JSON.stringify(obj.metadata),
    };
  }

  buildWhereClause(filter: OracleFilter): { clause: string; params: QueryParams } {
    const conditions: string[] = [];
    const params: QueryParams = [];
    let paramIndex = 1;

    if (filter.protocol) {
      conditions.push(`protocol = $${paramIndex++}`);
      params.push(filter.protocol);
    }
    if (filter.chain) {
      conditions.push(`chain = $${paramIndex++}`);
      params.push(filter.chain);
    }
    if (filter.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(filter.status);
    }
    if (filter.search) {
      conditions.push(`(name ILIKE $${paramIndex} OR address ILIKE $${paramIndex})`);
      params.push(`%${filter.search}%`);
    }

    return {
      clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
      params,
    };
  }

  async findByProtocol(protocol: string): Promise<OracleEntity[]> {
    return this.findByFilter({ protocol });
  }

  async findByChain(chain: string): Promise<OracleEntity[]> {
    return this.findByFilter({ chain });
  }

  async findByStatus(status: OracleStatus): Promise<OracleEntity[]> {
    return this.findByFilter({ status });
  }

  async findActive(): Promise<OracleEntity[]> {
    return this.findByFilter({ status: 'active' });
  }

  async search(queryStr: string): Promise<OracleEntity[]> {
    return this.findByFilter({ search: queryStr });
  }

  async findByAddress(address: string): Promise<OracleEntity | null> {
    try {
      const result = await query(`SELECT * FROM ${this.tableName} WHERE address = $1 LIMIT 1`, [
        address,
      ]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToEntity(result.rows[0] as DatabaseRow);
    } catch (error) {
      logger.error('Failed to find oracle by address', {
        error: error instanceof Error ? error.message : String(error),
        address,
      });
      throw error;
    }
  }

  async findByProtocolAndChain(protocol: string, chain: string): Promise<OracleEntity[]> {
    return this.findByFilter({ protocol, chain });
  }

  async getOraclesWithStaleFeeds(): Promise<OracleEntity[]> {
    try {
      const result = await query(`
        SELECT DISTINCT o.* FROM oracles o
        INNER JOIN price_feeds pf ON pf.oracle_id = o.id
        WHERE pf.is_stale = true OR pf.last_update < NOW() - INTERVAL '5 minutes'
        ORDER BY o.created_at DESC
      `);

      return result.rows.map((row) => this.mapRowToEntity(row as DatabaseRow));
    } catch (error) {
      logger.error('Failed to find oracles with stale feeds', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async countByProtocol(protocol: string): Promise<number> {
    return this.count({ protocol });
  }

  async countByChain(chain: string): Promise<number> {
    return this.count({ chain });
  }
}

export class PriceFeedRepository extends BaseRepositoryClass<PriceFeedEntity, string> {
  constructor(config: Partial<RepositoryConfig> = {}) {
    super({
      tableName: 'price_feeds',
      idColumn: 'id',
      defaultSort: { field: 'symbol', order: 'asc' },
      ...config,
    });
  }

  mapRowToEntity(row: DatabaseRow): PriceFeedEntity {
    return new PriceFeedEntity({
      id: row.id as string,
      oracleId: row.oracle_id as string,
      symbol: row.symbol as string,
      decimals: (row.decimals as number) || 18,
      heartbeat: (row.heartbeat as number) || 300,
      deviationThreshold: (row.deviation_threshold as number) || 0.5,
    });
  }

  mapEntityToRow(entity: PriceFeedEntity): DatabaseRow {
    return {
      id: entity.id,
      oracle_id: entity.oracleId,
      symbol: entity.symbol,
      decimals: entity.decimals,
      heartbeat: entity.heartbeat,
      deviation_threshold: entity.deviationThreshold,
    };
  }

  async findByOracleId(oracleId: string): Promise<PriceFeedEntity[]> {
    try {
      const result = await query(
        `SELECT * FROM ${this.tableName} WHERE oracle_id = $1 ORDER BY symbol ASC`,
        [oracleId],
      );

      return result.rows.map((row) => this.mapRowToEntity(row as DatabaseRow));
    } catch (error) {
      logger.error('Failed to find price feeds by oracle id', {
        error: error instanceof Error ? error.message : String(error),
        oracleId,
      });
      throw error;
    }
  }

  async findBySymbol(symbol: string): Promise<PriceFeedEntity[]> {
    try {
      const result = await query(`SELECT * FROM ${this.tableName} WHERE symbol = $1`, [symbol]);

      return result.rows.map((row) => this.mapRowToEntity(row as DatabaseRow));
    } catch (error) {
      logger.error('Failed to find price feeds by symbol', {
        error: error instanceof Error ? error.message : String(error),
        symbol,
      });
      throw error;
    }
  }

  async findStaleFeeds(maxAgeSeconds: number = 300): Promise<PriceFeedEntity[]> {
    try {
      const cutoff = new Date(Date.now() - maxAgeSeconds * 1000);
      const result = await query(
        `SELECT * FROM ${this.tableName} WHERE last_update < $1 OR last_update IS NULL`,
        [cutoff],
      );

      return result.rows.map((row) => this.mapRowToEntity(row as DatabaseRow));
    } catch (error) {
      logger.error('Failed to find stale price feeds', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findByOracleAndSymbol(oracleId: string, symbol: string): Promise<PriceFeedEntity | null> {
    try {
      const result = await query(
        `SELECT * FROM ${this.tableName} WHERE oracle_id = $1 AND symbol = $2 LIMIT 1`,
        [oracleId, symbol],
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToEntity(result.rows[0] as DatabaseRow);
    } catch (error) {
      logger.error('Failed to find price feed by oracle and symbol', {
        error: error instanceof Error ? error.message : String(error),
        oracleId,
        symbol,
      });
      throw error;
    }
  }
}

export const oracleRepository = new OracleRepository();
export const priceFeedRepository = new PriceFeedRepository();
