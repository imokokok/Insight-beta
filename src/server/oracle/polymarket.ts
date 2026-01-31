import { hasDatabase, query } from '@/server/db';
import { writeJsonFile } from '@/server/kvStore';
import { getMemoryStore, memoryNowIso } from '@/server/memoryBackend';
import type { Market, MarketResolution } from '@/lib/blockchain/polymarketMonitor';

export interface MarketRecord extends Market {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketResolutionRecord extends MarketResolution {
  id: string;
  createdAt: string;
}

const MARKETS_KEY = 'polymarket_markets/v1';
const RESOLUTIONS_KEY = 'polymarket_resolutions/v1';

/**
 * 保存市场记录
 */
export async function upsertMarketRecord(
  market: Omit<MarketRecord, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<MarketRecord> {
  const id = market.conditionId;
  const now = memoryNowIso();

  if (hasDatabase()) {
    const result = await query(
      `
      INSERT INTO polymarket_markets (
        id, condition_id, question, creator, collateral_token, fee, created_at_block,
        resolved, resolution_time, outcome, volume, liquidity, chain, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (id) DO UPDATE SET
        resolved = EXCLUDED.resolved,
        resolution_time = EXCLUDED.resolution_time,
        outcome = EXCLUDED.outcome,
        volume = EXCLUDED.volume,
        liquidity = EXCLUDED.liquidity,
        updated_at = EXCLUDED.updated_at
      RETURNING *
      `,
      [
        id,
        market.conditionId,
        market.question,
        market.creator,
        market.collateralToken,
        market.fee.toString(),
        market.createdAt.toString(),
        market.resolved,
        market.resolutionTime ? new Date(Number(market.resolutionTime) * 1000).toISOString() : null,
        market.outcome,
        market.volume.toString(),
        market.liquidity.toString(),
        market.chain || '137',
        now,
        now,
      ],
    );
    return formatMarketRecord(result.rows[0]);
  } else {
    const store = getMemoryStore<MarketRecord>(MARKETS_KEY);
    const existing = store.get(id);
    const newRecord: MarketRecord = {
      ...existing,
      ...market,
      id,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    store.set(id, newRecord);
    await writeJsonFile(MARKETS_KEY, Object.fromEntries(store.entries()));
    return newRecord;
  }
}

/**
 * 保存市场解析记录
 */
export async function insertMarketResolution(
  resolution: Omit<MarketResolutionRecord, 'id' | 'createdAt'>,
): Promise<MarketResolutionRecord> {
  const id = `${resolution.conditionId}-${resolution.txHash}`;
  const now = memoryNowIso();

  if (hasDatabase()) {
    const result = await query(
      `
      INSERT INTO polymarket_resolutions (
        id, condition_id, resolved, outcome, resolution_time, resolver, tx_hash, chain, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO NOTHING
      RETURNING *
      `,
      [
        id,
        resolution.conditionId,
        resolution.resolved,
        resolution.outcome,
        new Date(Number(resolution.resolutionTime) * 1000).toISOString(),
        resolution.resolver,
        resolution.txHash,
        '137',
        now,
      ],
    );
    if (result.rows.length === 0) {
      const existing = await query('SELECT * FROM polymarket_resolutions WHERE id = $1', [id]);
      return formatResolutionRecord(existing.rows[0]);
    }
    return formatResolutionRecord(result.rows[0]);
  } else {
    const store = getMemoryStore<MarketResolutionRecord>(RESOLUTIONS_KEY);
    if (store.has(id)) {
      return store.get(id) as MarketResolutionRecord;
    }
    const newRecord: MarketResolutionRecord = {
      ...resolution,
      id,
      createdAt: now,
    };
    store.set(id, newRecord);
    await writeJsonFile(RESOLUTIONS_KEY, Object.fromEntries(store.entries()));
    return newRecord;
  }
}

/**
 * 获取市场列表
 */
export async function getMarkets(options?: {
  resolved?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ records: MarketRecord[]; total: number }> {
  if (hasDatabase()) {
    let sql = 'SELECT * FROM polymarket_markets WHERE 1=1';
    const params: (boolean | number)[] = [];

    if (options?.resolved !== undefined) {
      sql += ` AND resolved = $${params.length + 1}`;
      params.push(options.resolved);
    }

    const countResult = await query(`SELECT COUNT(*) FROM (${sql}) AS t`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    sql += ' ORDER BY created_at DESC';

    if (options?.limit) {
      sql += ` LIMIT $${params.length + 1}`;
      params.push(options.limit);
    }

    if (options?.offset) {
      sql += ` OFFSET $${params.length + 1}`;
      params.push(options.offset);
    }

    const result = await query(sql, params);
    return {
      records: result.rows.map(formatMarketRecord),
      total,
    };
  } else {
    const store = getMemoryStore<MarketRecord>(MARKETS_KEY);
    let records = Array.from(store.values());

    if (options?.resolved !== undefined) {
      records = records.filter((r) => r.resolved === options.resolved);
    }

    const total = records.length;

    records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (options?.offset || options?.limit) {
      const start = options.offset || 0;
      const end = options.limit ? start + options.limit : undefined;
      records = records.slice(start, end);
    }

    return { records, total };
  }
}

/**
 * 获取单个市场
 */
export async function getMarket(conditionId: string): Promise<MarketRecord | null> {
  if (hasDatabase()) {
    const result = await query('SELECT * FROM polymarket_markets WHERE id = $1', [conditionId]);
    if (result.rows.length === 0) return null;
    return formatMarketRecord(result.rows[0]);
  } else {
    const store = getMemoryStore<MarketRecord>(MARKETS_KEY);
    return store.get(conditionId) || null;
  }
}

/**
 * 获取市场统计
 */
export async function getMarketStats(): Promise<{
  totalMarkets: number;
  resolvedMarkets: number;
  activeMarkets: number;
  totalVolume: string;
  totalLiquidity: string;
}> {
  if (hasDatabase()) {
    const [totalResult, resolvedResult, volumeResult, liquidityResult] = await Promise.all([
      query('SELECT COUNT(*) as total FROM polymarket_markets'),
      query('SELECT COUNT(*) as total FROM polymarket_markets WHERE resolved = true'),
      query('SELECT COALESCE(SUM(volume), 0) as total FROM polymarket_markets'),
      query('SELECT COALESCE(SUM(liquidity), 0) as total FROM polymarket_markets'),
    ]);

    const totalMarkets = parseInt(totalResult.rows[0].total, 10);
    const resolvedMarkets = parseInt(resolvedResult.rows[0].total, 10);

    return {
      totalMarkets,
      resolvedMarkets,
      activeMarkets: totalMarkets - resolvedMarkets,
      totalVolume: volumeResult.rows[0].total.toString(),
      totalLiquidity: liquidityResult.rows[0].total.toString(),
    };
  } else {
    const store = getMemoryStore<MarketRecord>(MARKETS_KEY);
    const markets = Array.from(store.values());

    const resolvedMarkets = markets.filter((m) => m.resolved).length;
    const totalVolume = markets.reduce((sum, m) => sum + BigInt(m.volume), 0n);
    const totalLiquidity = markets.reduce((sum, m) => sum + BigInt(m.liquidity), 0n);

    return {
      totalMarkets: markets.length,
      resolvedMarkets,
      activeMarkets: markets.length - resolvedMarkets,
      totalVolume: totalVolume.toString(),
      totalLiquidity: totalLiquidity.toString(),
    };
  }
}

// Helper functions
function formatMarketRecord(row: Record<string, unknown>): MarketRecord {
  return {
    id: String(row.id),
    conditionId: String(row.condition_id || row.conditionId),
    question: String(row.question || ''),
    creator: String(row.creator) as `0x${string}`,
    collateralToken: String(row.collateral_token || row.collateralToken) as `0x${string}`,
    fee: BigInt(row.fee || 0),
    createdAt: BigInt(row.created_at_block || row.createdAt || 0),
    resolved: Boolean(row.resolved),
    resolutionTime: row.resolution_time
      ? BigInt(new Date(String(row.resolution_time)).getTime() / 1000)
      : undefined,
    outcome: row.outcome !== null ? Number(row.outcome) : undefined,
    volume: BigInt(row.volume || 0),
    liquidity: BigInt(row.liquidity || 0),
    chain: String(row.chain || '137'),
    createdAt: String(row.created_at || row.createdAt),
    updatedAt: String(row.updated_at || row.updatedAt),
  };
}

function formatResolutionRecord(row: Record<string, unknown>): MarketResolutionRecord {
  return {
    id: String(row.id),
    conditionId: String(row.condition_id || row.conditionId),
    resolved: Boolean(row.resolved),
    outcome: Number(row.outcome),
    resolutionTime: BigInt(new Date(String(row.resolution_time)).getTime() / 1000),
    resolver: String(row.resolver) as `0x${string}`,
    txHash: String(row.tx_hash || row.txHash) as `0x${string}`,
    createdAt: String(row.created_at || row.createdAt),
  };
}
