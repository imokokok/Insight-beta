import { hasDatabase, query } from '@/server/db';
import { writeJsonFile } from '@/server/kvStore';
import { getMemoryStore, memoryNowIso } from '@/server/memoryBackend';
import type { TVLData } from '@/lib/blockchain/umaTvlMonitor';

export interface TVLRecord {
  id: string;
  chainId: number;
  timestamp: string;
  totalStaked: string;
  totalBonded: string;
  totalRewards: string;
  oracleTvl: string;
  dvmTvl: string;
  activeAssertions: number;
  activeDisputes: number;
  createdAt: string;
}

const TVL_KEY = 'uma_tvl/v1';

export async function insertTvlRecord(
  data: Omit<TVLData, 'timestamp'> & { timestamp: number },
): Promise<TVLRecord> {
  const id = `${data.chainId}-${data.timestamp}`;
  const now = memoryNowIso();

  if (hasDatabase()) {
    const result = await query(
      `
      INSERT INTO uma_tvl (
        id, chain_id, timestamp, total_staked, total_bonded, total_rewards,
        oracle_tvl, dvm_tvl, active_assertions, active_disputes, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO NOTHING
      RETURNING *
      `,
      [
        id,
        data.chainId,
        new Date(data.timestamp).toISOString(),
        data.totalStaked.toString(),
        data.totalBonded.toString(),
        data.totalRewards.toString(),
        data.oracleTvl.toString(),
        data.dvmTvl.toString(),
        data.activeAssertions,
        data.activeDisputes,
        now,
      ],
    );
    return formatTvlRecord(result.rows[0]);
  } else {
    const store = getMemoryStore<TVLRecord>(TVL_KEY);
    const record: TVLRecord = {
      id,
      chainId: data.chainId,
      timestamp: new Date(data.timestamp).toISOString(),
      totalStaked: data.totalStaked.toString(),
      totalBonded: data.totalBonded.toString(),
      totalRewards: data.totalRewards.toString(),
      oracleTvl: data.oracleTvl.toString(),
      dvmTvl: data.dvmTvl.toString(),
      activeAssertions: data.activeAssertions,
      activeDisputes: data.activeDisputes,
      createdAt: now,
    };
    store.set(id, record);
    await writeJsonFile(TVL_KEY, Object.fromEntries(store.entries()));
    return record;
  }
}

export async function getLatestTvl(chainId?: number): Promise<TVLRecord | null> {
  if (hasDatabase()) {
    let sql = 'SELECT * FROM uma_tvl';
    const params: number[] = [];

    if (chainId) {
      sql += ' WHERE chain_id = $1';
      params.push(chainId);
    }

    sql += ' ORDER BY timestamp DESC LIMIT 1';

    const result = await query(sql, params);
    if (result.rows.length === 0) return null;
    return formatTvlRecord(result.rows[0]);
  } else {
    const store = getMemoryStore<TVLRecord>(TVL_KEY);
    let records = Array.from(store.values());

    if (chainId) {
      records = records.filter((r) => r.chainId === chainId);
    }

    records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return records[0] || null;
  }
}

export async function getTvlHistory(
  chainId: number,
  options?: { hours?: number; limit?: number },
): Promise<TVLRecord[]> {
  const hours = options?.hours || 24;
  const limit = options?.limit || 100;

  if (hasDatabase()) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const result = await query(
      'SELECT * FROM uma_tvl WHERE chain_id = $1 AND timestamp > $2 ORDER BY timestamp DESC LIMIT $3',
      [chainId, since, limit],
    );
    return result.rows.map(formatTvlRecord);
  } else {
    const store = getMemoryStore<TVLRecord>(TVL_KEY);
    const since = Date.now() - hours * 60 * 60 * 1000;

    return Array.from(store.values())
      .filter((r) => r.chainId === chainId && new Date(r.timestamp).getTime() > since)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }
}

function formatTvlRecord(row: Record<string, unknown>): TVLRecord {
  return {
    id: String(row.id),
    chainId: Number(row.chain_id || row.chainId),
    timestamp: String(row.timestamp),
    totalStaked: String(row.total_staked || row.totalStaked),
    totalBonded: String(row.total_bonded || row.totalBonded),
    totalRewards: String(row.total_rewards || row.totalRewards),
    oracleTvl: String(row.oracle_tvl || row.oracleTvl),
    dvmTvl: String(row.dvm_tvl || row.dvmTvl),
    activeAssertions: Number(row.active_assertions || row.activeAssertions),
    activeDisputes: Number(row.active_disputes || row.activeDisputes),
    createdAt: String(row.created_at || row.createdAt),
  };
}
