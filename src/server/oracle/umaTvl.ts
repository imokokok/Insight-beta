import { hasDatabase, query } from '@/server/db';
import { readJsonFile, writeJsonFile } from '@/server/kvStore';

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
}

const TVL_KEY = 'uma_tvl/v1';

// Helper to get data from KV store
async function getKvData<T>(key: string): Promise<Record<string, T>> {
  const data = await readJsonFile(key, {});
  return (data as Record<string, T>) || {};
}

/**
 * 保存 TVL 记录
 */
export async function insertTvlRecord(record: Omit<TVLRecord, 'id'>): Promise<TVLRecord> {
  const id = `${record.chainId}-${record.timestamp}`;

  if (hasDatabase()) {
    const result = await query(
      `
      INSERT INTO uma_tvl (
        id, chain_id, timestamp, total_staked, total_bonded, total_rewards,
        oracle_tvl, dvm_tvl, active_assertions, active_disputes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO NOTHING
      RETURNING *
      `,
      [
        id,
        record.chainId,
        record.timestamp,
        record.totalStaked,
        record.totalBonded,
        record.totalRewards,
        record.oracleTvl,
        record.dvmTvl,
        record.activeAssertions,
        record.activeDisputes,
      ],
    );
    return formatTvlRecord(result.rows[0] as Record<string, unknown>);
  } else {
    const data = await getKvData<TVLRecord>(TVL_KEY);
    const newRecord: TVLRecord = { ...record, id };
    data[id] = newRecord;
    await writeJsonFile(TVL_KEY, data);
    return newRecord;
  }
}

/**
 * 获取最新的 TVL 记录
 */
export async function getLatestTvl(chainId: number): Promise<TVLRecord | null> {
  if (hasDatabase()) {
    const result = await query(
      'SELECT * FROM uma_tvl WHERE chain_id = $1 ORDER BY timestamp DESC LIMIT 1',
      [chainId],
    );
    if (result.rows.length === 0) return null;
    return formatTvlRecord(result.rows[0] as Record<string, unknown>);
  } else {
    const data = await getKvData<TVLRecord>(TVL_KEY);
    const records = Object.values(data)
      .filter((r) => r.chainId === chainId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return records[0] || null;
  }
}

/**
 * 获取 TVL 历史记录
 */
export async function getTvlHistory(chainId: number, hours: number = 24): Promise<TVLRecord[]> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  if (hasDatabase()) {
    const result = await query(
      'SELECT * FROM uma_tvl WHERE chain_id = $1 AND timestamp > $2 ORDER BY timestamp DESC',
      [chainId, since],
    );
    return result.rows.map((r) => formatTvlRecord(r as Record<string, unknown>));
  } else {
    const data = await getKvData<TVLRecord>(TVL_KEY);
    return Object.values(data)
      .filter(
        (r) => r.chainId === chainId && new Date(r.timestamp).getTime() > new Date(since).getTime(),
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
}

/**
 * 获取所有链的最新 TVL
 */
export async function getAllLatestTvl(): Promise<TVLRecord[]> {
  if (hasDatabase()) {
    const result = await query(
      `
      SELECT DISTINCT ON (chain_id) *
      FROM uma_tvl
      ORDER BY chain_id, timestamp DESC
      `,
    );
    return result.rows.map((r) => formatTvlRecord(r as Record<string, unknown>));
  } else {
    const data = await getKvData<TVLRecord>(TVL_KEY);
    const records = Object.values(data);
    const latestByChain = new Map<number, TVLRecord>();

    for (const record of records) {
      const existing = latestByChain.get(record.chainId);
      if (!existing || new Date(record.timestamp) > new Date(existing.timestamp)) {
        latestByChain.set(record.chainId, record);
      }
    }

    return Array.from(latestByChain.values()).sort((a, b) => a.chainId - b.chainId);
  }
}

// Helper function to format database rows
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
  };
}
