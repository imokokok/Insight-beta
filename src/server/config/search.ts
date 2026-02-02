/**
 * Search Module - 配置搜索过滤模块
 *
 * 支持配置搜索、过滤、排序
 */

import type { OracleConfig } from '@/lib/types/oracleTypes';
import { hasDatabase, query } from '../db';
import { getMemoryInstance } from '@/server/memoryBackend';

export interface ConfigSearchOptions {
  query?: string;
  chain?: string;
  hasContractAddress?: boolean;
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface ConfigSearchResult {
  instanceId: string;
  name: string;
  config: OracleConfig;
  matchScore?: number;
}

/**
 * 搜索配置
 */
export async function searchConfigs(
  options: ConfigSearchOptions = {},
): Promise<{ results: ConfigSearchResult[]; total: number }> {
  if (!hasDatabase()) {
    // 内存模式：从内存存储搜索
    const mem = getMemoryInstance('default');
    return {
      results: [
        {
          instanceId: 'default',
          name: 'Default',
          config: mem.oracleConfig,
        },
      ],
      total: 1,
    };
  }

  const {
    query: searchQuery,
    chain,
    hasContractAddress,
    sortBy = 'name',
    sortOrder = 'asc',
    limit = 50,
    offset = 0,
  } = options;

  const conditions: string[] = [];
  const values: (string | boolean | number)[] = [];
  let paramIndex = 1;

  if (searchQuery) {
    conditions.push(`(id ILIKE $${paramIndex} OR name ILIKE $${paramIndex})`);
    values.push(`%${searchQuery}%`);
    paramIndex++;
  }

  if (chain) {
    conditions.push(`chain = $${paramIndex}`);
    values.push(chain);
    paramIndex++;
  }

  if (hasContractAddress !== undefined) {
    conditions.push(
      hasContractAddress
        ? `contract_address IS NOT NULL AND contract_address != ''`
        : `(contract_address IS NULL OR contract_address = '')`,
    );
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sortColumn =
    sortBy === 'createdAt' ? 'created_at' : sortBy === 'updatedAt' ? 'updated_at' : 'id';
  const orderDirection = sortOrder === 'desc' ? 'DESC' : 'ASC';
  const orderClause = `ORDER BY ${sortColumn} ${orderDirection}`;

  const countPromise = query<{ count: number }>(
    `SELECT COUNT(*) as count FROM oracle_instances ${whereClause}`,
    values,
  );

  const dataPromise = query<{
    id: string;
    name: string;
    rpc_url: string;
    contract_address: string;
    chain: string;
    start_block: number;
    max_block_range: number;
    voting_period_hours: number;
    confirmation_blocks: number;
  }>(
    `SELECT * FROM oracle_instances ${whereClause} ${orderClause} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...values, limit, offset],
  );

  const [countRes, dataRes] = await Promise.all([countPromise, dataPromise]);

  const results = dataRes.rows.map(
    (row: {
      id: string;
      name: string;
      rpc_url: string;
      contract_address: string;
      chain: string;
      start_block: number;
      max_block_range: number;
      voting_period_hours: number;
      confirmation_blocks: number;
    }) => ({
      instanceId: row.id,
      name: row.name,
      config: {
        rpcUrl: row.rpc_url || '',
        contractAddress: row.contract_address || '',
        chain: (row.chain as OracleConfig['chain']) || 'Local',
        startBlock: row.start_block || 0,
        maxBlockRange: row.max_block_range || 10000,
        votingPeriodHours: row.voting_period_hours || 72,
        confirmationBlocks: row.confirmation_blocks || 12,
      },
    }),
  );

  return {
    results,
    total: parseInt(String(countRes.rows[0]?.count || '0'), 10),
  };
}
